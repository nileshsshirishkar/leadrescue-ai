import { redirect } from "next/navigation";
import { LeadRescueApp } from "@/components/lead-rescue-app";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  if (!getSupabasePublicConfig()) redirect("/login?error=not-configured");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <>
      <form action="/auth/signout" method="post" className="fixed right-4 top-4 z-50">
        <button
          type="submit"
          className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
        >
          Sign out
        </button>
      </form>
      <LeadRescueApp />
    </>
  );
}
