create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('meta', 'google')),
  external_account_id text not null check (length(btrim(external_account_id)) > 0),
  status text not null default 'active' check (status in ('active', 'disabled')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_connections_org_id_unique unique (organization_id, id),
  constraint provider_connections_provider_external_unique unique (provider, external_account_id)
);

create index provider_connections_org_provider_idx
  on public.provider_connections (organization_id, provider, status);

create table public.provider_lead_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_connection_id uuid not null,
  provider text not null check (provider in ('meta', 'google')),
  provider_lead_id text not null check (length(btrim(provider_lead_id)) > 0),
  form_id text,
  provider_created_at timestamptz,
  processing_status text not null default 'pending' check (processing_status in ('pending', 'processed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  lead_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_lead_receipts_connection_same_org_fk
    foreign key (organization_id, provider_connection_id)
    references public.provider_connections (organization_id, id) on delete cascade,
  constraint provider_lead_receipts_lead_same_org_fk
    foreign key (organization_id, lead_id)
    references public.leads (organization_id, id) on delete set null,
  constraint provider_lead_receipts_org_provider_lead_unique
    unique (organization_id, provider, provider_lead_id)
);

create index provider_lead_receipts_pending_idx
  on public.provider_lead_receipts (provider, processing_status, created_at);

create trigger provider_connections_set_updated_at
before update on public.provider_connections
for each row execute function private.set_updated_at();

create trigger provider_lead_receipts_set_updated_at
before update on public.provider_lead_receipts
for each row execute function private.set_updated_at();

create trigger provider_connections_prevent_org_move
before update on public.provider_connections
for each row execute function private.prevent_organization_id_change();

create trigger provider_lead_receipts_prevent_org_move
before update on public.provider_lead_receipts
for each row execute function private.prevent_organization_id_change();

alter table public.provider_connections enable row level security;
alter table public.provider_lead_receipts enable row level security;

revoke all on table public.provider_connections from public, anon, authenticated;
revoke all on table public.provider_lead_receipts from public, anon, authenticated;

grant all on table public.provider_connections to service_role;
grant all on table public.provider_lead_receipts to service_role;

create or replace function public.record_meta_lead_webhook_receipt(
  p_page_id text,
  p_leadgen_id text,
  p_form_id text,
  p_provider_created_at timestamptz
)
returns table(result text, receipt_id uuid, organization_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection_id uuid;
  v_organization_id uuid;
  v_receipt_id uuid;
begin
  if p_page_id is null or p_page_id <> btrim(p_page_id) or length(p_page_id) = 0 then
    raise exception using errcode = '22023', message = 'Meta page id is required';
  end if;

  if p_leadgen_id is null or p_leadgen_id <> btrim(p_leadgen_id) or length(p_leadgen_id) = 0 then
    raise exception using errcode = '22023', message = 'Meta lead id is required';
  end if;

  select pc.id, pc.organization_id
    into v_connection_id, v_organization_id
  from public.provider_connections pc
  join public.organizations o on o.id = pc.organization_id
  where pc.provider = 'meta'
    and pc.external_account_id = p_page_id
    and pc.status = 'active'
    and o.access_status = 'active'
  limit 1;

  if v_connection_id is null then
    raise exception using errcode = '42501', message = 'No active Meta tenant mapping';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_organization_id::text || pg_catalog.chr(31) || 'meta' || pg_catalog.chr(31) || p_leadgen_id,
      0
    )
  );

  select r.id
    into v_receipt_id
  from public.provider_lead_receipts r
  where r.organization_id = v_organization_id
    and r.provider = 'meta'
    and r.provider_lead_id = p_leadgen_id
  limit 1;

  if v_receipt_id is not null then
    return query select 'existing'::text, v_receipt_id, v_organization_id;
    return;
  end if;

  insert into public.provider_lead_receipts (
    organization_id,
    provider_connection_id,
    provider,
    provider_lead_id,
    form_id,
    provider_created_at,
    metadata
  )
  values (
    v_organization_id,
    v_connection_id,
    'meta',
    p_leadgen_id,
    nullif(btrim(p_form_id), ''),
    p_provider_created_at,
    jsonb_strip_nulls(jsonb_build_object(
      'page_id', p_page_id,
      'form_id', nullif(btrim(p_form_id), '')
    ))
  )
  returning id into v_receipt_id;

  return query select 'created'::text, v_receipt_id, v_organization_id;
end;
$$;

revoke execute on function public.record_meta_lead_webhook_receipt(text, text, text, timestamptz) from public;
revoke execute on function public.record_meta_lead_webhook_receipt(text, text, text, timestamptz) from anon;
revoke execute on function public.record_meta_lead_webhook_receipt(text, text, text, timestamptz) from authenticated;
grant execute on function public.record_meta_lead_webhook_receipt(text, text, text, timestamptz) to service_role;
