import { readTenantLeadDetail } from "@/lib/supabase/tenant-lead-detail";
import { updateTenantLeadWorkflow } from "@/lib/supabase/tenant-lead-workflow";

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ leadId: string }> },
): Promise<Response> {
  const { leadId } = await context.params;
  const result = await readTenantLeadDetail(leadId);

  switch (result.status) {
    case "ok":
      return jsonResponse(
        {
          ok: true,
          organizationId: result.organizationId,
          lead: result.lead,
          contact: result.contact,
        },
        200,
      );
    case "not-found":
      return jsonResponse({ ok: false, error: "Lead not found." }, 404);
    case "unauthenticated":
      return jsonResponse({ ok: false, error: "Authentication required." }, 401);
    case "missing-membership":
      return jsonResponse({ ok: false, error: "Organization access is not configured." }, 403);
    case "ambiguous-membership":
      return jsonResponse({ ok: false, error: "Organization selection is required." }, 409);
    case "unavailable":
      return jsonResponse({ ok: false, error: "Lead detail is unavailable." }, 503);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ leadId: string }> },
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const { leadId } = await context.params;
  const result = await updateTenantLeadWorkflow(leadId, body);

  switch (result.status) {
    case "ok":
      return jsonResponse({ ok: true, result: result.result }, 200);
    case "invalid":
      return jsonResponse({ ok: false, error: "Invalid lead workflow update." }, 400);
    case "invalid-transition":
      return jsonResponse({ ok: false, error: "Lead workflow transition is not allowed." }, 409);
    case "not-found":
      return jsonResponse({ ok: false, error: "Lead not found." }, 404);
    case "unauthenticated":
      return jsonResponse({ ok: false, error: "Authentication required." }, 401);
    case "missing-membership":
      return jsonResponse({ ok: false, error: "Organization access is not configured." }, 403);
    case "ambiguous-membership":
      return jsonResponse({ ok: false, error: "Organization selection is required." }, 409);
    case "unavailable":
      return jsonResponse({ ok: false, error: "Lead workflow could not be updated." }, 503);
  }
}
