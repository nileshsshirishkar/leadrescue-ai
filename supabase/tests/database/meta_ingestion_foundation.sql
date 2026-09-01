begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(6);

insert into public.organizations (id, name, slug, access_status)
values
  ('51000000-0000-0000-0000-000000000001', 'Meta Tenant A', 'meta-tenant-a', 'active'),
  ('52000000-0000-0000-0000-000000000001', 'Meta Tenant B', 'meta-tenant-b', 'paused');

insert into public.provider_connections (
  id, organization_id, provider, external_account_id, status
)
values
  ('53000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'meta', 'page-1001', 'active'),
  ('53000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000001', 'meta', 'page-2001', 'active');

set local role service_role;

select extensions.is(
  (select result from public.record_meta_lead_webhook_receipt('page-1001', 'lead-abc', 'form-1', now())),
  'created',
  'Active Meta page mapping creates one durable receipt'
);

select extensions.is(
  (select result from public.record_meta_lead_webhook_receipt('page-1001', 'lead-abc', 'form-1', now())),
  'existing',
  'Retry returns the existing receipt'
);

select extensions.is(
  (select count(*)::integer from public.provider_lead_receipts where provider_lead_id = 'lead-abc'),
  1,
  'Retry does not create a duplicate receipt'
);

select extensions.is(
  (select organization_id from public.provider_lead_receipts where provider_lead_id = 'lead-abc'),
  '51000000-0000-0000-0000-000000000001'::uuid,
  'Meta page resolves to the mapped tenant'
);

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
  'Paused tenant Meta page fails closed'
);

select * from extensions.finish();
rollback;
