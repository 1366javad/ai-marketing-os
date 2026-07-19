const { createHash } = require("node:crypto");
const { KNOWLEDGE_DOMAINS } = require("../contracts");
const { buildKnowledgeIdentity } = require("../versions/buildKnowledgeIdentity");

const MAX_CLAIMS_PER_SOURCE = 30;

function parseProviderJson(text) {
  const source = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("extraction provider returned invalid JSON");
  return JSON.parse(source.slice(start, end + 1));
}

function normalizeKey(value, field) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
  if (!key) throw new TypeError(`${field} is required`);
  return key;
}

function normalizeValue(value) {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) throw new TypeError("claim value is required");
    return normalized;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  throw new TypeError("claim value must be a string or object");
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function canonicalJson(value) {
  if (typeof value === "string") return value.trim().replace(/\s+/g, " ").toLowerCase();
  function sort(input) {
    if (Array.isArray(input)) return input.map(sort);
    if (input && typeof input === "object") {
      return Object.fromEntries(Object.keys(input).sort().map((key) => [key, sort(input[key])]));
    }
    return input;
  }
  return JSON.stringify(sort(value));
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validateEvidence(evidence, sections, sourceId) {
  const sectionByOrdinal = new Map(sections.map((section) => [section.ordinal, section]));
  const seen = new Set();
  return (Array.isArray(evidence) ? evidence : []).flatMap((item) => {
    const ordinal = Number(item?.sectionOrdinal);
    const excerpt = String(item?.excerpt || "").trim();
    const section = sectionByOrdinal.get(ordinal);
    if (!Number.isInteger(ordinal) || !excerpt || !section) return [];
    if (!String(section.text || "").includes(excerpt)) return [];
    const excerptHash = hash(excerpt);
    const key = `${ordinal}:${excerptHash}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ sourceId, sectionOrdinal: ordinal, excerptHash }];
  });
}

function validateExtractedClaims({ providerText, businessId, sourceId, sections }) {
  const parsed = parseProviderJson(providerText);
  const rawClaims = Array.isArray(parsed.claims) ? parsed.claims.slice(0, MAX_CLAIMS_PER_SOURCE) : [];
  const claims = [];
  const diagnostics = [];

  for (let index = 0; index < rawClaims.length; index += 1) {
    const raw = rawClaims[index];
    try {
      const domain = String(raw?.domain || "").trim().toLowerCase();
      if (!KNOWLEDGE_DOMAINS.includes(domain)) throw new TypeError("unsupported domain");
      const subjectKey = normalizeKey(raw.subjectKey, "subjectKey");
      const claimKey = normalizeKey(raw.claimKey, "claimKey");
      const value = normalizeValue(raw.value);
      const scope = {
        businessId,
        ...(raw?.scope?.brandId ? { brandId: normalizeKey(raw.scope.brandId, "brandId") } : {}),
        ...(raw?.scope?.productId ? { productId: normalizeKey(raw.scope.productId, "productId") } : {}),
      };
      const identity = buildKnowledgeIdentity({ businessId, domain, scope, subjectKey, claimKey });
      const evidence = validateEvidence(raw.evidence, sections, sourceId);
      if (evidence.length === 0) throw new TypeError("exact evidence is required");
      const validFrom = normalizeDate(raw?.validity?.validFrom);
      const validUntil = normalizeDate(raw?.validity?.validUntil);
      if (validFrom && validUntil && validUntil <= validFrom) throw new TypeError("invalid validity window");
      claims.push({
        ...identity,
        value,
        valueHash: hash(canonicalJson(value)),
        validity: { validFrom, validUntil },
        evidence,
      });
    } catch (error) {
      diagnostics.push({ index, reason: error.message });
    }
  }
  return { claims, diagnostics };
}

module.exports = {
  MAX_CLAIMS_PER_SOURCE,
  canonicalJson,
  parseProviderJson,
  validateExtractedClaims,
};
