# LeadRescue AI Milestone 14 Production Environment Runbook

**Status:** PREPARATION ONLY. This document defines the controlled Production-environment sequence. It does not itself create Production infrastructure, change `main`, purchase plans, expose real client data, or authorize commercial use.

## 1. Current verified starting point

- Authoritative repository: `nileshsshirishkar/leadrescue-ai`.
- `develop` contains work through merged PR #27 / Milestone 13.
- `main` remains on the older public Phase 2 Production state and has not received the Supabase tenant-workspace milestones.
- Current hosted Supabase project is `LeadRescue AI Dev` in `ap-south-1`; there is no separate LeadRescue Production Supabase project visible in the connected account yet.
- Current Vercel team remains Hobby and must not be treated as approved Client #1 commercial hosting.
- Supabase leaked-password protection remains intentionally deferred until the approved Client #1 onboarding / Pro-plan gate.

## 2. Official production guidance reverified for this milestone

Current Supabase documentation recommends:

- separate environments for local/staging/Production workflows;
- version-controlled migrations as the Production schema-change mechanism;
- running the Production Checklist before launch;
- reviewing Security Advisor and RLS;
- setting the exact Production Site URL / redirect URLs for Auth;
- using `supabase db push --dry-run` before applying remote migrations;
- never using destructive remote reset operations on Production;
- never using development seed data on Production.

The Production project must be created cleanly and receive schema only from the canonical repository migrations. Do not clone Dev rows or QA fixtures into Production.

## 3. Canonical migration source

The canonical Production source is the migration directory on `develop`, not the hosted Dev migration timestamps.

Current repository migration files on `develop`:

1. `20260820210907_harden_automatic_rls_helper.sql`
2. `20260820211513_create_leadrescue_core_schema.sql`
3. `20260820211600_add_core_foreign_key_indexes.sql`
4. `20260823083811_add_lead_source_idempotency_constraints.sql`
5. `20260823090500_create_atomic_imported_lead_function.sql`
6. `20260824223000_create_lead_workflow_update_function.sql`
7. `20260825051000_add_organization_access_status.sql`

Current hosted Dev also reports seven migrations, but three hosted migration versions differ because those changes were applied through the hosted migration tooling at different timestamps. This is migration-history drift, not evidence that Production should copy Dev history. A new Production project should be built from the repository's version-controlled migration files and then verified against the expected schema/functions/policies.

## 4. Production project creation gate

Creating a new Supabase project is a material Production-environment action and may have a cost depending on the selected organization/plan.

Before creation:

1. user explicitly selects the Supabase organization;
2. query the current project-creation cost for that organization;
3. present the cost/recurrence to the user;
4. obtain the required cost confirmation;
5. create **`LeadRescue AI Production`** in `ap-south-1` unless the user explicitly chooses another approved region;
6. wait until the project is `ACTIVE_HEALTHY` before any migration.

No Production project should be created by guessing the organization or cost.

## 5. Clean migration sequence

After the Production project is healthy:

1. record Production project ref and region in the controlled evidence file, never credentials;
2. verify the target is the new Production project before every schema mutation;
3. apply the seven canonical repository migrations in order, or use an equivalent controlled `db push` flow that preserves the repository versions;
4. do not include Dev seed data or QA fixtures;
5. list remote migration history and verify all expected versions;
6. verify core tables, functions, grants, foreign keys, RLS-enabled state and key policies;
7. run Security Advisor and record findings;
8. run the Production-compatible tenant pgTAP/acceptance tests only with fictional data and clean all fixtures afterward.

## 6. Production Auth configuration gate

Before connecting a Production Vercel deployment:

- public self-signup remains disabled;
- founder provisioning remains the first-10-client model;
- configure the exact Production Site URL and approved redirect URLs;
- do not use broad Preview wildcards as the Production Site URL;
- verify password sign-in, wrong-password rejection, protected routes, sign-out, normal refresh, forced expired-access-token refresh and malformed/invalid-session rejection;
- keep optional OpenAI enhancement disabled for the first live Client #1 onboarding under the approved Milestone 13 policy.

Auth acceptance must use fictional Production QA users/organizations. Dev users and passwords are not copied into Production.

## 7. Vercel environment boundary

Do not point current public Production at the new Supabase project yet.

First create/verify the Production Supabase project and schema, then configure the required Production environment variables in Vercel through a separate controlled gate. Preview/Development variables must remain distinct from Production variables.

No `main` merge or Production deployment is authorized by this runbook.

## 8. Fictional Production acceptance package

Before any real client data:

- provision two fictional Production organizations and two independent users;
- verify each user sees only its own workspace/contact details;
- verify cross-tenant lead reads, creates, updates, tasks and reminders fail closed;
- verify one-lead create and retry idempotency;
- verify CSV import retry behavior and row-failure reporting;
- verify status/notes/follow-up transaction and audit event;
- verify due/overdue/upcoming reminders;
- verify founder pause/reactivate enforcement server-side and through RLS/database paths;
- verify signed-out, expired-token and invalid-session behavior;
- verify deletion/offboarding procedure with fictional data;
- verify backup/restore after the approved commercial Supabase plan is active;
- verify monitoring and rate-limit controls after the approved commercial Vercel plan is active;
- verify rollback procedure;
- remove Production QA fixtures or retain only explicitly approved non-production acceptance fixtures.

## 9. Hard stop conditions

Stop and do not continue if:

- repository does not resolve exactly to `nileshsshirishkar/leadrescue-ai`;
- Production project identity is ambiguous;
- migration order/history does not match the canonical repository set;
- any migration fails;
- RLS is missing or Security Advisor reveals an unexpected material warning;
- tenant isolation fails;
- a request would require copying Dev/real client data into Production;
- a secret would need to be committed to GitHub or exposed to the browser;
- a step would change `main` or current public Production without a separate explicit promotion approval.

## 10. Current next action

The connected Supabase account currently exposes one organization through the existing Dev project: `tksocpsdgotwmjeydhbc`. Supabase project creation tooling requires the user to explicitly choose which organization should own the new project, and it requires a live cost check/confirmation before creation.

Therefore the next executable Production action is:

**User selects the Supabase organization for `LeadRescue AI Production`; then query and confirm the current project-creation cost before creating the project.**
