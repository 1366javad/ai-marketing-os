create table if not exists public.market_sources (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  source_kind text not null check(source_kind in ('text','document','website_snapshot','transcript','structured_dataset')),
  source_category text not null check(source_category in ('competitor_official','regulatory_government','academic_industry','search_trend','advertising_library','news_trade','social_community','licensed_dataset','human_research_note')),
  title text not null, original_reference text not null, publisher text not null,
  authority text not null check(authority in ('primary','authoritative_secondary','supporting','unverified')),
  access_basis text not null, capture_method text not null,
  status text not null default 'registered' check(status in ('registered','normalized','processed','failed','archived','retired')),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  metadata jsonb not null default '{}', unique(id,business_id), unique(business_id,original_reference)
);

create table if not exists public.market_source_captures (
  id uuid primary key default gen_random_uuid(), source_id uuid not null, business_id uuid not null references public.businesses(id),
  content_hash text not null, content_base64 text not null, content_encoding text not null check(content_encoding in ('utf8','binary')),
  byte_length integer not null check(byte_length>0 and byte_length<=5242880), captured_at timestamptz not null,
  published_at timestamptz, metadata jsonb not null default '{}', created_at timestamptz not null default now(),
  unique(id,business_id), unique(business_id,content_hash),
  foreign key(source_id,business_id) references public.market_sources(id,business_id)
);

create table if not exists public.market_normalizations (
  id uuid primary key default gen_random_uuid(), capture_id uuid not null, source_id uuid not null,
  business_id uuid not null references public.businesses(id), normalized_text text not null, language text not null,
  sections jsonb not null default '[]' check(jsonb_typeof(sections)='array'), warnings jsonb not null default '[]' check(jsonb_typeof(warnings)='array'),
  normalizer_version text not null, normalized_at timestamptz not null default now(),
  unique(capture_id,normalizer_version), foreign key(capture_id,business_id) references public.market_source_captures(id,business_id),
  foreign key(source_id,business_id) references public.market_sources(id,business_id)
);

create table if not exists public.market_entities (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  entity_key text not null, entity_type text not null check(entity_type in ('competitor','audience','category','channel','product','topic')),
  display_name text not null, aliases jsonb not null default '[]' check(jsonb_typeof(aliases)='array'),
  status text not null default 'active' check(status in ('active','archived','retired','merged')),
  metadata jsonb not null default '{}', created_at timestamptz not null default now(), unique(id,business_id), unique(business_id,entity_key)
);

create table if not exists public.market_observations (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id), capture_id uuid not null,
  entity_id uuid, observation_type text not null, value jsonb not null, scope jsonb not null, observed_at timestamptz not null,
  status text not null default 'candidate' check(status in ('candidate','validated','rejected','archived')),
  provenance jsonb not null, created_at timestamptz not null default now(), unique(id,business_id),
  foreign key(capture_id,business_id) references public.market_source_captures(id,business_id),
  foreign key(entity_id,business_id) references public.market_entities(id,business_id)
);

create table if not exists public.market_candidates (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  identity_key text not null, scope_key text not null,
  domain text not null check(domain in ('competitor','audience_signal','category_trend','channel_pattern','market_opportunity','market_threat','regulatory_signal','economic_signal','cultural_signal','technology_signal')),
  memory_type text not null check(memory_type in ('observation','signal','claim','trend','relationship','snapshot')),
  entity_key text not null, claim_key text not null, value jsonb not null, value_hash text not null,
  confidence numeric(4,3) not null default 0 check(confidence between 0 and 1),
  confidence_band text not null default 'low' check(confidence_band in ('low','moderate','high','very_high')),
  scope jsonb not null, valid_from timestamptz, valid_until timestamptz, freshness_class text not null default 'standard',
  status text not null default 'candidate' check(status in ('candidate','needs_review','rejected','promoted')),
  extractor_version text not null, created_at timestamptz not null default now(), unique(id,business_id),
  unique(business_id,identity_key,value_hash,extractor_version), check(valid_until is null or valid_from is null or valid_until>valid_from)
);

