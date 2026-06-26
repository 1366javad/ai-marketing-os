const { artifact } = require("../memorySchema");

const RESEARCH_FOUNDATION = Object.freeze([
  artifact("research", "market_research"),
  artifact("research", "audience_analysis"),
  artifact("research", "competitor_analysis"),
]);

const MODULE_ARTIFACT_SELECTORS = Object.freeze({
  research: [],
  seo: [
    ...RESEARCH_FOUNDATION,
    artifact("research", "trends_research"),
    artifact("research", "opportunities_research"),
  ],
  content: [
    ...RESEARCH_FOUNDATION,
    artifact("research", "trends_research"),
    artifact("research", "pain_points_research"),
    artifact("research", "opportunities_research"),
    artifact("seo", "keyword_research"),
    artifact("seo", "keyword_cluster"),
    artifact("seo", "topic_cluster"),
    artifact("seo", "seo_strategy"),
    artifact("seo", "faq_generation"),
  ],
  creative: [
    ...RESEARCH_FOUNDATION,
    artifact("research", "trends_research"),
    artifact("research", "pain_points_research"),
    artifact("seo", "topic_cluster"),
    artifact("seo", "seo_strategy"),
    artifact("content", "blog_draft"),
  ],
  ads: [
    ...RESEARCH_FOUNDATION,
    artifact("research", "pain_points_research"),
    artifact("seo", "seo_strategy"),
    artifact("creative", "creative_concept"),
    artifact("creative", "image_asset"),
  ],
  video: [
    artifact("content", "blog_draft"),
    artifact("content", "email_draft"),
    artifact("creative", "creative_concept"),
    artifact("creative", "image_asset"),
  ],
  analytics: null,
});

const VALID_MODULES = Object.freeze(
  Object.keys(MODULE_ARTIFACT_SELECTORS),
);

function getModuleArtifactSelectors(module) {
  if (!VALID_MODULES.includes(module)) {
    throw new Error(
      `getModuleArtifactSelectors: unknown module "${module}". ` +
        `Valid modules are: ${VALID_MODULES.join(", ")}.`,
    );
  }

  return MODULE_ARTIFACT_SELECTORS[module];
}

function getModuleEventTypes(module) {
  const selectors = getModuleArtifactSelectors(module);
  return selectors === null ? null : selectors.map((item) => item.artifact);
}

module.exports = {
  getModuleArtifactSelectors,
  getModuleEventTypes,
  MODULE_ARTIFACT_SELECTORS,
  VALID_MODULES,
};

