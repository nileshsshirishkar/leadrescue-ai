begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(22);

insert into public.organizations (id, name, slug, access_status)
values
  ('51000000-0000-0000-0000-000000000001', 'Meta Tenant A', 'meta-tenant-a', 'active'),
  ('52000000-0000-0000-0000-000000000001', 'Meta Tenant B', 'meta-tenant-b', 'paused'),
  ('54000000-0000-0000-0000-000000000001', 'Meta Tenant C', 'meta-tenant-c', 'active');

insert into public.provider_connections (
  id, organization_id, provider, external_account_id, status
)
values
  ('53000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'meta', 'page-1001', 'active'),
  ('53000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000001', 'meta', 'page-2001', 'active'),
  ('53000000-0000-0000-0000-000000000003', '54000000-0000-0000-0000-000000000001', 'meta', 'page-3001', 'disabled'),
  ('53000000-0000-0000-0000-000000000004', '54000000-0000-0000-0000-000000000001', 'google', 'google-account-1', 'active');

insert into public.contacts (id, organization_id, full_name)
values
  ('51000000-0000-0000-0000-000000000101', '51000000-0000-0000-0000-000000000001', 'Meta Lead A'),
  ('52000000-0000-0000-0000-000000000101', '52000000-0000-0000-0000-000000000001', 'Meta Lead B');

insert into public.leads (
  id, organization_id, contact_id, source, source_external_id, status, notes
)
values
  (
    '51000000-0000-0000-0000-000000000201',
    '51000000-0000-0000-0000-000000000001',
    '51000000-0000-0000-0000-000000000101',
    'meta',
    'lead-abc',
    'Qualified',
    'Human-reviewed notes'
  ),
  (
    '52000000-0000-0000-0000-000000000201',
    '52000000-0000-0000-0000-000000000001',
    '52000000-0000-0000-0000-000000000101',
    'meta',
    'lead-other-tenant',
    'Follow-up needed',
    'Other tenant notes'
  );

select extensions.results_eq(
  $$
    select n.nspname::text, p.prosecdef
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'record_meta_lead_webhook_receipt'
      and p.pronargs = 4
      and n.nspname in ('private', 'public')
    order by n.nspname
  $$,
  $$values ('private'::text, true), ('public'::text, false)$$,
  'Only the private implementation is SECURITY DEFINER'
);

select extensions.ok(
  has_function_privilege(
    'service_role',
    'public.record_meta_lead_webhook_receipt(text,text,text,timestamptz)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'private.record_meta_lead_webhook_receipt(text,text,text,timestamptz)',
    'EXECUTE'
  ),
  'Service role can execute the scoped public wrapper and private implementation'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.record_meta_lead_webhook_receipt(text,text,text,timestamptz)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'private.record_meta_lead_webhook_receipt(text,text,text,timestamptz)',
    'EXECUTE'
  ),
  'Anon cannot execute either provider-ingress function'
);

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.record_meta_lead_webhook_receipt(text,text,text,timestamptz)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'private.record_meta_lead_webhook_receipt(text,text,text,timestamptz)',
    'EXECUTE'
  ),
  'Authenticated users cannot execute either provider-ingress function'
);

