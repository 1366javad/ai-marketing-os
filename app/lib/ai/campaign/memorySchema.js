const RESEARCH_ARTIFACTS = Object.freeze({
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

function normalizeMemoryKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function resolveMemoryModule(value = {}) {
  return normalizeMemoryKey(value.module);
}

function resolveMemoryArtifact(value = {}) {
  const explicit = normalizeMemoryKey(value.artifact);
  return explicit ? normalizeArtifactForModule(value.module, explicit) : "";
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
      blog_draft: "blog_draft",
      email_draft: "email_draft",
    };

    return map[artifact] || "";
  }
  if (memoryModule === "creative" && artifact !== "image_asset") {
    return "creative_concept";
  }
  if (memoryModule === "ads") return "ad_copy";
  if (DIRECT_ARTIFACTS.has(artifact)) return artifact;
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
