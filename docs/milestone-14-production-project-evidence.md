# LeadRescue AI Milestone 14 Production Project Evidence

**Status:** VERIFIED POST-MIGRATION SCHEMA EVIDENCE. This file records the direct current state of the new Production Supabase project after the canonical LeadRescue schema deployment. It does not authorize `main`, public Production promotion, commercial hosting, or real Client #1 data.

## Verified project identity

- Supabase project name: `LeadRescue AI Production`
- Project ref: `iumpokzozncoszwgywwn`
- Organization: `LeadRescue AI Production`
- Organization id: `nmtpmqgbtgjmwheecngb`
- Plan: Free during fictional Production validation
- Region: `ap-south-1` (South Asia / Mumbai)
- Status: `ACTIVE_HEALTHY`
- Postgres: 17 / GA release channel

This replaces the incorrectly created Seoul project and is the only Production Supabase project authorized for the remainder of Milestone 14.

## Clean-state verification before migration

Before the push:

- `public` contained no LeadRescue application tables;
- remote LeadRescue migration history was empty;
- no Dev rows, QA fixtures or real client data had been copied into Production;
- the CLI was linked explicitly to project ref `iumpokzozncoszwgywwn`;
- a `db push --dry-run --linked` preview showed exactly the seven repository migrations and no others.

## Canonical migration deployment

The user explicitly approved the first Production schema mutation. The seven version-controlled migrations were deployed from a fresh local clone of exact repository `nileshsshirishkar/leadrescue-ai`, branch `develop`, commit `a548a8622491bee39b0634bc6f0980b74425cdc6`, using Supabase CLI `db push --linked` after the dry run.

Direct Production verification now shows these exact remote migration versions and names:

1. `20260820210907` — `harden_automatic_rls_helper`
2. `20260820211513` — `create_leadrescue_core_schema`
3. `20260820211600` — `add_core_foreign_key_indexes`
4. `20260823083811` — `add_lead_source_idempotency_constraints`
5. `20260823090500` — `create_atomic_imported_lead_function`
6. `20260824223000` — `create_lead_workflow_update_function`
7. `20260825051000` — `add_organization_access_status`

The remote migration history therefore matches the canonical repository timestamps rather than generating connector-specific versions.

## Verified Production schema state

The seven core application tables now exist:

- `organizations`
- `profiles`
- `organization_members`
- `contacts`
- `leads`
- `lead_events`
- `follow_up_tasks`

Direct `pg_tables` verification confirms Row Level Security is enabled on all seven tables.

The expected policy set exists, including tenant/member reads, controlled writes, admin deletes, self-profile operations and active-organization access enforcement introduced by the final migration.

The expected non-internal table triggers exist for updated timestamps and organization-id immutability. The `ensure_rls` event trigger exists and is enabled for `ddl_command_end`.

The expected workflow functions exist:

- `public.persist_imported_lead(...)` — SECURITY INVOKER
- `public.update_lead_workflow(...)` — SECURITY INVOKER
- private membership/access helpers — SECURITY DEFINER in the non-exposed `private` schema
- `public.rls_auto_enable()` — SECURITY DEFINER, with direct execution revoked from `public`, `anon` and `authenticated`

Direct privilege checks confirm:

- `anon` has no SELECT privilege on any of the seven LeadRescue application tables;
- `authenticated` has the expected SELECT access subject to RLS;
- `anon` cannot execute `persist_imported_lead` or `update_lead_workflow`;
- `authenticated` can execute those two approved application functions;
- neither `anon`, `authenticated` nor `public` can execute `public.rls_auto_enable()`.

## Security Advisor after migration

Supabase Security Advisor was rerun after all seven migrations and currently returns **no database security lints**.

This resolves the two pre-migration warnings on `public.rls_auto_enable()` that existed immediately after project creation.

This does **not** mean every Client #1 Production security gate is complete. Supabase Pro purchase and leaked-password protection remain intentionally deferred under the approved Milestone 13 timing decision and must be enabled and verified before real Client #1 commercial lead data is accepted.

## Performance Advisor after migration

Performance Advisor currently reports only `unused_index` informational findings on newly created indexes. Production contains no application rows or real workload yet, so zero index usage is expected and is not evidence that those indexes should be removed.

Do not remove indexes based on these empty-database INFO notices. Reassess index usage only after representative fictional acceptance/load testing or real approved operational evidence.

## Data residue check

Direct counts after the schema push remain:

- organizations: 0
- profiles: 0
- organization_members: 0
- contacts: 0
- leads: 0
- lead_events: 0
- follow_up_tasks: 0

No Dev rows, seed data, QA fixtures or client data were introduced by the migration deployment.

## Remaining Milestone 14 gates

Schema deployment is complete, but the Production environment is not yet application-ready or commercially live. Remaining controlled work includes:

1. configure Production Auth for the founder-managed first-10-client model;
2. configure the exact Production Site URL and redirect URLs when the Production application URL is determined;
3. configure Production Vercel environment variables through a separate gate, without changing the current public Production deployment prematurely;
4. provision two fictional Production QA users and organizations;
5. run Production two-tenant read/create/update/task/reminder isolation acceptance;
6. verify Production import idempotency, workflow transaction/audit behavior and founder pause/reactivate enforcement;
7. verify signed-out, wrong-password, token-refresh and invalid-session behavior;
8. test fictional-data deletion/offboarding;
9. complete backup/restore only after the approved commercial Supabase plan is active;
10. complete monitoring/rate limiting only after the approved commercial Vercel plan is active;
11. verify rollback before any `main`/public Production promotion.

No `main` merge or public Production deployment is authorized by this evidence file.
