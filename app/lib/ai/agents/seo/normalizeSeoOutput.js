const { normalizeSeoTask, SEO_TASKS } = require("./buildSeoPrompt");
const { getProviderMetadata } = require("../../providers/providerMetadata");

function normalizeSeoOutput(providerResult, { brief } = {}) {
  const text = providerResult?.text || "";
  const parsed = parseJsonFromText(text);
  const task = normalizeSeoTask(brief?.task);
  const expectedType = SEO_TASKS[task]?.type || "keyword_research";

  if (!parsed) {
    throw createInvalidSeoOutputError(
      "The SEO provider returned invalid or incomplete JSON. Please generate this SEO task again.",
    );
  }

  const output = {
    type: normalizeType(parsed?.type, expectedType),
    title: sanitizeString(parsed?.title) || buildFallbackTitle({ task, brief }),
    summary: sanitizeString(parsed?.summary) || buildSummaryFallback(text),
    primaryKeywords: normalizeObjects(parsed?.primaryKeywords || parsed?.primary_keywords),
    secondaryKeywords: normalizeObjects(
      parsed?.secondaryKeywords || parsed?.secondary_keywords,
    ),
    keywordClusters: normalizeObjects(
      parsed?.keywordClusters || parsed?.keyword_clusters || parsed?.clusters,
    ),
    topicClusters: normalizeObjects(
      parsed?.topicClusters || parsed?.topic_clusters || parsed?.topics,
    ),
    strategy: normalizeStrategy(parsed?.strategy || parsed),
    metaDescriptions: normalizeObjects(
      parsed?.metaDescriptions || parsed?.meta_descriptions || parsed?.meta,
    ),
    faqs: normalizeObjects(parsed?.faqs || parsed?.faq),
    metadata: {
      ...getProviderMetadata(providerResult),
      provider: providerResult?.provider || "unknown",
      warning: providerResult?.warning || "",
      lowConfidenceProvider:
        providerResult?.lowConfidenceProvider ||
        providerResult?.provider === "pollinations",
      confidence: 0,
      generatedAt: new Date().toISOString(),
    },
  };

  if (!hasTaskPayload(output, task)) {
    throw createInvalidSeoOutputError(
      `The SEO provider did not return the required structured fields for ${SEO_TASKS[task]?.label || "this SEO task"}. Please generate it again.`,
    );
  }

  output.metadata.confidence = normalizeConfidence(parsed?.metadata?.confidence, output);

  return output;
}

function normalizeObjects(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeObjectItem(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|;/)
      .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean)
      .map((text) => ({ text }));
  }

  if (value && typeof value === "object") {
    return [normalizeObjectItem(value)].filter(Boolean);
  }

  return [];
}

function normalizeObjectItem(item) {
  if (typeof item === "string") return item.trim() ? { text: item.trim() } : null;
  if (!item || typeof item !== "object") return null;

  return Object.entries(item).reduce((acc, [key, value]) => {
    const safeKey = normalizeKey(key);
    if (Array.isArray(value)) {
      acc[safeKey] = value
        .map((entry) => normalizeNestedValue(entry))
        .filter(Boolean);
    } else if (value && typeof value === "object") {
      acc[safeKey] = normalizeNestedValue(value);
    } else {
      acc[safeKey] = sanitizeString(value) || String(value || "").trim();
    }
    return acc;
  }, {});
}

function normalizeNestedValue(value) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  if (typeof value !== "object") return String(value).trim();
  if (Array.isArray(value)) {
    return value.map(normalizeNestedValue).filter(Boolean);
  }

  return normalizeObjectItem(value);
}

