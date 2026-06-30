-- Seed an active Pro subscription for local/Beta verification.
-- Replace the UUID below with the authenticated user's auth.users.id.
-- This uses the same subscriptions flow as production; no email lookup and no bypass.

with target_user as (
  select '<USER_ID>'::uuid as user_id
),
updated_subscription as (
  update public.subscriptions
  set
    plan = 'pro',
    status = 'active',
    started_at = now(),
    expires_at = now() + interval '30 days',
    monthly_credits = 3000,
    metadata = jsonb_build_object('source', 'manual_beta_seed'),
    updated_at = now()
  where user_id = (select user_id from target_user)
  returning id
)
insert into public.subscriptions (
  user_id,
  plan,
  status,
  started_at,
  expires_at,
  monthly_credits,
  metadata
)
select
  user_id,
  'pro',
  'active',
  now(),
  now() + interval '30 days',
  3000,
  jsonb_build_object('source', 'manual_beta_seed')
from target_user
where not exists (
  select 1
  from updated_subscription
);
