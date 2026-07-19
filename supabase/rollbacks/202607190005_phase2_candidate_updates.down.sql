drop function if exists public.review_knowledge_candidate_update(uuid,uuid,text,uuid,text,text);
drop function if exists public.create_knowledge_candidate_update(uuid,text,text,jsonb,text,text,jsonb,uuid,text);
grant insert, update, delete on public.knowledge_candidate_updates to authenticated;
