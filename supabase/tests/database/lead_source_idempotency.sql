begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(8);

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values ('00000000-0000-0000-0000-00000000c001', 'authenticated', 'authenticated', 'idempotency@leadrescue.invalid', now(), now(), false, false);

insert into public.profiles (user_id, full_name)
values ('00000000-0000-0000-0000-00000000c001', 'Idempotency User');

insert into public.organizations (id, name, slug)
values
  ('30000000-0000-0000-0000-000000000001', 'Idempotency Tenant A', 'idempotency-a'),
  ('40000000-0000-0000-0000-000000000001', 'Idempotency Tenant B', 'idempotency-b');

insert into public.organization_members (organization_id, user_id, role)
values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000c001', 'member');

insert into public.contacts (id, organization_id, full_name)
values
  ('33000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Tenant A Contact'),
  ('44000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Tenant B Contact');

select extensions.ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.leads'::regclass
      and conname = 'leads_org_source_external_unique'
      and contype = 'u'
  ),
  'Lead source idempotency unique constraint exists'
);

insert into public.leads (
  organization_id,
  contact_id,
  source,
  source_external_id,
  status
)
values (
  '30000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000001',
  'csv',
  'source-001',
  'New'
);

select extensions.throws_ok(
  $$insert into public.leads (organization_id, contact_id, source, source_external_id, status)
    values ('30000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 'csv', 'source-001', 'New')$$,
  '23505',
  null,
  'Duplicate source key is rejected within the same organization'
);

select extensions.lives_ok(
  $$insert into public.leads (organization_id, contact_id, source, source_external_id, status)
    values ('40000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001', 'csv', 'source-001', 'New')$$,
  'Same source key may exist in a different organization'
);

select extensions.lives_ok(
  $$insert into public.leads (organization_id, contact_id, source, source_external_id, status)
    values ('30000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 'manual', null, 'New')$$,
  'A manual lead without an external source id remains allowed'
);

select extensions.throws_ok(
  $$insert into public.leads (organization_id, contact_id, source, source_external_id, status)
    values ('30000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', ' csv ', 'source-002', 'New')$$,
  '23514',
  null,
  'Source must already be trimmed'
);

select extensions.throws_ok(
  $$insert into public.leads (organization_id, contact_id, source, source_external_id, status)
    values ('30000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 'csv', ' source-003 ', 'New')$$,
  '23514',
  null,
  'External source id must already be trimmed'
);

select extensions.throws_ok(
  $$insert into public.leads (organization_id, contact_id, source, source_external_id, status)
    values ('30000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', '', 'source-004', 'New')$$,
  '23514',
  null,
  'Source cannot be empty'
);

select extensions.throws_ok(
  $$insert into public.leads (organization_id, contact_id, source, source_external_id, status)
    values ('30000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 'csv', '', 'New')$$,
  '23514',
  null,
  'External source id cannot be an empty string'
);

select * from extensions.finish();
rollback;
