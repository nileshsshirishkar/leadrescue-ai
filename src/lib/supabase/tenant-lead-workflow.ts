import { z } from "zod";
import {
  leadWorkflowUpdateInputSchema,
  leadStatusSchema,
  type LeadWorkflowUpdateInput,
} from "@/lib/lead-workflow";
import { resolveOrganizationContext } from "@/lib/supabase/organization-context";
import { createClient } from "@/lib/supabase/server";

const leadIdSchema = z.string().uuid();

const workflowMutationRowSchema = z
  .object({
    lead_id: z.string().uuid(),
    status: leadStatusSchema,
    notes: z.string(),
    completed_task_count: z.number().int().nonnegative(),
    new_task_id: z.string().uuid().nullable(),
    next_follow_up_at: z.string().nullable(),
    reopened: z.boolean(),
  })
  .strict();

export type TenantLeadWorkflowUpdate = z.infer<typeof workflowMutationRowSchema>;

export type TenantLeadWorkflowUpdateResult =
  | { status: "ok"; result: TenantLeadWorkflowUpdate }
  | { status: "invalid" }
  | { status: "invalid-transition" }
  | { status: "not-found" }
  | { status: "unauthenticated" }
  | { status: "missing-membership" }
  | { status: "ambiguous-membership" }
  | { status: "unavailable" };

class WorkflowMutationError extends Error {
  constructor(public readonly code: string | undefined) {
    super("Lead workflow mutation failed");
  }
}

export interface TenantLeadWorkflowDependencies {
  resolveContext: typeof resolveOrganizationContext;
  mutateLead(leadId: string, input: LeadWorkflowUpdateInput): Promise<unknown>;
}

async function createDefaultDependencies(): Promise<TenantLeadWorkflowDependencies> {
  const supabase = await createClient();

  return {
    resolveContext: resolveOrganizationContext,
    async mutateLead(leadId, input) {
      const { data, error } = await supabase.rpc("update_lead_workflow", {
        p_lead_id: leadId,
        p_status: input.status,
        p_notes: input.notes ?? null,
        p_next_follow_up_at: input.nextFollowUpAt ?? null,
        p_reopen: input.reopen,
      });

      if (error) throw new WorkflowMutationError(error.code);
      return data ?? [];
    },
  };
}

export async function updateTenantLeadWorkflow(
  leadId: string,
  input: unknown,
  dependencies?: TenantLeadWorkflowDependencies,
): Promise<TenantLeadWorkflowUpdateResult> {
  const parsedLeadId = leadIdSchema.safeParse(leadId);
  const parsedInput = leadWorkflowUpdateInputSchema.safeParse(input);
  if (!parsedLeadId.success || !parsedInput.success) return { status: "invalid" };

  try {
    const effectiveDependencies = dependencies ?? (await createDefaultDependencies());
    const contextResult = await effectiveDependencies.resolveContext();
    if (contextResult.status !== "ok") return contextResult;

    const rows = z
      .array(workflowMutationRowSchema)
      .max(1)
      .safeParse(
        await effectiveDependencies.mutateLead(parsedLeadId.data, parsedInput.data),
      );

    if (!rows.success) return { status: "unavailable" };
    if (rows.data.length === 0) return { status: "not-found" };

    const result = rows.data[0];
    if (result.lead_id !== parsedLeadId.data) return { status: "unavailable" };

    return { status: "ok", result };
  } catch (error) {
    if (error instanceof WorkflowMutationError && error.code === "22023") {
      return { status: "invalid-transition" };
    }
    return { status: "unavailable" };
  }
}
