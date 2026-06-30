const { runTextProvider } = require("../../providers");
const {
  buildResearchPrompt,
  buildResearchRepairPrompt,
} = require("./buildResearchPrompt");
const { normalizeResearchOutput } = require("./normalizeResearchOutput");
const {
  normalizeArtifactForModule,
} = require("../../campaign/memorySchema");

async function runResearchAgent({ brief, executionPlan }) {
  if (!brief) {
    throw new Error("runResearchAgent: brief is required.");
  }
  if (!executionPlan) {
    throw new Error("runResearchAgent: executionPlan is required.");
  }

  const { systemPrompt, userPrompt } = buildResearchPrompt({
    brief,
    executionPlan,
  });

  const providerResult = await runTextProvider({
    systemPrompt,
    userPrompt,
    temperature: 0.45,
    maxTokens: 2400,
    responseFormat: "json_object",
  });

  return normalizeResearchOutput(providerResult, { brief, executionPlan });
}

async function repairResearchOutput({
  brief,
  executionPlan,
  previousOutput,
  issues,
}) {
  const { systemPrompt, userPrompt } = buildResearchRepairPrompt({
    brief,
    executionPlan,
    previousOutput,
    issues,
  });
  const providerResult = await runTextProvider({
    systemPrompt,
    userPrompt,
    temperature: 0.25,
    maxTokens: 2400,
    responseFormat: "json_object",
  });

  return normalizeResearchOutput(providerResult, { brief, executionPlan });
}

function toResearchMemoryEvent(researchOutput, { brief, executionPlan }) {
  const artifact = normalizeArtifactForModule("research", researchOutput.type);

  return {
    eventType: "research_insight",
    module: "research",
    artifact,
    summary: researchOutput.summary,
    payload: {
      type: researchOutput.type,
      title: researchOutput.title,
      summary: researchOutput.summary,
      insights: researchOutput.insights,
      recommendations: researchOutput.recommendations,
      risks: researchOutput.risks,
      nextActions: researchOutput.nextActions,
      task: brief?.task || executionPlan?.task || "research",
      confidence: researchOutput.metadata?.confidence || 0,
      provider: researchOutput.metadata?.provider || "unknown",
      generatedAt: researchOutput.metadata?.generatedAt || "",
    },
    suggestedRiskLevel: "low",
  };
}

function formatResearchMarkdown(researchOutput) {
  const sections = [
    `# ${researchOutput.title}`,
    "",
    researchOutput.summary,
    "",
    "## Insights",
    ...researchOutput.insights.map((insight) => `- ${insight}`),
    "",
    "## Recommendations",
    ...researchOutput.recommendations.map((recommendation) => `- ${recommendation}`),
    "",
    "## Risks",
    ...researchOutput.risks.map((risk) => `- ${risk}`),
    "",
    "## Next Actions",
    ...researchOutput.nextActions.map((action) => `- ${action}`),
  ];

  return sections.join("\n");
}

module.exports = {
  runResearchAgent,
  repairResearchOutput,
  buildResearchPrompt,
  normalizeResearchOutput,
  toResearchMemoryEvent,
  formatResearchMarkdown,
};