create table if not exists public.market_candidate_evidence (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  candidate_id uuid not null, capture_id uuid not null, source_id uuid not null, section_ordinal integer not null check(section_ordinal>=0),
  excerpt_hash text not null, evidence_role text not null default 'supporting' check(evidence_role in ('supporting','contradicting','neutral','contextual')),
  created_at timestamptz not null default now(), unique(candidate_id,capture_id,section_ordinal,excerpt_hash),
  foreign key(candidate_id,business_id) references public.market_candidates(id,business_id),
  foreign key(capture_id,business_id) references public.market_source_captures(id,business_id),
  foreign key(source_id,business_id) references public.market_sources(id,business_id)
);

create table if not exists public.market_conflicts (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id), identity_key text not null,
  candidate_ids uuid[] not null check(cardinality(candidate_ids)>=2), kind text not null check(kind in ('value_conflict','scope_conflict','validity_conflict','authority_conflict')),
  status text not null default 'open' check(status in ('open','resolved','dismissed')), resolution text,
  resolved_candidate_id uuid, resolved_at timestamptz, resolved_by uuid references auth.users(id), created_at timestamptz not null default now(),
  foreign key(resolved_candidate_id,business_id) references public.market_candidates(id,business_id)
);
create unique index if not exists market_conflicts_open_identity_idx on public.market_conflicts(business_id,identity_key) where status='open';

create table if not exists public.market_versions (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  identity_key text not null, scope_key text not null, domain text not null, memory_type text not null,
  entity_key text not null, claim_key text not null, value jsonb not null, version integer not null check(version>0),
  status text not null check(status in ('approved','expired','revoked','archived','retired')),
  confidence numeric(4,3) not null check(confidence between 0 and 1), confidence_band text not null,
  scope jsonb not null, freshness_class text not null, valid_from timestamptz, valid_until timestamptz,
  supersedes uuid references public.market_versions(id), approved_at timestamptz not null, approved_by uuid not null references auth.users(id),
  approval_reason text not null, policy_version text not null default 'market-policy-v1', created_at timestamptz not null default now(),
  unique(id,business_id), unique(business_id,identity_key,scope_key,version),
  check(valid_until is null or valid_from is null or valid_until>valid_from)
);
create unique index if not exists market_versions_single_successor_idx on public.market_versions(supersedes) where supersedes is not null;

create table if not exists public.market_version_evidence (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  version_id uuid not null, capture_id uuid not null, source_id uuid not null, excerpt_hash text not null,
  created_at timestamptz not null default now(), unique(version_id,capture_id,excerpt_hash),
  foreign key(version_id,business_id) references public.market_versions(id,business_id),
  foreign key(capture_id,business_id) references public.market_source_captures(id,business_id),
  foreign key(source_id,business_id) references public.market_sources(id,business_id)
);

