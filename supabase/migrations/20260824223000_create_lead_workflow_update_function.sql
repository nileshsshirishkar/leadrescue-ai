create or replace function public.update_lead_workflow(
  p_lead_id uuid,
  p_status text,
  p_notes text,
  p_next_follow_up_at timestamptz,
  p_reopen boolean default false
)
returns table(
  lead_id uuid,
  status text,
  notes text,
  completed_task_count integer,
  new_task_id uuid,
  next_follow_up_at timestamptz,
  reopened boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_organization_id uuid;
  v_membership_count integer;
  v_current_status text;
  v_new_task_id uuid;
  v_completed_task_count integer := 0;
  v_terminal_statuses constant text[] := array['Won', 'Lost'];
  v_allowed_statuses constant text[] := array[
    'New',
    'Follow-up needed',
    'Interested',
    'Qualified',
    'Appointment booked',
    'Won',
    'Lost'
  ];
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

  if p_lead_id is null then
    raise exception using errcode = '22023', message = 'Lead id is required';
  end if;

  if p_status is null or not (p_status = any(v_allowed_statuses)) then
    raise exception using errcode = '22023', message = 'Lead status is not approved';
  end if;

  if p_notes is not null and length(p_notes) > 5000 then
    raise exception using errcode = '22023', message = 'Lead notes are too long';
  end if;

  if p_status = any(v_terminal_statuses) and p_next_follow_up_at is not null then
    raise exception using errcode = '22023', message = 'Terminal leads cannot have a next follow-up task';
  end if;

  if not (p_status = any(v_terminal_statuses)) and p_next_follow_up_at is null then
    raise exception using errcode = '22023', message = 'Active leads require a next follow-up date';
  end if;

  if p_reopen and p_status <> 'Follow-up needed' then
    raise exception using errcode = '22023', message = 'Reopened leads must return to Follow-up needed';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_organization_id::text || pg_catalog.chr(31) || p_lead_id::text,
      0
    )
  );

  select l.status
  into v_current_status
  from public.leads l
  where l.organization_id = v_organization_id
    and l.id = p_lead_id
  for update;

  if v_current_status is null then
    return;
  end if;

  if v_current_status = any(v_terminal_statuses) then
    if not p_reopen or p_status <> 'Follow-up needed' then
      raise exception using errcode = '22023', message = 'Terminal leads require an explicit reopen action';
    end if;
  elsif p_reopen then
    raise exception using errcode = '22023', message = 'Only terminal leads can be reopened';
  end if;

  update public.follow_up_tasks fut
  set
    status = 'completed',
    completed_at = coalesce(fut.completed_at, now())
  where fut.organization_id = v_organization_id
    and fut.lead_id = p_lead_id
    and fut.status = 'pending';

  get diagnostics v_completed_task_count = row_count;

  update public.leads l
  set
    status = p_status,
    notes = case when p_notes is null then l.notes else p_notes end
  where l.organization_id = v_organization_id
    and l.id = p_lead_id;

  if not (p_status = any(v_terminal_statuses)) then
    insert into public.follow_up_tasks (
      organization_id,
      lead_id,
      assigned_to,
      due_at,
      status,
      task_type
    )
    values (
      v_organization_id,
      p_lead_id,
      v_user_id,
      p_next_follow_up_at,
      'pending',
      'lead_follow_up'
    )
    returning id into v_new_task_id;
  end if;

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
    p_lead_id,
    case when p_reopen then 'lead_reopened' else 'lead_workflow_updated' end,
    v_user_id,
    case
      when p_reopen then 'Lead reopened for follow-up.'
      else 'Lead status, notes, or follow-up task updated.'
    end,
    jsonb_build_object(
      'previous_status', v_current_status,
      'new_status', p_status,
      'notes_changed', p_notes is not null,
      'completed_task_count', v_completed_task_count,
      'next_follow_up_at', p_next_follow_up_at,
      'reopened', p_reopen
    )
  );

  return query
  select
    p_lead_id,
    p_status,
    (select l.notes from public.leads l where l.organization_id = v_organization_id and l.id = p_lead_id),
    v_completed_task_count,
    v_new_task_id,
    p_next_follow_up_at,
    p_reopen;
end;
$$;

revoke execute on function public.update_lead_workflow(uuid, text, text, timestamptz, boolean) from public;
revoke execute on function public.update_lead_workflow(uuid, text, text, timestamptz, boolean) from anon;
grant execute on function public.update_lead_workflow(uuid, text, text, timestamptz, boolean) to authenticated;
