function buildAnalyticsPrompt({ brief, executionPlan }) {
  if (!brief) throw new Error("buildAnalyticsPrompt: brief is required.");

  const relevantEvents = Array.isArray(brief.relevantEvents)
    ? brief.relevantEvents
    : [];
  const systemPrompt = [
    "You are Analytics Agent V2 for AI Marketing OS.",
    "Evaluate the supplied campaign context and approved campaign memory.",
    "Produce observational campaign learning only.",
    "Do not trigger agents, change campaign state, publish, spend budget, or invent performance data.",
    "Clearly distinguish evidence from inference and identify missing data.",
    "Return only valid JSON.",
    "",
    "Return JSON with this exact shape:",
    JSON.stringify({
      title: "",
      summary: "",
      insight: "",
      findings: [""],
      recommendations: [""],
      risks: [""],
      evidence: [{ module: "", artifact: "", eventId: "", observation: "" }],
      limitations: [""],
      metadata: { confidence: 0 },
    }),
  ].join("\n");

  const userPrompt = [
    `Analytics task: ${executionPlan?.task || brief.task || "evaluate_campaign"}`,
    "",
    "Full campaign context:",
    JSON.stringify(brief.context || {}, null, 2),
    "",
    "Approved and auto-saved campaign memory:",
    relevantEvents.length
      ? JSON.stringify(relevantEvents.map(toPromptEvent), null, 2)
      : "No approved campaign memory is available.",
    "",
    "Requirements:",
    "- Base every finding on supplied context or memory.",
    "- Produce one durable campaign insight of at least 80 characters.",
    "- Include evidence identities using canonical module + artifact.",
    "- Treat missing performance data as a limitation, not as zero performance.",
    "- Recommendations are advisory only and must not initiate another agent.",
  ].join("\n");

  return { systemPrompt, userPrompt };
}

function toPromptEvent(event) {
  return {
    id: event.id,
    module: event.module,
    artifact: event.artifact,
    approvalStatus: event.approvalStatus,
    summary: event.summary,
    payload: event.payload,
  };
}

module.exports = { buildAnalyticsPrompt };
