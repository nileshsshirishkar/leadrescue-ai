import { describe, expect, it, vi } from "vitest";
import { parseLeadCsv } from "@/lib/csv";
import {
  CsvImportRequestError,
  clearPendingImportId,
  getOrCreatePendingImportId,
  importCsvRows,
} from "@/lib/csv-import-client";
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
    sourceStage: "Proposal",
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

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

describe("CSV import client", () => {
  it("sends normalized source stage separately from LeadRescue status", async () => {
    const importId = "7e3d9f4b-2875-4e9d-a2bd-4ad5c2a6c181";
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return okResponse(importId, body.rows);
    });

    const result = await importCsvRows([
      { rowNumber: 2, lead: lead(1) },
      { rowNumber: 4, lead: lead(2) },
    ], { importId, fetchImpl: fetchImpl as typeof fetch });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe("/api/imports/csv");
    const request = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(request).toMatchObject({
      importId,
      rows: [
        { rowNumber: 2, lead: { name: "Fictional Lead 1", source: "manual_csv", sourceStage: "Proposal", status: "New" } },
        { rowNumber: 4, lead: { name: "Fictional Lead 2", source: "manual_csv", sourceStage: "Proposal", status: "New" } },
      ],
    });
    expect(result.created).toBe(1);
    expect(result.existing).toBe(1);
    expect(result.errors).toBe(0);
  });

  it("uses the original CSV line for persistence even after an invalid row is skipped", async () => {
    const parsed = parseLeadCsv([
      "Lead Name,Email",
      "First Lead,first@example.com",
      ",broken-email",
      "Third Lead,third@example.com",
    ].join("\n"));
    expect(parsed.validRows.map((row) => row.rowNumber)).toEqual([2, 4]);

    const importId = "7e3d9f4b-2875-4e9d-a2bd-4ad5c2a6c181";
    let requestRows: Array<{ rowNumber: number }> = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      requestRows = body.rows;
      return okResponse(importId, body.rows);
    });

    const result = await importCsvRows(parsed.leads.map((item, index) => ({
      rowNumber: index + 2,
      lead: item,
    })), { importId, fetchImpl: fetchImpl as typeof fetch });

    expect(requestRows.map((row) => row.rowNumber)).toEqual([2, 4]);
    expect(result.rows.map((row) => row.rowNumber)).toEqual([2, 3]);
    expect(result.rows.map((row) => row.sourceRowNumber)).toEqual([2, 4]);
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

  it("reuses a pending import id for the same CSV fingerprint until success clears it", () => {
    const storage = memoryStorage();
    const firstId = "7e3d9f4b-2875-4e9d-a2bd-4ad5c2a6c181";
    const secondId = "6e40c601-2ca2-4f87-82cb-9e6df92ff9ab";
    const createId = vi.fn()
      .mockReturnValueOnce(firstId)
      .mockReturnValueOnce(secondId);

    expect(getOrCreatePendingImportId(storage, "same-file", createId)).toBe(firstId);
    expect(getOrCreatePendingImportId(storage, "same-file", createId)).toBe(firstId);
    expect(createId).toHaveBeenCalledTimes(1);

    clearPendingImportId(storage, "same-file");
    expect(getOrCreatePendingImportId(storage, "same-file", createId)).toBe(secondId);
  });

  it("automatically reuses the same import id after an interrupted request", async () => {
    const storage = memoryStorage();
    const rows = [{ rowNumber: 2, lead: lead(1) }];
    let failedImportId = "";

    const failingFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      failedImportId = JSON.parse(String(init?.body)).importId;
      return new Response(JSON.stringify({ ok: false, error: "CSV import is temporarily unavailable." }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    });

    await expect(importCsvRows(rows, {
      retryStorage: storage,
      fetchImpl: failingFetch as typeof fetch,
    })).rejects.toMatchObject({ status: 503 });

    let retryImportId = "";
    const successfulFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      retryImportId = body.importId;
      return okResponse(body.importId, body.rows);
    });

    await importCsvRows(rows, {
      retryStorage: storage,
      fetchImpl: successfulFetch as typeof fetch,
    });

    expect(failedImportId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(retryImportId).toBe(failedImportId);
  });

  it("surfaces sanitized endpoint failures without continuing later batches", async () => {
    const fetchImpl = vi.fn(async () => new Response(
      JSON.stringify({ ok: false, error: "Authentication required." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ));

    try {
      await importCsvRows([{ rowNumber: 2, lead: lead(1) }], {
        importId: "7e3d9f4b-2875-4e9d-a2bd-4ad5c2a6c181",
        fetchImpl: fetchImpl as typeof fetch,
      });
      throw new Error("Expected importCsvRows to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(CsvImportRequestError);
      expect(error).toMatchObject({ status: 401, message: "Authentication required." });
    }
  });

  it("fails closed on malformed success responses", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    try {
      await importCsvRows([{ rowNumber: 2, lead: lead(1) }], {
        importId: "7e3d9f4b-2875-4e9d-a2bd-4ad5c2a6c181",
        fetchImpl: fetchImpl as typeof fetch,
      });
      throw new Error("Expected importCsvRows to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(CsvImportRequestError);
      expect(error).toMatchObject({ status: 502, message: "CSV import returned an invalid response." });
    }
  });
});
