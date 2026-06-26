alter table public.campaign_memory_events
add column if not exists module text;

alter table public.campaign_memory_events
add column if not exists artifact text;

update public.campaign_memory_events
set module = coalesce(
  nullif(module, ''),
  case
    when type in (
      'research_insight',
      'market_research',
      'audience_analysis',
      'competitor_analysis',
      'trends_research',
      'pain_points_research',
      'opportunities_research'
    ) then 'research'
    when type in (
      'keyword_idea',
      'keyword_research',
      'keyword_cluster',
      'topic_cluster',
      'seo_strategy',
      'meta_description',
      'faq_generation'
    ) then 'seo'
    when type in ('blog_draft', 'email_draft') then 'content'
    when type in ('creative_concept', 'image_asset') then 'creative'
    when type = 'ad_copy' then 'ads'
    when type = 'campaign_learning' then 'analytics'
    when type in ('video_script', 'storyboard') then 'video'
    when type in ('retroactive_attach', 'context_change') then 'special'
    else null
  end
)
where module is null or module = '';

update public.campaign_memory_events
set artifact = coalesce(
  nullif(artifact, ''),
  case
    when module = 'research' then
      case coalesce(payload->>'type', task, type)
        when 'market' then 'market_research'
        when 'market_research' then 'market_research'
        when 'audience' then 'audience_analysis'
        when 'audience_research' then 'audience_analysis'
        when 'audience_analysis' then 'audience_analysis'
        when 'competitor' then 'competitor_analysis'
        when 'competitor_research' then 'competitor_analysis'
        when 'competitor_analysis' then 'competitor_analysis'
        when 'trend' then 'trends_research'
        when 'trends' then 'trends_research'
        when 'trend_research' then 'trends_research'
        when 'trends_research' then 'trends_research'
        when 'painpoints' then 'pain_points_research'
        when 'pain_points' then 'pain_points_research'
        when 'pain_points_research' then 'pain_points_research'
        when 'opportunity' then 'opportunities_research'
        when 'opportunities' then 'opportunities_research'
        when 'opportunities_research' then 'opportunities_research'
        else 'market_research'
      end
    when module = 'seo' then
      case coalesce(payload->>'type', task, type)
        when 'keyword' then 'keyword_research'
        when 'keywords' then 'keyword_research'
        when 'keyword_research' then 'keyword_research'
        when 'clusters' then 'keyword_cluster'
        when 'keyword_clusters' then 'keyword_cluster'
        when 'keyword_cluster' then 'keyword_cluster'
        when 'topics' then 'topic_cluster'
        when 'topic_clusters' then 'topic_cluster'
        when 'topic_cluster' then 'topic_cluster'
        when 'strategy' then 'seo_strategy'
        when 'seo_strategy' then 'seo_strategy'
        when 'meta' then 'meta_description'
        when 'meta_descriptions' then 'meta_description'
        when 'meta_description' then 'meta_description'
        when 'faq' then 'faq_generation'
        when 'faqs' then 'faq_generation'
        when 'faq_generation' then 'faq_generation'
        else 'keyword_research'
      end
    when module = 'content' then
      case
        when coalesce(payload->>'type', task, type) in ('email', 'newsletter', 'email_draft')
          then 'email_draft'
        else 'blog_draft'
      end
    when module = 'creative' then
      case when type = 'image_asset' then 'image_asset' else 'creative_concept' end
    when module = 'ads' then 'ad_copy'
    when module = 'analytics' then 'campaign_learning'
    when module = 'video' then coalesce(nullif(type, ''), nullif(task, ''))
    when module = 'special' then
      case
        when type in ('retroactive_attach', 'context_change') then type
        else null
      end
    else nullif(type, '')
  end
)
where artifact is null or artifact = '';

create index if not exists campaign_memory_events_campaign_module_artifact_approval_idx
on public.campaign_memory_events (
  campaign_id,
  module,
  artifact,
  approval_status
);
