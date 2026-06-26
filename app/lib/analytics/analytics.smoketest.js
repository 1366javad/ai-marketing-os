const assert = require("node:assert/strict");
const { buildCampaignIntelligence } = require("./engine");

const campaign = {
  id: "campaign-1",
  name: "QuestApply Launch",
  product_name: "QuestApply",
  goal: "Generate qualified applicants",
  target_audience: "International graduate applicants",
  industry: "Education",
  status: "active",
  campaign_plan: {
    recommendedWorkflow: [
      { module: "research", task: "market", label: "Market Research" },
      { module: "seo", task: "keywords", label: "Keyword Research" },
      { module: "content", task: "blog", label: "Blog Post" },
      { module: "creative", task: "image_post", label: "Image Post" },
      { module: "ads", task: "google_ads", label: "Google Ads" },
      { module: "ads", task: "meta_ads", label: "Meta Ads" },
    ],
  },
};

const intelligence = buildCampaignIntelligence({
  campaign,
  memoryEvents: [
    event("research", "market_research", "market", "auto_saved"),
    event("seo", "keyword_research", "keywords", "auto_saved"),
    event("content", "blog_draft", "blog", "approved"),
    event("creative", "creative_concept", "image_post", "pending"),
    event("ads", "ad_copy", "google_ads", "approved"),
  ],
  outputs: [],
  assets: [],
});

assert.equal(intelligence.nextAction.type, "approve");
assert.equal(intelligence.nextAction.title, "Review Image Post");
assert.equal(
  intelligence.workflowProgress.find((step) => step.task === "google_ads")
    .status,
  "complete",
);
assert.equal(
  intelligence.workflowProgress.find((step) => step.task === "meta_ads")
    .status,
  "missing",
);
assert.equal(intelligence.metrics.contextCompleteness, 100);
assert.equal(intelligence.metrics.workflowCompletion, 67);
assert.equal(intelligence.metrics.moduleReadiness, 60);
assert.equal(
  intelligence.explainability.evidence.length,
  campaign.campaign_plan.recommendedWorkflow.length,
);
assert.equal(intelligence.risksAndGaps.some((item) => item.title.includes("Meta Ads")), true);

console.log("Analytics V1 smoketest passed");

function event(module, artifact, task, approvalStatus) {
  return {
    id: `${module}-${task}`,
    module,
    artifact,
    task,
    approval_status: approvalStatus,
    risk_level: module === "ads" ? "high" : "medium",
    confidence: 0.8,
    payload: { title: `${module} ${task}`, provider: "test" },
    created_at: new Date().toISOString(),
  };
}