function normalizeStrategy(value) {
  const strategy = value && typeof value === "object" ? value : {};

  return {
    quickWins: normalizeStringList(strategy.quickWins || strategy.quick_wins),
    mediumTerm: normalizeStringList(strategy.mediumTerm || strategy.medium_term),
    longTerm: normalizeStringList(strategy.longTerm || strategy.long_term),
    priorities: normalizeStringList(strategy.priorities),
  };
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stringifySeoItem(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|;/)
      .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function stringifySeoItem(item) {
  if (typeof item === "string") return item.trim();
  if (item == null) return "";
  if (typeof item !== "object") return String(item).trim();

  return Object.values(item)
    .flatMap((value) => {
      if (Array.isArray(value)) return value.map((entry) => stringifySeoItem(entry));
      if (value && typeof value === "object") return stringifySeoItem(value);
      return String(value || "").trim();
    })
    .filter(Boolean)
    .join(" - ");
}

function collectKeywords(seoOutput) {
  const keywords = [];
  const push = (value) => {
    const text = stringifySeoItem(value);
    if (text) keywords.push(text);
  };

  [...seoOutput.primaryKeywords, ...seoOutput.secondaryKeywords].forEach(push);
  seoOutput.keywordClusters.forEach((cluster) => {
    if (Array.isArray(cluster.keywords)) cluster.keywords.forEach(push);
    else push(cluster);
  });
  seoOutput.topicClusters.forEach(push);
  seoOutput.metaDescriptions.forEach(push);
  seoOutput.faqs.forEach(push);
  Object.values(seoOutput.strategy).forEach((items) => items.forEach(push));

  return [...new Set(keywords)].slice(0, 30);
}

function normalizeConfidence(value, output) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 1) {
    return numeric;
  }

  const checks = [
    output.summary.length >= 80,
    output.primaryKeywords.length + output.secondaryKeywords.length >= 3,
    output.keywordClusters.length >= 2,
    output.topicClusters.length >= 2,
    Object.values(output.strategy).some((items) => items.length >= 2),
    output.metaDescriptions.length >= 2,
    output.faqs.length >= 2,
  ];

  return Number((checks.filter(Boolean).length / checks.length).toFixed(2));
}

function parseJsonFromText(text) {
  if (!text || typeof text !== "string") return null;

  const trimmed = text.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const extracted = extractJsonObject(withoutFences);
  const candidates = [
    trimmed,
    withoutFences,
    extracted,
    repairJsonCandidate(extracted || withoutFences),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1) return "";
  if (end === -1 || end <= start) return text.slice(start);
  return text.slice(start, end + 1);
}

function repairJsonCandidate(value) {
  let candidate = String(value || "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  if (!candidate) return "";
  if (!candidate.startsWith("{") && /"type"\s*:/.test(candidate)) {
    candidate = `{${candidate}`;
  }

  candidate = candidate.replace(/,\s*([}\]])/g, "$1");
  return closeJsonContainers(candidate);
}

function closeJsonContainers(value) {
  const stack = [];
  let inString = false;
  let escaped = false;

  for (const char of value) {
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === "{" || char === "[") stack.push(char);
    else if (char === "}" && stack.at(-1) === "{") stack.pop();
    else if (char === "]" && stack.at(-1) === "[") stack.pop();
  }

  if (inString) return value;

  return (
    value +
    stack
      .reverse()
      .map((char) => (char === "{" ? "}" : "]"))
      .join("")
  );
}

function hasTaskPayload(output, task) {
  const checks = {
    keywords:
      output.primaryKeywords.length > 0 || output.secondaryKeywords.length > 0,
    clusters: output.keywordClusters.length > 0,
    topics: output.topicClusters.length > 0,
    strategy: Object.values(output.strategy).some((items) => items.length > 0),
    meta: output.metaDescriptions.length > 0,
    faq: output.faqs.length > 0,
  };

  return Boolean(checks[task]);
}

function createInvalidSeoOutputError(message) {
  const error = new Error(message);
  error.status = 422;
  return error;
}

function sanitizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(key) {
  return String(key || "").replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function buildSummaryFallback(text) {
  if (looksLikeJson(text)) return "";

  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function looksLikeJson(value) {
  const text = String(value || "").trim();
  return text.startsWith("{") || /"type"\s*:/.test(text);
}

function buildFallbackTitle({ task, brief }) {
  const offer = brief?.offer || "Campaign";
  const label = (SEO_TASKS[task]?.label || "SEO Asset").toLowerCase();
  return `${offer} ${label}`;
}

function normalizeType(value, fallbackType) {
  const type = sanitizeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return type || fallbackType;
}

module.exports = { normalizeSeoOutput, collectKeywords, stringifySeoItem };
