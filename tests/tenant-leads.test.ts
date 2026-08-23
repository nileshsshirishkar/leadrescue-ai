import { describe, expect, it } from "vitest";
import {
  readTenantLeads,
  type TenantLeadReadDependencies,
} from "@/lib/supabase/tenant-leads";

const organizationId = "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed";
const otherOrganizationId = "11111111-1111-4111-8111-111111111111";

const lead = {
  id: "207357a1-94e4-4184-a8c8-6f16773a5ea5",
  organization_id: organizationId,
  contact_id: "24d26c27-b8fa-415c-8e57-29d34745f247",
  business_type: "Home services",
  service_interest: "Annual maintenance plan",
  source: "manual",
  source_external_id: "qa-preview-read-001",
  status: "Follow-up needed",
  enquiry_text: "Fictional QA lead asking about annual maintenance plan availability.",
  last_contact_at: "2026-08-19T00:00:00.000Z",
  follow_up_count: 1,
  appointment_status: "Not booked",
  quoted_price: 1200,
  quoted_currency: "USD",
  budget_signal: "Asked about monthly payment options",
  notes: "Fictional non-production record for tenant-scoped read validation only.",
  created_at: "2026-08-22T00:00:00.000Z",
  updated_at: "2026-08-22T00:00:00.000Z",
};

function createDependencies(
  overrides: Partial<TenantLeadReadDependencies> = {},
): TenantLeadReadDependencies {
  return {
    resolveContext: async () => ({
      status: "ok",
      context: {
        organization: {
          id: organizationId,
          name: "LeadRescue QA",
          slug: "leadrescue-qa",
        },
        role: "owner",
      },
    }),
    listLeads: async () => [lead],
    ...overrides,
  };
}

describe("readTenantLeads", () => {
  it("returns validated leads for the authenticated organization", async () => {
    await expect(readTenantLeads(createDependencies())).resolves.toEqual({
      status: "ok",
      organizationId,
      leads: [lead],
    });
  });

  it("returns an empty list when the tenant has no leads", async () => {
    await expect(
      readTenantLeads(createDependencies({ listLeads: async () => [] })),
    ).resolves.toEqual({
      status: "ok",
      organizationId,
      leads: [],
    });
  });

  it("passes through unauthenticated context without querying leads", async () => {
    let queried = false;

    const result = await readTenantLeads(
      createDependencies({
        resolveContext: async () => ({ status: "unauthenticated" }),
        listLeads: async () => {
          queried = true;
          return [];
        },
      }),
    );

    expect(result).toEqual({ status: "unauthenticated" });
    expect(queried).toBe(false);
  });

  it("passes through ambiguous membership without querying leads", async () => {
    let queried = false;

    const result = await readTenantLeads(
      createDependencies({
        resolveContext: async () => ({ status: "ambiguous-membership" }),
        listLeads: async () => {
          queried = true;
          return [];
        },
      }),
    );

    expect(result).toEqual({ status: "ambiguous-membership" });
    expect(queried).toBe(false);
  });

  it("fails closed when returned data contains another organization", async () => {
    await expect(
      readTenantLeads(
        createDependencies({
          listLeads: async () => [
            {
              ...lead,
              organization_id: otherOrganizationId,
            },
          ],
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed when a lead row is malformed", async () => {
    await expect(
      readTenantLeads(
        createDependencies({
          listLeads: async () => [{ ...lead, follow_up_count: -1 }],
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed when the lead query throws", async () => {
    await expect(
      readTenantLeads(
        createDependencies({
          listLeads: async () => {
            throw new Error("database unavailable");
          },
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });
});
