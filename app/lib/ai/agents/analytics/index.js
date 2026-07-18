const { runTextProvider } = require("../../providers");
const { buildAnalyticsPrompt } = require("./buildAnalyticsPrompt");
const { normalizeAnalyticsOutput } = require("./normalizeAnalyticsOutput");

async function runAnalyticsAgent({ brief, executionPlan }) {
  if (!brief) throw new Error("runAnalyticsAgent: brief is required.");
  if (!executionPlan) {
    throw new Error("runAnalyticsAgent: executionPlan is required.");
  }

  const { systemPrompt, userPrompt } = buildAnalyticsPrompt({
    brief,
    executionPlan,
  });
  const providerResult = await runTextProvider({
    systemPrompt,
    userPrompt,
    temperature: 0.3,
    maxTokens: 2400,
    responseFormat: "json_object",
  });

  return normalizeAnalyticsOutput(providerResult, { brief, executionPlan });
}

function toAnalyticsMemoryEvent(output, { brief, executionPlan }) {
  return {
    eventType: "campaign_learning",
    module: "analytics",
    artifact: "campaign_learning",
    summary: output.summary,
    payload: {
      ...output,
      insight: output.insight,
      task: brief?.task || executionPlan?.task || "evaluate_campaign",
      provider: output.metadata?.provider || "unknown",
      confidence: output.metadata?.confidence || 0,
      generatedAt: output.metadata?.generatedAt || "",
    },
    suggestedRiskLevel: "low",
  };
}

module.exports = {
  buildAnalyticsPrompt,
  normalizeAnalyticsOutput,
  runAnalyticsAgent,
  toAnalyticsMemoryEvent,
};
