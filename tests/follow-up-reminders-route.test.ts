import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readTenantFollowUpReminders: vi.fn(),
}));

vi.mock("@/lib/supabase/tenant-follow-up-reminders", () => ({
  readTenantFollowUpReminders: mocks.readTenantFollowUpReminders,
}));

import { GET } from "@/app/api/follow-up-reminders/route";

const organizationId = "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed";
const taskId = "9546f4e7-506a-4e1b-b03a-3128559db4c2";
const leadId = "207357a1-94e4-4184-a8c8-6f16773a5ea5";

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("GET /api/follow-up-reminders", () => {
  beforeEach(() => {
    mocks.readTenantFollowUpReminders.mockReset();
  });

  it("returns tenant reminders with private no-store caching", async () => {
    mocks.readTenantFollowUpReminders.mockResolvedValue({
      status: "ok",
      organizationId,
      generatedAt: "2026-08-25T00:00:00.000Z",
      reminders: [
        {
          taskId,
          leadId,
          dueAt: "2026-08-25T12:00:00.000Z",
          bucket: "due",
          taskType: "lead_follow_up",
          channel: null,
          assignedTo: null,
          leadStatus: "Follow-up needed",
          serviceInterest: "Annual maintenance plan",
          contact: { fullName: "Avery Example", phone: "+12025550123", email: null },
        },
      ],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(json(response)).resolves.toEqual({
      ok: true,
      organizationId,
      generatedAt: "2026-08-25T00:00:00.000Z",
      reminders: [
        {
          taskId,
          leadId,
          dueAt: "2026-08-25T12:00:00.000Z",
          bucket: "due",
          taskType: "lead_follow_up",
          channel: null,
          assignedTo: null,
          leadStatus: "Follow-up needed",
          serviceInterest: "Annual maintenance plan",
          contact: { fullName: "Avery Example", phone: "+12025550123", email: null },
        },
      ],
    });
  });

  it.each([
    ["unauthenticated", 401, "Authentication required."],
    ["missing-membership", 403, "Organization access is not configured."],
    ["ambiguous-membership", 409, "Organization selection is required."],
    ["unavailable", 503, "Follow-up reminders are unavailable."],
  ] as const)("maps %s to %s", async (status, expectedStatus, error) => {
    mocks.readTenantFollowUpReminders.mockResolvedValue({ status });

    const response = await GET();

    expect(response.status).toBe(expectedStatus);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(json(response)).resolves.toEqual({ ok: false, error });
  });
});
