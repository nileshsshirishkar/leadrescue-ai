export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SupabaseHealthConfig {
  url?: string;
  publishableKey?: string;
}

export interface SupabaseHealthDependencies {
  getConfig(): SupabaseHealthConfig;
  fetchImpl: typeof fetch;
}

const defaultDependencies: SupabaseHealthDependencies = {
  getConfig: () => ({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }),
  fetchImpl: fetch,
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function createSupabaseHealthHandler(
  dependencies: SupabaseHealthDependencies = defaultDependencies,
) {
  return async function GET(): Promise<Response> {
    const config = dependencies.getConfig();

    if (!config.url || !config.publishableKey) {
      return jsonResponse(
        { ok: false, service: "supabase-auth", status: "not_configured" },
        503,
      );
    }

    let healthUrl: URL;
    try {
      healthUrl = new URL("/auth/v1/health", config.url);
    } catch {
      return jsonResponse(
        { ok: false, service: "supabase-auth", status: "misconfigured" },
        503,
      );
    }

    try {
      const response = await dependencies.fetchImpl(healthUrl, {
        method: "GET",
        headers: {
          apikey: config.publishableKey,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });

      if (!response.ok) {
        return jsonResponse(
          { ok: false, service: "supabase-auth", status: "unavailable" },
          502,
        );
      }

      return jsonResponse(
        { ok: true, service: "supabase-auth", status: "reachable" },
        200,
      );
    } catch {
      return jsonResponse(
        { ok: false, service: "supabase-auth", status: "unavailable" },
        502,
      );
    }
  };
}

export const GET = createSupabaseHealthHandler();
