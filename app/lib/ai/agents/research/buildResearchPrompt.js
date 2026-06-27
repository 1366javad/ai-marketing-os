const RESEARCH_TASKS = Object.freeze({
  market: {
    label: "Market Research",
    type: "market_research",
    focus: [
      "Market size and demand shape",
      "Customer or account segments",
      "Growth drivers and adoption blockers",
      "Market forces, timing, and category maturity",
    ],
    systemFocus: `Your goal is to help the campaign team understand the market they are entering.
Every finding must answer: "What does this mean for THIS campaign specifically?"
Focus on market dynamics that directly affect how [offer] should be positioned for [audience].`,
  },
  audience: {
    label: "Audience Research",
    type: "audience_research",
    focus: [
      "Personas and customer segments",
      "Motivations, jobs-to-be-done, and desired outcomes",
      "Objections, anxieties, and trust gaps",
      "Buying triggers and decision behavior",
    ],
    systemFocus: `Your goal is to help the campaign team deeply understand who they are selling to.
Every finding must answer: "What does this tell us about how to reach and convert [audience]?"
Focus on decision psychology, not demographic summaries.`,
  },
  competitor: {
    label: "Competitor Analysis",
    type: "competitor_research",
    focus: [
      "Direct and indirect competitor groups",
      "Positioning, claims, and category narratives",
      "Pricing or packaging signals when context provides them",
      "Differentiation gaps, threats, and white space",
    ],
    systemFocus: `Your goal is to map the competitive landscape so the campaign can differentiate.
Every finding must answer: "How does this affect how [offer] should position against alternatives?"
Focus on messaging gaps and white space, not generic competitor descriptions.`,
  },
  trends: {
    label: "Trend Research",
    type: "trends_research",
    focus: [
      "Emerging shifts and market signals",
      "Adoption timing and urgency",
      "Risks created by the trend environment",
      "Marketing implications and opportunity windows",
    ],
    systemFocus: `Your goal is to identify trends the campaign team can act on now or prepare for.
Every finding must answer: "How should [offer] respond to or leverage this trend?"
Focus on timing and marketing implications, not general trend descriptions.`,
  },
  pain_points: {
    label: "Pain Points",
    type: "pain_points_research",
    focus: [
      "Main audience problems and frustrations",
      "Barriers that block purchase, adoption, or action",
      "Unmet needs and emotional triggers",
      "Proof, education, or offer changes that reduce friction",
    ],
    systemFocus: `Your goal is to uncover what stops [audience] from buying or acting.
Every finding must answer: "What specific friction does this create for [offer]'s conversion?"
Focus on emotional blockers and trust gaps, not surface-level complaints.`,
  },
  opportunities: {
    label: "Opportunities",
    type: "opportunities_research",
    focus: [
      "Market gaps and under-served angles",
      "Growth paths and campaign openings",
      "Messaging opportunities",
      "Practical next moves for the campaign team",
    ],
    systemFocus: `Your goal is to find specific angles [offer] can exploit that competitors are missing.
Every finding must answer: "What concrete opportunity can this campaign act on in the next 90 days?"
Focus on actionable gaps, not general growth advice.`,
  },
});

const TASK_ALIASES = Object.freeze({
  market: "market",
  market_research: "market",
  audience: "audience",
  audience_research: "audience",
  competitor: "competitor",
  competitors: "competitor",
  competitor_research: "competitor",
  competitor_analysis: "competitor",
  trend: "trends",
  trends: "trends",
  trends_research: "trends",
  trend_research: "trends",
  painpoint: "pain_points",
  painpoints: "pain_points",
  pain_points: "pain_points",
  pain_points_research: "pain_points",
  opportunities: "opportunities",
  opportunity: "opportunities",
  opportunities_research: "opportunities",
});

