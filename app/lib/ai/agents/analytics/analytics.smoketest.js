const assert = require("node:assert/strict");
const {
  buildAnalyticsPrompt,
  normalizeAnalyticsOutput,
  toAnalyticsMemoryEvent,
} = require("./index");

const brief = {
  campaignName: "QuestApply Launch",
  task: "evaluate_campaign",
  context: {
    campaignId: "camp_123",
    campaignName: "QuestApply Launch",
    contextVersion: 3,
    industry: "EdTech",
    goal: "Lead generation",
    audience: "International students",
    status: "active",
  },
  relevantEvents: [
    {
      id: "evt_research",
      module: "research",
      artifact: "audience_analysis",
      approvalStatus: "approved",
      summary: "Visa uncertainty is a primary audience concern.",
      payload: {},
    },
    {
      id: "evt_ads",
      module: "ads",
      artifact: "ad_copy",
      approvalStatus: "approved",
      summary: "Approved application-planning campaign.",
      payload: {},
    },
  ],
};
const executionPlan = {
  module: "analytics",
  task: "evaluate_campaign",
  riskLevel: "low",
  needsApproval: false,
};
const prompts = buildAnalyticsPrompt({ brief, executionPlan });

assert.match(prompts.userPrompt, /QuestApply Launch/);
assert.match(prompts.userPrompt, /research/);
assert.match(prompts.systemPrompt, /observational campaign learning/i);

const output = normalizeAnalyticsOutput(
  {
    provider: "smoke",
    text: JSON.stringify({
      title: "QuestApply campaign learning",
      summary: "Approved campaign artifacts consistently address application uncertainty.",
      insight:
        "Approved Research and Ads artifacts consistently address application uncertainty, indicating that clarity should remain the campaign's primary evidence-based message while performance data is still unavailable.",
      findings: [
        "Audience research identifies visa uncertainty.",
        "Approved ad copy translates that concern into application-planning language.",
      ],
      recommendations: ["Continue testing clarity-led messaging."],
      risks: ["No performance metrics were supplied."],
      evidence: [
        {
          module: "research",
          artifact: "audience_analysis",
          eventId: "evt_research",
          observation: "Visa uncertainty is a primary concern.",
        },
      ],
      limitations: ["No impression, click, or conversion data was supplied."],
      metadata: { confidence: 0.82 },
    }),
  },
  { brief },
);

assert.ok(output.insight.length >= 80);
assert.equal(output.evidence[0].artifact, "audience_analysis");

const memoryEvent = toAnalyticsMemoryEvent(output, { brief, executionPlan });
assert.equal(memoryEvent.module, "analytics");
assert.equal(memoryEvent.artifact, "campaign_learning");
assert.equal(memoryEvent.suggestedRiskLevel, "low");
assert.ok(memoryEvent.payload.insight.length >= 80);

console.log("Analytics Agent V2 smoketest passed");
