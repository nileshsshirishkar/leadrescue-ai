import { z } from "zod";
import { resolveOrganizationContext } from "@/lib/supabase/organization-context";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types";

const WORKSPACE_LEAD_LIMIT = 5_000;

const contactSchema = z
  .object({
    full_name: z.string().min(1),
    phone_raw: z.string().nullable(),
    phone_e164: z.string().nullable(),
    email: z.string().nullable(),
  })
  .strict();

const sourceMetadataSchema = z
  .object({
    source_stage: z.string().optional(),
  })
  .passthrough();

const workspaceLeadRowSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    business_type: z.string(),
    service_interest: z.string(),
    source: z.string(),
    source_metadata: sourceMetadataSchema.optional().default({}),
    status: z.string(),
    enquiry_text: z.string(),
    last_contact_at: z.string().nullable(),
    follow_up_count: z.number().int().nonnegative(),
    appointment_status: z.string(),
    quoted_price: z.number().nonnegative().nullable(),
    budget_signal: z.string(),
    notes: z.string(),
    contact: contactSchema,
  })
  .strict();

export type TenantWorkspaceReadResult =
  | { status: "ok"; organizationId: string; leads: Lead[] }
  | { status: "unauthenticated" }
  | { status: "missing-membership" }
  | { status: "ambiguous-membership" }
  | { status: "unavailable" };

export interface TenantWorkspaceReadDependencies {
  resolveContext: typeof resolveOrganizationContext;
  listWorkspaceLeads(organizationId: string): Promise<unknown>;
}

async function createDefaultDependencies(): Promise<TenantWorkspaceReadDependencies> {
  const supabase = await createClient();

  return {
    resolveContext: resolveOrganizationContext,
    async listWorkspaceLeads(organizationId) {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, organization_id, business_type, service_interest, source, source_metadata, status, enquiry_text, last_contact_at, follow_up_count, appointment_status, quoted_price, budget_signal, notes, contact:contacts!leads_contact_same_org_fk(full_name, phone_raw, phone_e164, email)",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(WORKSPACE_LEAD_LIMIT);

      if (error) throw error;
      return data ?? [];
    },
  };
}

function toLead(row: z.infer<typeof workspaceLeadRowSchema>): Lead {
  const phone = row.contact.phone_e164 ?? row.contact.phone_raw ?? undefined;
  const sourceStage = row.source_metadata.source_stage?.trim() || undefined;

  return {
    id: row.id,
    name: row.contact.full_name,
    businessType: row.business_type,
    ...(phone ? { phone } : {}),
    ...(row.contact.email ? { email: row.contact.email } : {}),
    serviceInterest: row.service_interest,
    source: row.source,
    ...(sourceStage ? { sourceStage } : {}),
    status: row.status,
    enquiryText: row.enquiry_text,
    ...(row.last_contact_at ? { lastContactDate: row.last_contact_at } : {}),
    followUpCount: row.follow_up_count,
    appointmentStatus: row.appointment_status,
    ...(row.quoted_price === null ? {} : { quotedPrice: row.quoted_price }),
    budgetSignal: row.budget_signal,
    notes: row.notes,
  };
}

export async function readTenantWorkspace(
  dependencies?: TenantWorkspaceReadDependencies,
): Promise<TenantWorkspaceReadResult> {
  try {
    const effectiveDependencies = dependencies ?? (await createDefaultDependencies());
    const contextResult = await effectiveDependencies.resolveContext();

    if (contextResult.status !== "ok") return contextResult;

    const organizationId = contextResult.context.organization.id;
    const parsed = z
      .array(workspaceLeadRowSchema)
      .safeParse(await effectiveDependencies.listWorkspaceLeads(organizationId));

    if (!parsed.success) return { status: "unavailable" };
    if (parsed.data.some((lead) => lead.organization_id !== organizationId)) {
      return { status: "unavailable" };
    }

    return {
      status: "ok",
      organizationId,
      leads: parsed.data.map(toLead),
    };
  } catch {
    return { status: "unavailable" };
  }
}
