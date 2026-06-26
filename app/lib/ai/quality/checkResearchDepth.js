function checkResearchDepth(agentOutput, eventType) {
  if (eventType !== "research_insight") {
    return { passed: true, missing: [] };
  }

  const payload = agentOutput?.payload || {};
  const missing = [];

  if (!agentOutput?.summary || agentOutput.summary.trim().length < 80) {
    missing.push("summary must be at least 80 characters");
  }

  if (!Array.isArray(payload.insights) || payload.insights.length < 3) {
    missing.push("payload.insights must include at least 3 items");
  }

  if (!Array.isArray(payload.recommendations) || payload.recommendations.length < 3) {
    missing.push("payload.recommendations must include at least 3 items");
  }

  return { passed: missing.length === 0, missing };
}

module.exports = { checkResearchDepth };
