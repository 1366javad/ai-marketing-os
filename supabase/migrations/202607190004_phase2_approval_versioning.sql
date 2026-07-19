revoke insert, update, delete on public.business_knowledge_versions from authenticated;
revoke insert, update, delete on public.knowledge_version_evidence from authenticated;
grant select on public.business_knowledge_versions to authenticated;
grant select on public.knowledge_version_evidence to authenticated;

create or replace function public.can_review_business_knowledge(
  p_business_id uuid,
  p_actor_id uuid,
  p_allow_reviewer boolean default true
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = p_actor_id and exists (
    select 1 from public.business_memberships membership
    where membership.business_id = p_business_id
      and membership.user_id = p_actor_id
      and membership.role in (
        'owner',
        'admin',
        case when p_allow_reviewer then 'reviewer' else 'owner' end
      )
  );
$$;

create or replace function public.approve_knowledge_candidate(
  p_business_id uuid,
  p_candidate_id uuid,
  p_actor_id uuid,
  p_reason text,
  p_valid_from timestamptz,
  p_valid_until timestamptz,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_record public.knowledge_candidates;
  current_version public.business_knowledge_versions;
  new_version public.business_knowledge_versions;
  next_version integer;
begin
  if not public.can_review_business_knowledge(p_business_id, p_actor_id, true) then
    raise exception 'authorized human reviewer required';
  end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'approval reason is required';
  end if;
  if p_valid_until is not null and p_valid_from is not null and p_valid_until <= p_valid_from then
    raise exception 'invalid validity window';
  end if;

  select * into candidate_record
  from public.knowledge_candidates
  where id = p_candidate_id and business_id = p_business_id
  for update;
  if candidate_record.id is null or candidate_record.status <> 'candidate' then
    raise exception 'candidate is not approvable';
  end if;
  if candidate_record.scope is null
    or candidate_record.scope->>'businessId' is distinct from p_business_id::text then
    raise exception 'candidate scope is invalid';
  end if;
  if not exists (
    select 1 from public.knowledge_candidate_evidence evidence
    where evidence.candidate_id = candidate_record.id
      and evidence.business_id = p_business_id
      and coalesce(evidence.excerpt_hash, '') <> ''
  ) then
    raise exception 'candidate requires exact evidence';
  end if;
  if exists (
    select 1 from public.knowledge_conflicts conflict
    where conflict.business_id = p_business_id
      and conflict.status = 'open'
      and conflict.identity_key = candidate_record.identity_key
  ) then
    raise exception 'open conflict blocks approval';
  end if;

  select version.* into current_version
  from public.business_knowledge_versions version
  where version.business_id = p_business_id
    and version.identity_key = candidate_record.identity_key
    and version.scope_key = candidate_record.scope_key
    and not exists (
      select 1 from public.business_knowledge_versions successor
      where successor.supersedes = version.id
    )
  order by version.version desc
  limit 1
  for update;

  next_version := coalesce(current_version.version, 0) + 1;
  insert into public.business_knowledge_versions (
    business_id, identity_key, scope_key, domain, subject_key, claim_key,
    value, version, status, confidence, scope, valid_from, valid_until,
    conflict_ids, supersedes, approved_at, approved_by
  ) values (
    p_business_id, candidate_record.identity_key, candidate_record.scope_key,
    candidate_record.domain, candidate_record.subject_key,
    candidate_record.claim_key, candidate_record.value, next_version,
    'approved', candidate_record.confidence, candidate_record.scope,
    coalesce(p_valid_from, candidate_record.valid_from),
    coalesce(p_valid_until, candidate_record.valid_until),
    '{}', current_version.id, now(), p_actor_id
  ) returning * into new_version;

  insert into public.knowledge_version_evidence (
    business_id, version_id, source_id, excerpt_hash
  )
  select evidence.business_id, new_version.id, evidence.source_id, evidence.excerpt_hash
  from public.knowledge_candidate_evidence evidence
  where evidence.candidate_id = candidate_record.id;

  update public.knowledge_candidates set status = 'promoted'
  where id = candidate_record.id;

  insert into public.knowledge_audit_events (
    business_id, actor_id, action, target_kind, target_id,
    correlation_id, metadata
  ) values (
    p_business_id, p_actor_id, 'knowledge_candidate_approved',
    'business_knowledge_version', new_version.id::text, p_correlation_id,
    jsonb_build_object(
      'candidateId', candidate_record.id,
      'identityKey', candidate_record.identity_key,
      'version', next_version,
      'supersedes', current_version.id,
      'reason', p_reason
    )
  );
  return to_jsonb(new_version);
end;
$$;

create or replace function public.reject_knowledge_candidate(
  p_business_id uuid,
  p_candidate_id uuid,
  p_actor_id uuid,
  p_reason text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare candidate_record public.knowledge_candidates;
begin
  if not public.can_review_business_knowledge(p_business_id, p_actor_id, true) then
    raise exception 'authorized human reviewer required';
  end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'rejection reason is required'; end if;
  update public.knowledge_candidates
  set status = 'rejected'
  where id = p_candidate_id and business_id = p_business_id
    and status in ('candidate', 'needs_review')
  returning * into candidate_record;
  if candidate_record.id is null then raise exception 'rejectable candidate not found'; end if;
  insert into public.knowledge_audit_events(
    business_id,actor_id,action,target_kind,target_id,correlation_id,metadata
  ) values (
    p_business_id,p_actor_id,'knowledge_candidate_rejected','knowledge_candidate',
    candidate_record.id::text,p_correlation_id,jsonb_build_object('reason',p_reason)
  );
  return to_jsonb(candidate_record);
end;
$$;

create or replace function public.resolve_knowledge_conflict(
  p_business_id uuid,
  p_conflict_id uuid,
  p_selected_candidate_id uuid,
  p_actor_id uuid,
  p_reason text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare conflict_record public.knowledge_conflicts;
begin
  if not public.can_review_business_knowledge(p_business_id, p_actor_id, true) then
    raise exception 'authorized human reviewer required';
  end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'resolution reason is required'; end if;
  select * into conflict_record from public.knowledge_conflicts
  where id=p_conflict_id and business_id=p_business_id and status='open'
  for update;
  if conflict_record.id is null or not (p_selected_candidate_id = any(conflict_record.candidate_ids)) then
    raise exception 'valid selected conflict candidate is required';
  end if;
  update public.knowledge_candidates
  set status = case when id=p_selected_candidate_id then 'candidate' else 'rejected' end
  where business_id=p_business_id and id=any(conflict_record.candidate_ids)
    and status='needs_review';
  update public.knowledge_conflicts
  set status='resolved', resolution=p_reason,
      resolved_candidate_id=p_selected_candidate_id,
      resolved_at=now(), resolved_by=p_actor_id
  where id=conflict_record.id
  returning * into conflict_record;
  insert into public.knowledge_audit_events(
    business_id,actor_id,action,target_kind,target_id,correlation_id,metadata
  ) values (
    p_business_id,p_actor_id,'knowledge_conflict_resolved','knowledge_conflict',
    conflict_record.id::text,p_correlation_id,
    jsonb_build_object('selectedCandidateId',p_selected_candidate_id,'reason',p_reason)
  );
  return to_jsonb(conflict_record);
end;
$$;

create or replace function public.revoke_knowledge_version(
  p_business_id uuid,
  p_version_id uuid,
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
  current_version public.business_knowledge_versions;
  revoked_version public.business_knowledge_versions;
begin
  if not public.can_review_business_knowledge(p_business_id, p_actor_id, false) then
    raise exception 'business owner or admin required for revocation';
  end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'revocation reason is required'; end if;
  select version.* into current_version
  from public.business_knowledge_versions version
  where version.id=p_version_id and version.business_id=p_business_id
    and version.status='approved'
    and not exists(select 1 from public.business_knowledge_versions successor where successor.supersedes=version.id)
  for update;
  if current_version.id is null then raise exception 'active approved version not found'; end if;

  insert into public.business_knowledge_versions(
    business_id,identity_key,scope_key,domain,subject_key,claim_key,value,
    version,status,confidence,scope,valid_from,valid_until,conflict_ids,
    supersedes,approved_at,approved_by
  ) values (
    current_version.business_id,current_version.identity_key,current_version.scope_key,
    current_version.domain,current_version.subject_key,current_version.claim_key,
    current_version.value,current_version.version+1,'revoked',current_version.confidence,
    current_version.scope,current_version.valid_from,current_version.valid_until,
    current_version.conflict_ids,current_version.id,now(),p_actor_id
  ) returning * into revoked_version;
  insert into public.knowledge_version_evidence(business_id,version_id,source_id,excerpt_hash)
  select business_id,revoked_version.id,source_id,excerpt_hash
  from public.knowledge_version_evidence where version_id=current_version.id;
  insert into public.knowledge_audit_events(
    business_id,actor_id,action,target_kind,target_id,correlation_id,metadata
  ) values (
    p_business_id,p_actor_id,'business_knowledge_revoked','business_knowledge_version',
    revoked_version.id::text,p_correlation_id,
    jsonb_build_object('revokes',current_version.id,'reason',p_reason)
  );
  return to_jsonb(revoked_version);
end;
$$;

revoke all on function public.can_review_business_knowledge(uuid,uuid,boolean) from public;
revoke all on function public.approve_knowledge_candidate(uuid,uuid,uuid,text,timestamptz,timestamptz,text) from public;
revoke all on function public.reject_knowledge_candidate(uuid,uuid,uuid,text,text) from public;
revoke all on function public.resolve_knowledge_conflict(uuid,uuid,uuid,uuid,text,text) from public;
revoke all on function public.revoke_knowledge_version(uuid,uuid,uuid,text,text) from public;
grant execute on function public.approve_knowledge_candidate(uuid,uuid,uuid,text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.reject_knowledge_candidate(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.resolve_knowledge_conflict(uuid,uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.revoke_knowledge_version(uuid,uuid,uuid,text,text) to authenticated;
