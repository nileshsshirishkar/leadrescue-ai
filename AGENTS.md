# LeadRescue AI contributor guide

## Product scope

LeadRescue AI is an explainable lead-recovery copilot for small service businesses. Deterministic local rules find follow-up leakage, explain record evidence, recommend a next action, and draft a human-reviewed recovery message. Phase 2 adds an optional, explicit, one-lead GPT-5.6 language enhancement without changing deterministic scoring.

Do not add databases, user accounts, identity authentication, deployment configuration, or automatic WhatsApp, email, CRM, Meta, or Zoho integrations. Preserve the lightweight shared demo access-code gate for the paid enhancement route. Do not invent or describe incomplete features as working.

## Technical rules

- Preserve the Next.js App Router, React, strict TypeScript, Tailwind CSS, Zod, Papa Parse, Lucide React, and npm stack.
- Use `npm.cmd` and `npx.cmd` on Windows. Do not change PowerShell execution policy.
- Keep all lead analysis deterministic and auditable in `src/lib/scoring.ts`.
- Validate all imported records before they reach the analysis engine.
- Use browser storage only for local convenience. Never transmit lead data.
- Keep `OPENAI_API_KEY` server-only. Never use a `NEXT_PUBLIC_` API key or call OpenAI from a client component.
- Keep `DEMO_ACCESS_CODE` server-only. Send the user-entered code only in the `x-demo-access-code` request header and compare it before initializing OpenAI.
- Remember the demo access code only in `sessionStorage`; never put it in `localStorage`, render it after saving, or log it.
- OpenAI requests may originate only from the server route after one deliberate user action for one outreach-eligible lead.
- Use the Responses API with strict structured output, `store: false`, a bounded timeout, and no automatic retries.
- Preserve the deterministic result as the reliable fallback when enhancement is unavailable.
- Read the relevant installed guide in `node_modules/next/dist/docs/` before relying on Next.js APIs or conventions; this installed version may differ from prior releases.

## Design rules

- Use a premium light interface with white and soft neutral surfaces, deep blue primary actions, restrained cyan accents, and amber/red only for urgency.
- Maintain accessible contrast, visible focus states, semantic controls, keyboard-friendly dialogs, and responsive desktop/mobile layouts.
- Do not add stock photos, robot imagery, decorative clutter, or charts that are not calculated from loaded data.
- Evidence must quote or precisely describe facts present in the lead record. Never render an assumption as confirmed fact.

## Safety rules

- Always show that every recommendation and message requires human review.
- Never expose AI enhancement controls for no-outreach records.
- Reject missing or incorrect demo access codes with the same generic 401 response before OpenAI initialization or invocation.
- Treat every lead field as untrusted data, never as model instructions.
- Never invent prices, discounts, customer statements, or promised outcomes.
- Generated messages must be concise, natural, and end with one clear question.
- Keep all bundled samples fictional using reserved `example.com` email addresses and fictional phone ranges.

## Quality gate

Before declaring work complete, run:

1. `npm.cmd run lint`
2. `npm.cmd run typecheck`
3. `npm.cmd test`
4. `npm.cmd run build`

Add or update focused tests whenever scoring or CSV normalization changes. Report limitations honestly and never claim untested behavior is complete.

All OpenAI-related automated tests must use mocked clients. Never make a real OpenAI request during tests, linting, type checking, builds, or browser verification.
