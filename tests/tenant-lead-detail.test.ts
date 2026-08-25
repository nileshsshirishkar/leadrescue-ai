import { describe, expect, it } from "vitest";
import {
  readTenantLeadDetail,
  type TenantLeadDetailReadDependencies,
} from "@/lib/supabase/tenant-lead-detail";

const organizationId = "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed";
const otherOrganizationId = "11111111-1111-4111-8111-111111111111";
const leadId = "207357a1-94e4-4184-a8c8-6f16773a5ea5";
const contactId = "24d26c27-b8fa-415c-8e57-29d34745f247";

const lead = {
  id: leadId,
  organization_id: organizationId,
  contact_id: contactId,
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

const contact = {
  id: contactId,
  organization_id: organizationId,
  full_name: "Avery Example",
  phone_raw: "+1 202-555-0148",
  phone_e164: "+12025550148",
  email: "avery@example.com",
};

function createDependencies(
  overrides: Partial<TenantLeadDetailReadDependencies> = {},
): TenantLeadDetailReadDependencies {
  return {
    resolveContext: async () => ({
      status: "ok",
      context: {
        organization: {
          id: organizationId,
          name: "LeadRescue QA",
          slug: "leadrescue-qa",
          access_status: "active",
        },
        role: "owner",
      },
    }),
    listLead: async () => [lead],
    listContact: async () => [contact],
    ...overrides,
  };
}

describe("readTenantLeadDetail", () => {
  it("returns one validated tenant lead with its contact details", async () => {
    await expect(
      readTenantLeadDetail(leadId, createDependencies()),
    ).resolves.toEqual({
      status: "ok",
      organizationId,
      lead,
      contact,
    });
  });

  it("returns not-found for an invalid lead id without querying data", async () => {
    let leadQueried = false;
    let contactQueried = false;

    const result = await readTenantLeadDetail(
      "not-a-uuid",
      createDependencies({
        listLead: async () => {
          leadQueried = true;
          return [];
        },
        listContact: async () => {
          contactQueried = true;
          return [];
        },
      }),
    );

    expect(result).toEqual({ status: "not-found" });
    expect(leadQueried).toBe(false);
    expect(contactQueried).toBe(false);
  });

  it("returns not-found when the requested lead is not visible in the tenant", async () => {
    let contactQueried = false;

    const result = await readTenantLeadDetail(
      leadId,
      createDependencies({
        listLead: async () => [],
        listContact: async () => {
          contactQueried = true;
          return [];
        },
      }),
    );

    expect(result).toEqual({ status: "not-found" });
    expect(contactQueried).toBe(false);
  });

  it("passes through unauthenticated context without querying lead or contact", async () => {
    let queried = false;

    const result = await readTenantLeadDetail(
      leadId,
      createDependencies({
        resolveContext: async () => ({ status: "unauthenticated" }),
        listLead: async () => {
          queried = true;
          return [];
        },
      }),
    );

    expect(result).toEqual({ status: "unauthenticated" });
    expect(queried).toBe(false);
  });

  it("fails closed when a returned lead belongs to another organization", async () => {
    await expect(
      readTenantLeadDetail(
        leadId,
        createDependencies({
          listLead: async () => [{ ...lead, organization_id: otherOrganizationId }],
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed when the contact belongs to another organization", async () => {
    await expect(
      readTenantLeadDetail(
        leadId,
        createDependencies({
          listContact: async () => [
            { ...contact, organization_id: otherOrganizationId },
          ],
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed when the contact id does not match the lead", async () => {
    await expect(
      readTenantLeadDetail(
        leadId,
        createDependencies({
          listContact: async () => [
            {
              ...contact,
              id: "22222222-2222-4222-8222-222222222222",
            },
          ],
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed when the contact row is missing or malformed", async () => {
    await expect(
      readTenantLeadDetail(
        leadId,
        createDependencies({ listContact: async () => [] }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });
});
