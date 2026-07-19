import { describe, expect, it } from "vitest";
import { getSampleLeads } from "@/data/sample-leads";
import { getOutreachPresentation } from "@/lib/outreach";
import { analyzeLead } from "@/lib/scoring";

const referenceDate = new Date("2026-07-19T12:00:00.000Z");

function analyzeSample(id: string) {
  const lead = getSampleLeads(referenceDate).find((item) => item.id === id);
  if (!lead) throw new Error(`Missing sample lead ${id}`);
  return analyzeLead(lead, referenceDate);
}

describe("outreach presentation safety", () => {
  it("makes Lena's recently contacted case a non-copyable recommended action", () => {
    const analysis = analyzeSample("DEMO-011");
    const presentation = getOutreachPresentation(analysis);

    expect(analysis.leakageType).toBe("Recently contacted — monitor");
    expect(presentation).toEqual({
      customerOutreachRecommended: false,
      heading: "Recommended action",
      statusLabel: "NO OUTREACH RECOMMENDED",
      canCopyMessage: false,
      reviewInstruction: "Review after the current response window.",
    });
  });

  it("treats any explicit no-immediate-outreach action as non-copyable", () => {
    const presentation = getOutreachPresentation({
      leakageType: "Manual review hold",
      recommendedNextAction: "Wait for the active response window to close.",
      actionDeadline: "Monitor — no immediate outreach",
      recoveryMessage: "Internal review guidance only.",
    });

    expect(presentation.canCopyMessage).toBe(false);
    expect(presentation.heading).toBe("Recommended action");
    expect(presentation.statusLabel).toBe("NO OUTREACH RECOMMENDED");
  });

  it("keeps a genuine recovery message copyable and human-reviewed", () => {
    const analysis = analyzeSample("DEMO-004");
    const presentation = getOutreachPresentation(analysis);

    expect(analysis.leakageType).toBe("Overdue promised callback");
    expect(presentation).toEqual({
      customerOutreachRecommended: true,
      heading: "Recovery message draft",
      statusLabel: "HUMAN REVIEW REQUIRED",
      canCopyMessage: true,
      reviewInstruction: "Review facts and tone before sending.",
    });
  });
});
