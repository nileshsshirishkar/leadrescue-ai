# LeadRescue AI Milestone 14 Production Project Evidence

**Status:** PRODUCTION QA IN PROGRESS WITH MAJOR TENANT/AUTH GATES VERIFIED. This file records direct current evidence for the separate Production Supabase project and isolated Vercel Preview. It does not authorize `main`, public Production promotion, commercial hosting, or real Client #1 data.

## Verified project identity

- Supabase project name: `LeadRescue AI Production`
- Project ref: `iumpokzozncoszwgywwn`
- Organization: `LeadRescue AI Production`
- Organization id: `nmtpmqgbtgjmwheecngb`
- Plan: Free during fictional Production validation
- Region: `ap-south-1` (South Asia / Mumbai)
- Status: `ACTIVE_HEALTHY`
- Postgres: 17 / GA release channel

This replaces the incorrectly created Seoul project and is the only Production Supabase project authorized for Milestone 14.

## Canonical migration deployment

The user explicitly approved the first Production schema mutation. The seven version-controlled migrations were deployed from exact repository `nileshsshirishkar/leadrescue-ai`, branch `develop`, commit `a548a8622491bee39b0634bc6f0980b74425cdc6`, using Supabase CLI `db push --linked` after a dry run.

Direct Production verification showed these exact remote migration versions and names:

1. `20260820210907` - `harden_automatic_rls_helper`
2. `20260820211513` - `create_leadrescue_core_schema`
3. `20260820211600` - `add_core_foreign_key_indexes`
4. `20260823083811` - `add_lead_source_idempotency_constraints`
5. `20260823090500` - `create_atomic_imported_lead_function`
6. `20260824223000` - `create_lead_workflow_update_function`
7. `20260825051000` - `add_organization_access_status`

## Verified Production schema and security baseline

The seven core application tables exist: `organizations`, `profiles`, `organization_members`, `contacts`, `leads`, `lead_events`, and `follow_up_tasks`.

Direct verification confirmed Row Level Security is enabled on all seven tables. Expected tenant/member policies, controlled writes, admin deletes, self-profile operations, organization access-status enforcement, foreign-key indexes, updated timestamp triggers, organization-id immutability triggers, and the `ensure_rls` event trigger are present.

The expected workflow functions exist:

- `public.persist_imported_lead(...)` - SECURITY INVOKER
- `public.update_lead_workflow(...)` - SECURITY INVOKER
- private membership/access helpers - SECURITY DEFINER in the non-exposed `private` schema
- `public.rls_auto_enable()` - SECURITY DEFINER with direct execution revoked from `public`, `anon`, and `authenticated`

Direct privilege checks confirmed `anon` has no SELECT privilege on the seven LeadRescue tables, authenticated access is RLS-constrained, approved application RPCs are not executable by `anon`, and `public.rls_auto_enable()` is not directly executable by browser roles.

Supabase Security Advisor after migration returned no database security lints. Supabase Pro and leaked-password protection remain intentionally deferred until the approved Client #1 onboarding gate and must be enabled before real Client #1 commercial lead data is accepted.

## Isolated Production-connected Preview

The existing Vercel project remains connected to exact repository `nileshsshirishkar/leadrescue-ai`.

For Production acceptance only, branch `ops/production-environment` has branch-scoped Preview overrides for:

