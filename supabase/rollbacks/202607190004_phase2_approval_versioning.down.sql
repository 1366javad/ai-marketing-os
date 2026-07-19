drop function if exists public.revoke_knowledge_version(uuid,uuid,uuid,text,text);
drop function if exists public.resolve_knowledge_conflict(uuid,uuid,uuid,uuid,text,text);
drop function if exists public.reject_knowledge_candidate(uuid,uuid,uuid,text,text);
drop function if exists public.approve_knowledge_candidate(uuid,uuid,uuid,text,timestamptz,timestamptz,text);
drop function if exists public.can_review_business_knowledge(uuid,uuid,boolean);
grant insert, update, delete on public.business_knowledge_versions to authenticated;
grant insert, update, delete on public.knowledge_version_evidence to authenticated;
