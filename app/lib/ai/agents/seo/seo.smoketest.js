const assert = require("node:assert/strict");
const { runQualityChecks } = require("../../quality");
const { classifyOutputRisk } = require("../../quality/classifyOutputRisk");
const {
  buildSeoPrompt,
  normalizeSeoOutput,
  collectKeywords,
  toSeoMemoryEvent,
} = require("./index");

const normalized = normalizeSeoOutput(
  {
    provider: "test",
    text: JSON.stringify({
      type: "keyword_research",
      title: "AI Marketing OS keyword research",
      summary: "Campaign-specific keyword opportunities for AI marketing teams.",
      primaryKeywords: [
        { keyword: "ai marketing platform", volume: "High", difficulty: "Medium", intent: "Commercial" },
      ],
      secondaryKeywords: [
        { keyword: "marketing automation ai", volume: "Medium", difficulty: "Medium", intent: "Informational" },
      ],
    }),
  },
  { brief: { task: "keywords", offer: "AI Marketing OS" } },
);

assert.equal(normalized.type, "keyword_research");
assert.equal(normalized.primaryKeywords.length, 1);
assert.equal(collectKeywords(normalized).length >= 2, true);

const taskContracts = [
  {
    task: "clusters",
    payload: {
      type: "keyword_clusters",
      keywordClusters: [
        {
          cluster: "AI campaign planning",
          keywords: ["ai campaign planner"],
          intent: "Commercial",
          priority: "High",
        },
      ],
    },
    verify: (output) => output.keywordClusters.length === 1,
  },
  {
    task: "topics",
    payload: {
      type: "topic_clusters",
      topicClusters: [
        {
          pillarPage: "AI campaign planning",
          supportingArticles: ["How to create a campaign brief"],
          internalLinks: [
            {
              from: "How to create a campaign brief",
              to: "AI campaign planning",
              anchorText: "AI campaign planning",
            },
          ],
          ctas: ["Start planning your campaign."],
        },
      ],
    },
    verify: (output) =>
      output.topicClusters.length === 1 &&
      typeof output.topicClusters[0].internalLinks[0] === "object" &&
      output.topicClusters[0].ctas.length === 1,
  },
  {
    task: "strategy",
    payload: {
      type: "seo_strategy",
      strategy: {
        quickWins: ["Improve campaign landing page titles."],
        mediumTerm: ["Publish the campaign planning topic cluster."],
        longTerm: ["Build authority around AI marketing operations."],
        priorities: ["Commercial-intent campaign keywords."],
      },
    },
    verify: (output) =>
      Object.values(output.strategy).every((items) => items.length === 1),
  },
  {
    task: "meta",
    payload: {
      type: "meta_descriptions",
      metaDescriptions: [
        {
          page: "/campaign-planner",
          title: "AI Campaign Planner",
          metaDescription: "Plan research, SEO, content, and ads in one place.",
        },
      ],
    },
    verify: (output) => output.metaDescriptions.length === 1,
  },
  {
    task: "faq",
    payload: {
      type: "faqs",
      faqs: [
        {
          question: "What is an AI campaign planner?",
          answer: "A workspace for planning and generating campaign assets.",
          schemaOpportunity: "FAQPage",
        },
      ],
    },
    verify: (output) => output.faqs.length === 1,
  },
];

for (const contract of taskContracts) {
  const output = normalizeSeoOutput(
    {
      provider: "test",
      text: JSON.stringify({
        title: "SEO contract test",
        summary:
          "A campaign-specific SEO asset grounded in approved research memory.",
        ...contract.payload,
      }),
    },
    { brief: { task: contract.task, offer: "AI Marketing OS" } },
  );

  assert.equal(contract.verify(output), true, `${contract.task} normalization`);
}

const topLevelStrategy = normalizeSeoOutput(
  {
    provider: "pollinations",
    text: `{
      "type": "seo_strategy",
      "title": "QuestApply SEO Strategy",
      "summary": "A structured SEO roadmap for international graduate admissions in the United States and Canada.",
      "quickWins": ["Improve admissions landing page titles."],
      "mediumTerm": ["Publish graduate admissions topic clusters."],
      "longTerm": ["Build authority around international admissions."],
      "priorities": ["High-intent admissions keywords."],
    }`,
  },
  { brief: { task: "strategy", offer: "QuestApply" } },
);
assert.equal(topLevelStrategy.title, "QuestApply SEO Strategy");
assert.equal(topLevelStrategy.strategy.quickWins.length, 1);
assert.equal(topLevelStrategy.strategy.priorities.length, 1);

assert.throws(
  () =>
    normalizeSeoOutput(
      {
        provider: "pollinations",
        text: `{
          "type": "seo_strategy",
          "title": "QuestApply SEO Strategy",
          "summary": "This response was truncated before strategy fields`,
      },
      { brief: { task: "strategy", offer: "QuestApply" } },
    ),
  /invalid or incomplete JSON/,
);

assert.throws(
  () =>
    normalizeSeoOutput(
      {
        provider: "pollinations",
        text: `{
          "type": "seo_strategy",
          "title": "QuestApply SEO Strategy",
          "summary": "A valid JSON object without the required strategy arrays."
        }`,
      },
      { brief: { task: "strategy", offer: "QuestApply" } },
    ),
  /required structured fields/,
);

const executionPlan = {
  module: "seo",
  task: "keywords",
  riskLevel: "low",
  needsApproval: false,
};
const brief = {
  task: "keywords",
  offer: "AI Marketing OS",
  platforms: [],
  relevantEvents: [
    {
      module: "research",
      artifact: "audience_analysis",
      summary: "Buyers need faster campaign planning with fewer manual steps.",
    },
  ],
};
const prompt = buildSeoPrompt({ brief, executionPlan });
assert.match(prompt.userPrompt, /research\/audience_analysis/);
assert.match(prompt.userPrompt, /faster campaign planning/);
const quality = runQualityChecks(
  toSeoMemoryEvent(normalized, { brief, executionPlan }),
  executionPlan,
  brief,
);
assert.equal(quality.riskLevel, "low");
assert.equal(quality.approvalRequired, false);

const seoRiskFloors = {
  keyword_research: "low",
  keyword_cluster: "low",
  topic_cluster: "medium",
  seo_strategy: "high",
  meta_description: "medium",
  faq_generation: "medium",
};

for (const [artifact, expectedRisk] of Object.entries(seoRiskFloors)) {
  const risk = classifyOutputRisk(
    {
      eventType: "keyword_idea",
      artifact,
      suggestedRiskLevel: null,
    },
    executionPlan,
  );
  assert.equal(risk.riskLevel, expectedRisk, `${artifact} risk floor`);
  assert.equal(
    risk.approvalRequired,
    expectedRisk !== "low",
    `${artifact} approval requirement`,
  );
}
console.log("SEO Agent V2 smoketest passed");
