import { describe, expect, it } from "vitest";
import {
  resolveOrganizationContext,
  type OrganizationContextDependencies,
} from "@/lib/supabase/organization-context";

const userId = "ad158922-18f8-41dc-8a8e-106d6cf03c64";
const organizationId = "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed";

function createDependencies(
  overrides: Partial<OrganizationContextDependencies> = {},
): OrganizationContextDependencies {
  return {
    getAuthenticatedUserId: async () => userId,
    listMemberships: async () => [
      { organization_id: organizationId, role: "owner" },
    ],
    listOrganizations: async () => [
      {
        id: organizationId,
        name: "LeadRescue QA",
        slug: "leadrescue-qa",
      },
    ],
    ...overrides,
  };
}

describe("resolveOrganizationContext", () => {
  it("returns the single authenticated organization context", async () => {
    await expect(resolveOrganizationContext(createDependencies())).resolves.toEqual({
      status: "ok",
      context: {
        organization: {
          id: organizationId,
          name: "LeadRescue QA",
          slug: "leadrescue-qa",
        },
        role: "owner",
      },
    });
  });

  it("fails closed when no authenticated user exists", async () => {
    const listMemberships = async () => {
      throw new Error("must not query memberships");
    };

    await expect(
      resolveOrganizationContext(
        createDependencies({
          getAuthenticatedUserId: async () => null,
          listMemberships,
        }),
      ),
    ).resolves.toEqual({ status: "unauthenticated" });
  });

  it("fails closed when the user has no organization membership", async () => {
    await expect(
      resolveOrganizationContext(
        createDependencies({ listMemberships: async () => [] }),
      ),
    ).resolves.toEqual({ status: "missing-membership" });
  });

  it("does not silently choose when the user has multiple organizations", async () => {
    await expect(
      resolveOrganizationContext(
        createDependencies({
          listMemberships: async () => [
            { organization_id: organizationId, role: "owner" },
            {
              organization_id: "11111111-1111-4111-8111-111111111111",
              role: "member",
            },
          ],
        }),
      ),
    ).resolves.toEqual({ status: "ambiguous-membership" });
  });

  it("fails closed on malformed membership rows", async () => {
    await expect(
      resolveOrganizationContext(
        createDependencies({
          listMemberships: async () => [
            { organization_id: "not-a-uuid", role: "owner" },
          ],
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed when the organization lookup does not return exactly one row", async () => {
    await expect(
      resolveOrganizationContext(
        createDependencies({ listOrganizations: async () => [] }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed when a dependency throws", async () => {
    await expect(
      resolveOrganizationContext(
        createDependencies({
          listMemberships: async () => {
            throw new Error("database unavailable");
          },
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });
});
