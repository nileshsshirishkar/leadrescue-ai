import { z } from "zod";
import {
  createTenantLeadWriteDependencies,
  persistValidatedTenantLead,
  tenantLeadCreateInputSchema,
  type TenantLeadPersistenceResult,
  type TenantLeadWriteDependencies,
} from "@/lib/supabase/tenant-lead-write";

const csvImportRowSchema = z
  .object({
    rowNumber: z.number().int().min(2).max(1_000_000),
    lead: z
      .object({
        name: z.string().trim().min(1).max(160),
        businessType: z.string().trim().max(2_000).optional().default(""),
        phone: z.string().trim().max(240).optional().default(""),
        email: z.string().trim().max(240).optional().default(""),
        serviceInterest: z.string().trim().max(2_000).optional().default(""),
        source: z.string().trim().max(2_000).optional().default(""),
        status: z.string().trim().max(2_000).optional().default(""),
        enquiryText: z.string().trim().max(2_000).optional().default(""),
        lastContactDate: z.string().trim().max(100).optional().default(""),
        followUpCount: z.number().int().min(0).max(999).optional().default(0),
        appointmentStatus: z.string().trim().max(2_000).optional().default(""),
        quotedPrice: z.number().finite().nonnegative().optional(),
        budgetSignal: z.string().trim().max(2_000).optional().default(""),
        notes: z.string().trim().max(2_000).optional().default(""),
      })
      .strict(),
  })
  .strict();

export const csvImportRequestSchema = z
  .object({
    importId: z.string().uuid(),
    rows: z.array(csvImportRowSchema).min(1).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<number>();
    value.rows.forEach((row, index) => {
      if (seen.has(row.rowNumber)) {
        context.addIssue({
          code: "custom",
          message: "Row numbers must be unique within an import request.",
          path: ["rows", index, "rowNumber"],
        });
      }
      seen.add(row.rowNumber);
    });
  });

export type CsvImportRequest = z.infer<typeof csvImportRequestSchema>;

export interface CsvImportRowResult {
  rowNumber: number;
  status: "created" | "existing" | "error";
  leadId?: string;
}

export type CsvImportResult =
  | {
      status: "ok";
      importId: string;
      rows: CsvImportRowResult[];
      created: number;
      existing: number;
      errors: number;
    }
  | { status: "invalid" }
  | { status: "unauthenticated" }
  | { status: "missing-membership" }
  | { status: "ambiguous-membership" }
  | { status: "unavailable" };

function normalizeDate(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function mapRowToPersistenceInput(importId: string, row: CsvImportRequest["rows"][number]) {
  const source = row.lead.source || "manual_csv";
  return tenantLeadCreateInputSchema.parse({
    fullName: row.lead.name,
    phoneRaw: row.lead.phone || null,
    phoneE164: null,
    email: row.lead.email || null,
    businessType: row.lead.businessType,
    serviceInterest: row.lead.serviceInterest,
    source,
    sourceExternalId: `csv:${importId}:${row.rowNumber}`,
    status: row.lead.status || "New",
    enquiryText: row.lead.enquiryText,
    lastContactAt: normalizeDate(row.lead.lastContactDate),
    followUpCount: row.lead.followUpCount,
    appointmentStatus: row.lead.appointmentStatus,
    quotedPrice: row.lead.quotedPrice ?? null,
    quotedCurrency: null,
    budgetSignal: row.lead.budgetSignal,
    notes: row.lead.notes,
  });
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      results[index] = await worker(values[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => runWorker()));
  return results;
}

export async function importTenantCsvRows(
  input: unknown,
  dependencies?: TenantLeadWriteDependencies,
): Promise<CsvImportResult> {
  const parsed = csvImportRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  try {
    const effectiveDependencies = dependencies ?? (await createTenantLeadWriteDependencies());
    const context = await effectiveDependencies.resolveContext();
    if (context.status !== "ok") return context;

    const rows = await mapWithConcurrency(parsed.data.rows, 4, async (row): Promise<CsvImportRowResult> => {
      let persistence: TenantLeadPersistenceResult;
      try {
        const persistenceInput = mapRowToPersistenceInput(parsed.data.importId, row);
        persistence = await persistValidatedTenantLead(persistenceInput, effectiveDependencies);
      } catch {
        return { rowNumber: row.rowNumber, status: "error" };
      }

      if (persistence.status === "created" || persistence.status === "existing") {
        return {
          rowNumber: row.rowNumber,
          status: persistence.status,
          leadId: persistence.leadId,
        };
      }
      return { rowNumber: row.rowNumber, status: "error" };
    });

    return {
      status: "ok",
      importId: parsed.data.importId,
      rows,
      created: rows.filter((row) => row.status === "created").length,
      existing: rows.filter((row) => row.status === "existing").length,
      errors: rows.filter((row) => row.status === "error").length,
    };
  } catch {
    return { status: "unavailable" };
  }
}
