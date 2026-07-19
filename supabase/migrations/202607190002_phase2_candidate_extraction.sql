alter table public.knowledge_candidates
add column if not exists value_hash text;

alter table public.knowledge_candidates
add column if not exists extractor_version text;

update public.knowledge_candidates
set value_hash = encode(digest(value::text, 'sha256'), 'hex')
where value_hash is null;

update public.knowledge_candidates
set extractor_version = 'legacy-unversioned'
where extractor_version is null;

alter table public.knowledge_candidates alter column value_hash set not null;
alter table public.knowledge_candidates alter column extractor_version set not null;

create unique index if not exists knowledge_candidates_identity_value_idx
on public.knowledge_candidates (business_id, identity_key, value_hash, extractor_version);

create unique index if not exists knowledge_conflicts_open_identity_idx
on public.knowledge_conflicts (business_id, identity_key)
where status = 'open';

create or replace function public.persist_knowledge_candidate(
  p_business_id uuid,
  p_source_id uuid,
  p_identity_key text,
  p_scope_key text,
  p_domain text,
  p_subject_key text,
  p_claim_key text,
  p_value jsonb,
  p_value_hash text,
  p_scope jsonb,
  p_valid_from timestamptz,
  p_valid_until timestamptz,
  p_extractor_version text,
  p_evidence jsonb,
  p_actor_id uuid,
  p_correlation_id text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  candidate_record public.knowledge_candidates;
  evidence_record jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'candidate actor must match authenticated user';
  end if;
  if not public.is_business_member(p_business_id) then
    raise exception 'business membership required';
  end if;
  if not exists (
    select 1 from public.knowledge_sources source
    where source.id = p_source_id
      and source.business_id = p_business_id
      and source.status in ('normalized', 'processed')
  ) then
    raise exception 'normalized source is required';
  end if;
  if jsonb_typeof(p_evidence) <> 'array' or jsonb_array_length(p_evidence) = 0 then
    raise exception 'exact evidence is required';
  end if;

  insert into public.knowledge_candidates (
    business_id, domain, identity_key, scope_key, subject_key, claim_key,
    value, value_hash, confidence, scope, valid_from, valid_until,
    status, extractor_version
  ) values (
    p_business_id, p_domain, p_identity_key, p_scope_key, p_subject_key,
    p_claim_key, p_value, p_value_hash, 0, p_scope, p_valid_from,
    p_valid_until, 'candidate', p_extractor_version
  )
  on conflict (business_id, identity_key, value_hash, extractor_version)
  do nothing
  returning * into candidate_record;

  if candidate_record.id is null then
    select * into candidate_record
    from public.knowledge_candidates
    where business_id = p_business_id
      and identity_key = p_identity_key
      and value_hash = p_value_hash
      and extractor_version = p_extractor_version;
  end if;

  for evidence_record in select value from jsonb_array_elements(p_evidence)
  loop
    if (evidence_record->>'sourceId')::uuid <> p_source_id
      or coalesce(evidence_record->>'excerptHash', '') = ''
      or (evidence_record->>'sectionOrdinal') is null then
      raise exception 'invalid source evidence';
    end if;
    insert into public.knowledge_candidate_evidence (
      business_id, candidate_id, source_id, section_ordinal, excerpt_hash
    ) values (
      p_business_id, candidate_record.id, p_source_id,
      (evidence_record->>'sectionOrdinal')::integer,
      evidence_record->>'excerptHash'
    ) on conflict do nothing;
  end loop;

  update public.knowledge_sources
  set status = 'processed', last_processing_at = now()
  where id = p_source_id and business_id = p_business_id and status = 'normalized';

  insert into public.knowledge_audit_events (
    business_id, actor_id, action, target_kind, target_id,
    correlation_id, metadata
  ) values (
    p_business_id, p_actor_id, 'candidate_claim_extracted',
    'knowledge_candidate', candidate_record.id::text, p_correlation_id,
    jsonb_build_object(
      'sourceId', p_source_id,
      'identityKey', p_identity_key,
      'extractorVersion', p_extractor_version,
      'evidenceCount', jsonb_array_length(p_evidence)
    )
  );

  return to_jsonb(candidate_record);
end;
$$;

create or replace function public.save_knowledge_synthesis(
  p_business_id uuid,
  p_identity_key text,
  p_updates jsonb,
  p_conflict jsonb,
  p_actor_id uuid,
  p_correlation_id text
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  update_record jsonb;
  conflict_record public.knowledge_conflicts;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'synthesis actor must match authenticated user';
  end if;
  if not public.is_business_member(p_business_id) then
    raise exception 'business membership required';
  end if;

  for update_record in select value from jsonb_array_elements(p_updates)
  loop
    if coalesce(update_record->>'status', '') not in ('candidate', 'needs_review') then
      raise exception 'synthesis cannot set approval or visibility status';
    end if;
    update public.knowledge_candidates
    set confidence = (update_record->>'confidence')::numeric,
        status = update_record->>'status'
    where id = (update_record->>'candidateId')::uuid
      and business_id = p_business_id
      and identity_key = p_identity_key
      and status in ('candidate', 'needs_review');
    if not found then raise exception 'candidate synthesis target not found'; end if;
  end loop;

  if p_conflict is not null and jsonb_typeof(p_conflict) = 'object' then
    insert into public.knowledge_conflicts (
      business_id, identity_key, candidate_ids, kind, status
    ) values (
      p_business_id,
      p_identity_key,
      array(
        select value::uuid
        from jsonb_array_elements_text(p_conflict->'candidateIds') as value
      ),
      p_conflict->>'kind',
      'open'
    )
    on conflict (business_id, identity_key) where status = 'open'
    do update set candidate_ids = excluded.candidate_ids, kind = excluded.kind
    returning * into conflict_record;
  end if;

  insert into public.knowledge_audit_events (
    business_id, actor_id, action, target_kind, target_id,
    correlation_id, metadata
  ) values (
    p_business_id, p_actor_id,
    case when p_conflict is null then 'candidate_agreement_synthesized' else 'knowledge_conflict_opened' end,
    'knowledge_identity', p_identity_key, p_correlation_id,
    jsonb_build_object(
      'candidateCount', jsonb_array_length(p_updates),
      'conflictId', conflict_record.id
    )
  );
  return true;
end;
$$;

revoke all on function public.persist_knowledge_candidate(uuid,uuid,text,text,text,text,text,jsonb,text,jsonb,timestamptz,timestamptz,text,jsonb,uuid,text) from public;
grant execute on function public.persist_knowledge_candidate(uuid,uuid,text,text,text,text,text,jsonb,text,jsonb,timestamptz,timestamptz,text,jsonb,uuid,text) to authenticated;
revoke all on function public.save_knowledge_synthesis(uuid,text,jsonb,jsonb,uuid,text) from public;
grant execute on function public.save_knowledge_synthesis(uuid,text,jsonb,jsonb,uuid,text) to authenticated;

create index if not exists knowledge_candidate_evidence_candidate_idx
on public.knowledge_candidate_evidence (business_id, candidate_id, source_id);
