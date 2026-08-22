import { afterEach, describe, expect, it } from "vitest";
import { parseLoginForm } from "@/lib/auth/login";
import { getSupabasePublicConfig, requireSupabasePublicConfig } from "@/lib/supabase/config";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;

  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});

describe("Supabase authentication configuration", () => {
  it("returns null when either public environment value is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("returns trimmed public configuration when both values exist", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://example.supabase.co ";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " test-publishable-key ";

    expect(getSupabasePublicConfig()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "test-publishable-key",
    });
  });

  it("fails closed when required configuration is unavailable", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(() => requireSupabasePublicConfig()).toThrow("Supabase authentication is not configured.");
  });
});

describe("login form validation", () => {
  it("accepts a valid email and password", () => {
    const formData = new FormData();
    formData.set("email", " user@example.com ");
    formData.set("password", "correct horse battery staple");

    const parsed = parseLoginForm(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("user@example.com");
  });

  it("rejects malformed email and empty password", () => {
    const formData = new FormData();
    formData.set("email", "not-an-email");
    formData.set("password", "");

    expect(parseLoginForm(formData).success).toBe(false);
  });
});
