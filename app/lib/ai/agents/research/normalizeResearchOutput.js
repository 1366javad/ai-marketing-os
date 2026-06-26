const {
  normalizeResearchTask,
  RESEARCH_TASKS,
} = require("./buildResearchPrompt");
const { getProviderMetadata } = require("../../providers/providerMetadata");

function normalizeResearchOutput(providerResult, { brief } = {}) {
  const text = providerResult?.text || "";
  const parsed = unwrapResearchPayload(parseJsonFromText(text));
  const task = normalizeResearchTask(brief?.task);
  const expectedType = RESEARCH_TASKS[task]?.type || "market_research";

  const summary = sanitizeString(parsed?.summary) || buildSummaryFallback(text);
  const insights = normalizeStringList(
    parsed?.insights ||
      parsed?.keyInsights ||
      parsed?.key_insights ||
      parsed?.findings,
  );
  const recommendations = normalizeStringList(
    parsed?.recommendations ||
      parsed?.strategicRecommendations ||
      parsed?.strategic_recommendations ||
      parsed?.actions,
    [
    "action",
    "recommendation",
    "text",
    "impact",
    "expected_impact",
    "reasoning",
    "rationale",
    ],
  );
  const risks = normalizeStringList(
    parsed?.risks || parsed?.keyRisks || parsed?.key_risks || parsed?.threats,
    [
    "risk",
    "description",
    "text",
    "impact",
    "mitigation",
    "mitigation_strategy",
    "reasoning",
    ],
  );
  const nextActions = normalizeStringList(
    parsed?.nextActions ||
      parsed?.next_actions ||
      parsed?.actionPlan ||
      parsed?.action_plan,
    [
      "action",
      "next_action",
      "text",
      "priority",
      "expectedOutcome",
      "expected_outcome",
      "outcome",
      "impact",
      "reasoning",
    ],
  );

  return {
    type: normalizeType(parsed?.type, expectedType),
    title: sanitizeString(parsed?.title) || buildFallbackTitle({ task, brief }),
    summary,
    insights,
    recommendations,
    risks,
    nextActions,
    metadata: {
      ...getProviderMetadata(providerResult),
      provider: providerResult?.provider || "unknown",
      warning: providerResult?.warning || "",
      lowConfidenceProvider:
        providerResult?.lowConfidenceProvider ||
        providerResult?.provider === "pollinations",
      confidence: normalizeConfidence(parsed?.metadata?.confidence, {
        summary,
        insights,
        recommendations,
        risks,
        nextActions,
      }),
      generatedAt: new Date().toISOString(),
    },
  };
}

function unwrapResearchPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  const nested =
    value.research ||
    value.report ||
    value.result ||
    value.output ||
    value.data;

  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? { ...value, ...nested }
    : value;
}

function normalizeStringList(value, preferredKeys = [
  "insight",
  "text",
  "description",
  "finding",
  "reasoning",
]) {
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyResearchItem(item, preferredKeys))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|;/)
      .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function stringifyResearchItem(item, preferredKeys = []) {
  if (typeof item === "string") return item.trim();
  if (item == null) return "";

  if (typeof item !== "object") {
    return String(item).trim();
  }

  const keys = [
    ...preferredKeys,
    ...Object.keys(item).filter((key) => !preferredKeys.includes(key)),
  ];
  const seen = new Set();
  const values = [];

  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);

    const value = item[key];
    const text = Array.isArray(value)
      ? value
          .map((entry) => stringifyResearchItem(entry))
          .filter(Boolean)
          .join(", ")
      : typeof value === "object" && value !== null
        ? stringifyResearchItem(value)
        : sanitizeString(value) || String(value || "").trim();

    if (text) values.push(text);
  }

  return values.join(" — ");
}

function normalizeConfidence(
  value,
  { summary, insights, recommendations, risks, nextActions },
) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 1) {
    return numeric;
  }

  const checks = [
    summary.length >= 150,
    insights.length >= 3,
    recommendations.length >= 3,
    risks.length >= 2,
    nextActions.length >= 3,
  ];

  return Number((checks.filter(Boolean).length / checks.length).toFixed(2));
}

function parseJsonFromText(text) {
  if (!text || typeof text !== "string") return null;

  const trimmed = text.trim();
  const candidates = [
    trimmed,
    trimmed
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim(),
    extractJsonObject(trimmed),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return parseLooseResearchFields(trimmed);
}

function parseLooseResearchFields(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  return {
    title: lines[0].replace(/^#+\s*/, ""),
    summary: lines.slice(1, 3).join(" "),
    insights: lines.filter((line) => /^[-*]\s+/.test(line)).slice(0, 5),
    recommendations: lines
      .filter((line) => /^\d+[.)]\s+/.test(line))
      .slice(0, 5),
    risks: [],
    nextActions: [],
  };
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start, end + 1);
}

function sanitizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildSummaryFallback(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function buildFallbackTitle({ task, brief }) {
  const offer = brief?.offer || "Campaign";
  const label = task.replace(/_/g, " ");
  return `${offer} ${label} research`;
}

function normalizeType(value, fallbackType) {
  const type = sanitizeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return type === fallbackType ? type : fallbackType;
}

module.exports = { normalizeResearchOutput };
