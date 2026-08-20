create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to authenticated, service_role;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create unique index organizations_slug_lower_uidx on public.organizations (lower(slug));

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_org_user_unique unique (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id, organization_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) > 0),
  phone_raw text,
  phone_e164 text,
  email text,
  email_normalized text generated always as (nullif(lower(btrim(email)), '')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_org_id_unique unique (organization_id, id)
);
create index contacts_org_idx on public.contacts (organization_id);
create index contacts_org_phone_idx on public.contacts (organization_id, phone_e164) where phone_e164 is not null;
create index contacts_org_email_idx on public.contacts (organization_id, email_normalized) where email_normalized is not null;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null,
  business_type text not null default '',
  service_interest text not null default '',
  source text not null default 'manual',
  source_external_id text,
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata) = 'object'),
  status text not null default 'New',
  enquiry_text text not null default '',
  last_contact_at timestamptz,
  follow_up_count integer not null default 0 check (follow_up_count >= 0),
  appointment_status text not null default '',
  quoted_price numeric(12,2) check (quoted_price is null or quoted_price >= 0),
  quoted_currency text check (quoted_currency is null or quoted_currency ~ '^[A-Z]{3}$'),
  budget_signal text not null default '',
  notes text not null default '',
  owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_org_id_unique unique (organization_id, id),
  constraint leads_contact_same_org_fk foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id) on delete restrict,
  constraint leads_owner_member_fk foreign key (organization_id, owner_user_id)
    references public.organization_members (organization_id, user_id)
    on delete set null (owner_user_id)
);
create index leads_org_idx on public.leads (organization_id);
create index leads_org_status_idx on public.leads (organization_id, status);
create index leads_org_owner_idx on public.leads (organization_id, owner_user_id) where owner_user_id is not null;
create index leads_org_source_idx on public.leads (organization_id, source);

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  event_type text not null check (length(btrim(event_type)) > 0),
  channel text,
  direction text,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint lead_events_lead_same_org_fk foreign key (organization_id, lead_id)
    references public.leads (organization_id, id) on delete cascade
);
create index lead_events_org_lead_time_idx on public.lead_events (organization_id, lead_id, occurred_at desc);

create table public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  assigned_to uuid,
  due_at timestamptz not null,
  status text not null default 'pending',
  task_type text not null check (length(btrim(task_type)) > 0),
  channel text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint follow_up_tasks_lead_same_org_fk foreign key (organization_id, lead_id)
    references public.leads (organization_id, id) on delete cascade,
  constraint follow_up_tasks_assignee_member_fk foreign key (organization_id, assigned_to)
    references public.organization_members (organization_id, user_id)
    on delete set null (assigned_to)
);
create index follow_up_tasks_org_due_idx on public.follow_up_tasks (organization_id, due_at);
create index follow_up_tasks_org_status_due_idx on public.follow_up_tasks (organization_id, status, due_at);
create index follow_up_tasks_org_assignee_idx on public.follow_up_tasks (organization_id, assigned_to) where assigned_to is not null;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.prevent_organization_id_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id is immutable';
  end if;
  return new;
end;
$$;

create or replace function private.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.role = any(allowed_roles)
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
      where me.user_id = (select auth.uid())
        and them.user_id = target_user
    );
$$;

revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
revoke execute on all functions in schema private from authenticated;
grant execute on function private.is_org_member(uuid) to authenticated, service_role;
grant execute on function private.has_org_role(uuid, text[]) to authenticated, service_role;
grant execute on function private.shares_org_with_user(uuid) to authenticated, service_role;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();
create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function private.set_updated_at();
create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function private.set_updated_at();
create trigger leads_set_updated_at
before update on public.leads
for each row execute function private.set_updated_at();
create trigger follow_up_tasks_set_updated_at
before update on public.follow_up_tasks
for each row execute function private.set_updated_at();

create trigger organization_members_prevent_org_move
before update on public.organization_members
for each row execute function private.prevent_organization_id_change();
create trigger contacts_prevent_org_move
before update on public.contacts
for each row execute function private.prevent_organization_id_change();
create trigger leads_prevent_org_move
before update on public.leads
for each row execute function private.prevent_organization_id_change();
create trigger follow_up_tasks_prevent_org_move
before update on public.follow_up_tasks
for each row execute function private.prevent_organization_id_change();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.follow_up_tasks enable row level security;

revoke all on table public.organizations from public, anon, authenticated;
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.organization_members from public, anon, authenticated;
revoke all on table public.contacts from public, anon, authenticated;
revoke all on table public.leads from public, anon, authenticated;
revoke all on table public.lead_events from public, anon, authenticated;
revoke all on table public.follow_up_tasks from public, anon, authenticated;

grant select, update on table public.organizations to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.organization_members to authenticated;
grant select, insert, update, delete on table public.contacts to authenticated;
grant select, insert, update, delete on table public.leads to authenticated;
grant select, insert on table public.lead_events to authenticated;
grant select, insert, update, delete on table public.follow_up_tasks to authenticated;

grant all on table public.organizations to service_role;
grant all on table public.profiles to service_role;
grant all on table public.organization_members to service_role;
grant all on table public.contacts to service_role;
grant all on table public.leads to service_role;
grant all on table public.lead_events to service_role;
grant all on table public.follow_up_tasks to service_role;

create policy organizations_select_member
on public.organizations
for select
to authenticated
using (private.is_org_member(id));

create policy organizations_update_admin
on public.organizations
for update
to authenticated
using (private.has_org_role(id, array['owner','admin']))
with check (private.has_org_role(id, array['owner','admin']));

create policy profiles_select_shared_org
on public.profiles
for select
to authenticated
using (private.shares_org_with_user(user_id));

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy organization_members_select_member
on public.organization_members
for select
to authenticated
using (private.is_org_member(organization_id));

create policy contacts_select_member
on public.contacts
for select
to authenticated
using (private.is_org_member(organization_id));

create policy contacts_insert_member
on public.contacts
for insert
to authenticated
with check (private.is_org_member(organization_id));

create policy contacts_update_member
on public.contacts
for update
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy contacts_delete_admin
on public.contacts
for delete
to authenticated
using (private.has_org_role(organization_id, array['owner','admin']));

create policy leads_select_member
on public.leads
for select
to authenticated
using (private.is_org_member(organization_id));

create policy leads_insert_member
on public.leads
for insert
to authenticated
with check (private.is_org_member(organization_id));

create policy leads_update_member
on public.leads
for update
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy leads_delete_admin
on public.leads
for delete
to authenticated
using (private.has_org_role(organization_id, array['owner','admin']));

create policy lead_events_select_member
on public.lead_events
for select
to authenticated
using (private.is_org_member(organization_id));

create policy lead_events_insert_member
on public.lead_events
for insert
to authenticated
with check (
  private.is_org_member(organization_id)
  and actor_user_id = (select auth.uid())
);

create policy follow_up_tasks_select_member
on public.follow_up_tasks
for select
to authenticated
using (private.is_org_member(organization_id));

create policy follow_up_tasks_insert_member
on public.follow_up_tasks
for insert
to authenticated
with check (private.is_org_member(organization_id));

create policy follow_up_tasks_update_member
on public.follow_up_tasks
for update
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy follow_up_tasks_delete_admin
on public.follow_up_tasks
for delete
to authenticated
using (private.has_org_role(organization_id, array['owner','admin']));
