alter table public.leads
  add constraint leads_source_nonempty_trimmed
  check (source = btrim(source) and length(source) > 0),
  add constraint leads_source_external_id_nonempty_trimmed
  check (
    source_external_id is null
    or (
      source_external_id = btrim(source_external_id)
      and length(source_external_id) > 0
    )
  ),
  add constraint leads_org_source_external_unique
  unique (organization_id, source, source_external_id);
