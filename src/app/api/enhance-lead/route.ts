import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  enhancementApiResponseSchema,
  enhancementRequestSchema,
  enhancementResultSchema,
  isEnhancementAllowed,
  type EnhancementRequest,
} from "@/lib/enhancement";
import { buildEnhancementModelInput } from "@/lib/enhancement-prompt";
import { hasAuthenticatedUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

interface RuntimeConfig {
  apiKey?: string;
  model?: string;
  demoAccessCode?: string;
}

interface ModelConfig {
  apiKey: string;
  model: string;
}

interface ModelResult {
  enhancement: unknown;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface EnhanceLeadDependencies {
  authorizeRequest(): Promise<boolean>;
  getConfig(): RuntimeConfig;
  invokeModel(request: EnhancementRequest, config: ModelConfig): Promise<ModelResult>;
}

async function invokeOpenAI(request: EnhancementRequest, config: ModelConfig): Promise<ModelResult> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    timeout: 15_000,
    maxRetries: 0,
  });

  const response = await client.responses.parse({
    model: config.model,
    store: false,
    max_output_tokens: 700,
    reasoning: { effort: "none" },
    input: buildEnhancementModelInput(request),
    text: {
      format: zodTextFormat(enhancementResultSchema, "lead_enhancement"),
      verbosity: "low",
    },
  });

  return {
    enhancement: response.output_parsed,
    ...(response.usage
      ? {
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          },
        }
      : {}),
  };
}

const defaultDependencies: EnhanceLeadDependencies = {
  authorizeRequest: hasAuthenticatedUser,
  getConfig: () => ({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    demoAccessCode: process.env.DEMO_ACCESS_CODE,
  }),
  invokeModel: invokeOpenAI,
};

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

function hasValidDemoAccess(submittedCode: string | null, configuredCode: string | undefined): boolean {
  if (!submittedCode || !configuredCode || submittedCode.length > 256 || configuredCode.length > 256) return false;

  const submittedDigest = createHash("sha256").update(submittedCode, "utf8").digest();
  const configuredDigest = createHash("sha256").update(configuredCode, "utf8").digest();
  return timingSafeEqual(submittedDigest, configuredDigest);
}

export function createEnhanceLeadHandler(dependencies: EnhanceLeadDependencies = defaultDependencies) {
  return async function POST(request: Request): Promise<Response> {
    if (!(await dependencies.authorizeRequest())) {
      return jsonError("Authentication required.", 401);
    }

    const config = dependencies.getConfig();
    if (!hasValidDemoAccess(request.headers.get("x-demo-access-code"), config.demoAccessCode)) {
      return jsonError("Demo access required.", 401);
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 32_000) {
      return jsonError("Request is too large.", 413);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Request body must be valid JSON.", 400);
    }

    const parsedRequest = enhancementRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      return jsonError("Request validation failed.", 400);
    }

    if (!isEnhancementAllowed(parsedRequest.data)) {
      return jsonError("AI enhancement is unavailable because no outreach is recommended.", 403);
    }

    if (!config.apiKey || !config.model) {
      return jsonError("AI enhancement is not configured.", 503);
    }

    try {
      const modelResult = await dependencies.invokeModel(parsedRequest.data, {
        apiKey: config.apiKey,
        model: config.model,
      });
      const validated = enhancementApiResponseSchema.safeParse(modelResult);
      if (!validated.success) {
        return jsonError("AI enhancement returned an invalid result. Deterministic analysis remains available.", 502);
      }
      return Response.json(validated.data);
    } catch {
      return jsonError("AI enhancement is temporarily unavailable. Deterministic analysis remains available.", 502);
    }
  };
}

export const POST = createEnhanceLeadHandler();