create table if not exists public.market_candidate_updates (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  proposed_domain text not null, memory_type text not null, proposed_identity_key text not null, proposed_value jsonb not null,
  source_kind text not null check(source_kind in ('campaign_event','analytics_observation','human_note','market_observation')),
  source_reference_id text not null, evidence jsonb not null default '[]' check(jsonb_typeof(evidence)='array'),
  status text not null default 'candidate' check(status in ('candidate','under_review','rejected','accepted_for_validation')),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.market_audit_events (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id), actor_id uuid references auth.users(id),
  action text not null, target_kind text not null, target_id text not null, correlation_id text,
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create or replace function public.reject_market_immutable_mutation() returns trigger language plpgsql as $$ begin raise exception '% is append-only',tg_table_name; end $$;
create or replace function public.enforce_market_version_chain() returns trigger language plpgsql as $$
declare current_record public.market_versions; begin
  perform pg_advisory_xact_lock(hashtext(new.business_id::text||new.identity_key||new.scope_key));
  select v.* into current_record from public.market_versions v where v.business_id=new.business_id and v.identity_key=new.identity_key and v.scope_key=new.scope_key
    and not exists(select 1 from public.market_versions s where s.supersedes=v.id) order by v.version desc limit 1;
  if current_record.id is null then
    if new.version<>1 or new.supersedes is not null then raise exception 'first market version must be version 1'; end if;
  elsif new.supersedes is distinct from current_record.id or new.version<>current_record.version+1 then raise exception 'market version must extend current chain'; end if;
  return new;
end $$;
drop trigger if exists market_versions_chain on public.market_versions;
create trigger market_versions_chain before insert on public.market_versions for each row execute function public.enforce_market_version_chain();
drop trigger if exists market_versions_immutable on public.market_versions;
create trigger market_versions_immutable before update or delete on public.market_versions for each row execute function public.reject_market_immutable_mutation();
drop trigger if exists market_captures_immutable on public.market_source_captures;
create trigger market_captures_immutable before update or delete on public.market_source_captures for each row execute function public.reject_market_immutable_mutation();
drop trigger if exists market_normalizations_immutable on public.market_normalizations;
create trigger market_normalizations_immutable before update or delete on public.market_normalizations for each row execute function public.reject_market_immutable_mutation();
drop trigger if exists market_candidate_evidence_immutable on public.market_candidate_evidence;
create trigger market_candidate_evidence_immutable before update or delete on public.market_candidate_evidence for each row execute function public.reject_market_immutable_mutation();
drop trigger if exists market_version_evidence_immutable on public.market_version_evidence;
create trigger market_version_evidence_immutable before update or delete on public.market_version_evidence for each row execute function public.reject_market_immutable_mutation();
drop trigger if exists market_audit_immutable on public.market_audit_events;
create trigger market_audit_immutable before update or delete on public.market_audit_events for each row execute function public.reject_market_immutable_mutation();

create or replace view public.current_market_versions with(security_invoker=true) as
select v.* from public.market_versions v where v.status='approved'
and (v.valid_from is null or v.valid_from<=now()) and (v.valid_until is null or v.valid_until>now())
and not exists(select 1 from public.market_versions s where s.supersedes=v.id);

create or replace function public.register_market_source(
  p_business_id uuid,p_source_kind text,p_source_category text,p_title text,p_original_reference text,p_publisher text,
  p_authority text,p_access_basis text,p_capture_method text,p_content_hash text,p_content_base64 text,p_content_encoding text,
  p_captured_at timestamptz,p_published_at timestamptz,p_metadata jsonb,p_actor_id uuid,p_correlation_id text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.market_sources; c public.market_source_captures; duplicate boolean:=false; begin
  if auth.uid() is distinct from p_actor_id or not public.is_business_member(p_business_id) then raise exception 'business member identity required'; end if;
  select * into c from public.market_source_captures where business_id=p_business_id and content_hash=p_content_hash limit 1;
  if c.id is not null then select * into s from public.market_sources where id=c.source_id; duplicate:=true;
  else
    insert into public.market_sources(business_id,source_kind,source_category,title,original_reference,publisher,authority,access_basis,capture_method,created_by,metadata)
    values(p_business_id,p_source_kind,p_source_category,p_title,p_original_reference,p_publisher,p_authority,p_access_basis,p_capture_method,p_actor_id,p_metadata)
    on conflict(business_id,original_reference) do update set title=excluded.title returning * into s;
    insert into public.market_source_captures(source_id,business_id,content_hash,content_base64,content_encoding,byte_length,captured_at,published_at,metadata)
    values(s.id,p_business_id,p_content_hash,p_content_base64,p_content_encoding,length(decode(p_content_base64,'base64')),p_captured_at,p_published_at,p_metadata) returning * into c;
    insert into public.market_audit_events(business_id,actor_id,action,target_kind,target_id,correlation_id,metadata)
    values(p_business_id,p_actor_id,'market_source_captured','market_source_capture',c.id::text,p_correlation_id,jsonb_build_object('sourceId',s.id,'contentHash',p_content_hash));
  end if;
  return to_jsonb(s)||jsonb_build_object('capture_id',c.id,'content_hash',c.content_hash,'captured_at',c.captured_at,'published_at',c.published_at,'duplicate',duplicate);
end $$;

create or replace function public.save_market_normalization(
 p_business_id uuid,p_source_id uuid,p_capture_id uuid,p_normalized_text text,p_language text,p_sections jsonb,p_warnings jsonb,
 p_normalizer_version text,p_actor_id uuid,p_correlation_id text
) returns jsonb language plpgsql security definer set search_path=public as $$ declare n public.market_normalizations; begin
 if auth.uid() is distinct from p_actor_id or not public.is_business_member(p_business_id) then raise exception 'business member identity required'; end if;
 insert into public.market_normalizations(capture_id,source_id,business_id,normalized_text,language,sections,warnings,normalizer_version)
 values(p_capture_id,p_source_id,p_business_id,p_normalized_text,p_language,p_sections,p_warnings,p_normalizer_version)
 on conflict(capture_id,normalizer_version) do nothing returning * into n;
 if n.id is null then select * into n from public.market_normalizations where capture_id=p_capture_id and normalizer_version=p_normalizer_version; end if;
 update public.market_sources set status='normalized' where id=p_source_id and business_id=p_business_id and status='registered';
 insert into public.market_audit_events(business_id,actor_id,action,target_kind,target_id,correlation_id) values(p_business_id,p_actor_id,'market_source_normalized','market_normalization',n.id::text,p_correlation_id);
 return to_jsonb(n); end $$;

create or replace function public.persist_market_candidate(
 p_business_id uuid,p_source_id uuid,p_capture_id uuid,p_identity_key text,p_scope_key text,p_domain text,p_memory_type text,
 p_entity_key text,p_claim_key text,p_value jsonb,p_value_hash text,p_scope jsonb,p_valid_from timestamptz,p_valid_until timestamptz,
 p_freshness_class text,p_extractor_version text,p_evidence jsonb,p_actor_id uuid,p_correlation_id text
) returns jsonb language plpgsql security definer set search_path=public as $$ declare c public.market_candidates; e jsonb; capture_time timestamptz; entity_type text; begin
 if auth.uid() is distinct from p_actor_id or not public.is_business_member(p_business_id) then raise exception 'business member identity required'; end if;
 if jsonb_typeof(p_evidence)<>'array' or jsonb_array_length(p_evidence)=0 then raise exception 'exact evidence required'; end if;
 insert into public.market_candidates(business_id,identity_key,scope_key,domain,memory_type,entity_key,claim_key,value,value_hash,scope,valid_from,valid_until,freshness_class,extractor_version)
 values(p_business_id,p_identity_key,p_scope_key,p_domain,p_memory_type,p_entity_key,p_claim_key,p_value,p_value_hash,p_scope,p_valid_from,p_valid_until,p_freshness_class,p_extractor_version)
 on conflict(business_id,identity_key,value_hash,extractor_version) do nothing returning * into c;
 if c.id is null then select * into c from public.market_candidates where business_id=p_business_id and identity_key=p_identity_key and value_hash=p_value_hash and extractor_version=p_extractor_version; end if;
 select captured_at into capture_time from public.market_source_captures where id=p_capture_id and source_id=p_source_id and business_id=p_business_id;
 if capture_time is null then raise exception 'market capture not found'; end if;
 entity_type:=case when p_domain='competitor' then 'competitor' when p_domain='audience_signal' then 'audience' when p_domain='channel_pattern' then 'channel' when p_domain='category_trend' then 'category' else 'topic' end;
 insert into public.market_entities(business_id,canonical_key,entity_type,display_name,metadata)
 values(p_business_id,p_entity_key,entity_type,p_entity_key,jsonb_build_object('createdFromSourceId',p_source_id))
 on conflict(business_id,canonical_key) do nothing;
 insert into public.market_observations(business_id,entity_id,observation_type,value,scope,observed_at,capture_id,source_id)
 select p_business_id,id,p_memory_type,p_value,p_scope,capture_time,p_capture_id,p_source_id
 from public.market_entities where business_id=p_business_id and canonical_key=p_entity_key;
 for e in select value from jsonb_array_elements(p_evidence) loop
  if (e->>'sourceId')::uuid<>p_source_id or coalesce(e->>'excerptHash','')='' then raise exception 'invalid market evidence'; end if;
  insert into public.market_candidate_evidence(business_id,candidate_id,capture_id,source_id,section_ordinal,excerpt_hash)
  values(p_business_id,c.id,p_capture_id,p_source_id,(e->>'sectionOrdinal')::integer,e->>'excerptHash') on conflict do nothing;
 end loop;
 update public.market_sources set status='processed' where id=p_source_id and business_id=p_business_id;
 insert into public.market_audit_events(business_id,actor_id,action,target_kind,target_id,correlation_id,metadata)
 values(p_business_id,p_actor_id,'market_candidate_extracted','market_candidate',c.id::text,p_correlation_id,jsonb_build_object('identityKey',p_identity_key,'sourceId',p_source_id));
 return to_jsonb(c); end $$;

create or replace function public.save_market_synthesis(p_business_id uuid,p_identity_key text,p_updates jsonb,p_conflict jsonb,p_actor_id uuid,p_correlation_id text)
returns boolean language plpgsql security definer set search_path=public as $$ declare u jsonb; conflict_row public.market_conflicts; begin
 if auth.uid() is distinct from p_actor_id or not public.is_business_member(p_business_id) then raise exception 'business member identity required'; end if;
 for u in select value from jsonb_array_elements(p_updates) loop
  update public.market_candidates set confidence=(u->>'confidence')::numeric,confidence_band=u->>'confidenceBand',status=u->>'status'
  where id=(u->>'candidateId')::uuid and business_id=p_business_id and identity_key=p_identity_key and status in('candidate','needs_review');
 end loop;
 if p_conflict is not null then
  insert into public.market_conflicts(business_id,identity_key,candidate_ids,kind) values(p_business_id,p_identity_key,array(select value::uuid from jsonb_array_elements_text(p_conflict->'candidateIds')),p_conflict->>'kind')
  on conflict(business_id,identity_key) where status='open' do update set candidate_ids=excluded.candidate_ids returning * into conflict_row;
 end if;
 insert into public.market_audit_events(business_id,actor_id,action,target_kind,target_id,correlation_id) values(p_business_id,p_actor_id,case when p_conflict is null then 'market_candidate_synthesized' else 'market_conflict_opened' end,'market_identity',p_identity_key,p_correlation_id);
 return true; end $$;

create or replace function public.approve_market_candidate(p_business_id uuid,p_candidate_id uuid,p_actor_id uuid,p_reason text,p_valid_from timestamptz,p_valid_until timestamptz,p_correlation_id text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare c public.market_candidates; current_v public.market_versions; v public.market_versions; begin
 if not public.can_review_business_knowledge(p_business_id,p_actor_id,true) then raise exception 'authorized human reviewer required'; end if;
 if length(btrim(coalesce(p_reason,'')))=0 then raise exception 'approval reason required'; end if;
 select * into c from public.market_candidates where id=p_candidate_id and business_id=p_business_id and status='candidate' for update;
 if c.id is null then raise exception 'approvable market candidate not found'; end if;
 if not exists(select 1 from public.market_candidate_evidence e where e.candidate_id=c.id) then raise exception 'market candidate requires evidence'; end if;
 if exists(select 1 from public.market_conflicts x where x.business_id=p_business_id and x.identity_key=c.identity_key and x.status='open') then raise exception 'open market conflict blocks approval'; end if;
 select x.* into current_v from public.market_versions x where x.business_id=p_business_id and x.identity_key=c.identity_key and x.scope_key=c.scope_key and not exists(select 1 from public.market_versions s where s.supersedes=x.id) order by x.version desc limit 1 for update;
 insert into public.market_versions(business_id,identity_key,scope_key,domain,memory_type,entity_key,claim_key,value,version,status,confidence,confidence_band,scope,freshness_class,valid_from,valid_until,supersedes,approved_at,approved_by,approval_reason)
 values(p_business_id,c.identity_key,c.scope_key,c.domain,c.memory_type,c.entity_key,c.claim_key,c.value,coalesce(current_v.version,0)+1,'approved',c.confidence,c.confidence_band,c.scope,c.freshness_class,coalesce(p_valid_from,c.valid_from),coalesce(p_valid_until,c.valid_until),current_v.id,now(),p_actor_id,p_reason) returning * into v;
 insert into public.market_version_evidence(business_id,version_id,capture_id,source_id,excerpt_hash) select business_id,v.id,capture_id,source_id,excerpt_hash from public.market_candidate_evidence where candidate_id=c.id;
 update public.market_candidates set status='promoted' where id=c.id;
 insert into public.market_audit_events(business_id,actor_id,action,target_kind,target_id,correlation_id,metadata) values(p_business_id,p_actor_id,'market_candidate_approved','market_version',v.id::text,p_correlation_id,jsonb_build_object('candidateId',c.id,'reason',p_reason));
 return to_jsonb(v); end $$;

create or replace function public.reject_market_candidate(p_business_id uuid,p_candidate_id uuid,p_actor_id uuid,p_reason text,p_correlation_id text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare c public.market_candidates; begin
 if not public.can_review_business_knowledge(p_business_id,p_actor_id,true) then raise exception 'authorized human reviewer required'; end if;
 update public.market_candidates set status='rejected' where id=p_candidate_id and business_id=p_business_id and status in('candidate','needs_review') returning * into c;
 if c.id is null then raise exception 'rejectable market candidate not found'; end if;
 insert into public.market_audit_events(business_id,actor_id,action,target_kind,target_id,correlation_id,metadata) values(p_business_id,p_actor_id,'market_candidate_rejected','market_candidate',c.id::text,p_correlation_id,jsonb_build_object('reason',p_reason)); return to_jsonb(c); end $$;

create or replace function public.resolve_market_conflict(p_business_id uuid,p_conflict_id uuid,p_selected_candidate_id uuid,p_actor_id uuid,p_reason text,p_correlation_id text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare x public.market_conflicts; begin
 if not public.can_review_business_knowledge(p_business_id,p_actor_id,true) then raise exception 'authorized human reviewer required'; end if;
 select * into x from public.market_conflicts where id=p_conflict_id and business_id=p_business_id and status='open' for update;
 if x.id is null or not(p_selected_candidate_id=any(x.candidate_ids)) then raise exception 'valid market conflict selection required'; end if;
 update public.market_candidates set status=case when id=p_selected_candidate_id then 'candidate' else 'rejected' end where business_id=p_business_id and id=any(x.candidate_ids);
 update public.market_conflicts set status='resolved',resolution=p_reason,resolved_candidate_id=p_selected_candidate_id,resolved_at=now(),resolved_by=p_actor_id where id=x.id returning * into x;
 insert into public.market_audit_events(business_id,actor_id,action,target_kind,target_id,correlation_id) values(p_business_id,p_actor_id,'market_conflict_resolved','market_conflict',x.id::text,p_correlation_id); return to_jsonb(x); end $$;

create or replace function public.create_market_candidate_update(p_business_id uuid,p_proposed_domain text,p_memory_type text,p_proposed_identity_key text,p_proposed_value jsonb,p_source_kind text,p_source_reference_id text,p_evidence jsonb,p_actor_id uuid,p_correlation_id text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare u public.market_candidate_updates; begin
 if auth.uid() is distinct from p_actor_id or not public.is_business_member(p_business_id) then raise exception 'business member identity required'; end if;
 insert into public.market_candidate_updates(business_id,proposed_domain,memory_type,proposed_identity_key,proposed_value,source_kind,source_reference_id,evidence,created_by)
 values(p_business_id,p_proposed_domain,p_memory_type,p_proposed_identity_key,p_proposed_value,p_source_kind,p_source_reference_id,p_evidence,p_actor_id) returning * into u;
 insert into public.market_audit_events(business_id,actor_id,action,target_kind,target_id,correlation_id) values(p_business_id,p_actor_id,'market_candidate_update_created','market_candidate_update',u.id::text,p_correlation_id); return to_jsonb(u); end $$;

create or replace function public.transition_market_version(p_business_id uuid,p_version_id uuid,p_status text,p_actor_id uuid,p_reason text,p_correlation_id text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare current_v public.market_versions; v public.market_versions; begin
 if p_status not in('revoked','expired','archived','retired') then raise exception 'invalid market version transition'; end if;
 if not public.can_review_business_knowledge(p_business_id,p_actor_id,true) then raise exception 'authorized human reviewer required'; end if;
 if length(btrim(coalesce(p_reason,'')))=0 then raise exception 'transition reason required'; end if;
 select * into current_v from public.market_versions where id=p_version_id and business_id=p_business_id for update;
 if current_v.id is null or exists(select 1 from public.market_versions where supersedes=current_v.id) then raise exception 'current market version required'; end if;
 insert into public.market_versions(business_id,identity_key,scope_key,domain,memory_type,entity_key,claim_key,value,version,status,confidence,confidence_band,scope,freshness_class,valid_from,valid_until,supersedes,approved_at,approved_by,approval_reason)
 values(p_business_id,current_v.identity_key,current_v.scope_key,current_v.domain,current_v.memory_type,current_v.entity_key,current_v.claim_key,current_v.value,current_v.version+1,p_status,current_v.confidence,current_v.confidence_band,current_v.scope,current_v.freshness_class,current_v.valid_from,current_v.valid_until,current_v.id,now(),p_actor_id,p_reason) returning * into v;
 insert into public.market_version_evidence(business_id,version_id,capture_id,source_id,excerpt_hash) select business_id,v.id,capture_id,source_id,excerpt_hash from public.market_version_evidence where version_id=current_v.id;
 insert into public.market_audit_events(business_id,actor_id,action,target_kind,target_id,correlation_id,metadata) values(p_business_id,p_actor_id,'market_version_'||p_status,'market_version',v.id::text,p_correlation_id,jsonb_build_object('supersedes',current_v.id,'reason',p_reason)); return to_jsonb(v); end $$;

create or replace function public.transition_market_source(p_business_id uuid,p_source_id uuid,p_status text,p_actor_id uuid,p_reason text,p_correlation_id text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare s public.market_sources; begin
 if p_status not in('paused','archived','retired') then raise exception 'invalid market source transition'; end if;
 if not public.can_review_business_knowledge(p_business_id,p_actor_id,true) then raise exception 'authorized human reviewer required'; end if;
 if length(btrim(coalesce(p_reason,'')))=0 then raise exception 'transition reason required'; end if;
 update public.market_sources set status=p_status,updated_at=now() where id=p_source_id and business_id=p_business_id returning * into s;
 if s.id is null then raise exception 'market source not found'; end if;
 insert into public.market_audit_events(business_id,actor_id,action,target_kind,target_id,correlation_id,metadata) values(p_business_id,p_actor_id,'market_source_'||p_status,'market_source',s.id::text,p_correlation_id,jsonb_build_object('reason',p_reason)); return to_jsonb(s); end $$;

do $$ declare t text; begin foreach t in array array['market_sources','market_source_captures','market_normalizations','market_entities','market_observations','market_candidates','market_candidate_evidence','market_conflicts','market_versions','market_version_evidence','market_candidate_updates','market_audit_events'] loop execute format('alter table public.%I enable row level security',t); execute format('drop policy if exists %I on public.%I',t||'_member_select',t); execute format('create policy %I on public.%I for select to authenticated using (public.is_business_member(business_id))',t||'_member_select',t); end loop; end $$;

revoke insert,update,delete on public.market_sources,public.market_source_captures,public.market_normalizations,public.market_entities,public.market_observations,public.market_candidates,public.market_candidate_evidence,public.market_conflicts,public.market_versions,public.market_version_evidence,public.market_candidate_updates,public.market_audit_events from authenticated;
grant select on public.market_sources,public.market_source_captures,public.market_normalizations,public.market_entities,public.market_observations,public.market_candidates,public.market_candidate_evidence,public.market_conflicts,public.market_versions,public.market_version_evidence,public.market_candidate_updates,public.market_audit_events to authenticated;
revoke all on function public.register_market_source(uuid,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,jsonb,uuid,text) from public;
revoke all on function public.save_market_normalization(uuid,uuid,uuid,text,text,jsonb,jsonb,text,uuid,text) from public;
revoke all on function public.persist_market_candidate(uuid,uuid,uuid,text,text,text,text,text,text,jsonb,text,jsonb,timestamptz,timestamptz,text,text,jsonb,uuid,text) from public;
revoke all on function public.save_market_synthesis(uuid,text,jsonb,jsonb,uuid,text) from public;
revoke all on function public.approve_market_candidate(uuid,uuid,uuid,text,timestamptz,timestamptz,text) from public;
revoke all on function public.reject_market_candidate(uuid,uuid,uuid,text,text) from public;
revoke all on function public.resolve_market_conflict(uuid,uuid,uuid,uuid,text,text) from public;
revoke all on function public.create_market_candidate_update(uuid,text,text,text,jsonb,text,text,jsonb,uuid,text) from public;
revoke all on function public.transition_market_version(uuid,uuid,text,uuid,text,text) from public;
revoke all on function public.transition_market_source(uuid,uuid,text,uuid,text,text) from public;
grant execute on function public.register_market_source(uuid,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,jsonb,uuid,text) to authenticated;
grant execute on function public.save_market_normalization(uuid,uuid,uuid,text,text,jsonb,jsonb,text,uuid,text) to authenticated;
grant execute on function public.persist_market_candidate(uuid,uuid,uuid,text,text,text,text,text,text,jsonb,text,jsonb,timestamptz,timestamptz,text,text,jsonb,uuid,text) to authenticated;
grant execute on function public.save_market_synthesis(uuid,text,jsonb,jsonb,uuid,text) to authenticated;
grant execute on function public.approve_market_candidate(uuid,uuid,uuid,text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.reject_market_candidate(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.resolve_market_conflict(uuid,uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.create_market_candidate_update(uuid,text,text,text,jsonb,text,text,jsonb,uuid,text) to authenticated;
grant execute on function public.transition_market_version(uuid,uuid,text,uuid,text,text) to authenticated;
grant execute on function public.transition_market_source(uuid,uuid,text,uuid,text,text) to authenticated;

create index if not exists market_sources_business_status_idx on public.market_sources(business_id,status,created_at desc);
create index if not exists market_captures_source_time_idx on public.market_source_captures(business_id,source_id,captured_at desc);
create index if not exists market_candidates_identity_idx on public.market_candidates(business_id,identity_key,status);
create index if not exists market_versions_identity_idx on public.market_versions(business_id,identity_key,scope_key,version desc);
create index if not exists market_versions_runtime_idx on public.market_versions(business_id,status,domain,valid_until);
create index if not exists market_audit_target_idx on public.market_audit_events(business_id,target_kind,target_id,created_at desc);
