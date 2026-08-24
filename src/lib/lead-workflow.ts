import { z } from "zod";

export const LEAD_STATUSES = [
  "New",
  "Follow-up needed",
  "Interested",
  "Qualified",
  "Appointment booked",
  "Won",
  "Lost",
] as const;

export const ACTIVE_LEAD_STATUSES = [
  "New",
  "Follow-up needed",
  "Interested",
  "Qualified",
  "Appointment booked",
] as const;

export const TERMINAL_LEAD_STATUSES = ["Won", "Lost"] as const;

export const leadStatusSchema = z.enum(LEAD_STATUSES);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export function isTerminalLeadStatus(status: LeadStatus): boolean {
  return (TERMINAL_LEAD_STATUSES as readonly string[]).includes(status);
}

export const leadWorkflowUpdateInputSchema = z
  .object({
    status: leadStatusSchema,
    notes: z.string().max(5_000).optional(),
    nextFollowUpAt: z.string().datetime({ offset: true }).nullable().optional(),
    reopen: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    const terminal = isTerminalLeadStatus(value.status);

    if (terminal && value.nextFollowUpAt) {
      ctx.addIssue({
        code: "custom",
        path: ["nextFollowUpAt"],
        message: "Terminal leads cannot have a next follow-up task.",
      });
    }

    if (!terminal && !value.nextFollowUpAt) {
      ctx.addIssue({
        code: "custom",
        path: ["nextFollowUpAt"],
        message: "Active leads require a next follow-up date.",
      });
    }

    if (value.reopen && value.status !== "Follow-up needed") {
      ctx.addIssue({
        code: "custom",
        path: ["reopen"],
        message: "Reopened leads must return to Follow-up needed.",
      });
    }
  });

export type LeadWorkflowUpdateInput = z.infer<typeof leadWorkflowUpdateInputSchema>;
