begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(16);

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values ('00000000-0000-0000-0000-00000000c001','authenticated','authenticated','access-owner@leadrescue.invalid',now(),now(),false,false);

insert into public.profiles (user_id, full_name)
values ('00000000-0000-0000-0000-00000000c001','Access Owner');

insert into public.organizations (id, name, slug)
values ('30000000-0000-0000-0000-000000000001','Access Tenant','access-tenant');

insert into public.organization_members (organization_id, user_id, role)
values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c001','owner');

insert into public.contacts (id, organization_id, full_name)
values ('31000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Access Contact');

insert into public.leads (id, organization_id, contact_id, source, source_external_id, status)
values ('31100000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','qa','org-access-001','Follow-up needed');

insert into public.lead_events (id, organization_id, lead_id, event_type, actor_user_id, summary)
values ('31200000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','31100000-0000-0000-0000-000000000001','qa_access','00000000-0000-0000-0000-00000000c001','Access fixture');

insert into public.follow_up_tasks (id, organization_id, lead_id, assigned_to, due_at, status, task_type)
values ('31300000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','31100000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000c001',now() + interval '1 day','pending','lead_follow_up');

select extensions.results_eq(
  $$select access_status from public.organizations where id='30000000-0000-0000-0000-000000000001'$$,
  $$values ('active'::text)$$,
  'New organizations default to active'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000c001',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;

select extensions.results_eq($$select count(*)::bigint from public.organizations where id='30000000-0000-0000-0000-000000000001'$$,$$values (1::bigint)$$,'Active owner can see its organization');
select extensions.results_eq($$select count(*)::bigint from public.contacts where organization_id='30000000-0000-0000-0000-000000000001'$$,$$values (1::bigint)$$,'Active organization can read contacts');
select extensions.results_eq($$select count(*)::bigint from public.leads where organization_id='30000000-0000-0000-0000-000000000001'$$,$$values (1::bigint)$$,'Active organization can read leads');
select extensions.results_eq($$select count(*)::bigint from public.lead_events where organization_id='30000000-0000-0000-0000-000000000001'$$,$$values (1::bigint)$$,'Active organization can read lead events');
select extensions.results_eq($$select count(*)::bigint from public.follow_up_tasks where organization_id='30000000-0000-0000-0000-000000000001'$$,$$values (1::bigint)$$,'Active organization can read follow-up tasks');

select extensions.throws_ok(
  $$update public.organizations set access_status='paused' where id='30000000-0000-0000-0000-000000000001'$$,
  '42501','permission denied for table organizations','Authenticated organization owners cannot pause themselves or reactivate themselves'
);

reset role;
update public.organizations set access_status='paused' where id='30000000-0000-0000-0000-000000000001';
set local role authenticated;

select extensions.results_eq($$select access_status from public.organizations where id='30000000-0000-0000-0000-000000000001'$$,$$values ('paused'::text)$$,'Paused member can still resolve the organization access state');
select extensions.results_eq($$select count(*)::bigint from public.organization_members where organization_id='30000000-0000-0000-0000-000000000001' and user_id='00000000-0000-0000-0000-00000000c001'$$,$$values (1::bigint)$$,'Paused member can still resolve its own membership');
select extensions.results_eq($$select count(*)::bigint from public.contacts where organization_id='30000000-0000-0000-0000-000000000001'$$,$$values (0::bigint)$$,'Paused organization cannot read contacts');
select extensions.results_eq($$select count(*)::bigint from public.leads where organization_id='30000000-0000-0000-0000-000000000001'$$,$$values (0::bigint)$$,'Paused organization cannot read leads');
select extensions.results_eq($$select count(*)::bigint from public.lead_events where organization_id='30000000-0000-0000-0000-000000000001'$$,$$values (0::bigint)$$,'Paused organization cannot read lead events');
select extensions.results_eq($$select count(*)::bigint from public.follow_up_tasks where organization_id='30000000-0000-0000-0000-000000000001'$$,$$values (0::bigint)$$,'Paused organization cannot read follow-up tasks');

select extensions.throws_ok(
  $$insert into public.contacts (organization_id, full_name) values ('30000000-0000-0000-0000-000000000001','Blocked While Paused')$$,
  '42501','new row violates row-level security policy for table "contacts"','Paused organization cannot create contacts'
);

reset role;
update public.organizations set access_status='active' where id='30000000-0000-0000-0000-000000000001';
set local role authenticated;

select extensions.results_eq($$select count(*)::bigint from public.leads where id='31100000-0000-0000-0000-000000000001'$$,$$values (1::bigint)$$,'Reactivation restores lead access without deleting data');
select extensions.results_eq($$select count(*)::bigint from public.follow_up_tasks where id='31300000-0000-0000-0000-000000000001'$$,$$values (1::bigint)$$,'Reactivation restores follow-up task access without deleting data');

reset role;
select * from extensions.finish();
rollback;
