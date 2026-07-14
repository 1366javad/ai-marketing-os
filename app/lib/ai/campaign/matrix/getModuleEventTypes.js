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

const SEO_TASK_ALIASES = Object.freeze({
  keyword: "keyword_research",
  keywords: "keyword_research",
  keyword_research: "keyword_research",
  cluster: "keyword_cluster",
  clusters: "keyword_cluster",
  keyword_clusters: "keyword_cluster",
  keyword_cluster: "keyword_cluster",
  topic: "topic_cluster",
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

const SEO_PREDECESSOR_ARTIFACTS = Object.freeze({
  keyword_research: Object.freeze([]),
  keyword_cluster: Object.freeze(["keyword_research"]),
  topic_cluster: Object.freeze(["keyword_research", "keyword_cluster"]),
  seo_strategy: Object.freeze([
    "keyword_research",
    "keyword_cluster",
    "topic_cluster",
  ]),
  meta_description: Object.freeze([
    "keyword_research",
    "keyword_cluster",
    "topic_cluster",
    "seo_strategy",
  ]),
  faq_generation: Object.freeze([
    "keyword_research",
    "keyword_cluster",
    "topic_cluster",
    "seo_strategy",
  ]),
});

const VALID_MODULES = Object.freeze(
  Object.keys(MODULE_ARTIFACT_SELECTORS),
);

function getModuleArtifactSelectors(module, task = "") {
  if (!VALID_MODULES.includes(module)) {
    throw new Error(
      `getModuleArtifactSelectors: unknown module "${module}". ` +
        `Valid modules are: ${VALID_MODULES.join(", ")}.`,
    );
  }

  if (module !== "seo") return MODULE_ARTIFACT_SELECTORS[module];

  return [
    ...MODULE_ARTIFACT_SELECTORS.seo,
    ...getSeoPredecessorArtifacts(task).map((name) => artifact("seo", name)),
  ];
}

function getModuleEventTypes(module, task = "") {
  const selectors = getModuleArtifactSelectors(module, task);
  return selectors === null ? null : selectors.map((item) => item.artifact);
}

function normalizeSeoDependencyTask(task) {
  const key = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return SEO_TASK_ALIASES[key] || "keyword_research";
}

function getSeoPredecessorArtifacts(task) {
  return SEO_PREDECESSOR_ARTIFACTS[normalizeSeoDependencyTask(task)];
}

module.exports = {
  getModuleArtifactSelectors,
  getModuleEventTypes,
  MODULE_ARTIFACT_SELECTORS,
  SEO_PREDECESSOR_ARTIFACTS,
  getSeoPredecessorArtifacts,
  normalizeSeoDependencyTask,
  VALID_MODULES,
};
