import { describe, expect, it } from "vitest";
import { importTenantCsvRows } from "@/lib/supabase/csv-import";
import type { TenantLeadWriteDependencies } from "@/lib/supabase/tenant-lead-write";

const leadId = "207357a1-94e4-4184-a8c8-6f16773a5ea5";
const otherLeadId = "307357a1-94e4-4184-a8c8-6f16773a5ea5";

function dependencies(overrides: Partial<TenantLeadWriteDependencies> = {}): TenantLeadWriteDependencies {
  return {
    resolveContext: async () => ({
      status: "ok",
      context: {
        organization: {
          id: "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed",
          name: "LeadRescue QA",
          slug: "leadrescue-qa",
        },
        role: "owner",
      },
    }),
    persistLead: async () => [{ result: "created", lead_id: leadId }],
    ...overrides,
  };
}

const importId = "11111111-1111-4111-8111-111111111111";
const rows = [
  {
    rowNumber: 2,
    lead: {
      name: "Fictional CSV Lead A",
      source: "Meta",
      status: "New",
    },
  },
  {
    rowNumber: 3,
    lead: {
      name: "Fictional CSV Lead B",
      source: "",
      status: "Follow-up needed",
    },
  },
];

describe("importTenantCsvRows", () => {
  it("persists rows with stable per-import row keys and preserves source", async () => {
    const persisted: Array<Record<string, unknown>> = [];
    const result = await importTenantCsvRows(
      { importId, rows },
      dependencies({
        persistLead: async (input) => {
          persisted.push(input);
          const id = input.fullName.endsWith("A") ? leadId : otherLeadId;
          return [{ result: "created", lead_id: id }];
        },
      }),
    );

    expect(result).toMatchObject({ status: "ok", created: 2, existing: 0, errors: 0 });
    expect(persisted).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fullName: "Fictional CSV Lead A",
        source: "Meta",
        sourceExternalId: `csv:${importId}:2`,
      }),
      expect.objectContaining({
        fullName: "Fictional CSV Lead B",
        source: "manual_csv",
        sourceExternalId: `csv:${importId}:3`,
      }),
    ]));
  });

  it("reports created, existing, and row errors independently", async () => {
    const result = await importTenantCsvRows(
      { importId, rows: [...rows, { rowNumber: 4, lead: { name: "Fictional CSV Lead C" } }] },
      dependencies({
        persistLead: async (input) => {
          if (input.fullName.endsWith("A")) return [{ result: "created", lead_id: leadId }];
          if (input.fullName.endsWith("B")) return [{ result: "existing", lead_id: otherLeadId }];
          throw new Error("temporary database failure");
        },
      }),
    );

    expect(result).toMatchObject({ status: "ok", created: 1, existing: 1, errors: 1 });
    if (result.status === "ok") {
      expect(result.rows.map((row) => row.status)).toEqual(["created", "existing", "error"]);
    }
  });

  it("fails closed before row persistence when tenant context is unavailable", async () => {
    let persisted = false;
    const result = await importTenantCsvRows(
      { importId, rows },
      dependencies({
        resolveContext: async () => ({ status: "unauthenticated" }),
        persistLead: async () => {
          persisted = true;
          return [];
        },
      }),
    );

    expect(result).toEqual({ status: "unauthenticated" });
    expect(persisted).toBe(false);
  });

  it("rejects duplicate row numbers and oversized batches", async () => {
    await expect(importTenantCsvRows({ importId, rows: [rows[0], rows[0]] }, dependencies()))
      .resolves.toEqual({ status: "invalid" });

    const tooManyRows = Array.from({ length: 101 }, (_, index) => ({
      rowNumber: index + 2,
      lead: { name: `Lead ${index + 1}` },
    }));
    await expect(importTenantCsvRows({ importId, rows: tooManyRows }, dependencies()))
      .resolves.toEqual({ status: "invalid" });
  });
});
