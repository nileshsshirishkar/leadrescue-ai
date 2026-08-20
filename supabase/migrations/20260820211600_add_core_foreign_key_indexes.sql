create index leads_org_contact_idx on public.leads (organization_id, contact_id);
create index lead_events_actor_user_idx on public.lead_events (actor_user_id) where actor_user_id is not null;
create index follow_up_tasks_org_lead_idx on public.follow_up_tasks (organization_id, lead_id);
