# LeadRescue AI Milestone 14 Production Project Evidence

**Status:** PRODUCTION QA ACCEPTANCE COMPLETE THROUGH ZERO-RESIDUE CLEANUP; ROLLBACK DESIGN VERIFIED, PAID-PLAN EXECUTION STILL PENDING. This file records direct current evidence for the separate Production Supabase project and isolated Vercel Preview. It does not authorize `main`, public Production promotion, commercial hosting, or real Client #1 data.

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

Supabase Security Advisor after migration returned no database security lints except the separately recorded `Leaked Password Protection Disabled` Auth advisory. Supabase Pro and leaked-password protection remain intentionally deferred until the approved Client #1 onboarding gate and must be enabled before real Client #1 commercial lead data is accepted.

## Isolated Production-connected Preview

The existing Vercel project remains connected to exact repository `nileshsshirishkar/leadrescue-ai`.

For Production acceptance only, branch `ops/production-environment` has branch-scoped Preview overrides for:

- `NEXT_PUBLIC_SUPABASE_URL` -> Production project `iumpokzozncoszwgywwn`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` -> Production publishable browser key

General Preview values remain unchanged for other branches. `main`, the public Vercel Production deployment, and Production environment variables were not changed.

Verified acceptance deployment before this evidence update used Vercel Preview on branch `ops/production-environment`, exact head `6b1dea0cebb6d74c5a734cee8050f319302c5a10`, deployment `dpl_SzcugFTt3xf4x2kF4HrNJX3o9LEf`, with branch alias `leadrescue-ai-git-ops-production-environment-lead-rescue-ai.vercel.app`. It was `READY` and CI run #153 passed on that exact head.

Because this evidence update moves the PR head, exact-head CI and Preview must be reverified again before any merge decision.

## Verified Production QA acceptance

Production-connected browser testing with two genuinely independent authenticated sessions verified all of the following using fictional QA data only:

- bidirectional tenant-isolated workspace reads;
- direct cross-tenant lead GET denial;
- direct cross-tenant PATCH denial;
- own-tenant workflow update with audit event and pending follow-up task using `due_at`;
- reminder isolation between tenants;
- genuine expired access-token refresh without manual re-login;
- founder pause/reactivate enforcement against an already-authenticated browser session;
- signed-out fail-closed behavior with `/api/workspace` returning HTTP 401;
- wrong-password rejection with sanitized `Email or password is incorrect.` and no workspace access;
- malformed/invalid-session fail-closed behavior returning HTTP 401;
- CSV retry/idempotency using a stable `importId + rowNumber` identity;
- a stale retry returning `existing` without duplicating the logical lead or overwriting a later authenticated human edit;
- mixed-row CSV behavior where a valid row persisted and an invalid sibling row returned `error` without producing an orphan contact;
- deletion/offboarding behavior after tenant memberships were removed, where a still-authenticated Tenant B session failed closed with HTTP 403 `Organization access is not configured.`.

## Genuine expired access-token refresh follow-up

A real Tenant A access JWT was allowed to expire while the browser profile and refresh session remained intact.

Baseline before expiry:

- access-token expiry: `2026-08-28 04:55:32 IST`
- refresh-token fingerprint: `70e1fec1d87f`

After the expiry window, the same browser/profile reopened the Production-connected Preview without manual login. The application remained authenticated. A follow-up probe showed:

- new access-token expiry: `2026-08-28 06:06:48 IST`
- new refresh-token fingerprint: `7940e3f71695`
- subsequent `/api/workspace` requests returned HTTP 200

A second probe retained the same new expiry, confirming a stable refreshed session rather than continuous rotation.

Vercel logs at the refresh boundary recorded `AuthRefreshDiscardedError` for concurrent `/api/workspace` and `/api/follow-up-reminders` requests, while both HTTP responses remained 200 and subsequent workspace requests remained clean and successful. This remains an observability/dependency follow-up, not proof of auth failure. It must be reassessed against the current pinned Supabase packages and current upstream guidance before final Milestone 14 merge readiness.

## Zero-QA-residue cleanup verification

The user explicitly approved deletion of all fictional Production QA residue.

Application data was removed through a controlled Production SQL Editor transaction after the connected Supabase SQL path rejected writes in a read-only transaction. The cleanup transaction targeted only the two known fictional QA organizations and deleted dependent rows in controlled order.

The already-authenticated Tenant B browser was then tested after membership deletion and `/api/workspace` returned HTTP 403 with `Organization access is not configured.`, proving that the remaining Auth session could not retain tenant access after authorization data was removed.

The two temporary QA Auth users were then permanently deleted through Supabase Authentication -> Users.

Direct final Production verification showed all of the following at zero:

- `auth.users`
- `auth.sessions`
- `auth.refresh_tokens`
- `organizations`
- `profiles`
- `organization_members`
- `contacts`
- `leads`
- `lead_events`
- `follow_up_tasks`

Production therefore has zero QA identities and zero QA application-data residue. The seven canonical schema migrations remain in place.

## Rollback design verification

Application rollback and database recovery are separate controls and must not be conflated.

### Current public Vercel Production anchor

Direct Vercel deployment verification shows the current public Production deployment remains:

- deployment id: `dpl_4anLwFDrhcqz2FabQqDTk536mHGN`
- deployment URL: `leadrescue-qoz04tr7s-lead-rescue-ai.vercel.app`
- GitHub branch: `main`
- GitHub commit: `e933fe9a3546dc3d63a7c58ce48291d3d96da253`
- state: `READY`
- target: `production`
- public aliases include `leadrescue-ai-eosin.vercel.app`, `leadrescue-ai-lead-rescue-ai.vercel.app`, and `leadrescue-ai-git-main-lead-rescue-ai.vercel.app`.

This is still the old public Phase 2 Production application. It has not been replaced by PR #28 or by the Production-connected Preview.

### Current previous-production rollback candidate

Direct Vercel history also shows the immediately preceding Production deployment is:

- deployment id: `dpl_3JLnaTyxu93CRwctomCZvz24AbjW`
- deployment URL: `leadrescue-d9vkz5vd3-lead-rescue-ai.vercel.app`
- GitHub commit: `e8b60b70d0f4eae3de7231313ecd4f06b8d81491`
- state: `READY`
- target: `production`
- Vercel currently marks it `isRollbackCandidate: true`.

This proves that a concrete previous Production deployment exists in Vercel history. It is not the intended rollback target for a future LeadRescue promotion. If a later approved release replaces the current public Production, the pre-promotion anchor that must be preserved for emergency application rollback is the then-current deployment `dpl_4anLwFDrhcqz2FabQqDTk536mHGN` unless a newer explicitly approved public Production deployment supersedes it before promotion.

### Vercel plan limitation

The current Vercel team `LeadRescue AI` is still on the Hobby plan. Current official Vercel documentation states that rolling back to a specific older deployment is available on Pro or Enterprise plans. The documented command is `vercel rollback <deployment-url>`.

Official reference reverified for this milestone:

- https://vercel.com/docs/deployments/rollback-production-deployment
- https://vercel.com/docs/cli/rollback

Therefore an actual rollback rehearsal is not marked PASS on the current Hobby plan. It would also change public Production traffic, which is outside PR #28 approval. Before real Client #1 commercial use and before any public Production promotion, the approved paid Vercel commercial-plan gate must be satisfied and the current pre-promotion Production anchor must be reverified.

### Supabase database recovery boundary

The Production Supabase project remains on Free during fictional validation. Current official Supabase guidance distinguishes daily backups from Point-in-Time Recovery (PITR):

- paid projects can use physical/daily backup recovery capabilities;
- PITR is an additional billed recovery option with configurable retention;
- PITR must be enabled before it can be used for point-in-time rollback;
- restore-to-new-project is available for paid customers when physical backups are enabled.

Official references reverified for this milestone:

- https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery
- https://supabase.com/docs/reference/api/v1-restore-pitr-backup
- https://supabase.com/blog/restore-to-a-new-project

The approved Client #1 gate already requires Supabase Pro. Before real Client #1 data is accepted, LeadRescue must verify the selected backup/recovery configuration on the paid Production project and perform a controlled restore test. A restore-to-new-project exercise is preferred for the first verification because it can prove recovery without overwriting the active Production database. Whether PITR is required should be decided from the acceptable Recovery Point Objective rather than enabled by assumption.

Database recovery is not currently marked PASS. Free-plan fictional acceptance does not prove commercial backup/restore readiness.

### Release-time rollback procedure

For any future public Production promotion, use this controlled sequence:

1. verify repository is exactly `nileshsshirishkar/leadrescue-ai`;
2. verify the approved release commit and exact-head CI/Preview evidence;
3. verify the current public Production deployment immediately before promotion and record its deployment id/URL as the rollback anchor;
4. verify Vercel is on the approved paid commercial plan and rollback capability is available;
5. verify Supabase Pro backup/recovery status and the most recent successful recovery test before real client data is at risk;
6. promote only with separate explicit user approval;
7. after promotion, verify public Production health, authentication, tenant boundaries and critical API paths;
8. if the application release is faulty and the database remains compatible, roll Vercel traffic back to the recorded pre-promotion deployment;
9. if the incident involves data corruption or incompatible database state, stop application writes as appropriate and use the separately approved Supabase recovery procedure rather than assuming an application rollback repairs database state;
10. record incident evidence, rollback/restore result, and the exact resulting Production deployment/database state.

No live rollback or Production promotion was executed during this verification.

## Current PR and CI state before this evidence update

Immediately before this documentation update:

- repository resolved exactly to `nileshsshirishkar/leadrescue-ai`;
- PR #28 was open, draft, mergeable, base `develop`;
- PR #28 head was `6b1dea0cebb6d74c5a734cee8050f319302c5a10`;
- CI run #153 completed successfully on that exact head;
- the exact-head Vercel Preview was `READY`.

Because this documentation update creates a new PR head, those exact-head checks must be run again before merge readiness can be assessed.

## Remaining Milestone 14 gates

Fictional Production tenant/auth/import/deletion QA and rollback-design verification are complete. Remaining controlled work is:

1. reassess the observed `AuthRefreshDiscardedError` against the current pinned Supabase packages and current official/upstream guidance, without changing auth code based on guesswork;
2. update evidence if that review changes the risk classification or requires a code/test follow-up;
3. rerun exact-head CI and Vercel Preview validation after the final evidence changes;
4. bring PR #28 to an explicit Merge/Hold gate for `develop` only.

Client #1 commercial gates remain separate and unresolved until required: paid Vercel commercial plan, Supabase Pro, leaked-password protection enabled, verified backup/restore, monitoring/rate-limit readiness, and the other approved Client #1 operational/privacy controls.

`main` and public Production promotion remain a later separate approval. No `main` merge or public Production deployment is authorized by this evidence file.
