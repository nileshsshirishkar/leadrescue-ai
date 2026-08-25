alter table public.organizations
add column access_status text not null default 'active';

alter table public.organizations
add constraint organizations_access_status_check
check (access_status in ('active', 'paused'));

create or replace function private.has_active_org_access(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and o.access_status = 'active'
  );
$$;

create or replace function private.has_active_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.role = any(allowed_roles)
      and o.access_status = 'active'
  );
$$;

create or replace function private.shares_org_with_user(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_user = (select auth.uid())
    or exists (
      select 1
      from public.organization_members me
      join public.organization_members them
        on them.organization_id = me.organization_id
      join public.organizations o
        on o.id = me.organization_id
      where me.user_id = (select auth.uid())
        and them.user_id = target_user
        and o.access_status = 'active'
    );
$$;

revoke execute on function private.has_active_org_access(uuid) from public, anon, authenticated;
revoke execute on function private.has_active_org_role(uuid, text[]) from public, anon, authenticated;
grant execute on function private.has_active_org_access(uuid) to authenticated, service_role;
grant execute on function private.has_active_org_role(uuid, text[]) to authenticated, service_role;

revoke update on table public.organizations from authenticated;
drop policy if exists organizations_update_admin on public.organizations;

drop policy if exists organization_members_select_member on public.organization_members;
create policy organization_members_select_member
on public.organization_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.has_active_org_access(organization_id)
);

drop policy if exists contacts_select_member on public.contacts;
create policy contacts_select_member
on public.contacts
for select
to authenticated
using (private.has_active_org_access(organization_id));

drop policy if exists contacts_insert_member on public.contacts;
create policy contacts_insert_member
on public.contacts
for insert
to authenticated
with check (private.has_active_org_access(organization_id));

drop policy if exists contacts_update_member on public.contacts;
create policy contacts_update_member
on public.contacts
for update
to authenticated
using (private.has_active_org_access(organization_id))
with check (private.has_active_org_access(organization_id));

drop policy if exists contacts_delete_admin on public.contacts;
create policy contacts_delete_admin
on public.contacts
for delete
to authenticated
using (private.has_active_org_role(organization_id, array['owner','admin']));

drop policy if exists leads_select_member on public.leads;
create policy leads_select_member
on public.leads
for select
to authenticated
using (private.has_active_org_access(organization_id));

drop policy if exists leads_insert_member on public.leads;
create policy leads_insert_member
on public.leads
for insert
to authenticated
with check (private.has_active_org_access(organization_id));

drop policy if exists leads_update_member on public.leads;
create policy leads_update_member
on public.leads
for update
to authenticated
using (private.has_active_org_access(organization_id))
with check (private.has_active_org_access(organization_id));

drop policy if exists leads_delete_admin on public.leads;
create policy leads_delete_admin
on public.leads
for delete
to authenticated
using (private.has_active_org_role(organization_id, array['owner','admin']));

drop policy if exists lead_events_select_member on public.lead_events;
create policy lead_events_select_member
on public.lead_events
for select
to authenticated
using (private.has_active_org_access(organization_id));

drop policy if exists lead_events_insert_member on public.lead_events;
create policy lead_events_insert_member
on public.lead_events
for insert
to authenticated
with check (
  private.has_active_org_access(organization_id)
  and actor_user_id = (select auth.uid())
);

drop policy if exists follow_up_tasks_select_member on public.follow_up_tasks;
create policy follow_up_tasks_select_member
on public.follow_up_tasks
for select
to authenticated
using (private.has_active_org_access(organization_id));

drop policy if exists follow_up_tasks_insert_member on public.follow_up_tasks;
create policy follow_up_tasks_insert_member
on public.follow_up_tasks
for insert
to authenticated
with check (private.has_active_org_access(organization_id));

drop policy if exists follow_up_tasks_update_member on public.follow_up_tasks;
create policy follow_up_tasks_update_member
on public.follow_up_tasks
for update
to authenticated
using (private.has_active_org_access(organization_id))
with check (private.has_active_org_access(organization_id));

drop policy if exists follow_up_tasks_delete_admin on public.follow_up_tasks;
create policy follow_up_tasks_delete_admin
on public.follow_up_tasks
for delete
to authenticated
using (private.has_active_org_role(organization_id, array['owner','admin']));
