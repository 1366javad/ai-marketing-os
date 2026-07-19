revoke insert, update, delete on public.knowledge_candidates from authenticated;
revoke insert, update, delete on public.knowledge_candidate_evidence from authenticated;
revoke insert, update, delete on public.knowledge_conflicts from authenticated;
grant select on public.knowledge_candidates to authenticated;
grant select on public.knowledge_candidate_evidence to authenticated;
grant select on public.knowledge_conflicts to authenticated;

alter function public.persist_knowledge_candidate(uuid,uuid,text,text,text,text,text,jsonb,text,jsonb,timestamptz,timestamptz,text,jsonb,uuid,text)
security definer;

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
security definer
set search_path = public
as $$
declare
  update_record jsonb;
  conflict_record public.knowledge_conflicts;
  identity_candidate_count integer;
  identity_source_count integer;
  candidate_source_count integer;
  source_authority numeric;
  evidence_complete boolean;
  expected_confidence numeric;
  expected_status text;
  actual_candidate_ids uuid[];
  provided_candidate_ids uuid[];
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'synthesis actor must match authenticated user';
  end if;
  if not public.is_business_member(p_business_id) then
    raise exception 'business membership required';
  end if;

  select count(*)::integer, array_agg(id order by id)
  into identity_candidate_count, actual_candidate_ids
  from public.knowledge_candidates
  where business_id = p_business_id
    and identity_key = p_identity_key
    and status in ('candidate', 'needs_review');

  select count(distinct evidence.source_id)::integer
  into identity_source_count
  from public.knowledge_candidate_evidence evidence
  join public.knowledge_candidates candidate on candidate.id = evidence.candidate_id
  where candidate.business_id = p_business_id
    and candidate.identity_key = p_identity_key
    and candidate.status in ('candidate', 'needs_review');

  if identity_candidate_count = 0 or identity_source_count = 0 then
    raise exception 'source-backed synthesis candidates are required';
  end if;
  if jsonb_array_length(p_updates) <> identity_candidate_count then
    raise exception 'synthesis must update every candidate in the identity';
  end if;

  expected_status := case when identity_candidate_count > 1 then 'needs_review' else 'candidate' end;

  for update_record in select value from jsonb_array_elements(p_updates)
  loop
    select
      count(distinct evidence.source_id)::integer,
      avg(case source.authority
        when 'authoritative' then 1.0
        when 'supporting' then 0.7
        else 0.4
      end),
      bool_and(coalesce(evidence.excerpt_hash, '') <> '')
    into candidate_source_count, source_authority, evidence_complete
    from public.knowledge_candidates candidate
    join public.knowledge_candidate_evidence evidence on evidence.candidate_id = candidate.id
    join public.knowledge_sources source on source.id = evidence.source_id
    where candidate.id = (update_record->>'candidateId')::uuid
      and candidate.business_id = p_business_id
      and candidate.identity_key = p_identity_key
      and candidate.status in ('candidate', 'needs_review');

    if candidate_source_count = 0 then
      raise exception 'candidate synthesis target not found';
    end if;

    expected_confidence := round(
      greatest(0, least(1,
        0.40 * source_authority
        + 0.35 * case
            when identity_source_count > 1
              then candidate_source_count::numeric / identity_source_count
            else 0.5
          end
        + 0.25 * case when evidence_complete then 1 else 0 end
      )),
      2
    );

    if update_record->>'status' <> expected_status
      or abs((update_record->>'confidence')::numeric - expected_confidence) > 0.001 then
      raise exception 'synthesis result does not match deterministic contract';
    end if;

    update public.knowledge_candidates
    set confidence = expected_confidence,
        status = expected_status
    where id = (update_record->>'candidateId')::uuid
      and business_id = p_business_id
      and identity_key = p_identity_key;
  end loop;

  if identity_candidate_count > 1 then
    if p_conflict is null
      or p_conflict->>'kind' <> 'value_conflict'
      or p_conflict->>'status' <> 'open' then
      raise exception 'materially different values require an open value conflict';
    end if;
    select array_agg(value::uuid order by value::uuid)
    into provided_candidate_ids
    from jsonb_array_elements_text(p_conflict->'candidateIds') as value;
    if provided_candidate_ids is distinct from actual_candidate_ids then
      raise exception 'conflict candidate set is incomplete';
    end if;

    insert into public.knowledge_conflicts (
      business_id, identity_key, candidate_ids, kind, status
    ) values (
      p_business_id, p_identity_key, actual_candidate_ids,
      'value_conflict', 'open'
    )
    on conflict (business_id, identity_key) where status = 'open'
    do update set candidate_ids = excluded.candidate_ids, kind = excluded.kind
    returning * into conflict_record;
  elsif p_conflict is not null then
    raise exception 'agreement synthesis cannot create a conflict';
  end if;

  insert into public.knowledge_audit_events (
    business_id, actor_id, action, target_kind, target_id,
    correlation_id, metadata
  ) values (
    p_business_id, p_actor_id,
    case when identity_candidate_count = 1 then 'candidate_agreement_synthesized' else 'knowledge_conflict_opened' end,
    'knowledge_identity', p_identity_key, p_correlation_id,
    jsonb_build_object(
      'candidateCount', identity_candidate_count,
      'sourceCount', identity_source_count,
      'conflictId', conflict_record.id
    )
  );
  return true;
end;
$$;

revoke all on function public.save_knowledge_synthesis(uuid,text,jsonb,jsonb,uuid,text) from public;
grant execute on function public.save_knowledge_synthesis(uuid,text,jsonb,jsonb,uuid,text) to authenticated;
