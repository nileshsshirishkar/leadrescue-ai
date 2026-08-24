begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(19);

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('00000000-0000-0000-0000-00000000c001', 'authenticated', 'authenticated', 'persist-a@leadrescue.invalid', now(), now(), false, false),
  ('00000000-0000-0000-0000-00000000d001', 'authenticated', 'authenticated', 'persist-multi@leadrescue.invalid', now(), now(), false, false);

insert into public.profiles (user_id, full_name)
values
  ('00000000-0000-0000-0000-00000000c001', 'Persist User A'),
  ('00000000-0000-0000-0000-00000000d001', 'Persist Multi User');

insert into public.organizations (id, name, slug)
values
  ('30000000-0000-0000-0000-000000000001', 'Persist Tenant A', 'persist-tenant-a'),
  ('40000000-0000-0000-0000-000000000001', 'Persist Tenant B', 'persist-tenant-b'),
  ('50000000-0000-0000-0000-000000000001', 'Persist Tenant C', 'persist-tenant-c');

insert into public.organization_members (organization_id, user_id, role)
values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000c001', 'member'),
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000d001', 'member'),
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000d001', 'member');

create or replace function public.test_reject_persist_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.metadata ->> 'source_external_id' = 'rollback-001' then
    raise exception 'test event rejection';
  end if;
  return new;
end;
$$;

create trigger test_reject_persist_event_trigger
before insert on public.lead_events
for each row execute function public.test_reject_persist_event();

create or replace function public.test_unrelated_unique_violation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email = 'unique-probe@leadrescue.invalid' then
    raise unique_violation
      using message = 'test unrelated uniqueness violation',
            constraint = 'test_unrelated_contact_unique';
  end if;
  return new;
end;
$$;

create trigger test_unrelated_unique_violation_trigger
before insert on public.contacts
for each row execute function public.test_unrelated_unique_violation();

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.persist_imported_lead(text,text,text,text,text,text,text,text,text,text,timestamptz,integer,text,numeric,text,text,text)',
    'EXECUTE'
  ),
  'Authenticated role can execute the persistence function'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.persist_imported_lead(text,text,text,text,text,text,text,text,text,text,timestamptz,integer,text,numeric,text,text,text)',
    'EXECUTE'
  ),
  'Anon role cannot execute the persistence function'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.results_eq(
  $$select result from public.persist_imported_lead(
    'Atomic Example', '+1 202-555-0198', '+12025550198', 'atomic@example.invalid',
    'Home services', 'Maintenance plan', 'manual-import', 'atomic-001', 'New',
    'Fictional atomic persistence test.', null, 0, 'Not booked', null, null, '', 'Test lead'
  )$$,
  $$values ('created'::text)$$,
  'First persistence call creates a lead'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.contacts where organization_id = '30000000-0000-0000-0000-000000000001'$$,
  $$values (1::bigint)$$,
  'First persistence call creates one contact'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.leads where organization_id = '30000000-0000-0000-0000-000000000001' and source = 'manual-import' and source_external_id = 'atomic-001'$$,
  $$values (1::bigint)$$,
  'First persistence call creates one lead in the authenticated tenant'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.lead_events where organization_id = '30000000-0000-0000-0000-000000000001' and event_type = 'lead_imported'$$,
  $$values (1::bigint)$$,
  'First persistence call creates one audit event'
);

select extensions.results_eq(
  $$select result from public.persist_imported_lead(
    'Changed Retry Name', null, null, 'changed@example.invalid',
    'Different business', 'Different service', 'manual-import', 'atomic-001', 'Changed',
    'This retry must not overwrite the existing lead.', null, 8, 'Booked', 999, 'USD', 'Changed', 'Changed'
  )$$,
  $$values ('existing'::text)$$,
  'Retry with the same idempotency key returns existing'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.contacts where organization_id = '30000000-0000-0000-0000-000000000001'$$,
  $$values (1::bigint)$$,
  'Idempotent retry creates no second contact'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.leads where organization_id = '30000000-0000-0000-0000-000000000001' and source = 'manual-import' and source_external_id = 'atomic-001'$$,
  $$values (1::bigint)$$,
  'Idempotent retry creates no second lead'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.lead_events where organization_id = '30000000-0000-0000-0000-000000000001' and event_type = 'lead_imported'$$,
  $$values (1::bigint)$$,
  'Idempotent retry creates no second audit event'
);

select extensions.results_eq(
  $$select status from public.leads where organization_id = '30000000-0000-0000-0000-000000000001' and source = 'manual-import' and source_external_id = 'atomic-001'$$,
  $$values ('New'::text)$$,
  'Idempotent retry does not overwrite the existing lead'
);

select extensions.throws_ok(
  $$select * from public.persist_imported_lead(
    'Bad Source', null, null, null, '', '', ' padded ', 'bad-source-001', 'New', '', null, 0, '', null, null, '', ''
  )$$,
  '22023',
  'Source must be trimmed and non-empty',
  'Padded source values fail closed'
);

select extensions.throws_ok(
  $$select * from public.persist_imported_lead(
    'Missing External ID', null, null, null, '', '', 'manual-import', null, 'New', '', null, 0, '', null, null, '', ''
  )$$,
  '22023',
  'External source id must be trimmed and non-empty',
  'Missing external source ids fail closed'
);

select extensions.throws_ok(
  $$select * from public.persist_imported_lead(
    'Rollback Example', null, null, null, '', '', 'manual-import', 'rollback-001', 'New', '', null, 0, '', null, null, '', ''
  )$$,
  'P0001',
  'test event rejection',
  'Audit-event failure aborts the persistence call'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.contacts where organization_id = '30000000-0000-0000-0000-000000000001'$$,
  $$values (1::bigint)$$,
  'Audit-event failure rolls back the new contact'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.leads where organization_id = '30000000-0000-0000-0000-000000000001' and source_external_id = 'rollback-001'$$,
  $$values (0::bigint)$$,
  'Audit-event failure rolls back the new lead'
);

select extensions.throws_ok(
  $$select * from public.persist_imported_lead(
    'Unrelated Unique Probe', null, null, 'unique-probe@leadrescue.invalid', '', '',
    'manual-import', 'unique-probe-001', 'New', '', null, 0, '', null, null, '', ''
  )$$,
  '23505',
  'test unrelated uniqueness violation',
  'Unrelated uniqueness violations are rethrown instead of treated as idempotent retries'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.leads where organization_id = '30000000-0000-0000-0000-000000000001' and source_external_id = 'unique-probe-001'$$,
  $$values (0::bigint)$$,
  'Unrelated uniqueness failures leave no persisted lead'
);

reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.throws_ok(
  $$select * from public.persist_imported_lead(
    'Ambiguous Org', null, null, null, '', '', 'manual-import', 'ambiguous-001', 'New', '', null, 0, '', null, null, '', ''
  )$$,
  'P0001',
  'Organization selection required',
  'Multiple organization memberships fail closed'
);

reset role;

select * from extensions.finish();
rollback;
