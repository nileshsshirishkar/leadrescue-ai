import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  persistTenantLead: vi.fn(),
  readTenantLeads: vi.fn(),
}));

vi.mock("@/lib/supabase/tenant-lead-write", () => ({
  persistTenantLead: mocks.persistTenantLead,
}));

vi.mock("@/lib/supabase/tenant-leads", () => ({
  readTenantLeads: mocks.readTenantLeads,
}));

import { POST } from "@/app/api/leads/route";

const leadId = "207357a1-94e4-4184-a8c8-6f16773a5ea5";

function request(body: string): Request {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("POST /api/leads", () => {
  beforeEach(() => {
    mocks.persistTenantLead.mockReset();
    mocks.readTenantLeads.mockReset();
  });

  it("returns 201 for a newly created lead", async () => {
    mocks.persistTenantLead.mockResolvedValue({ status: "created", leadId });

    const response = await POST(
      request(
        JSON.stringify({
          fullName: "Fictional QA Lead",
          source: "manual_csv",
          sourceExternalId: "qa-app-write-001",
        }),
      ),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(readJson(response)).resolves.toEqual({
      ok: true,
      result: "created",
      leadId,
    });
  });

  it("returns 200 for an idempotent existing lead", async () => {
    mocks.persistTenantLead.mockResolvedValue({ status: "existing", leadId });

    const response = await POST(request(JSON.stringify({ test: true })));

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({
      ok: true,
      result: "existing",
      leadId,
    });
  });

  it("rejects invalid JSON before persistence", async () => {
    const response = await POST(request("{"));

    expect(response.status).toBe(400);
    expect(mocks.persistTenantLead).not.toHaveBeenCalled();
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Invalid JSON body.",
    });
  });

  it("maps invalid payloads to a sanitized 400", async () => {
    mocks.persistTenantLead.mockResolvedValue({ status: "invalid" });

    const response = await POST(request(JSON.stringify({ test: true })));

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Invalid lead payload.",
    });
  });

  it("maps unauthenticated access to 401", async () => {
    mocks.persistTenantLead.mockResolvedValue({ status: "unauthenticated" });

    const response = await POST(request(JSON.stringify({ test: true })));

    expect(response.status).toBe(401);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Authentication required.",
    });
  });

  it("maps ambiguous membership to 409", async () => {
    mocks.persistTenantLead.mockResolvedValue({ status: "ambiguous-membership" });

    const response = await POST(request(JSON.stringify({ test: true })));

    expect(response.status).toBe(409);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Organization selection is required.",
    });
  });

  it("sanitizes database failures as 503", async () => {
    mocks.persistTenantLead.mockResolvedValue({ status: "unavailable" });

    const response = await POST(request(JSON.stringify({ test: true })));

    expect(response.status).toBe(503);
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Lead could not be saved.",
    });
  });
});
