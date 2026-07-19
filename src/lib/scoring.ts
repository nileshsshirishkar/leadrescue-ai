import type { ConfidenceLevel, IntentLevel, Lead, LeadAnalysis, RecoveryPriority } from "@/lib/types";

const DAY_MS = 86_400_000;
const BUYING_KEYWORDS = [
  "price", "pricing", "cost", "availability", "available", "appointment",
  "consultation", "book", "booking", "quote",
];
const GENERIC_SERVICES = new Set(["", "service", "services", "information", "help"]);

function combinedText(lead: Lead): string {
  return [lead.enquiryText, lead.notes, lead.status, lead.appointmentStatus, lead.budgetSignal]
    .join(" ")
    .toLowerCase();
}

function daysSince(date: string | undefined, referenceDate: Date): number | null {
  if (!date) return null;
  const timestamp = Date.parse(date);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((referenceDate.getTime() - timestamp) / DAY_MS));
}

function getIntent(lead: Lead, text: string): { level: IntentLevel; points: number; keyword?: string } {
  let points = 0;
  const service = lead.serviceInterest.trim().toLowerCase();
  if (!GENERIC_SERVICES.has(service) && service.length >= 4) points += 25;
  const keyword = BUYING_KEYWORDS.find((term) => text.includes(term));
  if (keyword) points += 25;
  if (lead.quotedPrice !== undefined || /budget|price|cost|quote/.test(lead.budgetSignal.toLowerCase())) points += 20;
  if (/requested|booked|scheduled|missed/.test(lead.appointmentStatus.toLowerCase())) points += 15;
  if (lead.enquiryText.trim().length >= 45) points += 10;
  if (/interested|qualified|hot|proposal/.test(lead.status.toLowerCase())) points += 10;
  return { level: points >= 55 ? "High" : points >= 30 ? "Medium" : "Low", points, keyword };
}

function getConfidence(lead: Lead): ConfidenceLevel {
  const contactMethods = Number(Boolean(lead.phone)) + Number(Boolean(lead.email));
  const contextualFields = [lead.serviceInterest, lead.enquiryText, lead.notes].filter(Boolean).length;
  if (contactMethods === 0 || contextualFields === 0) return "Low";
  if (contactMethods === 1 || contextualFields === 1) return "Medium";
  return "High";
}

function getMissingInformation(lead: Lead): string[] {
  const missing: string[] = [];
  if (!lead.phone) missing.push("Phone number");
  if (!lead.email) missing.push("Email address");
  if (!lead.serviceInterest) missing.push("Specific service interest");
  if (!lead.budgetSignal && lead.quotedPrice === undefined) missing.push("Budget or price response");
  if (!lead.lastContactDate) missing.push("Last contact date");
  if (!lead.appointmentStatus) missing.push("Appointment status");
  return missing;
}

