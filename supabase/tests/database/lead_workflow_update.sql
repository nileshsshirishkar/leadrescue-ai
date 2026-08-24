begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(16);

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('00000000-0000-0000-0000-00000000e001', 'authenticated', 'authenticated', 'workflow-a@leadrescue.invalid', now(), now(), false, false),
  ('00000000-0000-0000-0000-00000000e002', 'authenticated', 'authenticated', 'workflow-b@leadrescue.invalid', now(), now(), false, false);

insert into public.profiles (user_id, full_name)
values
  ('00000000-0000-0000-0000-00000000e001', 'Workflow User A'),
  ('00000000-0000-0000-0000-00000000e002', 'Workflow User B');

insert into public.organizations (id, name, slug)
values
  ('60000000-0000-0000-0000-000000000001', 'Workflow Tenant A', 'workflow-tenant-a'),
  ('70000000-0000-0000-0000-000000000001', 'Workflow Tenant B', 'workflow-tenant-b');

insert into public.organization_members (organization_id, user_id, role)
values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000e001', 'member'),
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000e002', 'member');

insert into public.contacts (id, organization_id, full_name)
values
  ('60000000-0000-0000-0000-000000000101', '60000000-0000-0000-0000-000000000001', 'Workflow Lead A'),
  ('70000000-0000-0000-0000-000000000101', '70000000-0000-0000-0000-000000000001', 'Workflow Lead B');

insert into public.leads (id, organization_id, contact_id, source, source_external_id, status, notes)
values
  ('60000000-0000-0000-0000-000000000201', '60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000101', 'manual', 'workflow-a-001', 'Follow-up needed', 'Original notes'),
  ('70000000-0000-0000-0000-000000000201', '70000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000101', 'manual', 'workflow-b-001', 'Follow-up needed', 'Other tenant notes');

insert into public.follow_up_tasks (id, organization_id, lead_id, assigned_to, due_at, status, task_type)
values
  ('60000000-0000-0000-0000-000000000301', '60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-00000000e001', now() - interval '1 day', 'pending', 'lead_follow_up');

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.update_lead_workflow(uuid,text,text,timestamptz,boolean)',
    'EXECUTE'
  ),
  'Authenticated role can execute the workflow function'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.update_lead_workflow(uuid,text,text,timestamptz,boolean)',
    'EXECUTE'
  ),
  'Anon role cannot execute the workflow function'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.results_eq(
  $$select status from public.update_lead_workflow(
    '60000000-0000-0000-0000-000000000201',
    'Qualified',
    'Qualified during follow-up.',
    now() + interval '2 days',
    false
  )$$,
  $$values ('Qualified'::text)$$,
  'Active workflow update persists the approved status'
);

select extensions.results_eq(
  $$select notes from public.leads where id = '60000000-0000-0000-0000-000000000201'$$,
  $$values ('Qualified during follow-up.'::text)$$,
  'Workflow update persists notes'
);

select extensions.results_eq(
  $$select status from public.follow_up_tasks where id = '60000000-0000-0000-0000-000000000301'$$,
  $$values ('completed'::text)$$,
  'Existing pending task is completed'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.follow_up_tasks where lead_id = '60000000-0000-0000-0000-000000000201' and status = 'pending'$$,
  $$values (1::bigint)$$,
  'Active workflow update leaves exactly one new pending task'
);

select extensions.results_eq(
  $$select assigned_to from public.follow_up_tasks where lead_id = '60000000-0000-0000-0000-000000000201' and status = 'pending'$$,
  $$values ('00000000-0000-0000-0000-00000000e001'::uuid)$$,
  'Replacement task is assigned to the authenticated user'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.lead_events where lead_id = '60000000-0000-0000-0000-000000000201' and event_type = 'lead_workflow_updated'$$,
  $$values (1::bigint)$$,
  'Workflow update creates an audit event'
);

select extensions.results_eq(
  $$select status from public.update_lead_workflow(
    '60000000-0000-0000-0000-000000000201',
    'Won',
    null,
    null,
    false
  )$$,
  $$values ('Won'::text)$$,
  'Terminal outcome can be recorded without a next task'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.follow_up_tasks where lead_id = '60000000-0000-0000-0000-000000000201' and status = 'pending'$$,
  $$values (0::bigint)$$,
  'Terminal outcome closes pending work and creates no new task'
);

select extensions.throws_ok(
  $$select * from public.update_lead_workflow(
    '60000000-0000-0000-0000-000000000201',
    'Qualified',
    null,
    now() + interval '1 day',
    false
  )$$,
  '22023',
  'Terminal leads require an explicit reopen action',
  'Terminal lead cannot move back to an active status without reopen'
);

select extensions.results_eq(
  $$select status from public.update_lead_workflow(
    '60000000-0000-0000-0000-000000000201',
    'Follow-up needed',
    'Reopened after client response.',
    now() + interval '1 day',
    true
  )$$,
  $$values ('Follow-up needed'::text)$$,
  'Explicit reopen returns a terminal lead to Follow-up needed'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.lead_events where lead_id = '60000000-0000-0000-0000-000000000201' and event_type = 'lead_reopened'$$,
  $$values (1::bigint)$$,
  'Reopen action creates a dedicated audit event'
);

select extensions.throws_ok(
  $$select * from public.update_lead_workflow(
    '60000000-0000-0000-0000-000000000201',
    'No answer',
    null,
    now() + interval '1 day',
    false
  )$$,
  '22023',
  'Lead status is not approved',
  'Unapproved status values fail closed'
);

select extensions.throws_ok(
  $$select * from public.update_lead_workflow(
    '60000000-0000-0000-0000-000000000201',
    'Interested',
    null,
    null,
    false
  )$$,
  '22023',
  'Active leads require a next follow-up date',
  'Active status requires a next follow-up task'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.update_lead_workflow(
    '70000000-0000-0000-0000-000000000201',
    'Won',
    null,
    null,
    false
  )$$,
  $$values (0::bigint)$$,
  'Cross-tenant lead update reveals no row'
);

select extensions.results_eq(
  $$select status from public.leads where id = '70000000-0000-0000-0000-000000000201'$$,
  $$values ('Follow-up needed'::text)$$,
  'Cross-tenant update leaves the other tenant lead unchanged'
);

reset role;
rollback;
