import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  importTenantCsvRows: vi.fn(),
}));

vi.mock("@/lib/supabase/csv-import", () => ({
  importTenantCsvRows: mocks.importTenantCsvRows,
}));

import { POST } from "@/app/api/imports/csv/route";

function request(body: string): Request {
  return new Request("http://localhost/api/imports/csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("POST /api/imports/csv", () => {
  beforeEach(() => mocks.importTenantCsvRows.mockReset());

  it("returns a sanitized successful batch report", async () => {
    mocks.importTenantCsvRows.mockResolvedValue({
      status: "ok",
      importId: "11111111-1111-4111-8111-111111111111",
      rows: [
        { rowNumber: 2, status: "created", leadId: "207357a1-94e4-4184-a8c8-6f16773a5ea5" },
        { rowNumber: 3, status: "error" },
      ],
      created: 1,
      existing: 0,
      errors: 1,
    });

    const response = await POST(request(JSON.stringify({ importId: "test", rows: [] })));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: "ok",
      created: 1,
      existing: 0,
      errors: 1,
    });
  });

  it("rejects invalid JSON before orchestration", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect(mocks.importTenantCsvRows).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Invalid JSON body." });
  });

  it("maps validation and auth failures without exposing internals", async () => {
    mocks.importTenantCsvRows.mockResolvedValueOnce({ status: "invalid" });
    let response = await POST(request("{}"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Invalid CSV import payload." });

    mocks.importTenantCsvRows.mockResolvedValueOnce({ status: "unauthenticated" });
    response = await POST(request("{}"));
    expect(response.status).toBe(401);

    mocks.importTenantCsvRows.mockResolvedValueOnce({ status: "ambiguous-membership" });
    response = await POST(request("{}"));
    expect(response.status).toBe(409);

    mocks.importTenantCsvRows.mockResolvedValueOnce({ status: "unavailable" });
    response = await POST(request("{}"));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "CSV import is temporarily unavailable." });
  });
});
