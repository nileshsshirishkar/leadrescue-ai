import { z } from "zod";
import { resolveOrganizationContext } from "@/lib/supabase/organization-context";
import { createClient } from "@/lib/supabase/server";

const trimmedKeySchema = z
  .string()
  .min(1)
  .max(255)
  .refine((value) => value === value.trim(), "Value must be trimmed");

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).optional().default("");

const optionalNullableText = (maxLength: number) =>
  z.string().trim().max(maxLength).nullable().optional().default(null);

export const tenantLeadCreateInputSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    phoneRaw: optionalNullableText(100),
    phoneE164: optionalNullableText(50),
    email: z.string().trim().email().max(320).nullable().optional().default(null),
    businessType: optionalText(200),
    serviceInterest: optionalText(500),
    source: trimmedKeySchema,
    sourceExternalId: trimmedKeySchema,
    status: z.literal("New").optional().default("New"),
    sourceStage: optionalText(2_000),
    enquiryText: optionalText(5000),
    lastContactAt: z.string().datetime({ offset: true }).nullable().optional().default(null),
    followUpCount: z.number().int().nonnegative().max(1_000_000).optional().default(0),
    appointmentStatus: optionalText(100),
    quotedPrice: z.number().finite().nonnegative().nullable().optional().default(null),
    quotedCurrency: z.string().trim().max(10).nullable().optional().default(null),
    budgetSignal: optionalText(500),
    notes: optionalText(5000),
  })
  .strict();

export type TenantLeadCreateInput = z.infer<typeof tenantLeadCreateInputSchema>;

const persistenceRowSchema = z
  .object({
    result: z.enum(["created", "existing"]),
    lead_id: z.string().uuid(),
  })
  .strict();

export type TenantLeadPersistenceResult =
  | { status: "created"; leadId: string }
  | { status: "existing"; leadId: string }
  | { status: "unavailable" };

export type TenantLeadWriteResult =
  | TenantLeadPersistenceResult
  | { status: "invalid" }
  | { status: "unauthenticated" }
  | { status: "missing-membership" }
  | { status: "ambiguous-membership" };

export interface TenantLeadWriteDependencies {
  resolveContext: typeof resolveOrganizationContext;
  persistLead(input: TenantLeadCreateInput): Promise<unknown>;
}

export async function createTenantLeadWriteDependencies(): Promise<TenantLeadWriteDependencies> {
  const supabase = await createClient();

  return {
    resolveContext: resolveOrganizationContext,
    async persistLead(input) {
      const { data, error } = await supabase.rpc("persist_imported_lead", {
        p_full_name: input.fullName,
        p_phone_raw: input.phoneRaw,
        p_phone_e164: input.phoneE164,
        p_email: input.email,
        p_business_type: input.businessType,
        p_service_interest: input.serviceInterest,
        p_source: input.source,
        p_source_external_id: input.sourceExternalId,
        p_status: input.sourceStage || null,
        p_enquiry_text: input.enquiryText,
        p_last_contact_at: input.lastContactAt,
        p_follow_up_count: input.followUpCount,
        p_appointment_status: input.appointmentStatus,
        p_quoted_price: input.quotedPrice,
        p_quoted_currency: input.quotedCurrency,
        p_budget_signal: input.budgetSignal,
        p_notes: input.notes,
      });

      if (error) throw error;
      return data;
    },
  };
}

export async function persistValidatedTenantLead(
  input: TenantLeadCreateInput,
  dependencies: TenantLeadWriteDependencies,
): Promise<TenantLeadPersistenceResult> {
  try {
    const parsedRows = z
      .array(persistenceRowSchema)
      .length(1)
      .safeParse(await dependencies.persistLead(input));

    if (!parsedRows.success) return { status: "unavailable" };

    const row = parsedRows.data[0];
    return row.result === "created"
      ? { status: "created", leadId: row.lead_id }
      : { status: "existing", leadId: row.lead_id };
  } catch {
    return { status: "unavailable" };
  }
}

export async function persistTenantLead(
  input: unknown,
  dependencies?: TenantLeadWriteDependencies,
): Promise<TenantLeadWriteResult> {
  const parsedInput = tenantLeadCreateInputSchema.safeParse(input);
  if (!parsedInput.success) return { status: "invalid" };

  try {
    const effectiveDependencies = dependencies ?? (await createTenantLeadWriteDependencies());
    const contextResult = await effectiveDependencies.resolveContext();

    if (contextResult.status !== "ok") return contextResult;

    return await persistValidatedTenantLead(parsedInput.data, effectiveDependencies);
  } catch {
    return { status: "unavailable" };
  }
}
