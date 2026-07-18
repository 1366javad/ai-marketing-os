create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.business_memberships (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'reviewer')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_memberships membership
    where membership.business_id = target_business_id
      and membership.user_id = auth.uid()
  );
$$;

revoke all on function public.is_business_member(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;

create or replace function public.is_business_creator(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses business
    where business.id = target_business_id
      and business.created_by = auth.uid()
  );
$$;

revoke all on function public.is_business_creator(uuid) from public;
grant execute on function public.is_business_creator(uuid) to authenticated;

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  source_kind text not null check (source_kind in ('text', 'document', 'website_snapshot', 'transcript')),
  title text not null check (length(btrim(title)) > 0),
  original_reference text,
  content_hash text not null check (length(content_hash) >= 32),
  authority text not null check (authority in ('authoritative', 'supporting', 'unverified')),
  status text not null default 'registered' check (status in ('registered', 'normalized', 'processed', 'failed', 'archived')),
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  unique (id, business_id),
  unique (business_id, content_hash)
);

create table if not exists public.knowledge_normalizations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  business_id uuid not null references public.businesses(id),
  normalized_text text not null,
  language text not null,
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  normalized_at timestamptz not null default now(),
  normalizer_version text not null,
  unique (source_id, normalizer_version),
  foreign key (source_id, business_id) references public.knowledge_sources(id, business_id)
);

create table if not exists public.knowledge_candidates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  domain text not null check (domain in ('brand_identity', 'tone_rule', 'positioning', 'value_proposition', 'product', 'offer', 'business_model', 'audience', 'business_goal', 'constraint', 'approved_fact', 'validated_learning')),
  identity_key text not null,
  scope_key text not null,
  subject_key text not null,
  claim_key text not null,
  value jsonb not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  scope jsonb not null,
  valid_from timestamptz,
  valid_until timestamptz,
  status text not null default 'candidate' check (status in ('candidate', 'needs_review', 'rejected', 'promoted')),
  created_at timestamptz not null default now(),
  unique (id, business_id),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table if not exists public.knowledge_candidate_evidence (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  candidate_id uuid not null,
  source_id uuid not null,
  section_ordinal integer check (section_ordinal is null or section_ordinal >= 0),
  excerpt_hash text not null,
  created_at timestamptz not null default now(),
  unique (candidate_id, source_id, section_ordinal, excerpt_hash),
  foreign key (candidate_id, business_id) references public.knowledge_candidates(id, business_id),
  foreign key (source_id, business_id) references public.knowledge_sources(id, business_id)
);

create table if not exists public.knowledge_conflicts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  identity_key text not null,
  candidate_ids uuid[] not null check (cardinality(candidate_ids) >= 2),
  kind text not null check (kind in ('value_conflict', 'scope_conflict', 'validity_conflict', 'authority_conflict')),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution text,
  resolved_candidate_id uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  foreign key (resolved_candidate_id, business_id) references public.knowledge_candidates(id, business_id)
);

create table if not exists public.business_knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  identity_key text not null,
  scope_key text not null,
  domain text not null check (domain in ('brand_identity', 'tone_rule', 'positioning', 'value_proposition', 'product', 'offer', 'business_model', 'audience', 'business_goal', 'constraint', 'approved_fact', 'validated_learning')),
  subject_key text not null,
  claim_key text not null,
  value jsonb not null,
  version integer not null check (version > 0),
  status text not null check (status in ('approved', 'superseded', 'expired', 'revoked')),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  scope jsonb not null,
  valid_from timestamptz,
  valid_until timestamptz,
  conflict_ids uuid[] not null default '{}',
  supersedes uuid references public.business_knowledge_versions(id),
  approved_at timestamptz not null,
  approved_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, identity_key, version),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create unique index if not exists business_knowledge_versions_single_successor_idx
on public.business_knowledge_versions (supersedes)
where supersedes is not null;

create index if not exists business_knowledge_versions_active_identity_idx
on public.business_knowledge_versions (business_id, identity_key, scope_key, version desc);

