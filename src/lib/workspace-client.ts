import { z } from "zod";
import { leadArraySchema } from "@/lib/schemas";
import type { Lead } from "@/lib/types";

const workspaceResponseSchema = z
  .object({
    ok: z.literal(true),
    organizationId: z.string().uuid(),
    leads: leadArraySchema,
  })
  .strict();

export class WorkspaceRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WorkspaceRequestError";
  }
}

export interface WorkspaceSnapshot {
  organizationId: string;
  leads: Lead[];
}

export async function fetchWorkspaceSnapshot(
  fetcher: typeof fetch = fetch,
): Promise<WorkspaceSnapshot> {
  const response = await fetcher("/api/workspace", {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new WorkspaceRequestError("The shared workspace returned an invalid response.", response.status);
  }

  if (!response.ok) {
    const error = z.object({ error: z.string().min(1) }).safeParse(body);
    throw new WorkspaceRequestError(
      error.success ? error.data.error : "The shared workspace could not be loaded.",
      response.status,
    );
  }

  const parsed = workspaceResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new WorkspaceRequestError("The shared workspace returned invalid lead data.", response.status);
  }

  return {
    organizationId: parsed.data.organizationId,
    leads: parsed.data.leads,
  };
}