select extensions.ok(
  not has_table_privilege(
    'anon',
    'public.provider_connections',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'anon',
    'public.provider_lead_receipts',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'Anon has no direct provider table privileges'
);

select extensions.ok(
  not has_table_privilege(
    'authenticated',
    'public.provider_connections',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'authenticated',
    'public.provider_lead_receipts',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'Authenticated users have no direct provider table privileges'
);

select extensions.ok(
  not has_table_privilege(
    'service_role',
    'public.provider_connections',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'service_role',
    'public.provider_lead_receipts',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'Service role must use the scoped provider-ingress function instead of direct table access'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('provider_connections', 'provider_lead_receipts')
      and c.relrowsecurity
  ),
  2,
  'RLS is enabled on both provider tables'
);

set local role anon;

select extensions.throws_ok(
  $$select * from public.record_meta_lead_webhook_receipt('page-1001', 'lead-anon', null, null)$$,
  '42501',
  'permission denied for function record_meta_lead_webhook_receipt',
  'Anon execution is denied by the public wrapper ACL'
);

reset role;
set local role authenticated;

select extensions.throws_ok(
  $$select * from public.record_meta_lead_webhook_receipt('page-1001', 'lead-authenticated', null, null)$$,
  '42501',
  'permission denied for function record_meta_lead_webhook_receipt',
  'Authenticated execution is denied by the public wrapper ACL'
);

reset role;

create temporary table test_meta_ingress_calls (
  sequence_number integer primary key,
  result text not null,
  receipt_id uuid not null,
  organization_id uuid not null
) on commit drop;

grant select, insert on table test_meta_ingress_calls to service_role;

set local role service_role;

insert into test_meta_ingress_calls (sequence_number, result, receipt_id, organization_id)
select
  1,
  receipt.result,
  receipt.receipt_id,
  receipt.organization_id
from public.record_meta_lead_webhook_receipt(
  'page-1001',
  'lead-abc',
  'form-1',
  '2026-09-01 10:00:00+00'::timestamptz
) receipt;

reset role;

select extensions.results_eq(
  $$
    select result, organization_id
    from test_meta_ingress_calls
    where sequence_number = 1
  $$,
  $$values ('created'::text, '51000000-0000-0000-0000-000000000001'::uuid)$$,
  'Active Meta page mapping creates a receipt in the mapped tenant'
);

update public.provider_lead_receipts
set
  processing_status = 'processed',
  attempt_count = 4,
  last_error = 'Retained processing note',
  lead_id = '51000000-0000-0000-0000-000000000201',
  metadata = metadata || '{"processing_marker":"retained"}'::jsonb
where provider_lead_id = 'lead-abc';

create temporary table test_meta_receipt_snapshot on commit drop as
select *
from public.provider_lead_receipts
where provider_lead_id = 'lead-abc';

set local role service_role;

insert into test_meta_ingress_calls (sequence_number, result, receipt_id, organization_id)
select
  2,
  receipt.result,
  receipt.receipt_id,
  receipt.organization_id
from public.record_meta_lead_webhook_receipt(
  'page-1001',
  'lead-abc',
  'form-retry-must-not-overwrite',
  '2026-09-02 10:00:00+00'::timestamptz
) receipt;

reset role;

select extensions.results_eq(
  $$
    select result, receipt_id
    from test_meta_ingress_calls
    where sequence_number = 2
  $$,
  $$
    select 'existing'::text, receipt_id
    from test_meta_ingress_calls
    where sequence_number = 1
  $$,
  'Duplicate delivery returns the same existing receipt'
);

select extensions.is(
  (
    select count(*)::integer
    from public.provider_lead_receipts
    where organization_id = '51000000-0000-0000-0000-000000000001'
      and provider = 'meta'
      and provider_lead_id = 'lead-abc'
  ),
  1,
  'Duplicate delivery creates no second receipt'
);

select extensions.results_eq(
  $$
    select
      id,
      organization_id,
      provider_connection_id,
      provider,
      provider_lead_id,
      form_id,
      provider_created_at,
      processing_status,
      attempt_count,
      last_error,
      lead_id,
      metadata,
      created_at,
      updated_at
    from public.provider_lead_receipts
    where provider_lead_id = 'lead-abc'
  $$,
  $$
    select
      id,
      organization_id,
      provider_connection_id,
      provider,
      provider_lead_id,
      form_id,
      provider_created_at,
      processing_status,
      attempt_count,
      last_error,
      lead_id,
      metadata,
      created_at,
      updated_at
    from test_meta_receipt_snapshot
  $$,
  'Duplicate delivery leaves every stored receipt field unchanged'
);

select extensions.results_eq(
  $$
    select status, notes
    from public.leads
    where id = '51000000-0000-0000-0000-000000000201'
  $$,
  $$values ('Qualified'::text, 'Human-reviewed notes'::text)$$,
  'Duplicate delivery does not overwrite later human lead workflow edits'
);

set local role service_role;

select extensions.throws_ok(
  $$select * from public.record_meta_lead_webhook_receipt('page-unknown', 'lead-missing', 'form-2', now())$$,
  '42501',
  'No active Meta tenant mapping',
  'Unknown Meta page fails closed'
);

select extensions.throws_ok(
  $$select * from public.record_meta_lead_webhook_receipt('page-2001', 'lead-paused', 'form-3', now())$$,
  '42501',
  'No active Meta tenant mapping',
  'Paused organization Meta page fails closed'
);

select extensions.throws_ok(
  $$select * from public.record_meta_lead_webhook_receipt('page-3001', 'lead-disabled', 'form-4', now())$$,
  '42501',
  'No active Meta tenant mapping',
  'Disabled provider connection fails closed'
);

reset role;

select extensions.throws_ok(
  $$
    insert into public.provider_lead_receipts (
      organization_id, provider_connection_id, provider, provider_lead_id
    )
    values (
      '51000000-0000-0000-0000-000000000001',
      '53000000-0000-0000-0000-000000000002',
      'meta',
      'lead-cross-connection'
    )
  $$,
  '23503',
  'insert or update on table "provider_lead_receipts" violates foreign key constraint "provider_lead_receipts_connection_same_org_provider_fk"',
  'Cross-tenant provider connection linkage is rejected'
);

select extensions.throws_ok(
  $$
    insert into public.provider_lead_receipts (
      organization_id, provider_connection_id, provider, provider_lead_id, lead_id
    )
    values (
      '51000000-0000-0000-0000-000000000001',
      '53000000-0000-0000-0000-000000000001',
      'meta',
      'lead-cross-lead',
      '52000000-0000-0000-0000-000000000201'
    )
  $$,
  '23503',
  'insert or update on table "provider_lead_receipts" violates foreign key constraint "provider_lead_receipts_lead_same_org_fk"',
  'Cross-tenant lead linkage is rejected'
);

select extensions.throws_ok(
  $$
    insert into public.provider_lead_receipts (
      organization_id, provider_connection_id, provider, provider_lead_id
    )
    values (
      '54000000-0000-0000-0000-000000000001',
      '53000000-0000-0000-0000-000000000004',
      'meta',
      'lead-provider-mismatch'
    )
  $$,
  '23503',
  'insert or update on table "provider_lead_receipts" violates foreign key constraint "provider_lead_receipts_connection_same_org_provider_fk"',
  'Receipt provider must match its provider connection'
);

delete from public.leads
where id = '51000000-0000-0000-0000-000000000201';

select extensions.results_eq(
  $$
    select organization_id, lead_id, provider_lead_id
    from public.provider_lead_receipts
    where provider_lead_id = 'lead-abc'
  $$,
  $$values (
    '51000000-0000-0000-0000-000000000001'::uuid,
    null::uuid,
    'lead-abc'::text
  )$$,
  'Deleting a linked lead clears only lead_id and preserves its tenant receipt'
);

select * from extensions.finish();
rollback;
