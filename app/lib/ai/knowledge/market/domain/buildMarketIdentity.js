const { createHash } = require("node:crypto");
const { MARKET_DOMAINS, MARKET_MEMORY_TYPES, assertMarketEnum } = require("../contracts");

function key(value, field) {
  const normalized = String(value || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 160);
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function normalizeMarketScope(businessId, input = {}) {
  const normalizedBusiness = String(businessId || "").trim();
  if (!normalizedBusiness) throw new TypeError("businessId is required");
  if (input.businessId && String(input.businessId).trim() !== normalizedBusiness) {
    throw new TypeError("scope.businessId must match businessId");
  }
  const scope = { businessId: normalizedBusiness };
  for (const field of ["geography", "segment", "category", "channel"]) {
    if (input[field]) scope[field] = key(input[field], `scope.${field}`);
  }
  return scope;
}

function buildMarketIdentity({ businessId, domain, memoryType, entityKey, claimKey, scope }) {
  const normalizedBusiness = String(businessId || "").trim();
  if (!normalizedBusiness) throw new TypeError("businessId is required");
  const normalizedDomain = assertMarketEnum("domain", String(domain || "").toLowerCase(), MARKET_DOMAINS);
  const normalizedType = assertMarketEnum("memoryType", String(memoryType || "").toLowerCase(), MARKET_MEMORY_TYPES);
  const normalizedEntity = key(entityKey, "entityKey");
  const normalizedClaim = key(claimKey, "claimKey");
  const normalizedScope = normalizeMarketScope(normalizedBusiness, scope);
  const scopeKey = ["geography", "segment", "category", "channel"]
    .map((field) => `${field}:${normalizedScope[field] || "*"}`).join("|");
  return Object.freeze({
    businessId: normalizedBusiness,
    domain: normalizedDomain,
    memoryType: normalizedType,
    entityKey: normalizedEntity,
    claimKey: normalizedClaim,
    scope: Object.freeze(normalizedScope),
    scopeKey,
    identityKey: [normalizedBusiness, "market", normalizedDomain, normalizedType, normalizedEntity, normalizedClaim, scopeKey].join("::"),
  });
}

function canonicalMarketValue(value) {
  if (typeof value === "string") return value.trim().replace(/\s+/g, " ").toLowerCase();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("value must be a string or object");
  const sort = (input) => Array.isArray(input) ? input.map(sort) : input && typeof input === "object"
    ? Object.fromEntries(Object.keys(input).sort().map((name) => [name, sort(input[name])])) : input;
  return JSON.stringify(sort(value));
}

function hashMarketValue(value) {
  return createHash("sha256").update(canonicalMarketValue(value)).digest("hex");
}

module.exports = { buildMarketIdentity, canonicalMarketValue, hashMarketValue, normalizeMarketScope };
