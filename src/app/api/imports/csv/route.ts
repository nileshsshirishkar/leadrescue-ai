import { importTenantCsvRows } from "@/lib/supabase/csv-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const result = await importTenantCsvRows(body);
  switch (result.status) {
    case "ok":
      return jsonResponse({ ok: true, ...result }, 200);
    case "invalid":
      return jsonResponse({ ok: false, error: "Invalid CSV import payload." }, 400);
    case "unauthenticated":
      return jsonResponse({ ok: false, error: "Authentication required." }, 401);
    case "missing-membership":
      return jsonResponse({ ok: false, error: "Organization access is not configured." }, 403);
    case "ambiguous-membership":
      return jsonResponse({ ok: false, error: "Organization selection is required." }, 409);
    case "unavailable":
      return jsonResponse({ ok: false, error: "CSV import is temporarily unavailable." }, 503);
  }
}
