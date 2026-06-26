const RESEARCH_ARTIFACTS = Object.freeze({
  research_insight: "market_research",
  market: "market_research",
  market_research: "market_research",
  audience: "audience_analysis",
  audience_research: "audience_analysis",
  audience_analysis: "audience_analysis",
  competitor: "competitor_analysis",
  competitors: "competitor_analysis",
  competitor_research: "competitor_analysis",
  competitor_analysis: "competitor_analysis",
  trend: "trends_research",
  trends: "trends_research",
  trend_research: "trends_research",
  trends_research: "trends_research",
  painpoint: "pain_points_research",
  painpoints: "pain_points_research",
  pain_points: "pain_points_research",
  pain_points_research: "pain_points_research",
  opportunity: "opportunities_research",
  opportunities: "opportunities_research",
  opportunities_research: "opportunities_research",
});

const SEO_ARTIFACTS = Object.freeze({
  keyword_idea: "keyword_research",
  keyword: "keyword_research",
  keywords: "keyword_research",
  keyword_research: "keyword_research",
  clusters: "keyword_cluster",
  keyword_clusters: "keyword_cluster",
  keyword_cluster: "keyword_cluster",
  topics: "topic_cluster",
  topic_clusters: "topic_cluster",
  topic_cluster: "topic_cluster",
  strategy: "seo_strategy",
  seo_strategy: "seo_strategy",
  meta: "meta_description",
  metas: "meta_description",
  meta_descriptions: "meta_description",
  meta_description: "meta_description",
  faq: "faq_generation",
  faqs: "faq_generation",
  faq_generation: "faq_generation",
});

const DIRECT_ARTIFACTS = new Set([
  "blog_draft",
  "email_draft",
  "creative_concept",
  "image_asset",
  "ad_copy",
  "campaign_learning",
  "retroactive_attach",
  "context_change",
  "video_script",
  "storyboard",
]);

const LEGACY_MODULE_BY_TYPE = Object.freeze({
  research_insight: "research",
  keyword_idea: "seo",
  blog_draft: "content",
  email_draft: "content",
  creative_concept: "creative",
  image_asset: "creative",
  ad_copy: "ads",
  campaign_learning: "analytics",
  video_script: "video",
  storyboard: "video",
  retroactive_attach: "special",
  context_change: "special",
});

function normalizeMemoryKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function resolveMemoryModule(value = {}) {
  const explicit = normalizeMemoryKey(value.module);
  if (explicit) return explicit;

  const legacyType = normalizeMemoryKey(value.type || value.eventType);
  return LEGACY_MODULE_BY_TYPE[legacyType] || "";
}

function resolveMemoryArtifact(value = {}) {
  const explicit = normalizeMemoryKey(value.artifact);
  const memoryModule = resolveMemoryModule(value);
  const payload = value.payload || value.metadata?.memoryEvent?.payload || {};

  if (memoryModule === "content" && ["blog_draft", "email_draft"].includes(explicit)) {
    const specificContentArtifact = normalizeArtifactForModule(
      memoryModule,
      normalizeMemoryKey(payload.type || payload.task || value.task),
    );
    if (specificContentArtifact) return specificContentArtifact;
  }

  if (explicit) return normalizeArtifactForModule(value.module, explicit);

  const candidates = [
    payload.type,
    payload.task,
    value.task,
    value.type,
    value.eventType,
  ].map(normalizeMemoryKey);

  for (const candidate of candidates) {
    const artifact = normalizeArtifactForModule(memoryModule, candidate);
    if (artifact) return artifact;
  }

  return "";
}

function normalizeArtifactForModule(moduleValue, artifactValue) {
  const memoryModule = normalizeMemoryKey(moduleValue);
  const artifact = normalizeMemoryKey(artifactValue);

  if (!artifact) return "";
  if (memoryModule === "research") {
    return RESEARCH_ARTIFACTS[artifact] || "";
  }
  if (memoryModule === "seo") {
    return SEO_ARTIFACTS[artifact] || "";
  }
  if (memoryModule === "content") {
    const map = {
      blog: "blog_post",
      blog_post: "blog_post",
      blog_draft: "blog_post",
      email: "email",
      email_draft: "email",
      newsletter: "newsletter",
      landing: "landing_page",
      landing_page: "landing_page",
      case_study: "case_study",
      linkedin: "linkedin_post",
      linkedin_post: "linkedin_post",
      instagram: "instagram_caption",
      instagram_caption: "instagram_caption",
    };

    return map[artifact] || "";
  }
  if (memoryModule === "creative" && artifact !== "image_asset") {
    return "creative_concept";
  }
  if (memoryModule === "ads") return "ad_copy";
  if (DIRECT_ARTIFACTS.has(artifact)) return artifact;
  if (artifact === "research_insight") return RESEARCH_ARTIFACTS[artifact] || "";
  if (artifact === "keyword_idea") return SEO_ARTIFACTS[artifact] || "";

  return artifact;
}

function canonicalizeMemoryEvent(row = {}) {
  const memoryModule = resolveMemoryModule(row);
  const artifact = resolveMemoryArtifact({ ...row, module: memoryModule });

  return {
    ...row,
    module: memoryModule,
    artifact,
    type: artifact || normalizeMemoryKey(row.type),
  };
}

function matchesArtifactSelectors(event, selectors) {
  if (selectors === null) return true;
  if (!Array.isArray(selectors) || selectors.length === 0) return false;

  const canonical = canonicalizeMemoryEvent(event);
  return selectors.some(
    (selector) =>
      canonical.module === selector.module &&
      canonical.artifact === selector.artifact,
  );
}

function artifact(module, name) {
  return Object.freeze({ module, artifact: name });
}

module.exports = {
  RESEARCH_ARTIFACTS,
  SEO_ARTIFACTS,
  artifact,
  canonicalizeMemoryEvent,
  matchesArtifactSelectors,
  normalizeArtifactForModule,
  normalizeMemoryKey,
  resolveMemoryArtifact,
  resolveMemoryModule,
};
