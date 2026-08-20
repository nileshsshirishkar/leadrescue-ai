begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(12);

-- Test-only identities and tenant records. The transaction is rolled back at the end.
insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('00000000-0000-0000-0000-00000000a001', 'authenticated', 'authenticated', 'rls-a@leadrescue.invalid', now(), now(), false, false),
  ('00000000-0000-0000-0000-00000000b001', 'authenticated', 'authenticated', 'rls-b@leadrescue.invalid', now(), now(), false, false);

insert into public.profiles (user_id, full_name)
values
  ('00000000-0000-0000-0000-00000000a001', 'RLS User A'),
  ('00000000-0000-0000-0000-00000000b001', 'RLS User B');

insert into public.organizations (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000001', 'Tenant A', 'tenant-a'),
  ('20000000-0000-0000-0000-000000000001', 'Tenant B', 'tenant-b');

insert into public.organization_members (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000a001', 'member'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000b001', 'owner');

insert into public.contacts (id, organization_id, full_name, email)
values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Contact A', 'a@example.invalid'),
  ('22000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Contact B', 'b@example.invalid');

insert into public.leads (id, organization_id, contact_id, service_interest, status)
values
  ('11100000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Service A', 'New'),
  ('22200000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Service B', 'New');

select extensions.is(
  (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('organizations','profiles','organization_members','contacts','leads','lead_events','follow_up_tasks') and c.relrowsecurity),
  7,
  'RLS is enabled on all seven LeadRescue public tables'
);

-- Authenticate as tenant A member.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.results_eq(
  $$select count(*)::bigint from public.organizations$$,
  $$values (1::bigint)$$,
  'Tenant A sees only its organization'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.contacts$$,
  $$values (1::bigint)$$,
  'Tenant A sees only its contact'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.leads$$,
  $$values (1::bigint)$$,
  'Tenant A sees only its lead'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.profiles$$,
  $$values (1::bigint)$$,
  'Tenant A sees only profiles in its organization'
);

select extensions.throws_ok(
  $$insert into public.contacts (organization_id, full_name) values ('20000000-0000-0000-0000-000000000001', 'Cross Tenant Contact')$$,
  '42501',
  'new row violates row-level security policy for table "contacts"',
  'Tenant A cannot insert a contact into Tenant B'
);

select extensions.results_eq(
  $$with deleted as (delete from public.leads where id = '11100000-0000-0000-0000-000000000001' returning 1) select count(*)::bigint from deleted$$,
  $$values (0::bigint)$$,
  'Member cannot delete a lead'
);

select extensions.results_eq(
  $$with changed as (update public.organizations set name = 'Unauthorized' where id = '10000000-0000-0000-0000-000000000001' returning 1) select count(*)::bigint from changed$$,
  $$values (0::bigint)$$,
  'Member cannot update organization settings'
);

select extensions.throws_ok(
  $$update public.contacts set organization_id = '20000000-0000-0000-0000-000000000001' where id = '11000000-0000-0000-0000-000000000001'$$,
  'P0001',
  'organization_id is immutable',
  'Tenant-owned records cannot be moved between organizations'
);

reset role;

-- Authenticate as tenant B owner.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.results_eq(
  $$select count(*)::bigint from public.organizations$$,
  $$values (1::bigint)$$,
  'Tenant B sees only its organization'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.leads$$,
  $$values (1::bigint)$$,
  'Tenant B sees only its lead'
);

select extensions.results_eq(
  $$with deleted as (delete from public.leads where id = '22200000-0000-0000-0000-000000000001' returning 1) select count(*)::bigint from deleted$$,
  $$values (1::bigint)$$,
  'Owner can delete a lead in its own organization'
);

reset role;

select * from extensions.finish();
rollback;
