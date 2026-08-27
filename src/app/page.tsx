import { redirect } from "next/navigation";
import { FollowUpReminders } from "@/components/follow-up-reminders";
import { WorkspaceLeadRescueApp } from "@/components/workspace-lead-rescue-app";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { resolveOrganizationAccessContext } from "@/lib/supabase/organization-context";

function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
      >
        Sign out
      </button>
    </form>
  );
}

export default async function Home() {
  if (!getSupabasePublicConfig()) redirect("/login?error=not-configured");

  const access = await resolveOrganizationAccessContext();
  if (access.status === "unauthenticated") redirect("/login");

  if (access.status === "paused") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-4 py-12">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/[0.04] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">LeadRescue access</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">LeadRescue access is paused</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Contact support to reactivate this organization. Your LeadRescue data remains stored and is not deleted by a pause.
          </p>
          <div className="mt-6 flex justify-center">
            <SignOutButton />
          </div>
        </section>
      </main>
    );
  }

  if (access.status !== "ok") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-4 py-12">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/[0.04] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">LeadRescue access</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Organization access is unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This account does not currently have a usable LeadRescue organization context. Contact support if you believe this is unexpected.
          </p>
          <div className="mt-6 flex justify-center">
            <SignOutButton />
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="fixed right-4 top-4 z-50">
        <SignOutButton />
      </div>
      <WorkspaceLeadRescueApp />
      <div className="bg-[#f5f8fc] px-4 pb-10 lg:pl-[260px] lg:pr-6">
        <div className="mx-auto max-w-[1600px]">
          <FollowUpReminders />
        </div>
      </div>
    </>
  );
}
