import { getCsvSourceRowNumber } from "@/lib/csv";
import type { Lead } from "@/lib/types";

const CSV_IMPORT_BATCH_SIZE = 100;
const PENDING_IMPORT_PREFIX = "leadrescue-csv-import:";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CsvImportClientRow {
  rowNumber: number;
  lead: Lead;
}

export interface CsvImportClientRowResult {
  rowNumber: number;
  sourceRowNumber?: number;
  status: "created" | "existing" | "error";
  leadId?: string;
}

export interface CsvImportClientResult {
  importId: string;
  rows: CsvImportClientRowResult[];
  created: number;
  existing: number;
  errors: number;
}

interface CsvImportApiResponse {
  ok: true;
  status: "ok";
  importId: string;
  rows: Array<{
    rowNumber: number;
    status: "created" | "existing" | "error";
    leadId?: string;
  }>;
  created: number;
  existing: number;
  errors: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class CsvImportRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CsvImportRequestError";
  }
}

function isCsvImportApiResponse(value: unknown): value is CsvImportApiResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.ok === true &&
    candidate.status === "ok" &&
    typeof candidate.importId === "string" &&
    Array.isArray(candidate.rows) &&
    typeof candidate.created === "number" &&
    typeof candidate.existing === "number" &&
    typeof candidate.errors === "number";
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    // Fall through to the sanitized generic message.
  }
  return "CSV import could not be completed.";
}

export function createImportId(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("This browser cannot create a secure import identifier.");
  }
  return crypto.randomUUID();
}

export async function createCsvFingerprint(csvText: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("This browser cannot create a CSV retry fingerprint.");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(csvText));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function pendingImportKey(fingerprint: string): string {
  return `${PENDING_IMPORT_PREFIX}${fingerprint}`;
}

export function getOrCreatePendingImportId(
  storage: StorageLike,
  fingerprint: string,
  createId: () => string = createImportId,
): string {
  const key = pendingImportKey(fingerprint);
  const existing = storage.getItem(key);
  if (existing && UUID_PATTERN.test(existing)) return existing;

  const importId = createId();
  if (!UUID_PATTERN.test(importId)) throw new Error("Could not create a valid CSV import identifier.");
  storage.setItem(key, importId);
  return importId;
}

export function clearPendingImportId(storage: StorageLike, fingerprint: string): void {
  storage.removeItem(pendingImportKey(fingerprint));
}

function defaultSessionStorage(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function effectiveSourceRow(row: CsvImportClientRow): number {
  return getCsvSourceRowNumber(row.lead) ?? row.rowNumber;
}

async function fingerprintImportRows(rows: CsvImportClientRow[]): Promise<string> {
  return createCsvFingerprint(JSON.stringify(rows.map((row) => ({
    rowNumber: effectiveSourceRow(row),
    lead: row.lead,
  }))));
}

export async function importCsvRows(
  rows: CsvImportClientRow[],
  options: {
    importId?: string;
    fetchImpl?: typeof fetch;
    retryStorage?: StorageLike;
  } = {},
): Promise<CsvImportClientResult> {
  if (!rows.length) throw new Error("At least one valid CSV row is required.");

  const retryStorage = options.retryStorage ?? defaultSessionStorage();
  const retryFingerprint = options.importId || !retryStorage
    ? undefined
    : await fingerprintImportRows(rows);
  const importId = options.importId ?? (
    retryStorage && retryFingerprint
      ? getOrCreatePendingImportId(retryStorage, retryFingerprint)
      : createImportId()
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  const results: CsvImportClientRowResult[] = [];

  for (let start = 0; start < rows.length; start += CSV_IMPORT_BATCH_SIZE) {
    const batch = rows.slice(start, start + CSV_IMPORT_BATCH_SIZE);
    const requestRows = batch.map((row) => ({
      clientRowNumber: row.rowNumber,
      sourceRowNumber: effectiveSourceRow(row),
      lead: row.lead,
    }));
    const response = await fetchImpl("/api/imports/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importId,
        rows: requestRows.map(({ sourceRowNumber, lead }) => ({
          rowNumber: sourceRowNumber,
          lead: {
            name: lead.name,
            businessType: lead.businessType,
            phone: lead.phone ?? "",
            email: lead.email ?? "",
            serviceInterest: lead.serviceInterest,
            source: lead.source,
            status: lead.status,
            enquiryText: lead.enquiryText,
            lastContactDate: lead.lastContactDate ?? "",
            followUpCount: lead.followUpCount,
            appointmentStatus: lead.appointmentStatus,
            quotedPrice: lead.quotedPrice,
            budgetSignal: lead.budgetSignal,
            notes: lead.notes,
          },
        })),
      }),
    });

    if (!response.ok) {
      throw new CsvImportRequestError(await readErrorMessage(response), response.status);
    }

    const body: unknown = await response.json();
    if (!isCsvImportApiResponse(body) || body.importId !== importId || body.rows.length !== batch.length) {
      throw new CsvImportRequestError("CSV import returned an invalid response.", 502);
    }

    const mappedRows = body.rows.map((row, index): CsvImportClientRowResult => {
      const expected = requestRows[index];
      if (!expected || row.rowNumber !== expected.sourceRowNumber) {
        throw new CsvImportRequestError("CSV import returned an invalid row response.", 502);
      }
      return {
        rowNumber: expected.clientRowNumber,
        sourceRowNumber: expected.sourceRowNumber,
        status: row.status,
        leadId: row.leadId,
      };
    });
    results.push(...mappedRows);
  }

  const output: CsvImportClientResult = {
    importId,
    rows: results,
    created: results.filter((row) => row.status === "created").length,
    existing: results.filter((row) => row.status === "existing").length,
    errors: results.filter((row) => row.status === "error").length,
  };

  if (output.errors === 0 && retryStorage && retryFingerprint) {
    clearPendingImportId(retryStorage, retryFingerprint);
  }

  return output;
}
