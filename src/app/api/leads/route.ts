import { readTenantLeads } from "@/lib/supabase/tenant-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(): Promise<Response> {
  const result = await readTenantLeads();

  switch (result.status) {
    case "ok":
      return jsonResponse(
        {
          ok: true,
          organizationId: result.organizationId,
          leads: result.leads,
        },
        200,
      );
    case "unauthenticated":
      return jsonResponse({ ok: false, error: "Authentication required." }, 401);
    case "missing-membership":
      return jsonResponse({ ok: false, error: "Organization access is not configured." }, 403);
    case "ambiguous-membership":
      return jsonResponse({ ok: false, error: "Organization selection is required." }, 409);
    case "unavailable":
      return jsonResponse({ ok: false, error: "Lead data is unavailable." }, 503);
  }
}
