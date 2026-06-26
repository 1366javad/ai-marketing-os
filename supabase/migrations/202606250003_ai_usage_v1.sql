alter table public.ai_usage
add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

alter table public.ai_usage
add column if not exists campaign_name text;

alter table public.ai_usage
add column if not exists module text;

alter table public.ai_usage
add column if not exists artifact text;

alter table public.ai_usage
add column if not exists provider text;

alter table public.ai_usage
add column if not exists status text default 'completed';

alter table public.ai_usage
add column if not exists input_tokens integer default 0;

alter table public.ai_usage
add column if not exists output_tokens integer default 0;

alter table public.ai_usage
add column if not exists credits_used integer default 0;

alter table public.ai_usage
add column if not exists latency_ms integer default 0;

create index if not exists ai_usage_user_created_idx
on public.ai_usage (user_id, created_at desc);

create index if not exists ai_usage_user_module_provider_idx
on public.ai_usage (user_id, module, provider);

alter table public.ai_usage enable row level security;

drop policy if exists "Users can read their own usage" on public.ai_usage;
create policy "Users can read their own usage"
on public.ai_usage
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own usage" on public.ai_usage;
create policy "Users can insert their own usage"
on public.ai_usage
for insert
to authenticated
with check (auth.uid() = user_id);
