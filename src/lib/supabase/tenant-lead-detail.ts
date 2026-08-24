import { z } from "zod";
import { resolveOrganizationContext } from "@/lib/supabase/organization-context";
import { createClient } from "@/lib/supabase/server";

const leadIdSchema = z.string().uuid();

const tenantLeadDetailRowSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    contact_id: z.string().uuid(),
    business_type: z.string(),
    service_interest: z.string(),
    source: z.string(),
    source_external_id: z.string().nullable(),
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

const tenantContactDetailRowSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    full_name: z.string().min(1),
    phone_raw: z.string().nullable(),
    phone_e164: z.string().nullable(),
    email: z.string().nullable(),
  })
  .strict();

export type TenantLeadDetail = z.infer<typeof tenantLeadDetailRowSchema>;
export type TenantContactDetail = z.infer<typeof tenantContactDetailRowSchema>;

export type TenantLeadDetailReadResult =
  | {
      status: "ok";
      organizationId: string;
      lead: TenantLeadDetail;
      contact: TenantContactDetail;
    }
  | { status: "not-found" }
  | { status: "unauthenticated" }
  | { status: "missing-membership" }
  | { status: "ambiguous-membership" }
  | { status: "unavailable" };

export interface TenantLeadDetailReadDependencies {
  resolveContext: typeof resolveOrganizationContext;
  listLead(organizationId: string, leadId: string): Promise<unknown>;
  listContact(organizationId: string, contactId: string): Promise<unknown>;
}

async function createDefaultDependencies(): Promise<TenantLeadDetailReadDependencies> {
  const supabase = await createClient();

  return {
    resolveContext: resolveOrganizationContext,
    async listLead(organizationId, leadId) {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, organization_id, contact_id, business_type, service_interest, source, source_external_id, status, enquiry_text, last_contact_at, follow_up_count, appointment_status, quoted_price, quoted_currency, budget_signal, notes, created_at, updated_at",
        )
        .eq("organization_id", organizationId)
        .eq("id", leadId)
        .limit(2);

      if (error) throw error;
      return data ?? [];
    },
    async listContact(organizationId, contactId) {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, organization_id, full_name, phone_raw, phone_e164, email")
        .eq("organization_id", organizationId)
        .eq("id", contactId)
        .limit(2);

      if (error) throw error;
      return data ?? [];
    },
  };
}

export async function readTenantLeadDetail(
  leadId: string,
  dependencies?: TenantLeadDetailReadDependencies,
): Promise<TenantLeadDetailReadResult> {
  try {
    const effectiveDependencies = dependencies ?? (await createDefaultDependencies());
    const contextResult = await effectiveDependencies.resolveContext();

    if (contextResult.status !== "ok") return contextResult;
    if (!leadIdSchema.safeParse(leadId).success) return { status: "not-found" };

    const organizationId = contextResult.context.organization.id;
    const leadParse = z
      .array(tenantLeadDetailRowSchema)
      .safeParse(await effectiveDependencies.listLead(organizationId, leadId));

    if (!leadParse.success) return { status: "unavailable" };
    if (leadParse.data.length === 0) return { status: "not-found" };
    if (leadParse.data.length !== 1) return { status: "unavailable" };

    const lead = leadParse.data[0];
    if (lead.organization_id !== organizationId || lead.id !== leadId) {
      return { status: "unavailable" };
    }

    const contactParse = z
      .array(tenantContactDetailRowSchema)
      .safeParse(
        await effectiveDependencies.listContact(organizationId, lead.contact_id),
      );

    if (!contactParse.success || contactParse.data.length !== 1) {
      return { status: "unavailable" };
    }

    const contact = contactParse.data[0];
    if (
      contact.organization_id !== organizationId ||
      contact.id !== lead.contact_id
    ) {
      return { status: "unavailable" };
    }

    return {
      status: "ok",
      organizationId,
      lead,
      contact,
    };
  } catch {
    return { status: "unavailable" };
  }
}
