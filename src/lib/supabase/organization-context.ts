import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const membershipRowSchema = z
  .object({
    organization_id: z.string().uuid(),
    role: z.enum(["owner", "admin", "member"]),
  })
  .strict();

const organizationRowSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    slug: z.string().min(1),
    access_status: z.enum(["active", "paused"]),
  })
  .strict();

export type OrganizationRole = z.infer<typeof membershipRowSchema>["role"];
export type OrganizationAccessStatus = z.infer<typeof organizationRowSchema>["access_status"];

export interface OrganizationContext {
  organization: z.infer<typeof organizationRowSchema>;
  role: OrganizationRole;
}

export type OrganizationContextResult =
  | { status: "ok"; context: OrganizationContext }
  | { status: "paused"; context: OrganizationContext }
  | { status: "unauthenticated" }
  | { status: "missing-membership" }
  | { status: "ambiguous-membership" }
  | { status: "unavailable" };

export interface OrganizationContextDependencies {
  getAuthenticatedUserId(): Promise<string | null>;
  listMemberships(userId: string): Promise<unknown>;
  listOrganizations(organizationId: string): Promise<unknown>;
}

async function createDefaultDependencies(): Promise<OrganizationContextDependencies> {
  const supabase = await createClient();

  return {
    async getAuthenticatedUserId() {
      const { data, error } = await supabase.auth.getClaims();
      if (error) throw error;

      const userId = data?.claims?.sub;
      return typeof userId === "string" && userId.length > 0 ? userId : null;
    },

    async listMemberships(userId) {
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", userId)
        .limit(2);

      if (error) throw error;
      return data ?? [];
    },

    async listOrganizations(organizationId) {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, access_status")
        .eq("id", organizationId)
        .limit(2);

      if (error) throw error;
      return data ?? [];
    },
  };
}

export async function resolveOrganizationContext(
  dependencies?: OrganizationContextDependencies,
): Promise<OrganizationContextResult> {
  try {
    const effectiveDependencies = dependencies ?? (await createDefaultDependencies());
    const userId = await effectiveDependencies.getAuthenticatedUserId();

    if (!userId) return { status: "unauthenticated" };

    const membershipParse = z
      .array(membershipRowSchema)
      .safeParse(await effectiveDependencies.listMemberships(userId));

    if (!membershipParse.success) return { status: "unavailable" };
    if (membershipParse.data.length === 0) return { status: "missing-membership" };
    if (membershipParse.data.length !== 1) return { status: "ambiguous-membership" };

    const membership = membershipParse.data[0];
    const organizationParse = z
      .array(organizationRowSchema)
      .safeParse(
        await effectiveDependencies.listOrganizations(membership.organization_id),
      );

    if (!organizationParse.success || organizationParse.data.length !== 1) {
      return { status: "unavailable" };
    }

    const context: OrganizationContext = {
      organization: organizationParse.data[0],
      role: membership.role,
    };

    if (context.organization.access_status === "paused") {
      return { status: "paused", context };
    }

    return { status: "ok", context };
  } catch {
    return { status: "unavailable" };
  }
}
