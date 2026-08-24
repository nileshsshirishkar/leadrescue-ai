import { describe, expect, it } from "vitest";
import {
  persistTenantLead,
  type TenantLeadWriteDependencies,
} from "@/lib/supabase/tenant-lead-write";

const leadId = "207357a1-94e4-4184-a8c8-6f16773a5ea5";

function createDependencies(
  overrides: Partial<TenantLeadWriteDependencies> = {},
): TenantLeadWriteDependencies {
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

const validInput = {
  fullName: "Fictional QA Lead",
  source: "manual_csv",
  sourceExternalId: "qa-app-write-001",
};

describe("persistTenantLead", () => {
  it("persists a validated lead and returns created", async () => {
    let persistedInput: unknown;

    const result = await persistTenantLead(
      validInput,
      createDependencies({
        persistLead: async (input) => {
          persistedInput = input;
          return [{ result: "created", lead_id: leadId }];
        },
      }),
    );

    expect(result).toEqual({ status: "created", leadId });
    expect(persistedInput).toMatchObject({
      fullName: "Fictional QA Lead",
      source: "manual_csv",
      sourceExternalId: "qa-app-write-001",
      status: "New",
      followUpCount: 0,
      phoneRaw: null,
      phoneE164: null,
      email: null,
      quotedPrice: null,
    });
  });

  it("returns existing for an idempotent retry", async () => {
    await expect(
      persistTenantLead(
        validInput,
        createDependencies({
          persistLead: async () => [{ result: "existing", lead_id: leadId }],
        }),
      ),
    ).resolves.toEqual({ status: "existing", leadId });
  });

  it("rejects browser-supplied organization identity before any database work", async () => {
    let contextResolved = false;
    let persisted = false;

    const result = await persistTenantLead(
      { ...validInput, organizationId: "11111111-1111-4111-8111-111111111111" },
      createDependencies({
        resolveContext: async () => {
          contextResolved = true;
          return { status: "unauthenticated" };
        },
        persistLead: async () => {
          persisted = true;
          return [];
        },
      }),
    );

    expect(result).toEqual({ status: "invalid" });
    expect(contextResolved).toBe(false);
    expect(persisted).toBe(false);
  });

  it("rejects browser-supplied actor identity", async () => {
    await expect(
      persistTenantLead(
        { ...validInput, actorUserId: "22222222-2222-4222-8222-222222222222" },
        createDependencies(),
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("rejects malformed idempotency keys", async () => {
    await expect(
      persistTenantLead(
        { ...validInput, sourceExternalId: " qa-app-write-001 " },
        createDependencies(),
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("fails closed for unauthenticated context without persisting", async () => {
    let persisted = false;

    const result = await persistTenantLead(
      validInput,
      createDependencies({
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

  it("fails closed for ambiguous membership without persisting", async () => {
    let persisted = false;

    const result = await persistTenantLead(
      validInput,
      createDependencies({
        resolveContext: async () => ({ status: "ambiguous-membership" }),
        persistLead: async () => {
          persisted = true;
          return [];
        },
      }),
    );

    expect(result).toEqual({ status: "ambiguous-membership" });
    expect(persisted).toBe(false);
  });

  it("fails closed when the persistence response is malformed", async () => {
    await expect(
      persistTenantLead(
        validInput,
        createDependencies({ persistLead: async () => [{ result: "created" }] }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("sanitizes persistence failures", async () => {
    await expect(
      persistTenantLead(
        validInput,
        createDependencies({
          persistLead: async () => {
            throw new Error("sensitive database detail");
          },
        }),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });
});
