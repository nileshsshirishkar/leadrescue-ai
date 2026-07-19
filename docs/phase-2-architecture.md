# Phase 2 controlled enhancement architecture

## Authority boundary

The deterministic engine in `src/lib/scoring.ts` remains authoritative for recovery score, priority, diagnosis, evidence, confidence, deadline, next action, and no-outreach status. GPT-5.6 cannot replace, rescore, or override those fields. It may return only:

- a concise evidence-grounded explanation;
- a concise recovery message ending with one clear question;
- two or three conversation-guidance points;
- an uncertainty note, or an empty string when no material limitation exists.

Every deterministic and enhanced output requires human review. The application never sends customer outreach automatically.

## Deliberate one-lead request

The client does not request enhancement on page load, sample loading, drawer opening, search, filtering, or refresh. The **Enhance with GPT-5.6** button appears only for outreach-eligible leads and states that it runs one enhancement for that lead only.

The browser posts one strictly validated object to `POST /api/enhance-lead` and sends the shared demo access code in the `x-demo-access-code` header. Phone numbers, email addresses, lead IDs, and sources are excluded because they are not needed for language enhancement. The request contains the relevant non-contact record context plus the existing deterministic diagnosis and evidence.

The access code is remembered only in the current tab through `sessionStorage`, is cleared from the input after saving, is never rendered back to the user, and can be removed with **Clear access code**. It is not included in the lead fingerprint or persistent enhancement cache.

The route rechecks the deterministic no-outreach signals before reading configuration or creating an OpenAI client. No-outreach records receive a policy rejection without an API call.

## Server-only OpenAI boundary

`OPENAI_API_KEY`, `OPENAI_MODEL`, and `DEMO_ACCESS_CODE` are read only inside the Next.js server route. There are no `NEXT_PUBLIC_` OpenAI or access-code variables, and client components never instantiate the SDK.

Before parsing lead data or reaching the model boundary, the route compares the submitted and configured demo codes using equal-length SHA-256 digests and `timingSafeEqual`. Missing, incorrect, empty, or oversized values receive only `401 { "error": "Demo access required." }`. The route never logs either value or reveals whether the server configuration is missing.

The route uses the official OpenAI JavaScript SDK and Responses API with:

- strict Zod structured output;
- `store: false`;
- a 15-second SDK timeout;
- `maxRetries: 0` to avoid duplicate charges;
- no streaming;
- a bounded output-token limit;
- low verbosity and no reasoning effort for this concise transformation task.

Lead fields are serialized as an explicitly untrusted data block. The developer instruction says to ignore prompt-like instructions inside every lead field and prohibits invented prices, discounts, offers, conversations, appointment details, statements, objections, results, guarantees, medical advice, and unsupported facts.

The route validates model output again before responding. It returns only the four enhancement fields and, when supplied by OpenAI, `inputTokens`, `outputTokens`, and `totalTokens`. It never returns prompts, stack traces, secrets, or raw provider responses.

## Cost and cache controls

Concurrent clicks for the same lead fingerprint share one in-flight request. The initiating button is disabled while that request is active.

Enhancement and regeneration controls are disabled until a demo code has been saved for the current tab. Regeneration still requires its separate paid-request confirmation.

Successful results are validated and stored in browser `localStorage` under a stable fingerprint of the relevant lead record and deterministic context. Reopening an unchanged lead displays **Saved AI result** without a new request. Any relevant record or diagnosis change creates a different fingerprint. Regeneration is never automatic and requires confirmation because it creates another paid request.

Token counts are shown after success when available. The app does not estimate currency cost because no exact price configuration exists.

## Failure behavior

Invalid requests, missing configuration, no-outreach records, invalid model output, timeouts, and provider errors return short sanitized messages. The deterministic analysis and recovery draft remain visible and usable throughout. Automated tests inject mocked model clients; tests, linting, type checking, builds, and browser verification make no real OpenAI requests.