create table if not exists public.knowledge_version_evidence (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  version_id uuid not null,
  source_id uuid not null,
  excerpt_hash text not null,
  created_at timestamptz not null default now(),
  unique (version_id, source_id, excerpt_hash),
  foreign key (version_id, business_id) references public.business_knowledge_versions(id, business_id),
  foreign key (source_id, business_id) references public.knowledge_sources(id, business_id)
);

create table if not exists public.knowledge_candidate_updates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  proposed_domain text not null check (proposed_domain in ('brand_identity', 'tone_rule', 'positioning', 'value_proposition', 'product', 'offer', 'business_model', 'audience', 'business_goal', 'constraint', 'approved_fact', 'validated_learning')),
  proposed_identity_key text not null,
  proposed_value jsonb not null,
  source_kind text not null check (source_kind in ('campaign_event', 'analytics_observation', 'human_note')),
  source_reference_id text not null,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  status text not null default 'candidate' check (status in ('candidate', 'under_review', 'rejected', 'accepted_for_validation')),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create table if not exists public.knowledge_audit_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  actor_id uuid references auth.users(id),
  action text not null,
  target_kind text not null,
  target_id text not null,
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.enforce_knowledge_version_chain()
returns trigger language plpgsql as $$
declare
  current_version public.business_knowledge_versions;
begin
  perform pg_advisory_xact_lock(hashtext(new.business_id::text || new.identity_key || new.scope_key));

  select candidate.* into current_version
  from public.business_knowledge_versions candidate
  where candidate.business_id = new.business_id
    and candidate.identity_key = new.identity_key
    and candidate.scope_key = new.scope_key
    and not exists (
      select 1 from public.business_knowledge_versions successor
      where successor.supersedes = candidate.id
    )
  order by candidate.version desc
  limit 1;

  if current_version.id is null then
    if new.version <> 1 or new.supersedes is not null then
      raise exception 'first knowledge version must be version 1 without supersedes';
    end if;
  elsif new.supersedes is distinct from current_version.id
    or new.version <> current_version.version + 1 then
    raise exception 'knowledge version must extend the current append-only chain';
  end if;
  return new;
end;
$$;

drop trigger if exists knowledge_versions_enforce_chain on public.business_knowledge_versions;
create trigger knowledge_versions_enforce_chain
before insert on public.business_knowledge_versions
for each row execute function public.enforce_knowledge_version_chain();

create or replace function public.reject_knowledge_version_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'business_knowledge_versions are append-only';
end;
$$;

drop trigger if exists knowledge_versions_are_append_only on public.business_knowledge_versions;
create trigger knowledge_versions_are_append_only
before update or delete on public.business_knowledge_versions
for each row execute function public.reject_knowledge_version_mutation();

create or replace view public.current_business_knowledge_versions
with (security_invoker = true) as
select version.*
from public.business_knowledge_versions version
where not exists (
  select 1 from public.business_knowledge_versions successor
  where successor.supersedes = version.id
)
and version.status = 'approved'
and (version.valid_from is null or version.valid_from <= now())
and (version.valid_until is null or version.valid_until > now());

create or replace function public.reject_knowledge_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'knowledge_audit_events are append-only';
end;
$$;

create or replace function public.enforce_knowledge_source_immutability()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'knowledge_sources are immutable snapshots';
  end if;
  if new.business_id <> old.business_id
    or new.source_kind <> old.source_kind
    or new.title <> old.title
    or new.original_reference is distinct from old.original_reference
    or new.content_hash <> old.content_hash
    or new.authority <> old.authority
    or new.captured_at <> old.captured_at
    or new.created_at <> old.created_at
    or new.created_by <> old.created_by
    or new.metadata <> old.metadata then
    raise exception 'knowledge source snapshot provenance is immutable';
  end if;
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'registered' and new.status in ('normalized', 'failed', 'archived'))
    or (old.status = 'normalized' and new.status in ('processed', 'failed', 'archived'))
    or (old.status = 'failed' and new.status in ('registered', 'archived'))
    or (old.status = 'processed' and new.status = 'archived')
  ) then
    raise exception 'invalid knowledge source lifecycle transition';
  end if;
  return new;
