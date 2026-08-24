import { z } from "zod";
import { resolveOrganizationContext } from "@/lib/supabase/organization-context";
import { createClient } from "@/lib/supabase/server";

const taskRowSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    lead_id: z.string().uuid(),
    assigned_to: z.string().uuid().nullable(),
    due_at: z.string(),
    status: z.literal("pending"),
    task_type: z.string().min(1),
    channel: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

const leadRowSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    contact_id: z.string().uuid(),
    status: z.string(),
    service_interest: z.string(),
  })
  .strict();

const contactRowSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    full_name: z.string().min(1),
    phone_raw: z.string().nullable(),
    phone_e164: z.string().nullable(),
    email: z.string().nullable(),
  })
  .strict();

export const reminderBucketSchema = z.enum(["overdue", "due", "upcoming"]);
export type ReminderBucket = z.infer<typeof reminderBucketSchema>;

export const tenantFollowUpReminderSchema = z
  .object({
    taskId: z.string().uuid(),
    leadId: z.string().uuid(),
    dueAt: z.string(),
    bucket: reminderBucketSchema,
    taskType: z.string(),
    channel: z.string().nullable(),
    assignedTo: z.string().uuid().nullable(),
    leadStatus: z.string(),
    serviceInterest: z.string(),
    contact: z.object({
      fullName: z.string(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
    }),
  })
  .strict();

export type TenantFollowUpReminder = z.infer<typeof tenantFollowUpReminderSchema>;

export type TenantFollowUpReminderReadResult =
  | {
      status: "ok";
      organizationId: string;
      generatedAt: string;
      reminders: TenantFollowUpReminder[];
    }
  | { status: "unauthenticated" }
  | { status: "missing-membership" }
  | { status: "ambiguous-membership" }
  | { status: "unavailable" };

export interface TenantFollowUpReminderDependencies {
  resolveContext: typeof resolveOrganizationContext;
  now(): Date;
  listTasks(organizationId: string): Promise<unknown>;
  listLeads(organizationId: string, leadIds: string[]): Promise<unknown>;
  listContacts(organizationId: string, contactIds: string[]): Promise<unknown>;
}

function classifyDueAt(dueAt: string, now: Date): ReminderBucket | null {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  if (due.getTime() < now.getTime()) return "overdue";
  if (due.getTime() <= now.getTime() + 24 * 60 * 60 * 1000) return "due";
  return "upcoming";
}

async function createDefaultDependencies(): Promise<TenantFollowUpReminderDependencies> {
  const supabase = await createClient();

  return {
    resolveContext: resolveOrganizationContext,
    now: () => new Date(),
    async listTasks(organizationId) {
      const { data, error } = await supabase
        .from("follow_up_tasks")
        .select(
          "id, organization_id, lead_id, assigned_to, due_at, status, task_type, channel, created_at, updated_at",
        )
        .eq("organization_id", organizationId)
        .eq("status", "pending")
        .order("due_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      return data ?? [];
    },
    async listLeads(organizationId, leadIds) {
      if (leadIds.length === 0) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("id, organization_id, contact_id, status, service_interest")
        .eq("organization_id", organizationId)
        .in("id", leadIds)
        .limit(100);

      if (error) throw error;
      return data ?? [];
    },
    async listContacts(organizationId, contactIds) {
      if (contactIds.length === 0) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, organization_id, full_name, phone_raw, phone_e164, email")
        .eq("organization_id", organizationId)
        .in("id", contactIds)
        .limit(100);

      if (error) throw error;
      return data ?? [];
    },
  };
}

export async function readTenantFollowUpReminders(
  dependencies?: TenantFollowUpReminderDependencies,
): Promise<TenantFollowUpReminderReadResult> {
  try {
    const effectiveDependencies = dependencies ?? (await createDefaultDependencies());
    const contextResult = await effectiveDependencies.resolveContext();
    if (contextResult.status !== "ok") return contextResult;

    const organizationId = contextResult.context.organization.id;
    const taskParse = z.array(taskRowSchema).safeParse(await effectiveDependencies.listTasks(organizationId));
    if (!taskParse.success) return { status: "unavailable" };
    if (taskParse.data.some((task) => task.organization_id !== organizationId)) {
      return { status: "unavailable" };
    }

    const leadIds = [...new Set(taskParse.data.map((task) => task.lead_id))];
    const leadParse = z.array(leadRowSchema).safeParse(await effectiveDependencies.listLeads(organizationId, leadIds));
    if (!leadParse.success) return { status: "unavailable" };
    if (leadParse.data.some((lead) => lead.organization_id !== organizationId)) {
      return { status: "unavailable" };
    }

    const leadMap = new Map(leadParse.data.map((lead) => [lead.id, lead]));
    if (leadIds.some((leadId) => !leadMap.has(leadId))) return { status: "unavailable" };

    const contactIds = [...new Set(leadParse.data.map((lead) => lead.contact_id))];
    const contactParse = z
      .array(contactRowSchema)
      .safeParse(await effectiveDependencies.listContacts(organizationId, contactIds));
    if (!contactParse.success) return { status: "unavailable" };
    if (contactParse.data.some((contact) => contact.organization_id !== organizationId)) {
      return { status: "unavailable" };
    }

    const contactMap = new Map(contactParse.data.map((contact) => [contact.id, contact]));
    if (contactIds.some((contactId) => !contactMap.has(contactId))) {
      return { status: "unavailable" };
    }

    const now = effectiveDependencies.now();
    if (Number.isNaN(now.getTime())) return { status: "unavailable" };

    const reminders: TenantFollowUpReminder[] = [];
    for (const task of taskParse.data) {
      const lead = leadMap.get(task.lead_id);
      if (!lead) return { status: "unavailable" };
      const contact = contactMap.get(lead.contact_id);
      if (!contact) return { status: "unavailable" };
      const bucket = classifyDueAt(task.due_at, now);
      if (!bucket) return { status: "unavailable" };

      reminders.push({
        taskId: task.id,
        leadId: task.lead_id,
        dueAt: task.due_at,
        bucket,
        taskType: task.task_type,
        channel: task.channel,
        assignedTo: task.assigned_to,
        leadStatus: lead.status,
        serviceInterest: lead.service_interest,
        contact: {
          fullName: contact.full_name,
          phone: contact.phone_e164 ?? contact.phone_raw,
          email: contact.email,
        },
      });
    }

    return {
      status: "ok",
      organizationId,
      generatedAt: now.toISOString(),
      reminders,
    };
  } catch {
    return { status: "unavailable" };
  }
}
