const { ADS_TASKS, normalizeAdsTask } = require("./buildAdsPrompt");
const { getProviderMetadata } = require("../../providers/providerMetadata");

function normalizeAdsOutput(providerResult, { brief } = {}) {
  const text = providerResult?.text || "";
  const parsed = parseJsonFromText(text);
  const task = normalizeAdsTask(brief?.task);
  const taskConfig = ADS_TASKS[task] || ADS_TASKS.google_ads;

  let headlines = normalizeStringList(parsed?.headlines || parsed?.headline);
  let primaryTexts = normalizeStringList(
    parsed?.primaryTexts ||
      parsed?.primary_texts ||
      parsed?.primaryText ||
      parsed?.body,
  );
  let descriptions = normalizeStringList(
    parsed?.descriptions || parsed?.description,
  );
  const ctas = normalizeStringList(parsed?.ctas || parsed?.cta);
  const extensions = normalizeStringList(
    parsed?.extensions || parsed?.sitelinks || parsed?.callouts,
  );
  const hooks = normalizeStringList(parsed?.hooks);
  const scriptIdeas = normalizeStringList(
    parsed?.scriptIdeas || parsed?.script_ideas || parsed?.scripts,
  );
  const recommendations = normalizeStringList(parsed?.recommendations);
  const summary =
    sanitizeString(parsed?.summary) ||
    [primaryTexts[0], descriptions[0]].filter(Boolean).join(" ") ||
    buildSummaryFallback(text);

  if (task === "google_ads") {
    headlines = clampTextList(headlines, 30);
    primaryTexts = clampTextList(primaryTexts, 90);
    descriptions = clampTextList(descriptions, 90);
  }

  return {
    type: task,
    title:
      sanitizeString(parsed?.title) ||
      `${brief?.campaignName || brief?.offer || "Campaign"} ${taskConfig.label}`,
    summary,
    headlines,
    primaryTexts,
    descriptions,
    ctas,
    extensions,
    hooks,
    scriptIdeas,
    recommendations,
    metadata: {
      ...getProviderMetadata(providerResult),
      provider: providerResult?.provider || "unknown",
      warning: providerResult?.warning || "",
      lowConfidenceProvider:
        providerResult?.lowConfidenceProvider ||
        providerResult?.provider === "pollinations",
      confidence: normalizeConfidence(parsed?.metadata?.confidence, {
        headlines,
        primaryTexts,
        descriptions,
        ctas,
        recommendations,
      }),
      generatedAt: new Date().toISOString(),
    },
  };
}

function clampTextList(items, maxLength) {
  return items.map((item) => clampText(item, maxLength)).filter(Boolean);
}

function clampText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;

  const candidate = text.slice(0, maxLength + 1);
  const lastSpace = candidate.lastIndexOf(" ");
  return candidate.slice(0, lastSpace > maxLength * 0.65 ? lastSpace : maxLength).trim();
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map(stringifyAdsItem).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|;/)
      .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    return [stringifyAdsItem(value)].filter(Boolean);
  }

  return [];
}

function stringifyAdsItem(item) {
  if (typeof item === "string") return item.trim();
  if (item == null) return "";
  if (typeof item !== "object") return String(item).trim();

  return Object.values(item)
    .flatMap((value) =>
      Array.isArray(value) ? value.map(stringifyAdsItem) : stringifyAdsItem(value),
    )
    .filter(Boolean)
    .join(" - ");
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

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    title: lines[0]?.replace(/^#+\s*/, "") || "",
    summary: lines.slice(1, 3).join(" "),
    headlines: lines.filter((line) => /^[-*]\s+/.test(line)).slice(0, 8),
  };
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start, end + 1);
}

function normalizeConfidence(value, output) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 1) {
    return numeric;
  }

  const checks = [
    output.headlines.length >= 3,
    output.primaryTexts.length >= 2,
    output.descriptions.length >= 2,
    output.ctas.length >= 2,
    output.recommendations.length >= 2,
  ];

  return Number((checks.filter(Boolean).length / checks.length).toFixed(2));
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

module.exports = {
  normalizeAdsOutput,
  normalizeStringList,
  stringifyAdsItem,
};