function buildResearchPrompt({ brief, executionPlan }) {
  if (!brief) {
    throw new Error("buildResearchPrompt: brief is required.");
  }

  const taskKey = normalizeResearchTask(brief.task || executionPlan?.task);
  const task = RESEARCH_TASKS[taskKey] || RESEARCH_TASKS.market;
  const relevantEvents = Array.isArray(brief.relevantEvents)
    ? brief.relevantEvents
    : [];

  // Replace placeholders in systemFocus with actual campaign values
  const systemFocusResolved = task.systemFocus
    .replace(/\[offer\]/g, brief.offer || "the offer")
    .replace(/\[audience\]/g, brief.audience || "the target audience")
    .replace(/\[industry\]/g, brief.industry || "this industry");

  const systemPrompt = [
    "You are Research Agent V2 for AI Marketing OS.",
    "You are not a general assistant. You are a senior marketing strategist producing decision-making intelligence.",
    "",
    systemFocusResolved,
    "",
    "Rules:",
    "- Every insight must be specific to this campaign. If it could apply to any business, cut it.",
    "- Do not use generic marketing language: 'the market is competitive', 'there is demand', 'customers need support'.",
    "- Do not fabricate statistics, pricing, or competitor details not present in the brief.",
    "- Use cautious language for inferences: 'likely', 'suggests', 'based on the context'.",
    "- If context is limited, state what is unknown and why it matters.",
    "- You must return a single JSON object and nothing else.",
    "- Do not wrap the JSON in markdown fences.",
    "- Do not return prose before or after the JSON.",
    "- Arrays must be populated. Empty arrays fail the contract.",
    "- recommendations, risks, and nextActions must use the exact object keys shown below.",
    "",
    "Return only valid JSON with this exact shape:",
    JSON.stringify({
      type: task.type,
      title: "",
      summary: "",
      insights: [""],
      recommendations: [{ action: "", impact: "", reasoning: "" }],
      risks: [{ risk: "", mitigation: "" }],
      nextActions: [
        { action: "", priority: "High|Medium|Low", expectedOutcome: "" },
      ],
      metadata: { provider: "", confidence: 0, generatedAt: "" },
    }),
  ].join("\n");

  const userPrompt = [
    `Research task: ${task.label}`,
    `Output type: ${task.type}`,
    "",
    "Campaign context:",
    `- Campaign: ${brief.campaignName || "Not specified"}`,
    `- Industry: ${brief.industry || "Not specified"}`,
    `- Offer: ${brief.offer || "Not specified"}`,
    `- Audience: ${brief.audience || "Not specified"}`,
    `- Goal: ${brief.goal || "Not specified"}`,
    `- Competitors: ${Array.isArray(brief.competitors) ? brief.competitors.join(", ") : "Not specified"}`,
    `- Mode: ${executionPlan?.mode || brief.mode || "tool"}`,
    brief.normalizedPrompt
      ? `\nAdditional direction from user: ${brief.normalizedPrompt}`
      : "",
    relevantEvents.length
      ? `\nApproved context from campaign memory:\n${formatRelevantEvents(relevantEvents)}`
      : "\nApproved context: none yet.",
    "",
    "Task-specific focus areas:",
    ...task.focus.map((item) => `- ${item}`),
    "",
    "Output requirements:",
    "- title: specific to this campaign and task (not generic like 'Market Research Report')",
    "- summary: at least 80 characters and 3-5 concise paragraphs. Each paragraph must contain a specific finding tied to the campaign context. No filler.",
    "- insights: return at least 3 substantial findings; target 5-7 when the context supports them.",
    "  Each insight must be 2-3 sentences and directly actionable by a marketer.",
    "- recommendations: return at least 3 actionable steps for this campaign. Each must include: action, expected impact, reasoning.",
    "  If a recommendation cannot be tied to this specific campaign, do not include it.",
    "- risks: return at least 2 real risks for this campaign. Each must include: the risk itself and a concrete mitigation step.",
    "- nextActions: return at least 3 prioritized actions the team can take in the next 30-90 days.",
    "  Each must include: action, priority (High/Medium/Low), expected outcome.",
    "  Prioritize by impact, not by effort.",
    "- do not write ad copy, SEO copy, or content drafts.",
    "- do not include insights that apply to any business in any market.",
    "",
    "Return JSON only. The response must start with { and end with }.",
    "Do not include markdown, commentary, code fences, or explanations.",
  ].join("\n");

  return { systemPrompt, userPrompt };
}

function buildResearchRepairPrompt({
  brief,
  executionPlan,
  previousOutput,
  issues,
}) {
  const { systemPrompt, userPrompt } = buildResearchPrompt({
    brief,
    executionPlan,
  });

  return {
    systemPrompt,
    userPrompt: [
      userPrompt,
      "",
      "The previous response failed the required Research V2 contract.",
      "Correct every issue below and return a complete replacement JSON object.",
      ...issues.map((issue) => `- ${issue}`),
      "",
      "Previous normalized response:",
      JSON.stringify(previousOutput),
      "",
      "Return JSON only. Do not explain the correction.",
    ].join("\n"),
  };
}

function formatRelevantEvents(events) {
  return events
    .slice(0, 6)
    .map(
      (event) =>
        `- ${event.module}/${event.artifact || event.type}: ${event.summary}`,
    )
    .join("\n");
}

function normalizeResearchTask(task) {
  const key = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return TASK_ALIASES[key] || "market";
}

module.exports = {
  buildResearchPrompt,
  buildResearchRepairPrompt,
  normalizeResearchTask,
  RESEARCH_TASKS,
  TASK_ALIASES,
};
