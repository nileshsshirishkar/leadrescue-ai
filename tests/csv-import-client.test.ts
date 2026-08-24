import { describe, expect, it, vi } from "vitest";
import { CsvImportRequestError, importCsvRows } from "@/lib/csv-import-client";
import type { Lead } from "@/lib/types";

function lead(index: number): Lead {
  return {
    id: `L-${index}`,
    name: `Fictional Lead ${index}`,
    businessType: "QA",
    phone: "",
    email: "",
    serviceInterest: "Validation",
    source: "manual_csv",
    status: "New",
    enquiryText: "",
    lastContactDate: "",
    followUpCount: 0,
    appointmentStatus: "",
    budgetSignal: "",
    notes: "",
  };
}

function okResponse(importId: string, rows: Array<{ rowNumber: number }>) {
  return new Response(JSON.stringify({
    ok: true,
    status: "ok",
    importId,
    rows: rows.map(({ rowNumber }, index) => ({
      rowNumber,
      status: index % 2 === 0 ? "created" : "existing",
      leadId: "207357a1-94e4-4184-a8c8-6f16773a5ea5",
    })),
    created: 0,
    existing: 0,
    errors: 0,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("importCsvRows", () => {
  it("sends normalized leads to the authenticated CSV endpoint", async () => {
    const importId = "7e3d9f4b-2875-4e9d-a2bd-4ad5c2a6c181";
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return okResponse(importId, body.rows);
    });

    const result = await importCsvRows([
      { rowNumber: 2, lead: lead(1) },
      { rowNumber: 3, lead: lead(2) },
    ], { importId, fetchImpl: fetchImpl as typeof fetch });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe("/api/imports/csv");
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toMatchObject({
      importId,
      rows: [
        { rowNumber: 2, lead: { name: "Fictional Lead 1", source: "manual_csv" } },
        { rowNumber: 3, lead: { name: "Fictional Lead 2", source: "manual_csv" } },
      ],
    });
    expect(result.created).toBe(1);
    expect(result.existing).toBe(1);
    expect(result.errors).toBe(0);
  });

  it("chunks more than 100 rows while keeping one import id", async () => {
    const importId = "7e3d9f4b-2875-4e9d-a2bd-4ad5c2a6c181";
    const requests: unknown[] = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      requests.push(body);
      return okResponse(importId, body.rows);
    });

    const rows = Array.from({ length: 205 }, (_, index) => ({
      rowNumber: index + 2,
      lead: lead(index),
    }));

    const result = await importCsvRows(rows, { importId, fetchImpl: fetchImpl as typeof fetch });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect((requests[0] as { rows: unknown[] }).rows).toHaveLength(100);
    expect((requests[1] as { rows: unknown[] }).rows).toHaveLength(100);
    expect((requests[2] as { rows: unknown[] }).rows).toHaveLength(5);
    expect(requests.every((request) => (request as { importId: string }).importId === importId)).toBe(true);
    expect(result.rows).toHaveLength(205);
  });

  it("surfaces sanitized endpoint failures without continuing later batches", async () => {
    const fetchImpl = vi.fn(async () => new Response(
      JSON.stringify({ ok: false, error: "Authentication required." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ));

    await expect(importCsvRows([
      { rowNumber: 2, lead: lead(1) },
    ], {
      importId: "7e3d9f4b-2875-4e9d-a2bd-4ad5c2a6c181",
      fetchImpl: fetchImpl as typeof fetch,
    })).rejects.toEqual(expect.objectContaining<CsvImportRequestError>({
      status: 401,
      message: "Authentication required.",
    }));
  });

  it("fails closed on malformed success responses", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(importCsvRows([
      { rowNumber: 2, lead: lead(1) },
    ], {
      importId: "7e3d9f4b-2875-4e9d-a2bd-4ad5c2a6c181",
      fetchImpl: fetchImpl as typeof fetch,
    })).rejects.toEqual(expect.objectContaining<CsvImportRequestError>({
      status: 502,
      message: "CSV import returned an invalid response.",
    }));
  });
});
