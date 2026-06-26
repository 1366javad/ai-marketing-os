const { getCampaignContextSlice } = require("./getCampaignContextSlice");

const MOCK_CONTEXT = {
  campaignId: "camp_123",
  campaignName: "QuestApply Launch",
  contextVersion: 3,
  industry: "EdTech",
  offer: "1:1 application coaching",
  goal: "Lead generation",
  audience: "International students 18-24",
  positioning: "The coach that actually answers your questions",
  valueProposition: "Personal guidance, not generic templates",
  tone: "Encouraging, plain-language",
  platforms: ["Instagram", "TikTok"],
  competitors: ["Shorelight", "Studocu"],
  status: "active",
};

const MOCK_EVENTS = [
  event("evt_market", "research", "market_research", "auto_saved"),
  event("evt_audience", "research", "audience_analysis", "approved"),
  event("evt_pain", "research", "pain_points_research", "approved"),
  event("evt_keyword", "seo", "keyword_research", "auto_saved"),
  event("evt_topic", "seo", "topic_cluster", "approved"),
  event("evt_blog", "content", "blog_draft", "approved"),
  event("evt_blog_pending", "content", "blog_draft", "pending"),
  event("evt_creative", "creative", "creative_concept", "approved"),
];

function event(id, module, artifact, approvalStatus) {
  return {
    id,
    campaignId: "camp_123",
    module,
    artifact,
    type: artifact,
    approvalStatus,
    confidence: 0.8,
    riskLevel: approvalStatus === "auto_saved" ? "low" : "medium",
    task: artifact,
    summary: `${artifact} summary`,
    payload: {},
    supersedes: null,
    createdAt: id,
    createdBy: "test",
  };
}

const options = {
  contextDbAdapter: async () => MOCK_CONTEXT,
  eventsDbAdapter: async () => MOCK_EVENTS,
};

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL: ${label}`);
  }
}

async function run() {
  const seo = await getCampaignContextSlice(
    "camp_123",
    "seo",
    "keyword research",
    options,
  );
  assert(
    "SEO reads approved research artifacts",
    seo.relevantEvents.some((item) => item.artifact === "market_research") &&
      seo.relevantEvents.some((item) => item.artifact === "audience_analysis"),
  );
  assert(
    "SEO does not read its own keyword artifact",
    !seo.relevantEvents.some((item) => item.artifact === "keyword_research"),
  );

  const content = await getCampaignContextSlice(
    "camp_123",
    "content",
    "blog draft",
    options,
  );
  assert(
    "Content reads approved research and SEO artifacts",
    content.relevantEvents.some(
      (item) => item.artifact === "pain_points_research",
    ) &&
      content.relevantEvents.some(
        (item) => item.artifact === "keyword_research",
      ),
  );

  const creative = await getCampaignContextSlice(
    "camp_123",
    "creative",
    "carousel",
    options,
  );
  assert(
    "Creative reads approved blog draft",
    creative.relevantEvents.some((item) => item.id === "evt_blog"),
  );
  assert(
    "Creative excludes pending blog draft",
    !creative.relevantEvents.some((item) => item.id === "evt_blog_pending"),
  );

  const ads = await getCampaignContextSlice(
    "camp_123",
    "ads",
    "google ads",
    options,
  );
  assert(
    "Ads reads approved creative concept",
    ads.relevantEvents.some((item) => item.artifact === "creative_concept"),
  );
  assert(
    "Ads does not read blog drafts",
    !ads.relevantEvents.some((item) => item.artifact === "blog_draft"),
  );

  const review = await getCampaignContextSlice(
    "camp_123",
    "creative",
    "review",
    { ...options, includePending: true },
  );
  assert(
    "Review mode includes pending in-scope artifact",
    review.relevantEvents.some((item) => item.id === "evt_blog_pending"),
  );

  const analytics = await getCampaignContextSlice(
    "camp_123",
    "analytics",
    "performance",
    options,
  );
  assert(
    "Analytics sees all approved or auto-saved artifacts",
    analytics.relevantEvents.length === 7,
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
