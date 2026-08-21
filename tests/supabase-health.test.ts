import { describe, expect, it, vi } from "vitest";
import { createSupabaseHealthHandler } from "@/app/api/supabase-health/route";

describe("Supabase health route", () => {
  it("returns 503 when configuration is missing", async () => {
    const handler = createSupabaseHealthHandler({
      getConfig: () => ({}),
      fetchImpl: vi.fn(),
    });

    const response = await handler();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      service: "supabase-auth",
      status: "not_configured",
    });
  });

  it("returns 503 when the project URL is invalid", async () => {
    const handler = createSupabaseHealthHandler({
      getConfig: () => ({
        url: "not-a-url",
        publishableKey: "sb_publishable_test",
      }),
      fetchImpl: vi.fn(),
    });

    const response = await handler();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      service: "supabase-auth",
      status: "misconfigured",
    });
  });

  it("checks the Supabase Auth health endpoint without exposing credentials", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ name: "GoTrue" }), { status: 200 }));
    const handler = createSupabaseHealthHandler({
      getConfig: () => ({
        url: "https://example.supabase.co",
        publishableKey: "sb_publishable_test",
      }),
      fetchImpl: fetchImpl as typeof fetch,
    });

    const response = await handler();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "supabase-auth",
      status: "reachable",
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("https://example.supabase.co/auth/v1/health");
    expect(init?.headers).toEqual({ apikey: "sb_publishable_test" });
  });

  it("returns 502 when Supabase is unavailable", async () => {
    const handler = createSupabaseHealthHandler({
      getConfig: () => ({
        url: "https://example.supabase.co",
        publishableKey: "sb_publishable_test",
      }),
      fetchImpl: vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch,
    });

    const response = await handler();
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      service: "supabase-auth",
      status: "unavailable",
    });
  });
});
