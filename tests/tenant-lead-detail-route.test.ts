import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readTenantLeadDetail: vi.fn(),
  updateTenantLeadWorkflow: vi.fn(),
}));

vi.mock("@/lib/supabase/tenant-lead-detail", () => ({
  readTenantLeadDetail: mocks.readTenantLeadDetail,
}));

vi.mock("@/lib/supabase/tenant-lead-workflow", () => ({
  updateTenantLeadWorkflow: mocks.updateTenantLeadWorkflow,
}));

import { GET, PATCH } from "@/app/api/leads/[leadId]/route";

const leadId = "207357a1-94e4-4184-a8c8-6f16773a5ea5";

function context(id = leadId) {
  return { params: Promise.resolve({ leadId: id }) };
}

function patchRequest(body: string): Request {
  return new Request(`http://localhost/api/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("GET /api/leads/[leadId]", () => {
  beforeEach(() => {
    mocks.readTenantLeadDetail.mockReset();
    mocks.updateTenantLeadWorkflow.mockReset();
  });

  it("returns tenant lead and contact detail", async () => {
    const lead = { id: leadId, organization_id: "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed" };
    const contact = { id: "24d26c27-b8fa-415c-8e57-29d34745f247", full_name: "Avery Example" };
    mocks.readTenantLeadDetail.mockResolvedValue({
      status: "ok",
      organizationId: "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed",
      lead,
      contact,
    });

    const response = await GET(
      new Request(`http://localhost/api/leads/${leadId}`),
      context(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(readJson(response)).resolves.toEqual({
      ok: true,
      organizationId: "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed",
      lead,
      contact,
    });
  });

  it("maps tenant-invisible and invalid ids to the same sanitized 404", async () => {
    mocks.readTenantLeadDetail.mockResolvedValue({ status: "not-found" });

    const response = await GET(
      new Request("http://localhost/api/leads/not-a-uuid"),
      context("not-a-uuid"),
    );

    expect(response.status).toBe(404);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Lead not found.",
    });
  });

  it("maps unauthenticated access to 401", async () => {
    mocks.readTenantLeadDetail.mockResolvedValue({ status: "unauthenticated" });
    const response = await GET(new Request(`http://localhost/api/leads/${leadId}`), context());
    expect(response.status).toBe(401);
  });

  it("maps missing membership to 403", async () => {
    mocks.readTenantLeadDetail.mockResolvedValue({ status: "missing-membership" });
    const response = await GET(new Request(`http://localhost/api/leads/${leadId}`), context());
    expect(response.status).toBe(403);
  });

  it("maps ambiguous membership to 409", async () => {
    mocks.readTenantLeadDetail.mockResolvedValue({ status: "ambiguous-membership" });
    const response = await GET(new Request(`http://localhost/api/leads/${leadId}`), context());
    expect(response.status).toBe(409);
  });

  it("maps unavailable reads to sanitized 503", async () => {
    mocks.readTenantLeadDetail.mockResolvedValue({ status: "unavailable" });
    const response = await GET(new Request(`http://localhost/api/leads/${leadId}`), context());
    expect(response.status).toBe(503);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Lead detail is unavailable.",
    });
  });
});

describe("PATCH /api/leads/[leadId]", () => {
  beforeEach(() => {
    mocks.readTenantLeadDetail.mockReset();
    mocks.updateTenantLeadWorkflow.mockReset();
  });

  it("returns the persisted workflow result", async () => {
    const result = {
      lead_id: leadId,
      status: "Qualified",
      notes: "Client confirmed fit.",
      completed_task_count: 1,
      new_task_id: "33333333-3333-4333-8333-333333333333",
      next_follow_up_at: "2026-08-26T10:00:00+05:30",
      reopened: false,
    };
    mocks.updateTenantLeadWorkflow.mockResolvedValue({ status: "ok", result });

    const response = await PATCH(
      patchRequest(JSON.stringify({
        status: "Qualified",
        notes: "Client confirmed fit.",
        nextFollowUpAt: "2026-08-26T10:00:00+05:30",
      })),
      context(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(readJson(response)).resolves.toEqual({ ok: true, result });
  });

  it("rejects invalid JSON before mutation", async () => {
    const response = await PATCH(patchRequest("{"), context());
    expect(response.status).toBe(400);
    expect(mocks.updateTenantLeadWorkflow).not.toHaveBeenCalled();
  });

  it("maps invalid updates to 400", async () => {
    mocks.updateTenantLeadWorkflow.mockResolvedValue({ status: "invalid" });
    const response = await PATCH(patchRequest(JSON.stringify({ status: "No answer" })), context());
    expect(response.status).toBe(400);
  });

  it("maps terminal transition conflicts to 409", async () => {
    mocks.updateTenantLeadWorkflow.mockResolvedValue({ status: "invalid-transition" });
    const response = await PATCH(
      patchRequest(JSON.stringify({
        status: "Qualified",
        nextFollowUpAt: "2026-08-26T10:00:00+05:30",
      })),
      context(),
    );
    expect(response.status).toBe(409);
  });

  it("maps tenant-invisible leads to 404", async () => {
    mocks.updateTenantLeadWorkflow.mockResolvedValue({ status: "not-found" });
    const response = await PATCH(
      patchRequest(JSON.stringify({ status: "Won" })),
      context(),
    );
    expect(response.status).toBe(404);
  });

  it("maps unauthenticated updates to 401", async () => {
    mocks.updateTenantLeadWorkflow.mockResolvedValue({ status: "unauthenticated" });
    const response = await PATCH(patchRequest(JSON.stringify({ status: "Won" })), context());
    expect(response.status).toBe(401);
  });

  it("sanitizes unavailable update failures as 503", async () => {
    mocks.updateTenantLeadWorkflow.mockResolvedValue({ status: "unavailable" });
    const response = await PATCH(patchRequest(JSON.stringify({ status: "Won" })), context());
    expect(response.status).toBe(503);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Lead workflow could not be updated.",
    });
  });
});
