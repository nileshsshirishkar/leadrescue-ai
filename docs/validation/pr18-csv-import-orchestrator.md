# PR #18 CSV Import Orchestrator Validation

**Status:** IMPLEMENTED AND VERIFIED IN PREVIEW for the server-backed CSV orchestration boundary. UI wiring remains separate.

## Repository guard

All GitHub work targeted exactly `nileshsshirishkar/leadrescue-ai`.

## Scope

PR #18 adds authenticated server-backed CSV import orchestration around the already verified one-lead persistence boundary.

Implemented behavior:

- authenticated `POST /api/imports/csv`
- maximum 100 normalized rows per request
- tenant context resolved once before row persistence
- stable same-import row retry identity `csv:<importId>:<rowNumber>`
- original lead source preserved when supplied
- blank source falls back to `manual_csv`
- bounded row persistence concurrency of 4
- per-row `created`, `existing`, or `error` result
- aggregate created/existing/error counts
- partial-row failure reporting
- no email/phone automatic deduplication
- no service-role bypass
- no provider attribution inferred from the operational retry identity

This slice does not yet replace the browser-local CSV import UI.

## Automated verification

Exact runtime-validated head before this evidence commit:

`7d09a8f649025a8e89d427207d858547580859d7`

GitHub Actions CI #74 passed on that head.

- Verify: PASS
- Database Tests: PASS

The suite covers orchestrator input validation, unique row-number enforcement, stable retry keys, source fallback/preservation, created/existing/error aggregation, fail-closed authentication/tenant context, bounded orchestration behavior, and route response sanitization.

## Exact Preview

Vercel Preview deployment:

- deployment id: `dpl_9ThTED2uBJeSugMXPRj6iGAEVCpk`
- branch: `feat/csv-import-orchestrator`
- exact commit: `7d09a8f649025a8e89d427207d858547580859d7`
- state: READY

## Authenticated runtime validation

Controlled fictional batch import id:

`7e3d9f4b-2875-4e9d-a2bd-4ad5c2a6c181`

Rows 2 and 3 were posted through the authenticated Preview application route.

First request:

- HTTP 200
- created: 2
- existing: 0
- errors: 0
- row 2 lead id: `670e9b88-e73c-4eac-a515-539d92238edf`
- row 3 lead id: `160d3535-698a-49c1-b8c8-5f5616437a3c`

Direct hosted Dev verification after creation confirmed:

- exactly two matching leads
- exactly two corresponding contacts
- exactly one `lead_imported` event for each lead
- persisted status `New` for both rows
- persisted notes `Original PR18 row A` and `Original PR18 row B`

Same-import retry then sent the same import id and row numbers with deliberately changed status, enquiry text, follow-up count, appointment status, budget signal, and notes.

Retry result:

- HTTP 200
- created: 0
- existing: 2
- errors: 0
- same two lead ids returned

Direct hosted Dev verification after retry confirmed no overwrite:

- both statuses remained `New`
- both follow-up counts remained `0`
- original enquiry text remained
- original blank appointment and budget fields remained
- original notes remained
- each lead still had exactly one `lead_imported` event

Invalid payload validation:

- invalid import id plus empty row array returned HTTP 400
- response was sanitized as `Invalid CSV import payload.`

Vercel runtime logs independently recorded the exact Preview route calls:

- `POST /api/imports/csv 200`
- `POST /api/imports/csv 200`
- `POST /api/imports/csv 400`

## Cleanup

All fictional PR #18 runtime rows were removed after evidence capture.

Direct hosted Dev verification restored the controlled baseline to:

- 1 Auth user
- 1 organization
- 1 membership
- 1 contact
- 1 lead
- 0 lead events
- 0 follow-up tasks
- 0 PR #18 fixture leads

## Gate result

**PASS.** The authenticated server-backed CSV orchestration boundary is runtime-proven in Preview for multi-row creation, stable same-import retry, no overwrite, sanitized invalid input, and clean fixture removal.

## Remaining product boundary

The visible `Choose CSV` and drag-and-drop interface still uses browser-local parsing/storage. It must be wired to this verified endpoint in a separate controlled UI slice before LeadRescue can claim server-backed CSV import through the user interface.

A later re-upload of a CSV is not automatically the same import. No cross-import email/phone deduplication or file-level merge policy is approved by this milestone.

## Promotion boundary

After final CI passes on the exact final PR head, PR #18 may merge to `develop` only.

Do not merge to `main` or change Production as part of this milestone.
