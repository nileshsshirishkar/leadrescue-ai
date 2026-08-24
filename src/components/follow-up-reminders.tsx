"use client";

import { AlertCircle, CalendarClock, Clock3, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReminderBucket, TenantFollowUpReminder } from "@/lib/supabase/tenant-follow-up-reminders";

type ReminderResponse = {
  ok: true;
  organizationId: string;
  generatedAt: string;
  reminders: TenantFollowUpReminder[];
};

const BUCKET_ORDER: ReminderBucket[] = ["overdue", "due", "upcoming"];

const BUCKET_COPY: Record<ReminderBucket, { label: string; helper: string }> = {
  overdue: { label: "Overdue", helper: "Past the scheduled follow-up time" },
  due: { label: "Due next 24h", helper: "Needs attention within the next day" },
  upcoming: { label: "Upcoming", helper: "Scheduled more than 24 hours ahead" },
};

function formatDueAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid due time";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ReminderCard({ reminder }: { reminder: TenantFollowUpReminder }) {
  const phoneOrEmail = reminder.contact.phone ?? reminder.contact.email;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{reminder.contact.fullName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {reminder.serviceInterest || "Service not recorded"}
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
          {reminder.leadStatus || "Status not recorded"}
        </span>
      </div>
      <div className="mt-4 flex items-start gap-2 text-xs font-semibold text-slate-700">
        <CalendarClock className="mt-0.5 size-4 shrink-0 text-cyan-700" aria-hidden="true" />
        <span>{formatDueAt(reminder.dueAt)}</span>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        {phoneOrEmail ? `Contact: ${phoneOrEmail}` : "No phone or email recorded."}
      </p>
    </article>
  );
}

export function FollowUpReminders() {
  const [reminders, setReminders] = useState<TenantFollowUpReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/follow-up-reminders", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = (await response.json()) as Partial<ReminderResponse> & { error?: string };
      if (!response.ok || body.ok !== true || !Array.isArray(body.reminders)) {
        throw new Error(body.error || "Follow-up reminders could not be loaded.");
      }

      setReminders(body.reminders);
      setGeneratedAt(typeof body.generatedAt === "string" ? body.generatedAt : null);
    } catch (loadError) {
      setReminders([]);
      setGeneratedAt(null);
      setError(loadError instanceof Error ? loadError.message : "Follow-up reminders could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const grouped = useMemo(() => {
    const groups: Record<ReminderBucket, TenantFollowUpReminder[]> = {
      overdue: [],
      due: [],
      upcoming: [],
    };
    for (const reminder of reminders) groups[reminder.bucket].push(reminder);
    return groups;
  }, [reminders]);

  return (
    <section id="follow-ups" className="mt-8 scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/[0.03] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">
            <Clock3 className="size-4" aria-hidden="true" /> Follow-up reminders
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Server-backed due, overdue and upcoming work</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Pending follow-up tasks come from the shared LeadRescue workspace and use the saved task due time, not browser-local lead state.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#123d78] hover:border-blue-200 disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : isLoading ? (
        <div role="status" className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
          Loading shared follow-up tasks…
        </div>
      ) : reminders.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-bold text-slate-800">No pending follow-up tasks</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">A task will appear here after an active lead is worked and a next follow-up time is saved.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {BUCKET_ORDER.map((bucket) => (
            <div key={bucket} className="rounded-2xl bg-slate-50/70 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{BUCKET_COPY[bucket].label}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{BUCKET_COPY[bucket].helper}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                  {grouped[bucket].length}
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {grouped[bucket].length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-xs text-slate-400">None</p>
                ) : (
                  grouped[bucket].map((reminder) => <ReminderCard key={reminder.taskId} reminder={reminder} />)
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {generatedAt && (
        <p className="mt-4 text-right text-[10px] text-slate-400">Last refreshed {formatDueAt(generatedAt)}</p>
      )}
    </section>
  );
}
