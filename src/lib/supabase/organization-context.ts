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

export type OrganizationAccessContextResult =
  | { status: "ok"; context: OrganizationContext }
  | { status: "paused"; context: OrganizationContext }
  | { status: "unauthenticated" }
  | { status: "missing-membership" }
  | { status: "ambiguous-membership" }
  | { status: "unavailable" };

export type OrganizationContextResult =
  | { status: "ok"; context: OrganizationContext }
  | { status: "unauthenticated" }
  | { status: "missing-membership" }
  | { status: "ambiguous-membership" }
  | { status: "unavailable" };

export interface OrganizationContextDependencies {
  getAuthenticatedUserId(): Promise<string | null>;
  listMemberships(userId: string): Promise<unknown>;
  listOrganizations(organizationId: string): Promise<unknown>;
}

function isMalformedJwtDecodeError(error: unknown): boolean {
  if (error instanceof SyntaxError) return true;

  // auth-js 2.112.3 decodes JWT header/payload base64url bytes before JSON.parse.
  // Malformed bytes can fail in the UTF-8 decoder as a plain Error rather than
  // an AuthInvalidJwtError. Keep this deliberately narrow so network and
  // infrastructure failures still map to unavailable instead of authentication.
  return error instanceof Error && error.message === "Invalid UTF-8 sequence";
}

export function isAuthenticationClaimsError(error: unknown): boolean {
  if (isMalformedJwtDecodeError(error)) return true;
  if (!error || typeof error !== "object" || !("status" in error)) return false;

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && status >= 400 && status < 500;
}

async function createDefaultDependencies(): Promise<OrganizationContextDependencies> {
  const supabase = await createClient();

  return {
    async getAuthenticatedUserId() {
      try {
        const { data, error } = await supabase.auth.getClaims();
        if (error) {
          if (isAuthenticationClaimsError(error)) return null;
          throw error;
        }

        const userId = data?.claims?.sub;
        return typeof userId === "string" && userId.length > 0 ? userId : null;
      } catch (error) {
        if (isAuthenticationClaimsError(error)) return null;
        throw error;
      }
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

export async function resolveOrganizationAccessContext(
  dependencies?: OrganizationContextDependencies,
): Promise<OrganizationAccessContextResult> {
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

export async function resolveOrganizationContext(
  dependencies?: OrganizationContextDependencies,
): Promise<OrganizationContextResult> {
  const result = await resolveOrganizationAccessContext(dependencies);
  if (result.status === "paused") return { status: "missing-membership" };
  return result;
}
