import { z } from "zod";
import { resolveOrganizationContext } from "@/lib/supabase/organization-context";
import { createClient } from "@/lib/supabase/server";

const tenantLeadRowSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    contact_id: z.string().uuid(),
    business_type: z.string(),
    service_interest: z.string(),
    source: z.string(),
    status: z.string(),
    enquiry_text: z.string(),
    last_contact_at: z.string().nullable(),
    follow_up_count: z.number().int().nonnegative(),
    appointment_status: z.string(),
    quoted_price: z.number().nonnegative().nullable(),
    quoted_currency: z.string().nullable(),
    budget_signal: z.string(),
    notes: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export type TenantLead = z.infer<typeof tenantLeadRowSchema>;

export type TenantLeadReadResult =
  | { status: "ok"; organizationId: string; leads: TenantLead[] }
  | { status: "unauthenticated" }
  | { status: "missing-membership" }
  | { status: "ambiguous-membership" }
  | { status: "unavailable" };

export interface TenantLeadReadDependencies {
  resolveContext: typeof resolveOrganizationContext;
  listLeads(organizationId: string): Promise<unknown>;
}

async function createDefaultDependencies(): Promise<TenantLeadReadDependencies> {
  const supabase = await createClient();

  return {
    resolveContext: resolveOrganizationContext,
    async listLeads(organizationId) {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, organization_id, contact_id, business_type, service_interest, source, status, enquiry_text, last_contact_at, follow_up_count, appointment_status, quoted_price, quoted_currency, budget_signal, notes, created_at, updated_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data ?? [];
    },
  };
}

export async function readTenantLeads(
  dependencies?: TenantLeadReadDependencies,
): Promise<TenantLeadReadResult> {
  try {
    const effectiveDependencies = dependencies ?? (await createDefaultDependencies());
    const contextResult = await effectiveDependencies.resolveContext();

    if (contextResult.status !== "ok") return contextResult;

    const organizationId = contextResult.context.organization.id;
    const parsed = z
      .array(tenantLeadRowSchema)
      .safeParse(await effectiveDependencies.listLeads(organizationId));

    if (!parsed.success) return { status: "unavailable" };
    if (parsed.data.some((lead) => lead.organization_id !== organizationId)) {
      return { status: "unavailable" };
    }

    return {
      status: "ok",
      organizationId,
      leads: parsed.data,
    };
  } catch {
    return { status: "unavailable" };
  }
}
