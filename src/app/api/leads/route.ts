import { persistTenantLead } from "@/lib/supabase/tenant-lead-write";
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

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const result = await persistTenantLead(body);

  switch (result.status) {
    case "created":
      return jsonResponse(
        { ok: true, result: "created", leadId: result.leadId },
        201,
      );
    case "existing":
      return jsonResponse(
        { ok: true, result: "existing", leadId: result.leadId },
        200,
      );
    case "invalid":
      return jsonResponse({ ok: false, error: "Invalid lead payload." }, 400);
    case "unauthenticated":
      return jsonResponse({ ok: false, error: "Authentication required." }, 401);
    case "missing-membership":
      return jsonResponse({ ok: false, error: "Organization access is not configured." }, 403);
    case "ambiguous-membership":
      return jsonResponse({ ok: false, error: "Organization selection is required." }, 409);
    case "unavailable":
      return jsonResponse({ ok: false, error: "Lead could not be saved." }, 503);
  }
}
