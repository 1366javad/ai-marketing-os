create extension if not exists pgcrypto;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
add column if not exists plan text,
add column if not exists started_at timestamptz,
add column if not exists expires_at timestamptz,
add column if not exists monthly_credits integer;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'plan_id'
  ) then
    execute 'update public.subscriptions set plan = plan_id where plan is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'current_period_start'
  ) then
    execute 'update public.subscriptions set started_at = current_period_start where started_at is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'current_period_end'
  ) then
    execute 'update public.subscriptions set expires_at = current_period_end where expires_at is null';
  end if;
end $$;

update public.subscriptions
set
  plan = coalesce(plan, 'free'),
  started_at = coalesce(started_at, created_at, now()),
  expires_at = coalesce(expires_at, now()),
  monthly_credits = coalesce(monthly_credits, 0);

alter table public.subscriptions
alter column plan set not null,
alter column started_at set not null,
alter column expires_at set not null,
alter column monthly_credits set not null,
alter column monthly_credits set default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_plan_fkey'
  ) then
    alter table public.subscriptions
    add constraint subscriptions_plan_fkey
    foreign key (plan) references public.plans(id);
  end if;
end $$;

create index if not exists subscriptions_user_status_expires_idx
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

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their own subscriptions" on public.subscriptions;
create policy "Users can read their own subscriptions"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);
