# PR #17 Authenticated One-Lead Create Validation

**Status:** PASS. Authenticated Preview created/existing/invalid runtime behavior is now verified, direct hosted Dev state was checked, and the fictional runtime fixture was cleaned.

## Repository guard

All GitHub work for this validation targeted exactly `nileshsshirishkar/leadrescue-ai`.

## Scope

PR #17 adds the smallest authenticated application write slice after the verified PR #14 database boundary:

- `POST /api/leads`
- strict server-side payload validation
- no caller-supplied authoritative organization id or actor id
- fail-closed organization context resolution before persistence
- authenticated SSR Supabase client calls `public.persist_imported_lead(...)`
- explicit `created` and `existing` responses
- sanitized invalid/auth/membership/database failures
- existing `GET /api/leads` preserved

It does not add bulk CSV orchestration, localStorage migration, contact deduplication, reminders, provider integrations, main changes, or Production changes.

## Official implementation basis

Current Supabase documentation was rechecked before implementation:

- server-side Next.js access uses the SSR server client backed by request cookies
- `auth.getClaims()` is used for protected server identity verification
- PostgreSQL functions are invoked through `supabase.rpc(functionName, args)`
- authenticated Supabase requests carry the user's Auth context into the Data API and RLS boundary

## Automated validation

Implementation head before the runtime-evidence documentation update: `1e4c4165221d172cfe82bfa6a67f508edaf10bf8`.

CI run #70: PASS.

- `Verify`: PASS
  - install
  - lint
  - typecheck
  - unit tests
  - build
- `Database Tests`: PASS
  - local Supabase startup
  - pgTAP database suites

Focused tests cover:

- valid one-lead input returns `created`
- idempotent RPC result returns `existing`
- caller-supplied `organizationId` is rejected before context resolution or persistence
- caller-supplied `actorUserId` is rejected
- malformed/untrimmed idempotency keys are rejected
- unauthenticated and ambiguous tenant context fail closed before persistence
- malformed persistence responses fail closed
- database error details are not exposed
- route returns 201 for `created`
- route returns 200 for `existing`
- invalid JSON and invalid payloads return sanitized 400 responses
- unauthenticated route result maps to 401
- ambiguous membership maps to 409
- persistence failures map to sanitized 503

## Exact Preview validated

Vercel Preview deployment:

- deployment id: `dpl_FTydTsDUDb1diMhEThCVCAzToRnV`
- branch: `feat/authenticated-lead-create`
- commit: `1e4c4165221d172cfe82bfa6a67f508edaf10bf8`
- state: READY

The controlled QA user signed into this exact Preview before the authenticated runtime calls.

## Authenticated runtime evidence

Controlled fictional idempotency key:

- source: `manual_csv`
- source external id: `qa-app-write-20260825-001`

### First authenticated POST

The Preview returned:

- HTTP 201
- `ok: true`
- `result: created`
- lead id `4868e702-8812-450f-99ed-a83b5d81ef73`

Direct hosted Dev verification immediately afterward confirmed:

- the returned lead id existed
- status was `New`
- notes were `Original PR17 runtime value`
- exactly one corresponding contact existed
- exactly one `lead_imported` event existed

### Same-key retry

The second authenticated POST reused the same source and source external id while deliberately sending different human-editable values:

- status: `Changed-On-Retry`
- notes: `THIS MUST NOT OVERWRITE THE ORIGINAL VALUE`

The Preview returned:

- HTTP 200
- `ok: true`
- `result: existing`
- the same lead id `4868e702-8812-450f-99ed-a83b5d81ef73`

Direct hosted Dev verification after the retry confirmed:

- exactly one matching lead
- exactly one matching contact
- exactly one `lead_imported` event
- persisted status remained `New`
- persisted notes remained `Original PR17 runtime value`
- the retry did not overwrite the original values

### Invalid authenticated payload

An authenticated POST with `{ test: true }` returned:

- HTTP 400
- `ok: false`
- `error: Invalid lead payload.`

Vercel runtime logs independently recorded the exact Preview requests as:

- `POST /api/leads 201`
- `POST /api/leads 200`
- `POST /api/leads 400`

## Cleanup verification

After evidence capture, the fictional runtime fixture was deleted from hosted Dev.

Direct final counts were restored to:

- 1 Auth user
- 1 organization
- 1 organization membership
- 1 contact
- 1 lead
- 0 lead events
- 0 follow-up tasks
- 0 remaining leads with source external id `qa-app-write-20260825-001`

No Production data or schema was changed.

## Runtime gate result

**PASS.**

The authenticated application path is runtime-proven in Preview for one controlled imported lead:

1. authenticated POST reaches the server route and verified RPC boundary;
2. first call creates one logical lead/contact/import event;
3. same-key retry returns the existing lead;
4. retry input does not overwrite stored human-editable values;
5. malformed authenticated input is rejected with sanitized 400 behavior;
6. runtime evidence is visible in Vercel logs;
7. hosted Dev was cleaned back to baseline.

## Promotion boundary

Run final CI on the exact final PR head after this documentation update. If all required checks pass, mark PR #17 ready and merge it to `develop` only.

Do not merge PR #17 to `main`. Do not change Production as part of this milestone.

The next controlled build milestone is CSV import orchestration around this verified one-lead application persistence boundary.