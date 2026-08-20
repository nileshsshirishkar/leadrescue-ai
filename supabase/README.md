# Supabase database source

This directory version-controls the LeadRescue AI development database schema and database security tests.

## Migration history

The filenames intentionally match the migration versions already applied to the `LeadRescue AI Dev` Supabase project:

- `20260820210907_harden_automatic_rls_helper.sql`
- `20260820211513_create_leadrescue_core_schema.sql`
- `20260820211600_add_core_foreign_key_indexes.sql`

Supabase tracks remote migration history separately from Git. Keep the timestamp prefixes unchanged so the local migration files remain aligned with the remote migration versions.

## Database tests

`tests/database/tenant_isolation.sql` is a pgTAP test that creates two temporary users and two temporary organizations inside a transaction, exercises the core RLS boundary, and rolls everything back.

Run database tests only against a local/test Supabase stack, not against a production customer database.

Typical local workflow after the Supabase CLI is initialized and available:

```bash
supabase start
supabase db reset
supabase test db
```

The existing application CI does not run Supabase database tests yet. Adding a reproducible Supabase CLI test job is a separate controlled change.
