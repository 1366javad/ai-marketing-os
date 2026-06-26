const { runTextProvider } = require("../../providers");
const { buildSeoPrompt } = require("./buildSeoPrompt");
const { normalizeSeoOutput, collectKeywords, stringifySeoItem } = require("./normalizeSeoOutput");
const {
  normalizeArtifactForModule,
} = require("../../campaign/memorySchema");

async function runSeoAgent({ brief, executionPlan }) {
  if (!brief) {
    throw new Error("runSeoAgent: brief is required.");
  }
  if (!executionPlan) {
    throw new Error("runSeoAgent: executionPlan is required.");
  }

  const { systemPrompt, userPrompt } = buildSeoPrompt({
    brief,
    executionPlan,
  });

  const providerResult = await runTextProvider({
    systemPrompt,
    userPrompt,
    temperature: 0.4,
    maxTokens: 2200,
  });

  return normalizeSeoOutput(providerResult, { brief, executionPlan });
}

function toSeoMemoryEvent(seoOutput, { brief, executionPlan }) {
  const artifact = normalizeArtifactForModule("seo", seoOutput.type);

  return {
    eventType: "keyword_idea",
    module: "seo",
    artifact,
    summary: seoOutput.summary,
    payload: {
      ...seoOutput,
      task: brief?.task || executionPlan?.task || "seo",
      keywords: collectKeywords(seoOutput),
      confidence: seoOutput.metadata?.confidence || 0,
      provider: seoOutput.metadata?.provider || "unknown",
      generatedAt: seoOutput.metadata?.generatedAt || "",
    },
    suggestedRiskLevel: null,
  };
}

function formatSeoMarkdown(seoOutput) {
  const lines = [
    `# ${seoOutput.title}`,
    "",
    seoOutput.summary,
    "",
    ...formatObjectList("Primary Keywords", seoOutput.primaryKeywords),
    ...formatObjectList("Secondary Keywords", seoOutput.secondaryKeywords),
    ...formatObjectList("Keyword Clusters", seoOutput.keywordClusters),
    ...formatObjectList("Topic Clusters", seoOutput.topicClusters),
    ...formatStrategy(seoOutput.strategy),
    ...formatObjectList("Meta Descriptions", seoOutput.metaDescriptions),
    ...formatObjectList("FAQs", seoOutput.faqs),
  ];

  return lines.join("\n").trim();
}

function formatObjectList(title, items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  return [
    `## ${title}`,
    ...items.map((item) => `- ${stringifySeoItem(item)}`),
    "",
  ];
}

function formatStrategy(strategy = {}) {
  const sections = [
    ["Quick Wins", strategy.quickWins],
    ["Medium Term", strategy.mediumTerm],
    ["Long Term", strategy.longTerm],
    ["Priorities", strategy.priorities],
  ];

  return sections.flatMap(([title, items]) =>
    Array.isArray(items) && items.length
      ? [`## ${title}`, ...items.map((item) => `- ${item}`), ""]
      : [],
  );
}

module.exports = {
  runSeoAgent,
  buildSeoPrompt,
  toSeoMemoryEvent,
  formatSeoMarkdown,
  normalizeSeoOutput,
  collectKeywords,
};
