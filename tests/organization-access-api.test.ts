import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveOrganizationAccessContext: vi.fn(),
}));

vi.mock("@/lib/supabase/organization-context", () => ({
  resolveOrganizationAccessContext: mocks.resolveOrganizationAccessContext,
}));

import { GET as getOrganizationContext } from "@/app/api/organization-context/route";
import { createEnhanceLeadHandler } from "@/app/api/enhance-lead/route";

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("paused organization API enforcement", () => {
  beforeEach(() => {
    mocks.resolveOrganizationAccessContext.mockReset();
  });

  it("returns a sanitized 403 from organization context when paused", async () => {
    mocks.resolveOrganizationAccessContext.mockResolvedValue({
      status: "paused",
      context: {
        organization: {
          id: "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed",
          name: "LeadRescue QA",
          slug: "leadrescue-qa",
          access_status: "paused",
        },
        role: "owner",
      },
    });

    const response = await getOrganizationContext();

    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(readJson(response)).resolves.toEqual({
      ok: false,
      error: "Organization access is paused.",
    });
  });

  it("blocks AI enhancement before configuration or model access when organization access is forbidden", async () => {
    const getConfig = vi.fn(() => ({
      apiKey: "test-key-never-sent",
      model: "gpt-5.6",
      demoAccessCode: "correct-demo-code",
    }));
    const invokeModel = vi.fn();
    const handler = createEnhanceLeadHandler({
      authorizeRequest: async () => "forbidden",
      getConfig,
      invokeModel,
    });

    const response = await handler(
      new Request("http://localhost/api/enhance-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-access-code": "correct-demo-code",
        },
        body: JSON.stringify({ test: true }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toEqual({
      error: "Organization access is unavailable.",
    });
    expect(getConfig).not.toHaveBeenCalled();
    expect(invokeModel).not.toHaveBeenCalled();
  });
});
