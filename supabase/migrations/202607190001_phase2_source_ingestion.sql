alter table public.knowledge_sources
add column if not exists processing_attempts integer not null default 0
check (processing_attempts >= 0);

alter table public.knowledge_sources
add column if not exists processing_error jsonb;

alter table public.knowledge_sources
add column if not exists last_processing_at timestamptz;

create table if not exists public.knowledge_source_payloads (
  source_id uuid primary key,
  business_id uuid not null references public.businesses(id),
  content_base64 text not null,
  content_encoding text not null check (content_encoding in ('utf8', 'binary')),
  byte_length integer not null check (byte_length > 0 and byte_length <= 5242880),
  created_at timestamptz not null default now(),
  foreign key (source_id, business_id)
    references public.knowledge_sources(id, business_id)
);

alter table public.knowledge_source_payloads enable row level security;

create policy knowledge_source_payloads_member_access
on public.knowledge_source_payloads for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop trigger if exists knowledge_source_payloads_are_append_only
on public.knowledge_source_payloads;
create trigger knowledge_source_payloads_are_append_only
before update or delete on public.knowledge_source_payloads
for each row execute function public.reject_immutable_knowledge_record_mutation();

create or replace function public.register_knowledge_source(
  p_business_id uuid,
  p_source_kind text,
  p_title text,
  p_original_reference text,
  p_content_hash text,
  p_authority text,
  p_captured_at timestamptz,
  p_created_by uuid,
  p_metadata jsonb,
  p_content_base64 text,
  p_content_encoding text,
  p_correlation_id text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  source_record public.knowledge_sources;
  is_duplicate boolean := false;
  content_bytes bytea;
begin
  if auth.uid() is null or auth.uid() <> p_created_by then
    raise exception 'source actor must match authenticated user';
  end if;
  if not public.is_business_member(p_business_id) then
    raise exception 'business membership required';
  end if;

  content_bytes := decode(p_content_base64, 'base64');
  if octet_length(content_bytes) = 0 or octet_length(content_bytes) > 5242880 then
    raise exception 'source payload size is invalid';
  end if;

  insert into public.knowledge_sources (
    business_id, source_kind, title, original_reference, content_hash,
    authority, status, captured_at, created_by, metadata
  ) values (
    p_business_id, p_source_kind, p_title, p_original_reference,
    p_content_hash, p_authority, 'registered', p_captured_at,
    p_created_by, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (business_id, content_hash) do nothing
  returning * into source_record;

  if source_record.id is null then
    is_duplicate := true;
    select * into source_record
    from public.knowledge_sources
    where business_id = p_business_id and content_hash = p_content_hash;
  else
    insert into public.knowledge_source_payloads (
      source_id, business_id, content_base64, content_encoding, byte_length
    ) values (
      source_record.id, p_business_id, p_content_base64,
      p_content_encoding, octet_length(content_bytes)
    );
  end if;

  insert into public.knowledge_audit_events (
    business_id, actor_id, action, target_kind, target_id,
    correlation_id, metadata
  ) values (
    p_business_id, p_created_by,
    case when is_duplicate then 'source_duplicate_detected' else 'source_registered' end,
    'knowledge_source', source_record.id::text, p_correlation_id,
    jsonb_build_object(
      'sourceKind', p_source_kind,
      'contentHash', p_content_hash,
      'byteLength', octet_length(content_bytes)
    )
  );

  return to_jsonb(source_record) || jsonb_build_object('duplicate', is_duplicate);
end;
$$;

create or replace function public.save_knowledge_normalization(
  p_business_id uuid,
  p_source_id uuid,
  p_normalized_text text,
  p_language text,
  p_sections jsonb,
  p_warnings jsonb,
  p_normalizer_version text,
  p_actor_id uuid,
  p_correlation_id text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  normalization_record public.knowledge_normalizations;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'normalization actor must match authenticated user';
  end if;
  if not public.is_business_member(p_business_id) then
    raise exception 'business membership required';
  end if;

  insert into public.knowledge_normalizations (
    source_id, business_id, normalized_text, language, sections,
    warnings, normalizer_version
  ) values (
    p_source_id, p_business_id, p_normalized_text, p_language,
    p_sections, p_warnings, p_normalizer_version
  )
  on conflict (source_id, normalizer_version) do nothing
  returning * into normalization_record;

  if normalization_record.id is null then
    select * into normalization_record
    from public.knowledge_normalizations
    where source_id = p_source_id
      and business_id = p_business_id
      and normalizer_version = p_normalizer_version;
  else
    update public.knowledge_sources
    set status = 'normalized',
        processing_attempts = processing_attempts + 1,
        processing_error = null,
        last_processing_at = now()
    where id = p_source_id and business_id = p_business_id;

    insert into public.knowledge_audit_events (
      business_id, actor_id, action, target_kind, target_id,
      correlation_id, metadata
    ) values (
      p_business_id, p_actor_id, 'source_normalized',
      'knowledge_source', p_source_id::text, p_correlation_id,
      jsonb_build_object(
        'normalizerVersion', p_normalizer_version,
        'sectionCount', jsonb_array_length(p_sections),
        'warningCount', jsonb_array_length(p_warnings),
        'normalizedLength', length(p_normalized_text)
      )
    );
  end if;

  return to_jsonb(normalization_record);
end;
$$;

create or replace function public.mark_knowledge_source_failed(
  p_business_id uuid,
  p_source_id uuid,
  p_error_category text,
  p_retryable boolean,
  p_actor_id uuid,
  p_correlation_id text
)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'failure actor must match authenticated user';
  end if;
  update public.knowledge_sources
  set status = 'failed',
      processing_attempts = processing_attempts + 1,
      processing_error = jsonb_build_object(
        'category', p_error_category,
        'retryable', p_retryable
      ),
      last_processing_at = now()
  where id = p_source_id
    and business_id = p_business_id
    and public.is_business_member(business_id);
  if not found then raise exception 'knowledge source not found'; end if;

  insert into public.knowledge_audit_events (
    business_id, actor_id, action, target_kind, target_id,
    correlation_id, metadata
  ) values (
    p_business_id, p_actor_id, 'source_processing_failed',
    'knowledge_source', p_source_id::text, p_correlation_id,
    jsonb_build_object('errorCategory', p_error_category, 'retryable', p_retryable)
  );
  return true;
end;
$$;

create or replace function public.retry_knowledge_source(
  p_business_id uuid,
  p_source_id uuid,
  p_actor_id uuid,
  p_correlation_id text
)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'retry actor must match authenticated user';
  end if;
  update public.knowledge_sources
  set status = 'registered', processing_error = null
  where id = p_source_id
    and business_id = p_business_id
    and status = 'failed'
    and coalesce((processing_error->>'retryable')::boolean, false)
    and public.is_business_member(business_id);
  if not found then raise exception 'retryable knowledge source not found'; end if;

  insert into public.knowledge_audit_events (
    business_id, actor_id, action, target_kind, target_id,
    correlation_id, metadata
  ) values (
    p_business_id, p_actor_id, 'source_retry_started',
    'knowledge_source', p_source_id::text, p_correlation_id, '{}'::jsonb
  );
  return true;
end;
$$;

revoke all on function public.register_knowledge_source(uuid,text,text,text,text,text,timestamptz,uuid,jsonb,text,text,text) from public;
grant execute on function public.register_knowledge_source(uuid,text,text,text,text,text,timestamptz,uuid,jsonb,text,text,text) to authenticated;
revoke all on function public.save_knowledge_normalization(uuid,uuid,text,text,jsonb,jsonb,text,uuid,text) from public;
grant execute on function public.save_knowledge_normalization(uuid,uuid,text,text,jsonb,jsonb,text,uuid,text) to authenticated;
revoke all on function public.mark_knowledge_source_failed(uuid,uuid,text,boolean,uuid,text) from public;
grant execute on function public.mark_knowledge_source_failed(uuid,uuid,text,boolean,uuid,text) to authenticated;
revoke all on function public.retry_knowledge_source(uuid,uuid,uuid,text) from public;
grant execute on function public.retry_knowledge_source(uuid,uuid,uuid,text) to authenticated;

create index if not exists knowledge_source_payloads_business_idx
on public.knowledge_source_payloads (business_id, created_at desc);
