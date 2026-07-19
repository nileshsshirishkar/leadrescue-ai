import type { LeadAnalysis } from "@/lib/types";

export interface OutreachPresentation {
  customerOutreachRecommended: boolean;
  heading: "Recommended action" | "Recovery message draft";
  statusLabel: "NO OUTREACH RECOMMENDED" | "HUMAN REVIEW REQUIRED";
  canCopyMessage: boolean;
  reviewInstruction: string;
}

type OutreachSignals = Pick<
  LeadAnalysis,
  "leakageType" | "recommendedNextAction" | "actionDeadline" | "recoveryMessage"
>;

function isNoOutreachCase(analysis: OutreachSignals): boolean {
  const action = analysis.recommendedNextAction.trim().toLocaleLowerCase();
  const deadline = analysis.actionDeadline.trim().toLocaleLowerCase();
  const message = analysis.recoveryMessage.trim().toLocaleLowerCase();

  return (
    analysis.leakageType === "Recently contacted — monitor" ||
    analysis.leakageType === "Recently contacted — no immediate outreach" ||
    deadline.includes("no immediate outreach") ||
    action.startsWith("do not chase") ||
    action.startsWith("do not contact") ||
    action.startsWith("do not send") ||
    message.startsWith("no message recommended")
  );
}

export function getOutreachPresentation(analysis: OutreachSignals): OutreachPresentation {
  if (isNoOutreachCase(analysis)) {
    return {
      customerOutreachRecommended: false,
      heading: "Recommended action",
      statusLabel: "NO OUTREACH RECOMMENDED",
      canCopyMessage: false,
      reviewInstruction: "Review after the current response window.",
    };
  }

  return {
    customerOutreachRecommended: true,
    heading: "Recovery message draft",
    statusLabel: "HUMAN REVIEW REQUIRED",
    canCopyMessage: true,
    reviewInstruction: "Review facts and tone before sending.",
  };
}
