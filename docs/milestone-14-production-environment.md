# LeadRescue AI Milestone 14 Production Environment Runbook

**Status:** PREPARATION / CORRECTION REQUIRED. This document defines the controlled Production-environment sequence. It does not itself change `main`, expose real client data, or authorize commercial use.

## 1. Current verified starting point

- Authoritative repository: `nileshsshirishkar/leadrescue-ai`.
- `develop` contains work through merged PR #27 / Milestone 13.
- `main` remains on the older public Phase 2 Production state and has not received the Supabase tenant-workspace milestones.
- Dev Supabase project: `LeadRescue AI Dev`, ref `vzlltqutwsnnjzepyogj`, region `ap-south-1` (Mumbai).
- Production Supabase organization now exists: `LeadRescue AI Production`, organization id `nmtpmqgbtgjmwheecngb`, Free plan.
- A new project was created in that organization with ref `mqqhiliqobcazzgykqxs`, but direct Supabase verification shows its current project name is `nileshsshirishkar's Project` and its region is `ap-northeast-2` (Seoul), not the intended `LeadRescue AI Production` in `ap-south-1`.
- No LeadRescue migrations have been applied to that project by this milestone workflow.
- Current Vercel team remains Hobby and must not be treated as approved Client #1 commercial hosting.
- Supabase leaked-password protection remains intentionally deferred until the approved Client #1 onboarding / Pro-plan gate.

## 2. Official production guidance reverified for this milestone

Current Supabase documentation recommends separate environments, version-controlled migrations, Production checklist/security review, exact Production Auth URLs, and controlled migration deployment. Development seed data and destructive remote reset operations must not be used on Production.

Supabase also documents that a project's region is bound at the infrastructure level. Changing region requires creating a new project in the desired region and migrating to it. Because this project is still empty, the safest correction is to replace it before any LeadRescue migration or configuration is applied.

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

Hosted Dev also reports seven migrations, but three hosted migration versions differ because those changes were applied through hosted tooling at different timestamps. Production must therefore be built from the repository's version-controlled migration files and verified against the expected schema/functions/policies.

## 4. Production project correction gate

The currently created project `mqqhiliqobcazzgykqxs` must **not** receive LeadRescue migrations because it is in Seoul (`ap-northeast-2`) rather than the approved Mumbai region (`ap-south-1`).

Required correction:

1. do not add data, users, migrations, Auth configuration, Vercel variables or secrets to `mqqhiliqobcazzgykqxs`;
2. delete that empty project from the Supabase dashboard, or otherwise retire it before reuse;
3. keep the `LeadRescue AI Production` organization;
4. create a replacement project named exactly `LeadRescue AI Production`;
5. choose **South Asia (Mumbai) / `ap-south-1`** explicitly, not a generic Asia-Pacific selection;
6. keep Data API enabled;
7. disable automatic new-table exposure;
8. enable automatic RLS;
9. leave GitHub integration disconnected for this controlled Production setup;
10. verify the replacement project identity, organization, region and healthy status before any migration.

No migration is authorized until that verification passes.

## 5. Clean migration sequence

After the corrected Production project is `ACTIVE_HEALTHY`:

1. record Production project ref and region, never credentials;
2. verify the Production project identity before every schema mutation;
3. apply the seven canonical repository migrations in order using the controlled Supabase migration path;
4. do not include Dev seed data or QA fixtures;
5. list remote migration history and verify all expected versions;
6. verify tables, functions, grants, foreign keys, RLS state and key policies;
7. run Security Advisor and record findings;
8. run Production-compatible tenant acceptance tests only with fictional data and clean fixtures afterward.

## 6. Production Auth configuration gate

Before connecting a Production Vercel deployment:

- public self-signup remains disabled;
- founder provisioning remains the first-10-client model;
- configure the exact Production Site URL and approved redirect URLs;
- verify password sign-in, wrong-password rejection, protected routes, sign-out, normal refresh, expired-token refresh and malformed/invalid-session rejection;
- keep optional OpenAI enhancement disabled for the first live Client #1 onboarding under the approved Milestone 13 policy.

Dev users and passwords are not copied into Production.

## 7. Vercel environment boundary

Do not point current public Production at the new Supabase project yet. Preview/Development variables must remain distinct from Production variables.

No `main` merge or Production deployment is authorized by this runbook.

## 8. Fictional Production acceptance package

Before any real client data:

- provision two fictional Production organizations and two independent users;
- verify each user sees only its own workspace/contact details;
- verify cross-tenant lead reads, creates, updates, tasks and reminders fail closed;
- verify create/import retry idempotency and row-failure reporting;
- verify status/notes/follow-up transaction and audit event;
- verify due/overdue/upcoming reminders;
- verify founder pause/reactivate enforcement server-side and through RLS/database paths;
- verify signed-out, expired-token and invalid-session behavior;
- verify deletion/offboarding with fictional data;
- verify backup/restore after the approved commercial Supabase plan is active;
- verify monitoring/rate limits after the approved commercial Vercel plan is active;
- verify rollback;
- remove Production QA fixtures or retain only explicitly approved non-production acceptance fixtures.

## 9. Hard stop conditions

Stop if repository identity, Production project identity, migration history, RLS, tenant isolation or environment separation is ambiguous or incorrect. Never copy Dev/real-client data into Production, expose secrets, or change `main`/public Production without the separate explicit promotion gate.

## 10. Current next action

**Delete/retire the empty Seoul project `mqqhiliqobcazzgykqxs` and recreate `LeadRescue AI Production` explicitly in South Asia (Mumbai), `ap-south-1`. Then verify the new project ref before any migration.**
