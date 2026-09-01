alter table public.leads
  add constraint leads_status_approved_check
  check (status in (
    'New',
    'Follow-up needed',
    'Interested',
    'Qualified',
    'Appointment booked',
    'Won',
    'Lost'
  ));

create or replace function public.persist_imported_lead(
  p_full_name text,
  p_phone_raw text,
  p_phone_e164 text,
  p_email text,
  p_business_type text,
  p_service_interest text,
  p_source text,
  p_source_external_id text,
  p_status text,
  p_enquiry_text text,
  p_last_contact_at timestamptz,
  p_follow_up_count integer,
  p_appointment_status text,
  p_quoted_price numeric,
  p_quoted_currency text,
  p_budget_signal text,
  p_notes text
)
returns table(result text, lead_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_organization_id uuid;
  v_membership_count integer;
  v_contact_id uuid;
  v_lead_id uuid;
  v_constraint_name text;
  v_source_stage text := nullif(btrim(p_status), '');
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select count(*)::integer
  into v_membership_count
  from public.organization_members om
  where om.user_id = v_user_id;

  if v_membership_count = 0 then
    raise exception using errcode = '42501', message = 'Organization membership required';
  end if;

  if v_membership_count <> 1 then
    raise exception using errcode = 'P0001', message = 'Organization selection required';
  end if;

  select om.organization_id
  into v_organization_id
  from public.organization_members om
  where om.user_id = v_user_id;

  if p_full_name is null or length(btrim(p_full_name)) = 0 then
    raise exception using errcode = '22023', message = 'Lead name is required';
  end if;

  if p_source is null or p_source <> btrim(p_source) or length(p_source) = 0 then
    raise exception using errcode = '22023', message = 'Source must be trimmed and non-empty';
  end if;

  if p_source_external_id is null
    or p_source_external_id <> btrim(p_source_external_id)
    or length(p_source_external_id) = 0 then
    raise exception using errcode = '22023', message = 'External source id must be trimmed and non-empty';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_organization_id::text
        || pg_catalog.chr(31)
        || p_source
        || pg_catalog.chr(31)
        || p_source_external_id,
      0
    )
  );

  select l.id
  into v_lead_id
  from public.leads l
  where l.organization_id = v_organization_id
    and l.source = p_source
    and l.source_external_id = p_source_external_id
  limit 1;

  if v_lead_id is not null then
    return query select 'existing'::text, v_lead_id;
    return;
  end if;

  begin
    insert into public.contacts (
      organization_id,
      full_name,
      phone_raw,
      phone_e164,
      email
    )
    values (
      v_organization_id,
      btrim(p_full_name),
      nullif(btrim(p_phone_raw), ''),
      nullif(btrim(p_phone_e164), ''),
      nullif(btrim(p_email), '')
    )
    returning id into v_contact_id;

    insert into public.leads (
      organization_id,
      contact_id,
      business_type,
      service_interest,
      source,
      source_external_id,
      source_metadata,
      status,
      enquiry_text,
      last_contact_at,
      follow_up_count,
      appointment_status,
      quoted_price,
      quoted_currency,
      budget_signal,
      notes
    )
    values (
      v_organization_id,
      v_contact_id,
      coalesce(p_business_type, ''),
      coalesce(p_service_interest, ''),
      p_source,
      p_source_external_id,
      jsonb_strip_nulls(jsonb_build_object('source_stage', v_source_stage)),
      'New',
      coalesce(p_enquiry_text, ''),
      p_last_contact_at,
      coalesce(p_follow_up_count, 0),
      coalesce(p_appointment_status, ''),
      p_quoted_price,
      p_quoted_currency,
      coalesce(p_budget_signal, ''),
      coalesce(p_notes, '')
    )
    returning id into v_lead_id;

    insert into public.lead_events (
      organization_id,
      lead_id,
      event_type,
      actor_user_id,
      summary,
      metadata
    )
    values (
      v_organization_id,
      v_lead_id,
      'lead_imported',
      v_user_id,
      'Lead persisted from an authenticated import.',
      jsonb_strip_nulls(jsonb_build_object(
        'source', p_source,
        'source_external_id', p_source_external_id,
        'source_stage', v_source_stage
      ))
    );

    return query select 'created'::text, v_lead_id;
    return;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;

      if v_constraint_name is distinct from 'leads_org_source_external_unique' then
        raise;
      end if;

      select l.id
      into v_lead_id
      from public.leads l
      where l.organization_id = v_organization_id
        and l.source = p_source
        and l.source_external_id = p_source_external_id
      limit 1;

      if v_lead_id is null then
        raise;
      end if;

      return query select 'existing'::text, v_lead_id;
      return;
  end;
end;
$$;

revoke execute on function public.persist_imported_lead(
  text, text, text, text, text, text, text, text, text, text,
  timestamptz, integer, text, numeric, text, text, text
) from public;
revoke execute on function public.persist_imported_lead(
  text, text, text, text, text, text, text, text, text, text,
  timestamptz, integer, text, numeric, text, text, text
) from anon;
grant execute on function public.persist_imported_lead(
  text, text, text, text, text, text, text, text, text, text,
  timestamptz, integer, text, numeric, text, text, text
) to authenticated;
