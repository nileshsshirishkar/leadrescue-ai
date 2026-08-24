# PR #14 Hosted Dev Atomic Persistence Validation

**Status:** VERIFIED IN HOSTED DEV, including true simultaneous two-session same-key execution.

## Repository guard

All GitHub work for this validation targeted exactly `nileshsshirishkar/leadrescue-ai`.

## Exact validated branch state

- Pull request: #14
- Branch: `feat/supabase-atomic-lead-persist`
- CI-validated application/database head before the concurrency evidence commit: `3e1cc3ff82771f463888f1836593cef6693efbaf`
- CI run #63: PASS
- `Verify`: PASS
- `Database Tests`: PASS

## Hosted Supabase Dev

Project checked before migration:

- project name: `LeadRescue AI Dev`
- project ref: `vzlltqutwsnnjzepyogj`
- status: `ACTIVE_HEALTHY`

Applied hosted Dev migration:

- `20260824143703_create_atomic_imported_lead_function`

No Production Supabase migration was applied.

## Hosted function verification

`public.persist_imported_lead(...)` was directly checked after migration.

Verified properties:

- `SECURITY INVOKER`
- `authenticated` can execute
- `anon` cannot execute
- `public` cannot execute
- caller does not supply authoritative organization id or actor id
- authenticated user organization membership determines the tenant
- multiple memberships fail closed
- source and external source id are required for this imported-lead contract
- transaction-scoped advisory lock is derived from tenant + source + external id
- duplicate uniqueness fallback accepts only `leads_org_source_external_unique`
- unrelated uniqueness violations are rethrown

## Controlled hosted Dev transaction probe

A fictional temporary probe was executed as the existing controlled authenticated Dev user inside a transaction.

First call:

- created one contact
- created one lead
- created one `lead_imported` audit event

Second call with the same tenant/source/external-id key but deliberately changed lead fields:

- resolved to the existing lead
- did not create a second contact
- did not create a second lead
- did not create a second audit event
- did not overwrite the stored status

The probe transaction was rolled back. A direct follow-up query confirmed zero probe contacts, leads, or events remained.

## True simultaneous two-session concurrency validation

A separate hosted Dev test was executed with two independent PostgreSQL sessions using temporary `pg_cron` jobs. The jobs ran under the `authenticated` role with the existing controlled QA user's `auth.uid()` claim and the same organization membership. Both called `public.persist_imported_lead(...)` with the same source and source external id while deliberately supplying different status and notes values.

Evidence from the first concurrent execution:

- job A start: `2026-08-24 18:28:01.095098+00`
- job B start: `2026-08-24 18:28:01.098111+00`
- the run windows overlapped
- job A backend PID: `406445`
- job B backend PID: `406444`
- job A returned `created`
- job B returned `existing`
- both returned lead id `5943675d-cd18-41cd-98ab-6b6342ad5c94`
- final database state contained exactly one lead
- final database state contained exactly one corresponding contact
- final database state contained exactly one `lead_imported` audit event
- zero orphan contacts were found
- persisted status remained `New-A`
- persisted notes remained `Concurrent fixture A`
- job B's different `New-B` status and notes did not overwrite the created lead
- both sessions committed successfully
- no deadlock occurred

The scheduler fired a second time before it was unscheduled, but both later executions were guarded by the temporary result markers and committed as no-ops. They did not call the persistence function again and did not alter the accepted evidence.

The first attempt to record results failed because the temporary result table inherited automatic RLS without a policy. Both test transactions rolled back and direct verification showed zero fixture leads. The temporary table was then given a QA-user-only policy and the concurrency test was rerun successfully.

After evidence capture:

- both scheduled jobs were unscheduled
- the concurrency lead, contact and event were deleted
- the temporary result table was dropped
- the temporary `pg_cron` extension was dropped
- direct verification returned the Dev fixture baseline to 1 Auth user, 1 organization, 1 membership, 1 contact, 1 lead, 0 lead events and 0 follow-up tasks
- the concurrency source external id had zero remaining lead rows
- no Production state was changed

## Security advisor after validation

The hosted Dev security advisor continues to report one warning:

- leaked password protection is disabled in Supabase Auth

This warning predates and is independent of PR #14. It does not invalidate the database function validation, but it remains a security item to resolve before Production authentication promotion.

Performance advisor notices about currently unused indexes are informational at this early data volume and are not grounds to remove indexes without workload evidence.

## Concurrency gate result

**PASS.** True simultaneous two-session same-key execution is now runtime-proven in hosted Dev for the controlled QA tenant.

The evidence supports the required behavior: one call creates the logical lead, the competing call resolves to the existing lead, no duplicate contact/lead/import event is produced, later input does not overwrite the persisted human-editable fields, and both calls terminate without deadlock.

## Promotion boundary

Run final CI on the exact final PR head. If required checks pass, mark PR #14 ready for review and merge it into `develop` only.

Do not merge PR #14 to `main` as part of this milestone. Do not expose an application write endpoint until the next isolated application-write slice is implemented and validated. Production remains unchanged.
