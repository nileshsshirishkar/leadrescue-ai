# LeadRescue AI

LeadRescue AI is an explainable lead-recovery copilot for small service businesses. It finds leads that may be slipping through follow-up gaps, shows the exact record evidence behind each diagnosis, recommends a next action, and prepares a concise message for human review.

This repository contains the Phase 2 Build Week workflow. Deterministic scoring remains authoritative and local. For an outreach-eligible lead, a reviewer may deliberately request one optional server-side GPT-5.6 language enhancement. LeadRescue does not send messages, connect to a CRM, or perform automatic outreach.

## Phase 2 workflow

1. Load the 14 fictional demo leads or import a CSV.
2. Validate and normalize each record with Zod and Papa Parse.
3. Run the deterministic analysis rules in the browser.
4. Review live metrics and the ranked Rescue Queue.
5. Open a lead to inspect evidence, confidence, diagnosis, missing information, and deadline.
6. Review and copy the deterministic recovery message draft.
7. Enter the shared demo access code, which is remembered only in the current tab.
8. Optionally click **Enhance with GPT-5.6** for that one outreach-eligible lead.
9. Review the separate AI explanation, message, and conversation guidance before copying it.
10. Reopen an unchanged lead to reuse the locally cached enhancement without spending tokens again.
11. Reset the demo or clear locally stored lead data and saved AI results.

## Local setup (Windows PowerShell)

PowerShell script execution does not need to be changed. Use the Windows command shims:

```powershell
npm.cmd install
npm.cmd run dev
```

Copy `.env.example` to `.env.local` and provide `OPENAI_API_KEY`, `OPENAI_MODEL`, and a non-empty `DEMO_ACCESS_CODE` of at most 256 characters. These values are read only by the server route and must never use a `NEXT_PUBLIC_` prefix.

Open the exact local URL printed by Next.js (normally `http://localhost:3000`).

## Quality commands

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## CSV format

The canonical fields are:

`id`, `name`, `businessType`, `phone`, `email`, `serviceInterest`, `source`, `status`, `enquiryText`, `lastContactDate`, `followUpCount`, `appointmentStatus`, `quotedPrice`, `budgetSignal`, and `notes`.

Common headings such as `Lead ID`, `Full Name`, `Mobile`, `Interested In`, `Lead Source`, `Stage`, `Last Contact`, `Follow Ups`, `Booking Status`, and `Quoted Amount` are normalized automatically. A lead name is required. Invalid rows are skipped and reported without replacing an existing valid workspace when no valid rows remain.

Download [`public/sample-leads.csv`](public/sample-leads.csv) for a fictional example.

## Project structure

- `src/app/` — App Router page, metadata, loading, and graceful error UI.
- `src/components/` — interactive dashboard, import workflow, queue, table, and lead review drawer.
- `src/data/` — 14 fictional lead scenarios generated relative to the current date.
- `src/lib/schemas.ts` — reusable Zod validation.
- `src/lib/csv.ts` — CSV parsing, column aliases, normalization, and row errors.
- `src/lib/scoring.ts` — deterministic scoring, ranking, evidence, actions, and message templates.
- `src/lib/enhancement.ts` — strict request/response schemas, stable cache fingerprints, local cache validation, and duplicate-request prevention.
- `src/lib/enhancement-prompt.ts` — server prompt boundary that treats lead fields as untrusted data.
- `src/app/api/enhance-lead/route.ts` — controlled server-side Responses API route.
- `docs/scoring-methodology.md` — auditable scoring explanation.
- `docs/phase-2-architecture.md` — AI boundary, cost controls, caching, and failure behavior.
- `tests/` — focused deterministic scoring, CSV, outreach-safety, message, cache, and mocked enhancement tests.

## Privacy and safety

- Use only fictional or properly authorized lead data.
- Scoring, diagnosis, priority, evidence, confidence, deadline, and no-outreach decisions remain local and deterministic.
- GPT-5.6 is optional and may enhance language and conversation guidance only.
- Only a deliberate one-lead request can use tokens; page load, sample loading, drawer opening, search, filtering, and refresh do not call the API.
- No-outreach cases cannot invoke GPT.
- Every paid enhancement request must include the shared demo access code. Missing or incorrect codes receive the same generic response before OpenAI can be initialized or called.
- The API key stays server-side, and the OpenAI request uses `store: false`.
- The access code is stored only in the current tab's `sessionStorage`, is never displayed after saving, and can be cleared from the enhancement panel.
- Successful enhancements are cached in browser `localStorage` by a stable fingerprint to avoid unnecessary repeat spending.
- Browser `localStorage` restores the local workspace and caches validated enhancement results; **Clear workspace** removes both.
- Every recommendation and message is marked for human review.
- Templates do not invent discounts, prices, customer statements, or promised results.

## Phase 2 limitations

- AI enhancement requires valid server-side OpenAI credentials and consumes tokens only after the explicit button action.
- The shared demo code is a lightweight cost guard, not user authentication, identity, authorization roles, or a substitute for production rate limiting.
- There is no database, user account system, team sync, automatic outreach, or deployment configuration.
- CSV import supports common aliases, not every CRM export format.
- Dates are interpreted by the browser; ambiguous locale-specific dates should be converted to ISO `YYYY-MM-DD` first.
- The recovery score is a transparent prioritization heuristic, not a prediction of conversion probability.
- Copying requires browser clipboard permission.
- Local data belongs to one browser profile and is not encrypted by the application.
- Cached AI results also belong to one browser profile and can be cleared with browser storage controls.
