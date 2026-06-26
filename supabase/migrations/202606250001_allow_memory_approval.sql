alter table public.campaign_memory_events enable row level security;

drop policy if exists "campaign_memory_events_update_own_campaigns"
on public.campaign_memory_events;

create policy "campaign_memory_events_update_own_campaigns"
on public.campaign_memory_events
for update
to authenticated
using (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_memory_events.campaign_id
      and campaigns.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_memory_events.campaign_id
      and campaigns.user_id = auth.uid()
  )
);

