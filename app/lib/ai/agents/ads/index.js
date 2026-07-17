const { runTextProvider } = require("../../providers");
const { buildAdsPrompt } = require("./buildAdsPrompt");
const {
  normalizeAdsOutput,
  stringifyAdsItem,
} = require("./normalizeAdsOutput");

async function runAdsAgent({ brief, executionPlan }) {
  if (!brief) throw new Error("runAdsAgent: brief is required.");
  if (!executionPlan) {
    throw new Error("runAdsAgent: executionPlan is required.");
  }

  const { systemPrompt, userPrompt } = buildAdsPrompt({
    brief,
    executionPlan,
  });
  const providerResult = await runTextProvider({
    systemPrompt,
    userPrompt,
    temperature: 0.65,
    maxTokens: 2400,
    responseFormat: "json_object",
  });

  return normalizeAdsOutput(providerResult, { brief, executionPlan });
}

function toAdsMemoryEvent(adsOutput, { brief, executionPlan }) {
  return {
    eventType: "ad_copy",
    module: "ads",
    artifact: "ad_copy",
    summary: adsOutput.summary,
    payload: {
      ...adsOutput,
      headline: adsOutput.headlines[0] || adsOutput.title,
      body:
        adsOutput.primaryTexts[0] ||
        adsOutput.descriptions[0] ||
        adsOutput.summary,
      cta: adsOutput.ctas[0] || "",
      task: brief?.task || executionPlan?.task || adsOutput.type,
      provider: adsOutput.metadata?.provider || "unknown",
      confidence: adsOutput.metadata?.confidence || 0,
      generatedAt: adsOutput.metadata?.generatedAt || "",
    },
    suggestedRiskLevel: "high",
  };
}

function formatAdsMarkdown(output) {
  return [
    `# ${output.title}`,
    "",
    output.summary,
    "",
    ...formatList("Headlines", output.headlines),
    ...formatList("Primary Text", output.primaryTexts),
    ...formatList("Descriptions", output.descriptions),
    ...formatList("CTAs", output.ctas),
    ...formatList("Extensions", output.extensions),
    ...formatList("Hooks", output.hooks),
    ...formatList("Script Ideas", output.scriptIdeas),
    ...formatList("Recommendations", output.recommendations),
  ]
    .join("\n")
    .trim();
}

function formatList(title, items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  return [
    `## ${title}`,
    ...items.map((item) => `- ${stringifyAdsItem(item)}`),
    "",
  ];
}

module.exports = {
  buildAdsPrompt,
  formatAdsMarkdown,
  normalizeAdsOutput,
  runAdsAgent,
  toAdsMemoryEvent,
};
