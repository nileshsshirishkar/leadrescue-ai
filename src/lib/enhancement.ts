import { z } from "zod";
import { getOutreachPresentation } from "@/lib/outreach";
import type { LeadAnalysis } from "@/lib/types";

const recordText = z.string().trim().max(2_000);
const conciseText = z.string().trim().min(1).max(500);

export const enhancementRequestSchema = z.object({
  lead: z.object({
    name: z.string().trim().min(1).max(160),
    businessType: recordText,
    serviceInterest: recordText,
    status: recordText,
    enquiryText: recordText,
    lastContactDate: z.string().trim().max(80),
    followUpCount: z.number().int().min(0).max(999),
    appointmentStatus: recordText,
    quotedPrice: z.number().finite().min(0).optional(),
    budgetSignal: recordText,
    notes: recordText,
  }).strict(),
  deterministic: z.object({
    leakageType: z.string().trim().min(1).max(240),
    evidence: z.array(z.string().trim().min(1).max(500)).min(1).max(16),
    recommendedNextAction: z.string().trim().min(1).max(500),
    actionDeadline: z.string().trim().min(1).max(160),
    likelyObjection: z.string().trim().max(500),
    missingInformation: z.array(z.string().trim().min(1).max(240)).max(16),
    recoveryMessage: z.string().trim().min(1).max(800),
  }).strict(),
}).strict();

export const enhancementResultSchema = z.object({
  enhancedExplanation: conciseText,
  enhancedRecoveryMessage: z.string().trim().min(1).max(600).refine(
    (message) => message.endsWith("?") && (message.match(/\?/g) ?? []).length === 1,
    "Recovery message must end with exactly one clear question",
  ),
  conversationGuidance: z.array(z.string().trim().min(1).max(220)).min(2).max(3),
  uncertaintyNote: z.string().trim().max(400),
}).strict();

export const tokenUsageSchema = z.object({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
}).strict();

export const enhancementApiResponseSchema = z.object({
  enhancement: enhancementResultSchema,
  usage: tokenUsageSchema.optional(),
}).strict();

export type EnhancementRequest = z.infer<typeof enhancementRequestSchema>;
export type EnhancementResult = z.infer<typeof enhancementResultSchema>;
export type TokenUsage = z.infer<typeof tokenUsageSchema>;
export type EnhancementApiResponse = z.infer<typeof enhancementApiResponseSchema>;

export function createEnhancementRequest(analysis: LeadAnalysis): EnhancementRequest {
  return {
    lead: {
      name: analysis.lead.name,
      businessType: analysis.lead.businessType,
      serviceInterest: analysis.lead.serviceInterest,
      status: analysis.lead.status,
      enquiryText: analysis.lead.enquiryText,
      lastContactDate: analysis.lead.lastContactDate ?? "",
      followUpCount: analysis.lead.followUpCount,
      appointmentStatus: analysis.lead.appointmentStatus,
      ...(analysis.lead.quotedPrice === undefined ? {} : { quotedPrice: analysis.lead.quotedPrice }),
      budgetSignal: analysis.lead.budgetSignal,
      notes: analysis.lead.notes,
    },
    deterministic: {
      leakageType: analysis.leakageType,
      evidence: analysis.evidence,
      recommendedNextAction: analysis.recommendedNextAction,
      actionDeadline: analysis.actionDeadline,
      likelyObjection: analysis.likelyObjection,
      missingInformation: analysis.missingInformation,
      recoveryMessage: analysis.recoveryMessage,
    },
  };
}

export function isEnhancementAllowed(request: EnhancementRequest): boolean {
  return getOutreachPresentation({
    leakageType: request.deterministic.leakageType,
    recommendedNextAction: request.deterministic.recommendedNextAction,
    actionDeadline: request.deterministic.actionDeadline,
    recoveryMessage: request.deterministic.recoveryMessage,
  }).customerOutreachRecommended;
}

export function getEnhancementControls(analysis: LeadAnalysis) {
  const allowed = isEnhancementAllowed(createEnhancementRequest(analysis));
  return {
    showEnhanceButton: allowed,
    allowEnhancement: allowed,
  };
}

function hashString(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ code ^ index, 0x85ebca6b) >>> 0;
  }

  return `${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
}

export function createEnhancementFingerprint(analysis: LeadAnalysis): string {
  return `v1-${hashString(JSON.stringify(createEnhancementRequest(analysis)))}`;
}

const CACHE_PREFIX = "leadrescue-phase2-enhancement";
const cacheEntrySchema = z.object({
  fingerprint: z.string().min(1).max(120),
  response: enhancementApiResponseSchema,
}).strict();

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface MutableStorageLike extends StorageLike {
  readonly length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
}

const DEMO_ACCESS_STORAGE_KEY = "leadrescue-demo-access-code";

export function readDemoAccessCode(storage: Pick<Storage, "getItem">): string {
  return storage.getItem(DEMO_ACCESS_STORAGE_KEY) ?? "";
}

export function writeDemoAccessCode(storage: Pick<Storage, "setItem">, accessCode: string): void {
  storage.setItem(DEMO_ACCESS_STORAGE_KEY, accessCode);
}

export function clearDemoAccessCode(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(DEMO_ACCESS_STORAGE_KEY);
}

export function getEnhancementCacheKey(fingerprint: string): string {
  return `${CACHE_PREFIX}:${fingerprint}`;
}

export function readCachedEnhancement(storage: StorageLike, fingerprint: string): EnhancementApiResponse | null {
  try {
    const stored = storage.getItem(getEnhancementCacheKey(fingerprint));
    if (!stored) return null;
    const parsed = cacheEntrySchema.safeParse(JSON.parse(stored));
    return parsed.success && parsed.data.fingerprint === fingerprint ? parsed.data.response : null;
  } catch {
    return null;
  }
}

export function writeCachedEnhancement(
  storage: StorageLike,
  fingerprint: string,
  response: EnhancementApiResponse,
): void {
  storage.setItem(getEnhancementCacheKey(fingerprint), JSON.stringify({ fingerprint, response }));
}

export function clearCachedEnhancements(storage: MutableStorageLike): number {
  const cacheKeys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(`${CACHE_PREFIX}:`)) cacheKeys.push(key);
  }
  cacheKeys.forEach((key) => storage.removeItem(key));
  return cacheKeys.length;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class EnhancementRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "EnhancementRequestError";
  }
}

export function createEnhancementRequester(fetcher: FetchLike) {
  const inFlight = new Map<string, Promise<EnhancementApiResponse>>();

  return function requestEnhancement(fingerprint: string, payload: EnhancementRequest, demoAccessCode: string) {
    const existing = inFlight.get(fingerprint);
    if (existing) return existing;

    const request = (async () => {
      const response = await fetcher("/api/enhance-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-access-code": demoAccessCode,
        },
        body: JSON.stringify(payload),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error
          : "AI enhancement is temporarily unavailable. The deterministic result is still ready to use.";
        throw new EnhancementRequestError(message, response.status);
      }

      const parsed = enhancementApiResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error("AI enhancement returned an invalid result. The deterministic result is still ready to use.");
      }
      return parsed.data;
    })().finally(() => {
      inFlight.delete(fingerprint);
    });

    inFlight.set(fingerprint, request);
    return request;
  };
}

export const requestLeadEnhancement = createEnhancementRequester((input, init) => fetch(input, init));
