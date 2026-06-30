create extension if not exists pgcrypto;

create table if not exists public.plans (
  id text primary key,
  name text not null,
  daily_credits integer not null default 0,
  monthly_credits integer not null default 0,
  max_campaigns integer,
  export_enabled boolean not null default false,
  regenerate_enabled boolean not null default false,
  regenerate_daily_limit integer,
  video_enabled boolean not null default false,
  priority_ai boolean not null default false,
  feature_matrix jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plans (
  id,
  name,
  daily_credits,
  monthly_credits,
  max_campaigns,
  export_enabled,
  regenerate_enabled,
  regenerate_daily_limit,
  video_enabled,
  priority_ai,
  feature_matrix
)
values
  (
    'free',
    'Free',
    100,
    100,
    1,
    false,
    false,
    0,
    false,
    false,
    '{
      "research": ["market", "audience", "competitor"],
      "seo": ["keywords", "strategy"],
      "content": ["blog", "blog_post"],
      "creative": ["image_post"],
      "ads": ["meta_ads", "instagram_ad"],
      "video": [],
      "export": false,
      "regenerate": false
    }'::jsonb
  ),
  (
    'pro',
    'Pro',
    5000,
    3000,
    null,
    true,
    true,
    null,
    true,
    true,
    '{
      "research": ["*"],
      "seo": ["*"],
      "content": ["*"],
      "creative": ["*"],
      "ads": ["*"],
      "video": ["*"],
      "export": true,
      "regenerate": true
    }'::jsonb
  ),
  (
    'pro_plus',
    'Pro+',
    15000,
    10000,
    null,
    true,
    true,
    null,
    true,
    true,
    '{
      "research": ["*"],
      "seo": ["*"],
      "content": ["*"],
      "creative": ["*"],
      "ads": ["*"],
      "video": ["*"],
      "export": true,
      "regenerate": true
    }'::jsonb
  )
on conflict (id) do update set
  name = excluded.name,
  daily_credits = excluded.daily_credits,
  monthly_credits = excluded.monthly_credits,
  max_campaigns = excluded.max_campaigns,
  export_enabled = excluded.export_enabled,
  regenerate_enabled = excluded.regenerate_enabled,
  regenerate_daily_limit = excluded.regenerate_daily_limit,
  video_enabled = excluded.video_enabled,
  priority_ai = excluded.priority_ai,
  feature_matrix = excluded.feature_matrix,
  updated_at = now();

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null references public.plans(id),
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  monthly_credits integer not null default 0,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_status_idx
on public.subscriptions(user_id, status, expires_at desc);

with ranked_user_subscriptions as (
  select
    id,
    row_number() over (
      partition by user_id
      order by expires_at desc, updated_at desc, created_at desc
    ) as subscription_rank
  from public.subscriptions
)
delete from public.subscriptions
where id in (
  select id
  from ranked_user_subscriptions
  where subscription_rank > 1
);

drop index if exists subscriptions_one_active_per_user_idx;
create unique index if not exists subscriptions_one_per_user_idx
on public.subscriptions(user_id);

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Plans are readable by authenticated users" on public.plans;
create policy "Plans are readable by authenticated users"
on public.plans
for select
to authenticated
using (true);

drop policy if exists "Users can read their own subscriptions" on public.subscriptions;
create policy "Users can read their own subscriptions"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);
