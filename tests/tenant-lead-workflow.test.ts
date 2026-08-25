import { describe, expect, it } from "vitest";
import {
  updateTenantLeadWorkflow,
  type TenantLeadWorkflowDependencies,
} from "@/lib/supabase/tenant-lead-workflow";

const organizationId = "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed";
const leadId = "207357a1-94e4-4184-a8c8-6f16773a5ea5";
const taskId = "33333333-3333-4333-8333-333333333333";

function createDependencies(
  overrides: Partial<TenantLeadWorkflowDependencies> = {},
): TenantLeadWorkflowDependencies {
  return {
    resolveContext: async () => ({
      status: "ok",
      context: {
        organization: {
          id: organizationId,
          name: "LeadRescue QA",
          slug: "leadrescue-qa",
          access_status: "active",
        },
        role: "owner",
      },
    }),
    mutateLead: async (_id, input) => [
      {
        lead_id: leadId,
        status: input.status,
        notes: input.notes ?? "Existing notes",
        completed_task_count: 1,
        new_task_id: input.status === "Won" || input.status === "Lost" ? null : taskId,
        next_follow_up_at: input.nextFollowUpAt ?? null,
        reopened: input.reopen,
      },
    ],
    ...overrides,
  };
}

describe("updateTenantLeadWorkflow", () => {
  it("updates an active lead and returns the replacement follow-up task", async () => {
    const nextFollowUpAt = "2026-08-26T10:00:00+05:30";
    const result = await updateTenantLeadWorkflow(
      leadId,
      {
        status: "Qualified",
        notes: "Client confirmed fit.",
        nextFollowUpAt,
      },
      createDependencies(),
    );

    expect(result).toEqual({
      status: "ok",
      result: {
        lead_id: leadId,
        status: "Qualified",
        notes: "Client confirmed fit.",
        completed_task_count: 1,
        new_task_id: taskId,
        next_follow_up_at: nextFollowUpAt,
        reopened: false,
      },
    });
  });

  it("allows terminal outcomes without a new follow-up task", async () => {
    const result = await updateTenantLeadWorkflow(
      leadId,
      { status: "Won", notes: "Converted." },
      createDependencies(),
    );

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.result.new_task_id).toBeNull();
      expect(result.result.next_follow_up_at).toBeNull();
    }
  });

  it("requires active statuses to have a next follow-up date", async () => {
    await expect(
      updateTenantLeadWorkflow(
        leadId,
        { status: "Interested" },
        createDependencies(),
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("rejects a follow-up date on a terminal outcome", async () => {
    await expect(
      updateTenantLeadWorkflow(
        leadId,
        {
          status: "Lost",
          nextFollowUpAt: "2026-08-26T10:00:00+05:30",
        },
        createDependencies(),
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("rejects an unapproved status", async () => {
    await expect(
      updateTenantLeadWorkflow(
        leadId,
        {
          status: "No answer",
          nextFollowUpAt: "2026-08-26T10:00:00+05:30",
        },
        createDependencies(),
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("requires explicit reopen to target Follow-up needed", async () => {
    await expect(
      updateTenantLeadWorkflow(
        leadId,
        {
          status: "Qualified",
          reopen: true,
          nextFollowUpAt: "2026-08-26T10:00:00+05:30",
        },
        createDependencies(),
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("passes through fail-closed organization context before mutation", async () => {
    let mutated = false;
    const result = await updateTenantLeadWorkflow(
      leadId,
      {
        status: "Follow-up needed",
        nextFollowUpAt: "2026-08-26T10:00:00+05:30",
      },
      createDependencies({
        resolveContext: async () => ({ status: "ambiguous-membership" }),
        mutateLead: async () => {
          mutated = true;
          return [];
        },
      }),
    );

    expect(result).toEqual({ status: "ambiguous-membership" });
    expect(mutated).toBe(false);
  });

  it("returns not-found when the authenticated tenant cannot see the lead", async () => {
    await expect(
      updateTenantLeadWorkflow(
        leadId,
        {
          status: "Follow-up needed",
          nextFollowUpAt: "2026-08-26T10:00:00+05:30",
        },
        createDependencies({ mutateLead: async () => [] }),
      ),
    ).resolves.toEqual({ status: "not-found" });
  });

  it("fails closed on malformed mutation output", async () => {
    await expect(
      updateTenantLeadWorkflow(
        leadId,
        {
          status: "Follow-up needed",
          nextFollowUpAt: "2026-08-26T10:00:00+05:30",
        },
        createDependencies({ mutateLead: async () => [{ lead_id: leadId }] }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });
});
