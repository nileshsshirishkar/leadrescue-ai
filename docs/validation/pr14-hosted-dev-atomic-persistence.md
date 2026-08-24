# PR #14 Hosted Dev Atomic Persistence Validation

**Status:** VERIFIED IN HOSTED DEV, with one remaining concurrency validation boundary.

## Repository guard

All GitHub work for this validation targeted exactly `nileshsshirishkar/leadrescue-ai`.

## Exact validated branch state

- Pull request: #14
- Branch: `feat/supabase-atomic-lead-persist`
- CI-validated application/database head before this documentation commit: `ba49baa03887dbb064f4362fb4d3a2ee7b98be2f`
- CI run #62: PASS
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
- did not overwrite the stored `New` status

The probe transaction was rolled back. A direct follow-up query confirmed zero probe contacts, leads, or events remained.

## Security advisor after migration

The hosted Dev security advisor reported one warning:

- leaked password protection is disabled in Supabase Auth

This warning predates and is independent of PR #14. It does not invalidate the database function validation, but it remains a security item to resolve before Production authentication promotion.

Performance advisor notices about currently unused indexes are informational at this early data volume and are not grounds to remove indexes without workload evidence.

## Remaining validation boundary

True simultaneous two-session execution of the same idempotency key has not yet been independently runtime-proven in hosted Dev.

The implementation uses a transaction-level advisory lock plus the database unique constraint, but this document does not upgrade that specific concurrent two-session scenario to VERIFIED until a separate multi-session test is completed.

## Promotion boundary

PR #14 remains draft until this documentation commit passes CI. After CI passes, assess whether the remaining concurrency test can be performed safely before merging to `develop`.

Do not merge PR #14 to `main` as part of this milestone. Do not expose an application write endpoint yet. Production remains unchanged.
