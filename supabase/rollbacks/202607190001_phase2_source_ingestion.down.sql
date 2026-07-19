drop function if exists public.retry_knowledge_source(uuid,uuid,uuid,text);
drop function if exists public.mark_knowledge_source_failed(uuid,uuid,text,boolean,uuid,text);
drop function if exists public.save_knowledge_normalization(uuid,uuid,text,text,jsonb,jsonb,text,uuid,text);
drop function if exists public.register_knowledge_source(uuid,text,text,text,text,text,timestamptz,uuid,jsonb,text,text,text);
drop trigger if exists knowledge_source_payloads_are_append_only on public.knowledge_source_payloads;
drop table if exists public.knowledge_source_payloads;
alter table public.knowledge_sources drop column if exists last_processing_at;
alter table public.knowledge_sources drop column if exists processing_error;
alter table public.knowledge_sources drop column if exists processing_attempts;
