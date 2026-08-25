import { describe, expect, it } from "vitest";
import {
  resolveOrganizationAccessContext,
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
        access_status: "active",
      },
    ],
    ...overrides,
  };
}

describe("organization context", () => {
  it("returns the single active authenticated organization context", async () => {
    await expect(resolveOrganizationContext(createDependencies())).resolves.toEqual({
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
    });
  });

  it("returns a distinct paused result for UI/access diagnostics", async () => {
    const dependencies = createDependencies({
      listOrganizations: async () => [
        {
          id: organizationId,
          name: "LeadRescue QA",
          slug: "leadrescue-qa",
          access_status: "paused",
        },
      ],
    });

    await expect(resolveOrganizationAccessContext(dependencies)).resolves.toEqual({
      status: "paused",
      context: {
        organization: {
          id: organizationId,
          name: "LeadRescue QA",
          slug: "leadrescue-qa",
          access_status: "paused",
        },
        role: "owner",
      },
    });
  });

  it("fails closed for normal protected operations when organization is paused", async () => {
    const dependencies = createDependencies({
      listOrganizations: async () => [
        {
          id: organizationId,
          name: "LeadRescue QA",
          slug: "leadrescue-qa",
          access_status: "paused",
        },
      ],
    });

    await expect(resolveOrganizationContext(dependencies)).resolves.toEqual({
      status: "missing-membership",
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

  it("fails closed on malformed organization access status", async () => {
    await expect(
      resolveOrganizationAccessContext(
        createDependencies({
          listOrganizations: async () => [
            {
              id: organizationId,
              name: "LeadRescue QA",
              slug: "leadrescue-qa",
              access_status: "suspended",
            },
          ],
        }),
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
