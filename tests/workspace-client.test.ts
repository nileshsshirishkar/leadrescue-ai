import { describe, expect, it, vi } from "vitest";
import {
  fetchWorkspaceSnapshot,
  WorkspaceRequestError,
} from "@/lib/workspace-client";

const lead = {
  id: "207357a1-94e4-4184-a8c8-6f16773a5ea5",
  name: "Avery Example",
  businessType: "Home services",
  phone: "+12025550123",
  email: "avery@example.com",
  serviceInterest: "Annual maintenance plan",
  source: "manual",
  status: "Follow-up needed",
  enquiryText: "Fictional QA enquiry.",
  lastContactDate: "2026-08-19T00:00:00.000Z",
  followUpCount: 1,
  appointmentStatus: "Not booked",
  quotedPrice: 1200,
  budgetSignal: "Asked about monthly payment options",
  notes: "Fictional QA record.",
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchWorkspaceSnapshot", () => {
  it("returns validated shared-workspace leads", async () => {
    const fetcher = vi.fn(async () => response({
      ok: true,
      organizationId: "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed",
      leads: [lead],
    }));

    await expect(fetchWorkspaceSnapshot(fetcher as typeof fetch)).resolves.toEqual({
      organizationId: "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed",
      leads: [lead],
    });
    expect(fetcher).toHaveBeenCalledWith("/api/workspace", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  });

  it("surfaces the sanitized API error on authentication failure", async () => {
    const fetcher = vi.fn(async () => response(
      { ok: false, error: "Authentication required." },
      401,
    ));

    await expect(fetchWorkspaceSnapshot(fetcher as typeof fetch)).rejects.toMatchObject({
      name: "WorkspaceRequestError",
      message: "Authentication required.",
      status: 401,
    });
  });

  it("rejects an invalid successful payload instead of trusting browser data", async () => {
    const fetcher = vi.fn(async () => response({
      ok: true,
      organizationId: "b3e33046-b73a-4a09-ae85-bfc55c2fc6ed",
      leads: [{ ...lead, followUpCount: -1 }],
    }));

    await expect(fetchWorkspaceSnapshot(fetcher as typeof fetch)).rejects.toEqual(
      new WorkspaceRequestError("The shared workspace returned invalid lead data.", 200),
    );
  });

  it("rejects non-JSON responses", async () => {
    const fetcher = vi.fn(async () => new Response("upstream unavailable", { status: 503 }));

    await expect(fetchWorkspaceSnapshot(fetcher as typeof fetch)).rejects.toEqual(
      new WorkspaceRequestError("The shared workspace returned an invalid response.", 503),
    );
  });
});
