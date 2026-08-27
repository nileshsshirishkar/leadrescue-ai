import { describe, expect, it } from "vitest";
import {
  readTenantWorkspace,
  type TenantWorkspaceReadDependencies,
} from "@/lib/supabase/tenant-workspace";

const organizationId = "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed";
const otherOrganizationId = "11111111-1111-4111-8111-111111111111";

const workspaceRow = {
  id: "207357a1-94e4-4184-a8c8-6f16773a5ea5",
  organization_id: organizationId,
  business_type: "Home services",
  service_interest: "Annual maintenance plan",
  source: "manual",
  status: "Follow-up needed",
  enquiry_text: "Fictional QA lead asking about annual maintenance plan availability.",
  last_contact_at: "2026-08-19T00:00:00.000Z",
  follow_up_count: 1,
  appointment_status: "Not booked",
  quoted_price: 1200,
  budget_signal: "Asked about monthly payment options",
  notes: "Fictional non-production record for tenant workspace validation only.",
  contact: {
    full_name: "Avery Example",
    phone_raw: "+1 202-555-0123",
    phone_e164: "+12025550123",
    email: "avery@example.com",
  },
};

function createDependencies(
  overrides: Partial<TenantWorkspaceReadDependencies> = {},
): TenantWorkspaceReadDependencies {
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
    listWorkspaceLeads: async () => [workspaceRow],
    ...overrides,
  };
}

describe("readTenantWorkspace", () => {
  it("maps authenticated tenant rows into the dashboard Lead shape", async () => {
    await expect(readTenantWorkspace(createDependencies())).resolves.toEqual({
      status: "ok",
      organizationId,
      leads: [
        {
          id: workspaceRow.id,
          name: "Avery Example",
          businessType: "Home services",
          phone: "+12025550123",
          email: "avery@example.com",
          serviceInterest: "Annual maintenance plan",
          source: "manual",
          status: "Follow-up needed",
          enquiryText: workspaceRow.enquiry_text,
          lastContactDate: workspaceRow.last_contact_at,
          followUpCount: 1,
          appointmentStatus: "Not booked",
          quotedPrice: 1200,
          budgetSignal: "Asked about monthly payment options",
          notes: workspaceRow.notes,
        },
      ],
    });
  });

  it("returns an empty server workspace for a tenant with no leads", async () => {
    await expect(
      readTenantWorkspace(
        createDependencies({ listWorkspaceLeads: async () => [] }),
      ),
    ).resolves.toEqual({ status: "ok", organizationId, leads: [] });
  });

  it("does not query workspace rows when unauthenticated", async () => {
    let queried = false;

    const result = await readTenantWorkspace(
      createDependencies({
        resolveContext: async () => ({ status: "unauthenticated" }),
        listWorkspaceLeads: async () => {
          queried = true;
          return [];
        },
      }),
    );

    expect(result).toEqual({ status: "unauthenticated" });
    expect(queried).toBe(false);
  });

  it("fails closed if any returned row belongs to another organization", async () => {
    await expect(
      readTenantWorkspace(
        createDependencies({
          listWorkspaceLeads: async () => [
            { ...workspaceRow, organization_id: otherOrganizationId },
          ],
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed on malformed joined contact data", async () => {
    await expect(
      readTenantWorkspace(
        createDependencies({
          listWorkspaceLeads: async () => [
            { ...workspaceRow, contact: { ...workspaceRow.contact, full_name: "" } },
          ],
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed when the workspace query throws", async () => {
    await expect(
      readTenantWorkspace(
        createDependencies({
          listWorkspaceLeads: async () => {
            throw new Error("database unavailable");
          },
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });
});
