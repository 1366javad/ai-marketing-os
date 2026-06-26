alter table public.campaigns
add column if not exists campaign_plan jsonb not null default '{}'::jsonb;

comment on column public.campaigns.campaign_plan is
'Campaign-owned execution plan containing starter provenance, channels, success metrics, and recommended workflow.';