end;
$$;

create or replace function public.reject_immutable_knowledge_record_mutation()
returns trigger language plpgsql as $$
begin
  raise exception '% records are append-only', tg_table_name;
end;
$$;

drop trigger if exists knowledge_sources_are_immutable on public.knowledge_sources;
create trigger knowledge_sources_are_immutable
before update or delete on public.knowledge_sources
for each row execute function public.enforce_knowledge_source_immutability();

drop trigger if exists knowledge_normalizations_are_append_only on public.knowledge_normalizations;
create trigger knowledge_normalizations_are_append_only
before update or delete on public.knowledge_normalizations
for each row execute function public.reject_immutable_knowledge_record_mutation();

drop trigger if exists knowledge_candidate_evidence_is_append_only on public.knowledge_candidate_evidence;
create trigger knowledge_candidate_evidence_is_append_only
before update or delete on public.knowledge_candidate_evidence
for each row execute function public.reject_immutable_knowledge_record_mutation();

drop trigger if exists knowledge_version_evidence_is_append_only on public.knowledge_version_evidence;
create trigger knowledge_version_evidence_is_append_only
before update or delete on public.knowledge_version_evidence
for each row execute function public.reject_immutable_knowledge_record_mutation();

drop trigger if exists knowledge_audit_is_append_only on public.knowledge_audit_events;
create trigger knowledge_audit_is_append_only
before update or delete on public.knowledge_audit_events
for each row execute function public.reject_knowledge_audit_mutation();

alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_normalizations enable row level security;
alter table public.knowledge_candidates enable row level security;
alter table public.knowledge_candidate_evidence enable row level security;
alter table public.knowledge_conflicts enable row level security;
alter table public.business_knowledge_versions enable row level security;
alter table public.knowledge_version_evidence enable row level security;
alter table public.knowledge_candidate_updates enable row level security;
alter table public.knowledge_audit_events enable row level security;

create policy businesses_select_members on public.businesses for select to authenticated
using (public.is_business_member(id));
create policy businesses_insert_owner on public.businesses for insert to authenticated
with check (created_by = auth.uid());
create policy memberships_select_members on public.business_memberships for select to authenticated
using (public.is_business_member(business_id));
create policy memberships_insert_business_owner on public.business_memberships for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_business_creator(business_id)
);

create policy knowledge_sources_member_access on public.knowledge_sources for all to authenticated
using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy knowledge_normalizations_member_access on public.knowledge_normalizations for all to authenticated
using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy knowledge_candidates_member_access on public.knowledge_candidates for all to authenticated
using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy knowledge_candidate_evidence_member_access on public.knowledge_candidate_evidence for all to authenticated
using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy knowledge_conflicts_member_access on public.knowledge_conflicts for all to authenticated
using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy business_knowledge_versions_member_access on public.business_knowledge_versions for all to authenticated
using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy knowledge_version_evidence_member_access on public.knowledge_version_evidence for all to authenticated
using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy knowledge_candidate_updates_member_access on public.knowledge_candidate_updates for all to authenticated
using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy knowledge_audit_events_member_access on public.knowledge_audit_events for select to authenticated
using (public.is_business_member(business_id));
create policy knowledge_audit_events_member_insert on public.knowledge_audit_events for insert to authenticated
with check (public.is_business_member(business_id) and actor_id = auth.uid());

create index if not exists knowledge_sources_business_status_idx on public.knowledge_sources (business_id, status, created_at desc);
create index if not exists knowledge_candidates_business_identity_idx on public.knowledge_candidates (business_id, identity_key, status);
create index if not exists knowledge_conflicts_business_identity_idx on public.knowledge_conflicts (business_id, identity_key, status);
create index if not exists knowledge_versions_business_identity_idx on public.business_knowledge_versions (business_id, identity_key, version desc);
create index if not exists knowledge_candidate_updates_business_status_idx on public.knowledge_candidate_updates (business_id, status, created_at desc);
create index if not exists knowledge_audit_business_target_idx on public.knowledge_audit_events (business_id, target_kind, target_id, created_at desc);
