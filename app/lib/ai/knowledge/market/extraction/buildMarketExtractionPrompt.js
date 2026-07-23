const { MARKET_DOMAINS, MARKET_MEMORY_TYPES } = require("../contracts");

function buildMarketExtractionPrompt({ source, normalization }) {
  return {
    systemPrompt: [
      "You extract external market evidence into structured candidate memories.",
      "Return JSON only with { candidates: [...] }.",
      `Allowed domains: ${MARKET_DOMAINS.join(", ")}.`,
      `Allowed memoryType values: ${MARKET_MEMORY_TYPES.join(", ")}.`,
      "Each candidate requires domain, memoryType, entityKey, claimKey, value, scope, validity, freshnessClass, and evidence.",
      "Evidence entries require sectionOrdinal and an exact verbatim excerpt from the provided section.",
      "Do not approve, infer internal business truth, causal learning, or unsupported facts.",
    ].join("\n"),
    userPrompt: JSON.stringify({
      source: { title: source.title, category: source.source_category, authority: source.authority, capturedAt: source.captured_at },
      sections: normalization.sections,
    }),
  };
}

module.exports = { buildMarketExtractionPrompt };
