const assert = require("node:assert/strict");
const { buildBrief } = require("../brief-builder");
const { createKnowledgeService } = require("../knowledge");
const { MODULE_DOMAIN_ALLOWLISTS } = require("../knowledge/slicing/moduleDomainAllowlists");
const { buildResearchPrompt } = require("../agents/research/buildResearchPrompt");
const { buildSeoPrompt } = require("../agents/seo/buildSeoPrompt");
const { buildContentPrompt } = require("../agents/content/buildContentPrompt");
const { buildCreativePrompt } = require("../agents/creative/buildCreativePrompt");
const { buildAdsPrompt } = require("../agents/ads/buildAdsPrompt");
const { buildAnalyticsPrompt } = require("../agents/analytics/buildAnalyticsPrompt");
const { buildVideoPlanningPrompt } = require("../agents/video");
const {
  isKnowledgeRuntimeEnabled,
  retrieveRuntimeKnowledgeSlice,
} = require("./retrieveRuntimeKnowledgeSlice");

const BUSINESS_ID = "business-1";
const NOW = "2026-07-19T12:00:00.000Z";
const plans = Object.freeze({
  research: { module: "research", task: "market", mode: "campaign", campaignId: "campaign-1" },
  seo: { module: "seo", task: "keyword_research", mode: "campaign", campaignId: "campaign-1" },
  content: { module: "content", task: "blog_post", mode: "campaign", campaignId: "campaign-1" },
  creative: { module: "creative", task: "image_post", mode: "campaign", campaignId: "campaign-1" },
  ads: { module: "ads", task: "google_ads", mode: "campaign", campaignId: "campaign-1" },
  analytics: { module: "analytics", task: "evaluate_campaign", mode: "campaign", campaignId: "campaign-1" },
  video: { module: "video", task: "video_script", mode: "campaign", campaignId: "campaign-1" },
});
const promptBuilders = Object.freeze({
  research: ({ brief, executionPlan }) => buildResearchPrompt({ brief, executionPlan }),
  seo: ({ brief, executionPlan }) => buildSeoPrompt({ brief, executionPlan }),
  content: ({ brief, executionPlan }) => buildContentPrompt({ brief, executionPlan }),
  creative: ({ brief, executionPlan }) => buildCreativePrompt({ brief, executionPlan }),
  ads: ({ brief, executionPlan }) => buildAdsPrompt({ brief, executionPlan }),
  analytics: ({ brief, executionPlan }) => buildAnalyticsPrompt({ brief, executionPlan }),
  video: ({ brief }) => buildVideoPlanningPrompt({ brief, task: "video_script" }),
});

function row(id, domain, value) {
  return {
    id,
    business_id: BUSINESS_ID,
    identity_key: `identity-${id}`,
    domain,
    value,
    version: 1,
    status: "approved",
    confidence: 0.9,
    scope: { businessId: BUSINESS_ID },
    valid_from: null,
    valid_until: null,
    supersedes: null,
    approved_at: NOW,
  };
}

