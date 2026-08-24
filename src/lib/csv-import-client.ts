import type { Lead } from "@/lib/types";

const CSV_IMPORT_BATCH_SIZE = 100;

export interface CsvImportClientRow {
  rowNumber: number;
  lead: Lead;
}

export interface CsvImportClientRowResult {
  rowNumber: number;
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
  rows: CsvImportClientRowResult[];
  created: number;
  existing: number;
  errors: number;
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

function createImportId(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("This browser cannot create a secure import identifier.");
  }
  return crypto.randomUUID();
}

export async function importCsvRows(
  rows: CsvImportClientRow[],
  options: {
    importId?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<CsvImportClientResult> {
  if (!rows.length) throw new Error("At least one valid CSV row is required.");

  const importId = options.importId ?? createImportId();
  const fetchImpl = options.fetchImpl ?? fetch;
  const results: CsvImportClientRowResult[] = [];

  for (let start = 0; start < rows.length; start += CSV_IMPORT_BATCH_SIZE) {
    const batch = rows.slice(start, start + CSV_IMPORT_BATCH_SIZE);
    const response = await fetchImpl("/api/imports/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importId,
        rows: batch.map(({ rowNumber, lead }) => ({
          rowNumber,
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

    results.push(...body.rows);
  }

  return {
    importId,
    rows: results,
    created: results.filter((row) => row.status === "created").length,
    existing: results.filter((row) => row.status === "existing").length,
    errors: results.filter((row) => row.status === "error").length,
  };
}
