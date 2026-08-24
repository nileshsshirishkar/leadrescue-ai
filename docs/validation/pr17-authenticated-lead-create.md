# PR #17 Authenticated One-Lead Create Validation

**Status:** IMPLEMENTED ON PR #17, CI VERIFIED, PREVIEW PARTIALLY VERIFIED. Authenticated Preview POST remains an open runtime gate.

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

- server-side Next.js access should use the SSR server client backed by request cookies
- `auth.getClaims()` is the recommended verified identity check for protected server data
- PostgreSQL functions are invoked through `supabase.rpc(functionName, args)`
- authenticated Supabase requests carry the user Auth token into the Data API/RLS boundary

## Automated validation

PR head before this documentation commit: `321357fe1dea819db68da5df4d1b5b9ab61a3ad6`.

CI run #69: PASS.

- `Verify`: PASS
  - install
  - lint
  - typecheck
  - unit tests
  - build
- `Database Tests`: PASS
  - local Supabase startup
  - pgTAP database suites

Focused tests verify:

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

## Preview evidence

Vercel Preview deployment for exact head `321357fe1dea819db68da5df4d1b5b9ab61a3ad6`:

- deployment id: `dpl_5M3N2ShvTyi6zMLUryHj8aKnnkAx`
- branch: `feat/authenticated-lead-create`
- state: READY

Direct signed-out Preview fetch of `/api/leads` returned:

- HTTP 401
- `Authentication required.`
- `Cache-Control: private, no-store`

Vercel runtime logs independently recorded the same Preview request as `GET /api/leads 401` on the exact deployment.

## Remaining runtime gate

The available connected tooling does not hold an authenticated LeadRescue Preview browser session and does not expose a safe Supabase Auth admin action for creating a temporary login session. The existing controlled QA account password must not be extracted, reset, guessed, or exposed merely to complete this test.

Therefore the following is **REQUIRES VERIFICATION** before PR #17 may merge:

1. Authenticated Preview `POST /api/leads` using controlled fictional data.
2. Verify the response is `created` and capture the returned lead id.
3. Repeat the same request with the same source/source-external-id but deliberately changed human-editable values and verify the response is `existing`.
4. Directly verify hosted Dev still contains exactly one logical lead, one corresponding contact, and one initial import event for that key, with no overwrite from the retry.
5. Exercise one invalid payload through Preview and verify sanitized 400 behavior.
6. Clean up the fictional Preview fixture after evidence capture.

Do not weaken this gate by treating unit tests, the prior PR #14 direct database concurrency test, or a signed-out Preview request as proof of the authenticated application write path.

## Promotion boundary

Keep PR #17 draft until the authenticated Preview runtime gate passes and the final documentation commit has green CI.

If the gate passes, update the Decision Log, run final CI on the exact final head, mark PR #17 ready, and merge to `develop` only.

Do not merge to `main`. Production remains unchanged.