- `NEXT_PUBLIC_SUPABASE_URL` -> Production project `iumpokzozncoszwgywwn`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` -> Production publishable browser key

General Preview values remain unchanged for other branches. `main`, the public Vercel Production deployment, and Production environment variables were not changed.

Verified acceptance deployment:

- Vercel environment: Preview
- branch: `ops/production-environment`
- tested commit before this documentation update: `b489b8c26ac8720b54d65b0a1795668e18123c90`
- branch alias: `leadrescue-ai-git-ops-production-environment-lead-rescue-ai.vercel.app`
- deployment state during acceptance: READY

## Fictional Production QA identities and tenants

Two founder-created QA Auth users are temporarily retained under the explicitly accepted QA-identity exception. They are mapped to two fictional organizations:

- `fictional-qa-tenant-a`
- `fictional-qa-tenant-b`

All acceptance contact, lead, note, task, and event data is fictional. These QA users and fixtures must be removed before real Client #1 Production data is onboarded.

## Verified two-tenant application acceptance

Production-connected browser testing with two genuinely independent authenticated sessions verified:

- Tenant A workspace initially contained only Tenant A data.
- Tenant B workspace initially returned zero leads while Tenant A already had a persisted lead.
- Tenant A fictional CSV import created one Tenant A contact, lead, and `lead_imported` event.
- Tenant B fictional CSV import created one Tenant B contact, lead, and `lead_imported` event without modifying Tenant A.
- Tenant B direct GET of Tenant A lead returned `404` with `Lead not found.`
- Tenant B direct PATCH of Tenant A lead returned `404`; Tenant A status, notes, tasks, timestamp, and event count remained unchanged.
- Tenant A direct GET of Tenant B lead returned `404` with `Lead not found.`
- Tenant A direct PATCH of Tenant B lead returned `404`; Tenant B status, notes, tasks, timestamp, and event count remained unchanged.
- Tenant B own-tenant workflow PATCH returned HTTP 200, updated the lead, created a pending `lead_follow_up` task using `due_at`, assigned it to the Tenant B QA user, and created a `lead_workflow_updated` event with the correct actor.
- Tenant B reminder endpoint returned only Tenant B's pending reminder.
- Tenant A reminder endpoint returned an empty reminder array and did not reveal Tenant B's task.

This provides bidirectional browser-level evidence for tenant-isolated lead reads, workflow writes, tasks, and reminders through normal authenticated application paths.

## Genuine expired access-token refresh acceptance

A real Tenant A access JWT was allowed to expire while the browser profile and refresh session remained intact.

Baseline before expiry:

- access-token expiry: `2026-08-28 04:55:32 IST`
- refresh-token fingerprint: `70e1fec1d87f`

After the expiry window, the same browser/profile reopened the Production-connected Preview without manual login. The application remained authenticated. A follow-up probe showed:

- new access-token expiry: `2026-08-28 06:06:48 IST`
- new refresh-token fingerprint: `7940e3f71695`
- subsequent `/api/workspace` requests returned HTTP 200

A second probe retained the same new expiry, confirming a stable refreshed session rather than continuous rotation.

Vercel logs at the refresh boundary recorded `AuthRefreshDiscardedError` for concurrent `/api/workspace` and `/api/follow-up-reminders` requests, while both HTTP responses remained 200 and subsequent workspace requests remained clean and successful. This is recorded as a follow-up observability/dependency item, not as proof of auth failure. It must be reassessed before final commercial Production sign-off if it recurs or produces user-visible/session failures.

## Current CI and PR state before this evidence commit

PR #28 targets `develop`, remains draft/open, and was mergeable at head `b489b8c26ac8720b54d65b0a1795668e18123c90` before this documentation update.

GitHub Actions CI run #151 for that exact head completed successfully. Vercel status was also successful. Because this evidence update changes the PR head, exact-head CI/Preview checks must be reverified after this commit before any merge decision.

## Historical clean-state record

Immediately after the seven canonical migrations and before QA provisioning, direct counts were zero for organizations, profiles, memberships, contacts, leads, events, and tasks. No Dev rows, seed data, QA fixtures, or real client data were introduced by the migration deployment itself.

Production now intentionally contains the controlled fictional QA fixtures described above. They are temporary acceptance data and are not customer/commercial evidence.

## Remaining Milestone 14 gates

The major two-tenant and expired-token acceptance gates are complete, but Milestone 14 is not finished. Remaining controlled work includes:

1. verify founder pause/reactivate enforcement against the Production-connected Preview and database paths;
2. verify signed-out, wrong-password, malformed/invalid-session behavior fails closed;
3. verify Production import retry/idempotency and row-failure behavior without duplicating logical leads or overwriting later human edits;
4. verify fictional-data deletion/offboarding and zero QA residue procedure;
5. verify rollback procedure before any `main` or public Production promotion;
6. reassess the observed `AuthRefreshDiscardedError` against the current pinned Supabase packages and current upstream guidance;
7. rerun exact-head CI and Preview validation after the final evidence changes;
8. only then bring PR #28 to an explicit Merge/Hold gate for `develop`.

Backup/restore verification remains tied to the approved commercial Supabase plan. Monitoring/rate-limit commercial gates remain tied to the approved Vercel plan. Public `main`/Production promotion is a separate later approval.

No `main` merge or public Production deployment is authorized by this evidence file.
