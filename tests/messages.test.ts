import { describe, expect, it } from "vitest";
import { getSampleLeads } from "@/data/sample-leads";
import { analyzeLead } from "@/lib/scoring";
import type { Lead } from "@/lib/types";

const referenceDate = new Date("2026-07-19T12:00:00.000Z");

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "MESSAGE-TEST",
    name: "Jordan Vale",
    businessType: "Digital agency",
    phone: "+1 202-555-0198",
    email: "jordan.vale@example.com",
    serviceInterest: "Website audit",
    source: "Website",
    status: "New",
    enquiryText: "Interested in a website audit for a small service business.",
    lastContactDate: "2026-07-10",
    followUpCount: 0,
    appointmentStatus: "",
    quotedPrice: undefined,
    budgetSignal: "",
    notes: "",
    ...overrides,
  };
}

function questionCount(message: string): number {
  return (message.match(/\?/g) ?? []).length;
}

describe("diagnosis-specific recovery messages", () => {
  it("produces the evidence-led Leo Mercer callback message", () => {
    const leo = getSampleLeads(referenceDate).find((item) => item.id === "DEMO-004");
    expect(leo).toBeDefined();

    const result = analyzeLead(leo!, referenceDate);
    expect(result.leakageType).toBe("Overdue promised callback");
    expect(result.recoveryMessage).toBe(
      "Hi Leo, I’m following up regarding the paid search audit. We had planned to reconnect, and I’m sorry the callback was delayed. I’d be happy to continue the discussion and answer any questions about the audit and pricing. Would a quick call today or tomorrow work better for you?",
    );
    expect(result.humanReviewRequired).toBe(true);
  });

  it("omits pricing from callback drafts when the record has no pricing evidence", () => {
    const result = analyzeLead(lead({
      notes: "A callback was promised for the next afternoon; no later activity is recorded.",
    }), referenceDate);

    expect(result.leakageType).toBe("Overdue promised callback");
    expect(result.recoveryMessage).toContain("the website audit");
    expect(result.recoveryMessage.toLowerCase()).not.toContain("pricing");
    expect(questionCount(result.recoveryMessage)).toBe(1);
  });

  it("reflects an appointment request that was not completed", () => {
    const result = analyzeLead(lead({ appointmentStatus: "Requested — not booked" }), referenceDate);
    expect(result.leakageType).toBe("Appointment requested, not booked");
    expect(result.recoveryMessage).toContain("Your appointment request was not completed");
    expect(result.recoveryMessage).toMatch(/choose a suitable time to continue\?$/);
  });

  it("re-engages a missed appointment without inventing a reason", () => {
    const result = analyzeLead(lead({ appointmentStatus: "Missed appointment" }), referenceDate);
    expect(result.leakageType).toBe("Missed appointment without re-engagement");
    expect(result.recoveryMessage).toContain("the appointment was missed");
    expect(result.recoveryMessage.toLowerCase()).not.toMatch(/because|reason|why/);
    expect(result.recoveryMessage).toMatch(/arrange a new time\?$/);
  });

  it("addresses only the recorded price concern", () => {
    const result = analyzeLead(lead({
      budgetSignal: "Price objection — over budget",
      notes: "The record contains a price concern.",
    }), referenceDate);
    expect(result.leakageType).toBe("Price objection stalled");
    expect(result.recoveryMessage).toContain("pricing was a concern");
    expect(result.recoveryMessage.toLowerCase()).not.toContain("discount");
    expect(result.recoveryMessage).not.toMatch(/[$€£]\s?\d/);
    expect(questionCount(result.recoveryMessage)).toBe(1);
  });

  it("takes responsibility for leaving an interested lead waiting", () => {
    const result = analyzeLead(lead({ status: "Interested" }), referenceDate);
    expect(result.leakageType).toBe("Interested lead left waiting");
    expect(result.recoveryMessage).toContain("I’m sorry we didn’t follow up sooner");
    expect(result.recoveryMessage).toMatch(/continue the conversation\?$/);
  });

  it("makes a final low-pressure attempt after repeated no-response", () => {
    const result = analyzeLead(lead({
      followUpCount: 4,
      notes: "Four follow-ups were sent with no reply.",
    }), referenceDate);
    expect(result.leakageType).toBe("Repeated no-response");
    expect(result.recoveryMessage).toContain("final, low-pressure follow-up");
    expect(result.recoveryMessage).toContain("pause outreach after this message");
    expect(result.recoveryMessage.toLowerCase()).not.toContain("objection");
    expect(questionCount(result.recoveryMessage)).toBe(1);
  });

  it("asks one qualifying question when clarification is required", () => {
    const result = analyzeLead(lead({
      serviceInterest: "",
      enquiryText: "Please send more information.",
      lastContactDate: "2026-07-16",
    }), referenceDate);
    expect(result.leakageType).toBe("Needs clarification");
    expect(result.recoveryMessage).toContain("I need one detail before I can suggest a relevant next step");
    expect(result.recoveryMessage).toMatch(/What outcome would you like help with\?$/);
    expect(questionCount(result.recoveryMessage)).toBe(1);
  });

  it("recommends no outreach for a recently contacted lead", () => {
    const result = analyzeLead(lead({
      lastContactDate: "2026-07-19",
      status: "Contacted",
    }), referenceDate);
    expect(result.leakageType).toBe("Recently contacted — monitor");
    expect(result.recoveryMessage).toBe(
      "No message recommended yet. Jordan was contacted recently, so allow time for a response before preparing another follow-up.",
    );
    expect(questionCount(result.recoveryMessage)).toBe(0);
  });

  it("keeps every actionable draft concise, safe, and limited to one CTA", () => {
    const analyses = [
      analyzeLead(lead({ notes: "A callback was promised." }), referenceDate),
      analyzeLead(lead({ appointmentStatus: "Requested — not booked" }), referenceDate),
      analyzeLead(lead({ appointmentStatus: "Missed appointment" }), referenceDate),
      analyzeLead(lead({ budgetSignal: "Price objection — over budget" }), referenceDate),
      analyzeLead(lead({ status: "Interested" }), referenceDate),
      analyzeLead(lead({ followUpCount: 4, notes: "No reply after four follow-ups." }), referenceDate),
      analyzeLead(lead({ serviceInterest: "", enquiryText: "Need more information." }), referenceDate),
    ];

    for (const analysis of analyses) {
      expect(questionCount(analysis.recoveryMessage)).toBe(1);
      expect(analysis.recoveryMessage.length).toBeLessThan(360);
      expect(analysis.recoveryMessage.toLowerCase()).not.toMatch(/discount|guarantee|guaranteed results|special offer/);
      expect(analysis.humanReviewRequired).toBe(true);
    }
  });
});
