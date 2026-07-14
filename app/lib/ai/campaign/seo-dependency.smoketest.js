const assert = require("node:assert/strict");
const {
  getCampaignContextSlice,
} = require("./getCampaignContextSlice");

const campaignId = "seo_dependency_test";
const context = {
  campaignId,
  campaignName: "SEO Dependency Test",
  contextVersion: 4,
  industry: "SaaS",
  offer: "Marketing OS",
  goal: "Lead generation",
  audience: "B2B teams",
  positioning: "Marketing brain",
  valueProposition: "Shared intelligence",
  tone: "Professional",
  platforms: ["Google"],
  competitors: [],
  status: "active",
};

function event(id, artifact, approvalStatus = "auto_saved", options = {}) {
  return {
    id,
    campaignId,
    module: "seo",
    artifact,
    type: artifact,
    approvalStatus,
    confidence: 0.9,
    riskLevel: artifact === "seo_strategy" ? "high" : "low",
    task: artifact,
    summary: `${artifact} ${id}`,
    payload: {},
    supersedes: options.supersedes || null,
    createdAt: options.createdAt || `2026-07-14T00:00:${options.second || "00"}Z`,
    createdBy: "test",
  };
}

const events = [
  event("keyword_old", "keyword_research", "auto_saved", { second: "01" }),
  event("keyword_new", "keyword_research", "auto_saved", {
    supersedes: "keyword_old",
    second: "02",
  }),
  event("keyword_extra_history", "keyword_research", "auto_saved", {
    second: "00",
  }),
  event("cluster_visible", "keyword_cluster", "approved", { second: "03" }),
  event("cluster_pending", "keyword_cluster", "pending", { second: "04" }),
  event("topic_visible", "topic_cluster", "approved", { second: "05" }),
  event("topic_failed", "topic_cluster", "failed", { second: "06" }),
  event("strategy_visible", "seo_strategy", "approved", { second: "07" }),
  event("strategy_rejected", "seo_strategy", "rejected", { second: "08" }),
  event("meta_visible", "meta_description", "approved", { second: "09" }),
  event("faq_visible", "faq_generation", "approved", { second: "10" }),
];

async function slice(task, sourceEvents = events) {
  return getCampaignContextSlice(campaignId, "seo", task, {
    includePending: false,
    contextDbAdapter: async () => context,
    eventsDbAdapter: async () => sourceEvents,
  });
}

function seoArtifacts(result) {
  return result.relevantEvents
    .filter((item) => item.module === "seo")
    .map((item) => item.artifact)
    .sort();
}

async function run() {
  assert.deepEqual(seoArtifacts(await slice("keywords")), []);
  assert.deepEqual(seoArtifacts(await slice("clusters")), ["keyword_research"]);
  assert.deepEqual(seoArtifacts(await slice("topics")), [
    "keyword_cluster",
    "keyword_research",
  ]);
  assert.deepEqual(seoArtifacts(await slice("strategy")), [
    "keyword_cluster",
    "keyword_research",
    "topic_cluster",
  ]);
  assert.deepEqual(seoArtifacts(await slice("meta")), [
    "keyword_cluster",
    "keyword_research",
    "seo_strategy",
    "topic_cluster",
  ]);
  assert.deepEqual(seoArtifacts(await slice("faq")), [
    "keyword_cluster",
    "keyword_research",
    "seo_strategy",
    "topic_cluster",
  ]);

  const topic = await slice("topics");
  assert.equal(topic.relevantEvents.some((item) => item.id === "cluster_pending"), false);
  assert.equal(topic.relevantEvents.some((item) => item.id === "topic_failed"), false);
  assert.equal(topic.relevantEvents.some((item) => item.id === "strategy_rejected"), false);

  const clusters = await slice("clusters");
  assert.equal(clusters.relevantEvents.some((item) => item.id === "keyword_old"), false);
  assert.equal(clusters.relevantEvents.some((item) => item.id === "keyword_new"), true);
  assert.equal(
    clusters.relevantEvents.filter(
      (item) => item.module === "seo" && item.artifact === "keyword_research",
    ).length,
    1,
  );

  assert.equal((await slice("meta")).relevantEvents.some((item) => item.artifact === "faq_generation"), false);
  assert.equal((await slice("faq")).relevantEvents.some((item) => item.artifact === "meta_description"), false);

  const missing = await slice("strategy", []);
  assert.deepEqual(missing.relevantEvents, []);
  assert.deepEqual(missing.dependencyDiagnostics.missingPredecessors, [
    "keyword_research",
    "keyword_cluster",
    "topic_cluster",
  ]);
  assert.equal(missing.dependencyDiagnostics.reducedContext, true);

  console.log("PASS: progressive predecessor visibility for all SEO tasks");
  console.log("PASS: pending, failed, rejected, and superseded events are invisible");
  console.log("PASS: later-stage artifacts never flow backward");
  console.log("PASS: meta_description and faq_generation remain parallel");
  console.log("PASS: history is bounded to one visible event per artifact");
  console.log("PASS: missing optional predecessors produce diagnostics without blocking");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
