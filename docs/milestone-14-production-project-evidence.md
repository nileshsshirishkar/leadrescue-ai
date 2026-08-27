# LeadRescue AI Milestone 14 Production Project Evidence

**Status:** VERIFIED PRE-MIGRATION EVIDENCE. This file records the direct current state of the new Production Supabase project before LeadRescue schema deployment. It does not authorize `main` or public Production promotion.

## Verified project identity

- Supabase project name: `LeadRescue AI Production`
- Project ref: `iumpokzozncoszwgywwn`
- Organization: `LeadRescue AI Production`
- Organization id: `nmtpmqgbtgjmwheecngb`
- Plan: Free
- Region: `ap-south-1` (South Asia / Mumbai)
- Status: `ACTIVE_HEALTHY`
- Postgres: 17 / GA release channel

This replaces the incorrectly created Seoul project and is the only Production project authorized for the remainder of Milestone 14.

## Clean-state verification before LeadRescue migrations

- `public` schema contains no application tables.
- Supabase migration history is empty.
- No LeadRescue migration has been applied through the current milestone workflow.
- No Dev data or QA fixtures have been copied into this project.

## Initial Security Advisor findings

Before LeadRescue migrations, Supabase Security Advisor reports two warnings on the project-creation automatic-RLS helper `public.rls_auto_enable()`:

1. anon can execute the SECURITY DEFINER helper;
2. authenticated users can execute the SECURITY DEFINER helper.

These are expected to be addressed by the canonical first LeadRescue migration `20260820210907_harden_automatic_rls_helper.sql`, which recreates/hardens the helper and revokes EXECUTE from `public`, `anon`, and `authenticated`.

The warnings are not marked resolved until the canonical migration is deployed and Security Advisor is rerun.

## Canonical repository migration set

Verified against `develop` in `nileshsshirishkar/leadrescue-ai`:

1. `20260820210907_harden_automatic_rls_helper.sql`
2. `20260820211513_create_leadrescue_core_schema.sql`
3. `20260820211600_add_core_foreign_key_indexes.sql`
4. `20260823083811_add_lead_source_idempotency_constraints.sql`
5. `20260823090500_create_atomic_imported_lead_function.sql`
6. `20260824223000_create_lead_workflow_update_function.sql`
7. `20260825051000_add_organization_access_status.sql`

## Migration deployment blocker discovered before mutation

The connected Supabase MCP `apply_migration` action generates its own remote migration version/timestamp. It cannot currently accept the repository migration file's existing version.

Using that action for these seven already-versioned repository migrations would make Production migration history diverge from the canonical `supabase/migrations` filenames and can cause later `supabase db push` synchronization problems.

Supabase's current migration guidance recommends deploying version-controlled migration files with `supabase db push`. The current Supabase MCP implementation has an open issue requesting an optional explicit migration version for exactly this mismatch, with `supabase db push --linked` documented in that issue as the workaround.

Therefore the seven Production migrations have **not** been applied through MCP. This is a deliberate hard stop to preserve reproducible migration history.

## Required next step

Use a controlled Supabase CLI `db push` path against project ref `iumpokzozncoszwgywwn` so the repository migration timestamps are registered exactly as versioned in Git.

Before the push:

- dry-run the migration set;
- verify the linked target is `iumpokzozncoszwgywwn`;
- do not include seed data;
- do not run remote reset;
- do not expose or commit credentials.

After the push:

- list Production migrations and verify the seven repository versions;
- verify tables/functions/RLS/policies;
- rerun Security Advisor;
- continue with fictional Production acceptance only after schema verification passes.
