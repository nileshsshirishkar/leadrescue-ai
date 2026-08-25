begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(20);

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('00000000-0000-0000-0000-00000000c001', 'authenticated', 'authenticated', 'e2e-a@leadrescue.invalid', now(), now(), false, false),
  ('00000000-0000-0000-0000-00000000d001', 'authenticated', 'authenticated', 'e2e-b@leadrescue.invalid', now(), now(), false, false);

insert into public.profiles (user_id, full_name)
values
  ('00000000-0000-0000-0000-00000000c001', 'E2E User A'),
  ('00000000-0000-0000-0000-00000000d001', 'E2E User B');

insert into public.organizations (id, name, slug, access_status)
values
  ('30000000-0000-0000-0000-000000000001', 'E2E Tenant A', 'e2e-tenant-a', 'active'),
  ('40000000-0000-0000-0000-000000000001', 'E2E Tenant B', 'e2e-tenant-b', 'active');

insert into public.organization_members (organization_id, user_id, role)
values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000c001', 'owner'),
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000d001', 'owner');

insert into public.contacts (id, organization_id, full_name, email)
values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'E2E Contact A', 'e2e-a@example.invalid'),
  ('41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'E2E Contact B', 'e2e-b@example.invalid');

insert into public.leads (
  id, organization_id, contact_id, source, source_external_id, service_interest, status, notes
)
values
  ('31100000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'qa', 'e2e-a-seed', 'Tenant A service', 'Follow-up needed', 'Tenant A seed'),
  ('41100000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'qa', 'e2e-b-seed', 'Tenant B service', 'Follow-up needed', 'Tenant B seed');

insert into public.follow_up_tasks (
  id, organization_id, lead_id, assigned_to, due_at, status, task_type
)
values
  ('31200000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '31100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000c001', now() + interval '1 day', 'pending', 'lead_follow_up'),
  ('41200000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '41100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000d001', now() + interval '1 day', 'pending', 'lead_follow_up');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.results_eq(
  $$select count(*)::bigint from public.contacts$$,
  $$values (1::bigint)$$,
  'Tenant A reads only its contact'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.leads$$,
  $$values (1::bigint)$$,
  'Tenant A reads only its lead'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.follow_up_tasks$$,
  $$values (1::bigint)$$,
  'Tenant A reads only its task'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.lead_events$$,
  $$values (0::bigint)$$,
  'Tenant A initially sees no events'
);

select extensions.throws_ok(
  $$insert into public.contacts (organization_id, full_name) values ('40000000-0000-0000-0000-000000000001', 'Forbidden cross-tenant contact')$$,
  '42501',
  'new row violates row-level security policy for table "contacts"',
  'Tenant A cannot create a contact in Tenant B'
);

select extensions.results_eq(
  $$with changed as (
      update public.leads
      set notes='Forbidden Tenant A edit'
      where id='41100000-0000-0000-0000-000000000001'
      returning 1
    ) select count(*)::bigint from changed$$,
  $$values (0::bigint)$$,
  'Tenant A cannot update Tenant B lead'
);

select extensions.throws_ok(
  $$insert into public.follow_up_tasks (organization_id, lead_id, assigned_to, due_at, status, task_type)
    values ('40000000-0000-0000-0000-000000000001','41100000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000d001',now() + interval '2 days','pending','lead_follow_up')$$,
  '42501',
  'new row violates row-level security policy for table "follow_up_tasks"',
  'Tenant A cannot create a task in Tenant B'
);

select extensions.throws_ok(
  $$insert into public.lead_events (organization_id, lead_id, event_type, actor_user_id, summary)
    values ('40000000-0000-0000-0000-000000000001','41100000-0000-0000-0000-000000000001','cross_tenant_attempt','00000000-0000-0000-0000-00000000c001','Forbidden')$$,
  '42501',
  'new row violates row-level security policy for table "lead_events"',
  'Tenant A cannot create an event in Tenant B'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.update_lead_workflow(
    '41100000-0000-0000-0000-000000000001',
    'Qualified',
    'Forbidden workflow update',
    now() + interval '3 days',
    false
  )$$,
  $$values (0::bigint)$$,
  'Tenant A workflow RPC cannot expose or update Tenant B lead'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.persist_imported_lead(
    'E2E New Lead A',
    null,
    null,
    'qa',
    'e2e-a-created',
    'Tenant A created service',
    'New',
    null,
    0,
    null,
    null,
    'Tenant A created through RPC'
  ) where result='created'$$,
  $$values (1::bigint)$$,
  'Tenant A can create its own imported lead through authenticated RPC'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.leads where source_external_id='e2e-a-created'$$,
  $$values (1::bigint)$$,
  'Tenant A sees its newly created lead'
);

select * into temporary table e2e_a_workflow_result
from public.update_lead_workflow(
  '31100000-0000-0000-0000-000000000001',
  'Qualified',
  'Tenant A valid workflow update',
  now() + interval '4 days',
  false
);

select extensions.results_eq(
  $$select count(*)::bigint from e2e_a_workflow_result where status='Qualified' and new_task_id is not null$$,
  $$values (1::bigint)$$,
  'Tenant A can update its own lead workflow'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.follow_up_tasks where lead_id='31100000-0000-0000-0000-000000000001' and status='pending'$$,
  $$values (1::bigint)$$,
  'Tenant A workflow leaves exactly one pending task'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.lead_events where lead_id='31100000-0000-0000-0000-000000000001' and event_type='lead_workflow_updated'$$,
  $$values (1::bigint)$$,
  'Tenant A workflow creates one audit event'
);

reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.results_eq(
  $$select count(*)::bigint from public.contacts$$,
  $$values (1::bigint)$$,
  'Tenant B reads only its contact'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.leads$$,
  $$values (1::bigint)$$,
  'Tenant B reads only its original lead'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.follow_up_tasks$$,
  $$values (1::bigint)$$,
  'Tenant B reads only its task'
);

select extensions.results_eq(
  $$select notes from public.leads where id='41100000-0000-0000-0000-000000000001'$$,
  $$values ('Tenant B seed'::text)$$,
  'Tenant B lead remained unchanged after Tenant A attacks'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.leads where source_external_id='e2e-a-created'$$,
  $$values (0::bigint)$$,
  'Tenant B cannot see Tenant A newly created lead'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.lead_events$$,
  $$values (0::bigint)$$,
  'Tenant B cannot see Tenant A audit event'
);

reset role;
select * from extensions.finish();
rollback;