function priorityFor(score: number): RecoveryPriority {
  if (score >= 80) return "Critical";
  if (score >= 65) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function deadlineFor(priority: RecoveryPriority, recentlyContacted: boolean): string {
  if (recentlyContacted) return "Monitor — no immediate outreach";
  if (priority === "Critical") return "Today";
  if (priority === "High") return "Within 24 hours";
  if (priority === "Medium") return "Within 2 business days";
  return "Review this week";
}

function serviceSubject(lead: Lead): string {
  const service = lead.serviceInterest.trim();
  if (!service) return "your enquiry";
  const naturalCase = /^[A-Z]{2,}(?:\s|$)/.test(service)
    ? service
    : `${service[0].toLocaleLowerCase()}${service.slice(1)}`;
  return `the ${naturalCase}`;
}

function shortServiceReference(lead: Lead): string {
  const words = lead.serviceInterest.trim().toLocaleLowerCase().match(/[a-z0-9]+/g);
  return words?.length ? `the ${words[words.length - 1]}` : "your enquiry";
}

function hasPricingEvidence(lead: Lead): boolean {
  const recordText = [lead.enquiryText, lead.budgetSignal, lead.notes].join(" ");
  return lead.quotedPrice !== undefined || /\b(price|pricing|cost|quote|quoted|budget)\b/i.test(recordText);
}

/**
 * Diagnosis-specific deterministic messages. Each statement is grounded in the
 * selected leakage diagnosis or the lead's verified service/pricing fields.
 */
export function generateRecoveryMessage(lead: Lead, leakageType: string): string {
  const firstName = lead.name.trim().split(/\s+/)[0] || "there";
  const subject = serviceSubject(lead);

  if (leakageType === "Overdue promised callback") {
    const pricingContext = hasPricingEvidence(lead) ? " and pricing" : "";
    return `Hi ${firstName}, I’m following up regarding ${subject}. We had planned to reconnect, and I’m sorry the callback was delayed. I’d be happy to continue the discussion and answer any questions about ${shortServiceReference(lead)}${pricingContext}. Would a quick call today or tomorrow work better for you?`;
  }

  if (leakageType === "Appointment requested, not booked") {
    return `Hi ${firstName}, I’m following up regarding ${subject}. Your appointment request was not completed, and I’m sorry we didn’t help close the loop sooner. Would you like to choose a suitable time to continue?`;
  }

  if (leakageType === "Missed appointment without re-engagement") {
    return `Hi ${firstName}, I’m following up regarding ${subject}. I can see the appointment was missed and that we haven’t reconnected since. Would you like to arrange a new time?`;
  }

  if (leakageType === "Price objection stalled") {
    return `Hi ${firstName}, I’m following up regarding ${subject}. I understand pricing was a concern, and I’m sorry the conversation stalled. I’d be happy to clarify what is included. Would you like to review it together?`;
  }

  if (leakageType === "Interested lead left waiting") {
    return `Hi ${firstName}, thank you for your interest in ${subject}. I’m sorry we didn’t follow up sooner. I’d be happy to help with the next step. Would you like to continue the conversation?`;
  }

  if (leakageType === "Repeated no-response") {
    return `Hi ${firstName}, I’m making one final, low-pressure follow-up regarding ${subject}. I haven’t heard back after our previous follow-ups, so I’ll pause outreach after this message. Would you like to continue the conversation?`;
  }

  if (leakageType === "Needs clarification") {
    const context = lead.serviceInterest
      ? ` thanks for your enquiry about ${subject}.`
      : " thanks for reaching out.";
    return `Hi ${firstName},${context} I need one detail before I can suggest a relevant next step. What outcome would you like help with?`;
  }

  if (
    leakageType === "Recently contacted — monitor" ||
    leakageType === "Recently contacted — no immediate outreach"
  ) {
    return `No message recommended yet. ${firstName} was contacted recently, so allow time for a response before preparing another follow-up.`;
  }

  return `Hi ${firstName}, I’m following up regarding ${subject}. I’m sorry we didn’t reconnect sooner. Would you like to continue the conversation?`;
}

/** Deterministic Phase 1 analysis. See docs/scoring-methodology.md for the point table. */
export function analyzeLead(lead: Lead, referenceDate = new Date()): LeadAnalysis {
  const text = combinedText(lead);
  const contactAge = daysSince(lead.lastContactDate, referenceDate);
  const intent = getIntent(lead, text);
  const confidence = getConfidence(lead);
  const appointment = lead.appointmentStatus.toLowerCase();
  const callbackPromised = /callback|call back|promised call/.test(text);
  const priceObjection = /too expensive|price objection|over budget|budget concern|cost concern/.test(text);
  const clarificationNeeded = !lead.serviceInterest || /clarif|not sure|more information|general enquiry/.test(text);
  const missedAppointment = /missed|no[- ]?show/.test(appointment);
  const appointmentRequested = /requested|pending|not booked/.test(appointment);
  const recentlyContacted = contactAge !== null && contactAge <= 1;
  const repeatedNoResponse = lead.followUpCount >= 3 && /no response|unresponsive|no reply/.test(text);

  let score = intent.level === "High" ? 42 : intent.level === "Medium" ? 27 : 12;
  if (contactAge === null) score += 5;
  else if (contactAge >= 8) score += 22;
  else if (contactAge >= 4) score += 14;
  else if (contactAge >= 2) score += 6;
  else score -= 18;
  if (callbackPromised && !recentlyContacted) score += 20;
  if (missedAppointment) score += 24;
  else if (appointmentRequested && !recentlyContacted) score += 17;
  if (/interested|qualified|hot|proposal/.test(lead.status.toLowerCase())) score += 10;
  if (priceObjection) score += 6;
  if (repeatedNoResponse) score += intent.level === "High" ? -4 : -14;
  if (!lead.phone && !lead.email) score -= 12;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let leakageType = "Follow-up gap";
  if (recentlyContacted) leakageType = "Recently contacted — monitor";
  else if (missedAppointment) leakageType = "Missed appointment without re-engagement";
  else if (callbackPromised) leakageType = "Overdue promised callback";
  else if (appointmentRequested) leakageType = "Appointment requested, not booked";
  else if (priceObjection) leakageType = "Price objection stalled";
  else if (repeatedNoResponse) leakageType = "Repeated no-response";
  else if (clarificationNeeded) leakageType = "Needs clarification";
  else if (/interested|qualified|hot|proposal/.test(lead.status.toLowerCase()) && (contactAge ?? 0) >= 4) {
    leakageType = "Interested lead left waiting";
  }

  const evidence: string[] = [];
  if (lead.serviceInterest) evidence.push(`Service interest recorded as “${lead.serviceInterest}”.`);
  if (intent.keyword) evidence.push(`Record contains buying-intent language: “${intent.keyword}”.`);
  if (lead.lastContactDate && contactAge !== null) {
    evidence.push(`Last contact was ${contactAge} day${contactAge === 1 ? "" : "s"} ago (${lead.lastContactDate}).`);
  } else evidence.push("No last contact date is recorded.");
  if (lead.appointmentStatus) evidence.push(`Appointment status is “${lead.appointmentStatus}”.`);
  if (callbackPromised) evidence.push("The record contains a promised callback or call-back note.");
  if (priceObjection) evidence.push("The record explicitly contains a price or budget concern.");
  if (lead.followUpCount > 0) evidence.push(`${lead.followUpCount} follow-up attempt${lead.followUpCount === 1 ? " is" : "s are"} recorded.`);
  if (!lead.phone && !lead.email) evidence.push("Neither a phone number nor email address is recorded.");
  if (evidence.length === 1 && lead.status) evidence.push(`Pipeline status is “${lead.status}”.`);

  let recommendedNextAction = "Send a short, context-aware check-in and ask one clear question.";
  if (leakageType === "Recently contacted — monitor") recommendedNextAction = "Do not chase yet; review the lead after the current response window.";
  else if (leakageType === "Missed appointment without re-engagement") recommendedNextAction = "Offer a simple rebooking path without assuming why the appointment was missed.";
  else if (leakageType === "Overdue promised callback") recommendedNextAction = "Complete the promised callback and acknowledge the follow-up gap.";
  else if (leakageType === "Appointment requested, not booked") recommendedNextAction = "Offer two clear ways to continue booking the requested appointment.";
  else if (leakageType === "Repeated no-response") recommendedNextAction = "Make one final low-pressure attempt, then pause outreach if there is no response.";
  else if (leakageType === "Price objection stalled") recommendedNextAction = "Clarify value and scope without inventing a discount or changing the quoted price.";
  else if (leakageType === "Needs clarification") recommendedNextAction = "Ask one specific qualifying question before recommending a service.";

  const priority = priorityFor(score);
  const isFollowUpOverdue = !recentlyContacted && (callbackPromised || missedAppointment || appointmentRequested || (contactAge ?? 0) >= 4);
  const isAtRisk = missedAppointment || repeatedNoResponse || priceObjection || callbackPromised;
  let likelyObjection = "No explicit objection is recorded.";
  if (priceObjection) likelyObjection = "Price or budget concern is explicitly recorded.";
  else if (/timing concern|later this year|not now|too busy|bad timing/.test(text)) likelyObjection = "Timing concern is explicitly recorded.";
  else if (repeatedNoResponse) likelyObjection = "No objection is recorded; the lead has not responded to repeated follow-ups.";

  return {
    lead,
    recoveryPriority: priority,
    intentLevel: intent.level,
    recoveryScore: score,
    leakageType,
    evidence,
    confidence,
    recommendedNextAction,
    actionDeadline: deadlineFor(priority, recentlyContacted),
    likelyObjection,
    missingInformation: getMissingInformation(lead),
    recoveryMessage: generateRecoveryMessage(lead, leakageType),
    humanReviewRequired: true,
    daysSinceLastContact: contactAge,
    isFollowUpOverdue,
    isAtRisk,
  };
}

const PRIORITY_ORDER: Record<RecoveryPriority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const INTENT_ORDER: Record<IntentLevel, number> = { High: 3, Medium: 2, Low: 1 };
const CONFIDENCE_ORDER: Record<ConfidenceLevel, number> = { High: 3, Medium: 2, Low: 1 };

export function rankAnalyses(analyses: LeadAnalysis[]): LeadAnalysis[] {
  return [...analyses].sort((a, b) =>
    PRIORITY_ORDER[b.recoveryPriority] - PRIORITY_ORDER[a.recoveryPriority] ||
    INTENT_ORDER[b.intentLevel] - INTENT_ORDER[a.intentLevel] ||
    (b.daysSinceLastContact ?? -1) - (a.daysSinceLastContact ?? -1) ||
    Number(b.isAtRisk) - Number(a.isAtRisk) ||
    CONFIDENCE_ORDER[b.confidence] - CONFIDENCE_ORDER[a.confidence] ||
    a.lead.name.localeCompare(b.lead.name),
  );
}

export function summarizeAnalyses(analyses: LeadAnalysis[]) {
  const total = analyses.length;
  return {
    total,
    recoverNow: analyses.filter((item) => ["Critical", "High"].includes(item.recoveryPriority)).length,
    overdue: analyses.filter((item) => item.isFollowUpOverdue).length,
    atRisk: analyses.filter((item) => item.isAtRisk).length,
    averageScore: total ? Math.round(analyses.reduce((sum, item) => sum + item.recoveryScore, 0) / total) : 0,
  };
}
