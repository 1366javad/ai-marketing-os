const { createHash } = require("node:crypto");
const { buildMarketIdentity, hashMarketValue } = require("../domain/buildMarketIdentity");

function parse(text) {
  const source = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  const start = source.indexOf("{"); const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("market extraction provider returned invalid JSON");
  return JSON.parse(source.slice(start, end + 1));
}

function date(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function validateMarketCandidates({ providerText, businessId, sourceId, sections }) {
  const parsed = parse(providerText);
  const candidates = []; const diagnostics = [];
  const sectionMap = new Map((sections || []).map((section) => [Number(section.ordinal), section]));
  for (const [index, raw] of (Array.isArray(parsed.candidates) ? parsed.candidates.slice(0, 40) : []).entries()) {
    try {
      const value = typeof raw.value === "string" ? raw.value.trim() : raw.value;
      if (!value || (typeof value !== "string" && (typeof value !== "object" || Array.isArray(value)))) throw new TypeError("value is required");
      const identity = buildMarketIdentity({ businessId, ...raw });
      const evidence = (Array.isArray(raw.evidence) ? raw.evidence : []).flatMap((item) => {
        const ordinal = Number(item?.sectionOrdinal); const excerpt = String(item?.excerpt || "").trim();
        const section = sectionMap.get(ordinal);
        if (!section || !excerpt || !String(section.text || "").includes(excerpt)) return [];
        return [{ sourceId, sectionOrdinal: ordinal, excerptHash: createHash("sha256").update(excerpt).digest("hex") }];
      });
      if (!evidence.length) throw new TypeError("exact evidence is required");
      const validFrom = date(raw?.validity?.validFrom); const validUntil = date(raw?.validity?.validUntil);
      if (validFrom && validUntil && validUntil <= validFrom) throw new TypeError("invalid validity window");
      candidates.push({
        ...identity, value, valueHash: hashMarketValue(value), evidence,
        validity: { validFrom, validUntil },
        freshnessClass: String(raw.freshnessClass || "standard").trim().toLowerCase(),
      });
    } catch (error) { diagnostics.push({ index, reason: error.message }); }
  }
  return { candidates, diagnostics };
}

module.exports = { validateMarketCandidates };
