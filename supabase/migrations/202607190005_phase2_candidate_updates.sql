revoke insert, update, delete on public.knowledge_candidate_updates from authenticated;
grant select on public.knowledge_candidate_updates to authenticated;

create or replace function public.create_knowledge_candidate_update(
  p_business_id uuid,
  p_proposed_domain text,
  p_proposed_identity_key text,
  p_proposed_value jsonb,
  p_source_kind text,
  p_source_reference_id text,
  p_evidence jsonb,
  p_actor_id uuid,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare candidate_update public.knowledge_candidate_updates;
begin
  if auth.uid() is distinct from p_actor_id
    or not public.is_business_member(p_business_id) then
    raise exception 'business member identity required';
  end if;
  if p_proposed_domain not in (
    'brand_identity','tone_rule','positioning','value_proposition','product','offer',
    'business_model','audience','business_goal','constraint','approved_fact','validated_learning'
  ) then raise exception 'invalid proposed domain'; end if;
  if length(btrim(coalesce(p_proposed_identity_key, ''))) = 0 then
    raise exception 'proposed identity is required';
  end if;
  if p_proposed_value is null or jsonb_typeof(p_proposed_value) not in ('string','object') then
    raise exception 'proposed value must be a string or object';
  end if;
  if p_source_kind not in ('campaign_event','analytics_observation','human_note') then
    raise exception 'invalid candidate update source kind';
  end if;
  if length(btrim(coalesce(p_source_reference_id, ''))) = 0 then
    raise exception 'source reference is required';
  end if;
  if p_evidence is null or jsonb_typeof(p_evidence) <> 'array' then
    raise exception 'evidence must be an array';
  end if;

  insert into public.knowledge_candidate_updates(
    business_id,proposed_domain,proposed_identity_key,proposed_value,
    source_kind,source_reference_id,evidence,status,created_by
  ) values (
    p_business_id,p_proposed_domain,p_proposed_identity_key,p_proposed_value,
    p_source_kind,p_source_reference_id,p_evidence,'candidate',p_actor_id
  ) returning * into candidate_update;

  insert into public.knowledge_audit_events(
    business_id,actor_id,action,target_kind,target_id,correlation_id,metadata
  ) values (
    p_business_id,p_actor_id,'knowledge_candidate_update_created',
    'knowledge_candidate_update',candidate_update.id::text,p_correlation_id,
    jsonb_build_object(
      'sourceKind',p_source_kind,
      'sourceReferenceId',p_source_reference_id,
      'proposedDomain',p_proposed_domain,
      'evidenceCount',jsonb_array_length(p_evidence)
    )
  );
  return to_jsonb(candidate_update);
end;
$$;

create or replace function public.review_knowledge_candidate_update(
  p_business_id uuid,
  p_candidate_update_id uuid,
  p_action text,
  p_actor_id uuid,
  p_reason text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_update public.knowledge_candidate_updates;
  next_status text;
begin
  if not public.can_review_business_knowledge(p_business_id,p_actor_id,true) then
    raise exception 'authorized human reviewer required';
  end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'review reason is required';
  end if;
  select * into candidate_update from public.knowledge_candidate_updates
  where id=p_candidate_update_id and business_id=p_business_id for update;
  if candidate_update.id is null then raise exception 'candidate update not found'; end if;

  if p_action='start_review' and candidate_update.status='candidate' then
    next_status := 'under_review';
  elsif p_action='accept_for_validation' and candidate_update.status='under_review' then
    next_status := 'accepted_for_validation';
  elsif p_action='reject' and candidate_update.status in ('candidate','under_review') then
    next_status := 'rejected';
  else
    raise exception 'invalid candidate update review transition';
  end if;

  update public.knowledge_candidate_updates set status=next_status
  where id=candidate_update.id returning * into candidate_update;
  insert into public.knowledge_audit_events(
    business_id,actor_id,action,target_kind,target_id,correlation_id,metadata
  ) values (
    p_business_id,p_actor_id,'knowledge_candidate_update_' || next_status,
    'knowledge_candidate_update',candidate_update.id::text,p_correlation_id,
    jsonb_build_object('action',p_action,'status',next_status,'reason',p_reason)
  );
  return to_jsonb(candidate_update);
end;
$$;

revoke all on function public.create_knowledge_candidate_update(uuid,text,text,jsonb,text,text,jsonb,uuid,text) from public;
revoke all on function public.review_knowledge_candidate_update(uuid,uuid,text,uuid,text,text) from public;
grant execute on function public.create_knowledge_candidate_update(uuid,text,text,jsonb,text,text,jsonb,uuid,text) to authenticated;
grant execute on function public.review_knowledge_candidate_update(uuid,uuid,text,uuid,text,text) to authenticated;
