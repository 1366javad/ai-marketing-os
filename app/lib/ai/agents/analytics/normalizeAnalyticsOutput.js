const { getProviderMetadata } = require("../../providers/providerMetadata");

function normalizeAnalyticsOutput(providerResult, { brief } = {}) {
  const parsed = parseJson(providerResult?.text || "") || {};
  const findings = normalizeList(parsed.findings);
  const recommendations = normalizeList(parsed.recommendations);
  const risks = normalizeList(parsed.risks);
  const limitations = normalizeList(parsed.limitations);
  const evidence = normalizeEvidence(parsed.evidence);
  const insight = clean(parsed.insight) || clean(parsed.summary);
  const summary = clean(parsed.summary) || insight.slice(0, 500);

  return {
    type: "campaign_learning",
    title:
      clean(parsed.title) ||
      `${brief?.campaignName || "Campaign"} learning summary`,
    summary,
    insight,
    findings,
    recommendations,
    risks,
    evidence,
    limitations,
    metadata: {
      ...getProviderMetadata(providerResult),
      provider: providerResult?.provider || "unknown",
      warning: providerResult?.warning || "",
      confidence: normalizeConfidence(parsed?.metadata?.confidence, {
        insight,
        findings,
        evidence,
      }),
      generatedAt: new Date().toISOString(),
    },
  };
}

function parseJson(text) {
  const value = String(text || "").trim();
  for (const candidate of [
    value,
    value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim(),
    value.slice(value.indexOf("{"), value.lastIndexOf("}") + 1),
  ]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return null;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return clean(value) ? [clean(value)] : [];
  return value.map((item) => clean(item)).filter(Boolean);
}

function normalizeEvidence(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      module: clean(item?.module),
      artifact: clean(item?.artifact),
      eventId: clean(item?.eventId || item?.event_id),
      observation: clean(item?.observation),
    }))
    .filter((item) => item.module && item.artifact && item.observation);
}

function normalizeConfidence(value, output) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 1) return numeric;
  const checks = [
    output.insight.length >= 80,
    output.findings.length >= 2,
    output.evidence.length >= 1,
  ];
  return Number((checks.filter(Boolean).length / checks.length).toFixed(2));
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

module.exports = { normalizeAnalyticsOutput };