(async () => {
  const previousFlag = process.env.KNOWLEDGE_RUNTIME_ENABLED;
  delete process.env.KNOWLEDGE_RUNTIME_ENABLED;
  assert.equal(isKnowledgeRuntimeEnabled(), false);
  assert.equal(isKnowledgeRuntimeEnabled(true), true);
  let calls = 0;
  const disabled = await retrieveRuntimeKnowledgeSlice({
    executionPlan: plans.content,
    options: {
      enabled: false,
      businessId: BUSINESS_ID,
      service: { async getKnowledgeSlice() { calls += 1; } },
    },
  });
  assert.equal(calls, 0);
  assert.equal(disabled.knowledgeDiagnostics.reason, "rollout_disabled");

  const missingScope = await retrieveRuntimeKnowledgeSlice({
    executionPlan: plans.content,
    options: { enabled: true },
  });
  assert.equal(missingScope.knowledgeDiagnostics.reason, "business_scope_unavailable");

  const failure = await retrieveRuntimeKnowledgeSlice({
    executionPlan: plans.content,
    options: {
      enabled: true,
      businessId: BUSINESS_ID,
      service: { async getKnowledgeSlice() { throw new Error("temporary outage"); } },
    },
  });
  assert.equal(failure.knowledgeDiagnostics.status, "reduced");
  assert.equal(failure.knowledgeDiagnostics.reason, "retrieval_failed");

  for (const [runtimeModule, executionPlan] of Object.entries(plans)) {
    const allowedDomain = MODULE_DOMAIN_ALLOWLISTS[runtimeModule][0];
    let reads = 0;
    const persistence = {
      async loadKnowledgeSliceInputs() {
        reads += 1;
        return {
          versions: [
            row(`${runtimeModule}-allowed`, allowedDomain, `${runtimeModule} approved truth`),
            row(`${runtimeModule}-forbidden`, "validated_learning", `${runtimeModule} forbidden learning`),
          ],
          evidence: [{
            version_id: `${runtimeModule}-allowed`,
            source_id: `source-${runtimeModule}`,
          }],
          conflicts: [],
          unapprovedCount: 0,
        };
      },
    };
    const service = createKnowledgeService({ persistence, clock: () => new Date(NOW) });
    const integration = await retrieveRuntimeKnowledgeSlice({
      executionPlan,
      options: { enabled: true, businessId: BUSINESS_ID, service },
    });
    const campaignSlice = {
      contextVersion: 7,
      context: { offer: "Campaign offer" },
      relevantEvents: [{ id: "event-1", module: "research", artifact: "market_research", summary: "Campaign evidence" }],
    };
    const brief = buildBrief(
      "Create a campaign-specific output with approved context.",
      executionPlan,
      campaignSlice,
      integration.knowledgeSlice,
      integration.knowledgeDiagnostics,
    );
    const prompts = promptBuilders[runtimeModule]({ brief, executionPlan });
    assert.equal(reads, 1);
    assert(prompts.userPrompt.includes(`${runtimeModule} approved truth`));
    assert(!prompts.userPrompt.includes(`${runtimeModule} forbidden learning`));
    assert.equal(brief.campaignProvenance.sourceEventIds[0], "event-1");
    assert.equal(brief.knowledgeProvenance.knowledgeIds[0], `${runtimeModule}-allowed`);
    assert.equal(brief.knowledgeProvenance.sourceIds[0], `source-${runtimeModule}`);
    assert.notDeepEqual(brief.campaignProvenance, brief.knowledgeProvenance);
  }

  const empty = await retrieveRuntimeKnowledgeSlice({
    executionPlan: plans.content,
    options: {
      enabled: true,
      businessId: BUSINESS_ID,
      service: {
        async getKnowledgeSlice() {
          return {
            businessId: BUSINESS_ID,
            items: [],
            diagnostics: { truncated: false },
            generatedAt: NOW,
          };
        },
      },
    },
  });
  assert.equal(empty.knowledgeDiagnostics.reason, "no_visible_knowledge");
  assert.equal(empty.knowledgeDiagnostics.reduced, true);
  const emptyBrief = buildBrief(
    "Create an approved campaign output.",
    plans.content,
    null,
    empty.knowledgeSlice,
    empty.knowledgeDiagnostics,
  );
  const emptyPrompt = buildContentPrompt({ brief: emptyBrief, executionPlan: plans.content });
  assert(emptyPrompt.userPrompt.includes("No approved business knowledge is available"));
  assert(!emptyPrompt.userPrompt.includes("undefined"));

  if (previousFlag === undefined) delete process.env.KNOWLEDGE_RUNTIME_ENABLED;
  else process.env.KNOWLEDGE_RUNTIME_ENABLED = previousFlag;
  console.log("P2-F Knowledge Runtime integration smoketest passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
