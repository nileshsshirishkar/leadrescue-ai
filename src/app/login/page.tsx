import { redirect } from "next/navigation";
import { login } from "@/app/login/actions";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const errorMessages: Record<string, string> = {
  invalid: "Email or password is incorrect.",
  "not-configured": "Authentication is not configured for this environment.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const config = getSupabasePublicConfig();

  if (config) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) redirect("/");
  }

  const error = params.error ? errorMessages[params.error] : undefined;
  const configured = Boolean(config);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-8">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">LeadRescue AI</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use your approved LeadRescue account to open the workspace.
          </p>
        </div>

        {error ? (
          <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {!configured ? (
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Supabase environment values are missing. This environment is intentionally locked until authentication is configured.
          </p>
        ) : (
          <form action={login} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#123d78] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0d315f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
            >
              Sign in
            </button>
          </form>
        )}

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Account creation is controlled during the pilot. Public self-signup is not enabled.
        </p>
      </section>
    </main>
  );
}
