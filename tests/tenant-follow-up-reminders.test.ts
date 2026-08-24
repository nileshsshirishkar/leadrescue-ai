import { describe, expect, it, vi } from "vitest";
import { readTenantFollowUpReminders } from "@/lib/supabase/tenant-follow-up-reminders";

const organizationId = "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed";
const leadId = "207357a1-94e4-4184-a8c8-6f16773a5ea5";
const contactId = "24d26c27-b8fa-415c-8e57-29d34745f247";
const taskId = "9546f4e7-506a-4e1b-b03a-3128559db4c2";
const userId = "ad158922-18f8-41dc-8a8e-106d6cf03c64";

function okContext() {
  return {
    status: "ok" as const,
    context: {
      organization: { id: organizationId, name: "LeadRescue QA", slug: "leadrescue-qa" },
      role: "owner" as const,
    },
  };
}

function dependencies(dueAt: string) {
  return {
    resolveContext: vi.fn().mockResolvedValue(okContext()),
    now: vi.fn(() => new Date("2026-08-25T00:00:00.000Z")),
    listTasks: vi.fn().mockResolvedValue([
      {
        id: taskId,
        organization_id: organizationId,
        lead_id: leadId,
        assigned_to: userId,
        due_at: dueAt,
        status: "pending",
        task_type: "lead_follow_up",
        channel: null,
        created_at: "2026-08-24T00:00:00.000Z",
        updated_at: "2026-08-24T00:00:00.000Z",
      },
    ]),
    listLeads: vi.fn().mockResolvedValue([
      {
        id: leadId,
        organization_id: organizationId,
        contact_id: contactId,
        status: "Follow-up needed",
        service_interest: "Annual maintenance plan",
      },
    ]),
    listContacts: vi.fn().mockResolvedValue([
      {
        id: contactId,
        organization_id: organizationId,
        full_name: "Avery Example",
        phone_raw: "+1 202-555-0123",
        phone_e164: "+12025550123",
        email: "avery.leadread@example.com",
      },
    ]),
  };
}

describe("readTenantFollowUpReminders", () => {
  it.each([
    ["2026-08-24T23:59:59.000Z", "overdue"],
    ["2026-08-25T12:00:00.000Z", "due"],
    ["2026-08-27T00:00:00.000Z", "upcoming"],
  ] as const)("classifies %s as %s", async (dueAt, bucket) => {
    const deps = dependencies(dueAt);
    const result = await readTenantFollowUpReminders(deps);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("Expected ok reminder result");
    expect(result.generatedAt).toBe("2026-08-25T00:00:00.000Z");
    expect(result.reminders).toEqual([
      {
        taskId,
        leadId,
        dueAt,
        bucket,
        taskType: "lead_follow_up",
        channel: null,
        assignedTo: userId,
        leadStatus: "Follow-up needed",
        serviceInterest: "Annual maintenance plan",
        contact: {
          fullName: "Avery Example",
          phone: "+12025550123",
          email: "avery.leadread@example.com",
        },
      },
    ]);
    expect(deps.listTasks).toHaveBeenCalledWith(organizationId);
    expect(deps.listLeads).toHaveBeenCalledWith(organizationId, [leadId]);
    expect(deps.listContacts).toHaveBeenCalledWith(organizationId, [contactId]);
  });

  it("returns an empty reminder list without lead/contact queries when no tasks exist", async () => {
    const deps = dependencies("2026-08-25T12:00:00.000Z");
    deps.listTasks.mockResolvedValue([]);
    deps.listLeads.mockResolvedValue([]);
    deps.listContacts.mockResolvedValue([]);

    const result = await readTenantFollowUpReminders(deps);

    expect(result).toEqual({
      status: "ok",
      organizationId,
      generatedAt: "2026-08-25T00:00:00.000Z",
      reminders: [],
    });
    expect(deps.listLeads).toHaveBeenCalledWith(organizationId, []);
    expect(deps.listContacts).toHaveBeenCalledWith(organizationId, []);
  });

  it("fails closed when a task belongs to another organization", async () => {
    const deps = dependencies("2026-08-25T12:00:00.000Z");
    deps.listTasks.mockResolvedValue([
      {
        id: taskId,
        organization_id: "82000000-0000-4000-8000-000000000001",
        lead_id: leadId,
        assigned_to: userId,
        due_at: "2026-08-25T12:00:00.000Z",
        status: "pending",
        task_type: "lead_follow_up",
        channel: null,
        created_at: "2026-08-24T00:00:00.000Z",
        updated_at: "2026-08-24T00:00:00.000Z",
      },
    ]);

    await expect(readTenantFollowUpReminders(deps)).resolves.toEqual({ status: "unavailable" });
    expect(deps.listLeads).not.toHaveBeenCalled();
  });

  it("fails closed when a referenced lead is missing", async () => {
    const deps = dependencies("2026-08-25T12:00:00.000Z");
    deps.listLeads.mockResolvedValue([]);

    await expect(readTenantFollowUpReminders(deps)).resolves.toEqual({ status: "unavailable" });
    expect(deps.listContacts).not.toHaveBeenCalled();
  });

  it("short-circuits unauthenticated access", async () => {
    const deps = dependencies("2026-08-25T12:00:00.000Z");
    deps.resolveContext.mockResolvedValue({ status: "unauthenticated" });

    await expect(readTenantFollowUpReminders(deps)).resolves.toEqual({ status: "unauthenticated" });
    expect(deps.listTasks).not.toHaveBeenCalled();
  });
});
