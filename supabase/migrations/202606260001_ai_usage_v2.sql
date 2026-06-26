alter table public.ai_usage
add column if not exists run_id text;

alter table public.ai_usage
add column if not exists request_type text default 'agent_generation';

alter table public.ai_usage
add column if not exists total_tokens integer;

alter table public.ai_usage
add column if not exists provider_reported_tokens boolean default false;

alter table public.ai_usage
add column if not exists source text default 'agent_v2';

alter table public.ai_usage
add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists ai_usage_user_source_created_idx
on public.ai_usage (user_id, source, created_at desc);

create index if not exists ai_usage_campaign_module_artifact_idx
on public.ai_usage (campaign_id, module, artifact);

create index if not exists ai_usage_run_id_idx
on public.ai_usage (run_id);
