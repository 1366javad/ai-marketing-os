drop function if exists public.save_knowledge_synthesis(uuid,text,jsonb,jsonb,uuid,text);
drop function if exists public.persist_knowledge_candidate(uuid,uuid,text,text,text,text,text,jsonb,text,jsonb,timestamptz,timestamptz,text,jsonb,uuid,text);
drop index if exists public.knowledge_candidate_evidence_candidate_idx;
drop index if exists public.knowledge_conflicts_open_identity_idx;
drop index if exists public.knowledge_candidates_identity_value_idx;
alter table public.knowledge_candidates drop column if exists extractor_version;
alter table public.knowledge_candidates drop column if exists value_hash;
