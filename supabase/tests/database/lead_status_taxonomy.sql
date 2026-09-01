begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(4);

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values ('00000000-0000-0000-0000-00000000e001', 'authenticated', 'authenticated', 'status-taxonomy@leadrescue.invalid', now(), now(), false, false);

insert into public.profiles (user_id, full_name)
values ('00000000-0000-0000-0000-00000000e001', 'Status Taxonomy User');

insert into public.organizations (id, name, slug)
values ('60000000-0000-0000-0000-000000000001', 'Status Taxonomy Tenant', 'status-taxonomy-tenant');

insert into public.organization_members (organization_id, user_id, role)
values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000e001', 'owner');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.results_eq(
  $$select result from public.persist_imported_lead(
    'Imported Stage Example', null, null, null,
    'Clinic', 'Consultation', 'manual_csv', 'status-stage-001', 'Proposal',
    'Fictional imported source stage.', null, 0, '', null, null, '', ''
  )$$,
  $$values ('created'::text)$$,
  'Imported lead is created successfully when source stage is external vocabulary'
);

select extensions.results_eq(
  $$select status from public.leads where source_external_id = 'status-stage-001'$$,
  $$values ('New'::text)$$,
  'Imported external stage does not control authoritative LeadRescue status'
);

select extensions.results_eq(
  $$select source_metadata ->> 'source_stage' from public.leads where source_external_id = 'status-stage-001'$$,
  $$values ('Proposal'::text)$$,
  'Imported external stage is preserved in source metadata'
);

reset role;

select extensions.throws_ok(
  $$update public.leads set status = 'Proposal' where source_external_id = 'status-stage-001'$$,
  '23514',
  null,
  'Database constraint rejects status values outside the approved LeadRescue taxonomy'
);

select * from extensions.finish();
rollback;
