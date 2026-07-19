grant insert, update, delete on public.knowledge_candidates to authenticated;
grant insert, update, delete on public.knowledge_candidate_evidence to authenticated;
grant insert, update, delete on public.knowledge_conflicts to authenticated;
alter function public.persist_knowledge_candidate(uuid,uuid,text,text,text,text,text,jsonb,text,jsonb,timestamptz,timestamptz,text,jsonb,uuid,text)
security invoker;
alter function public.save_knowledge_synthesis(uuid,text,jsonb,jsonb,uuid,text)
security invoker;
