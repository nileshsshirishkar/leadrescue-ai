import { describe, expect, it } from "vitest";
import { analyzeLead, rankAnalyses } from "@/lib/scoring";
import type { Lead } from "@/lib/types";

const referenceDate = new Date("2026-07-19T12:00:00.000Z");

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "TEST-1",
    name: "Test Lead",
    businessType: "Aesthetic clinic",
    phone: "+1 202-555-0199",
    email: "test.lead@example.com",
    serviceInterest: "Skin consultation",
    source: "Website",
    status: "Interested",
    enquiryText: "Please share the price and availability for a consultation appointment.",
    lastContactDate: "2026-07-10",
    followUpCount: 0,
    appointmentStatus: "",
    quotedPrice: undefined,
    budgetSignal: "Asked about price",
    notes: "",
    ...overrides,
  };
}

describe("deterministic lead analysis", () => {
  it("makes a high-intent missed appointment critical and cites the record", () => {
    const result = analyzeLead(lead({ appointmentStatus: "Missed appointment" }), referenceDate);
    expect(result.intentLevel).toBe("High");
    expect(result.recoveryPriority).toBe("Critical");
    expect(result.leakageType).toBe("Missed appointment without re-engagement");
    expect(result.evidence).toContain("Appointment status is “Missed appointment”.");
    expect(result.humanReviewRequired).toBe(true);
  });

  it("does not chase a lead contacted today", () => {
    const result = analyzeLead(lead({ lastContactDate: "2026-07-19", status: "Contacted" }), referenceDate);
    expect(result.leakageType).toBe("Recently contacted — monitor");
    expect(result.actionDeadline).toBe("Monitor — no immediate outreach");
    expect(result.recoveryPriority).toBe("Low");
  });

  it("lowers confidence when contact details are missing", () => {
    const result = analyzeLead(lead({ phone: "", email: "" }), referenceDate);
    expect(result.confidence).toBe("Low");
    expect(result.missingInformation).toEqual(expect.arrayContaining(["Phone number", "Email address"]));
    expect(result.evidence).toContain("Neither a phone number nor email address is recorded.");
  });

  it("uses a safe price-objection template that ends in one question", () => {
    const result = analyzeLead(lead({ budgetSignal: "Price objection — over budget", notes: "Lead said it was too expensive." }), referenceDate);
    expect(result.leakageType).toBe("Price objection stalled");
    expect(result.recoveryMessage).toMatch(/\?$/);
    expect(result.recoveryMessage.toLowerCase()).not.toContain("discount");
    expect((result.recoveryMessage.match(/\?/g) ?? []).length).toBe(1);
  });

  it("does not turn an ordinary use of 'later' into a timing objection", () => {
    const result = analyzeLead(lead({ notes: "No later activity is recorded." }), referenceDate);
    expect(result.likelyObjection).toBe("No explicit objection is recorded.");
  });

  it("ranks urgent failures ahead of recent monitored leads", () => {
    const urgent = analyzeLead(lead({ id: "URGENT", appointmentStatus: "No-show" }), referenceDate);
    const recent = analyzeLead(lead({ id: "RECENT", lastContactDate: "2026-07-19", status: "Contacted" }), referenceDate);
    expect(rankAnalyses([recent, urgent]).map((item) => item.lead.id)).toEqual(["URGENT", "RECENT"]);
  });
});
