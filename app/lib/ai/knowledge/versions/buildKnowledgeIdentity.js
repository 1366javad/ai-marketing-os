const { KNOWLEDGE_DOMAINS, assertEnum } = require("../contracts");

function normalizeRequired(value, field) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function normalizeScope(scope, businessId) {
  const input = scope && typeof scope === "object" ? scope : {};
  if (
    input.businessId &&
    normalizeRequired(input.businessId, "scope.businessId") !== businessId
  ) {
    throw new TypeError("scope.businessId must match businessId");
  }
  const normalized = { businessId };

  if (input.brandId) normalized.brandId = normalizeRequired(input.brandId, "brandId");
  if (input.productId) {
    normalized.productId = normalizeRequired(input.productId, "productId");
  }

  return normalized;
}

function buildKnowledgeIdentity({
  businessId,
  domain,
  scope,
  subjectKey,
  claimKey,
}) {
  const normalizedBusinessId = normalizeRequired(businessId, "businessId");
  const normalizedDomain = assertEnum(
    "domain",
    normalizeRequired(domain, "domain"),
    KNOWLEDGE_DOMAINS,
  );
  const normalizedScope = normalizeScope(scope, normalizedBusinessId);
  const normalizedSubjectKey = normalizeRequired(subjectKey, "subjectKey");
  const normalizedClaimKey = normalizeRequired(claimKey, "claimKey");
  const scopeKey = [
    `business:${normalizedBusinessId}`,
    `brand:${normalizedScope.brandId || "*"}`,
    `product:${normalizedScope.productId || "*"}`,
  ].join("|");

  return Object.freeze({
    businessId: normalizedBusinessId,
    domain: normalizedDomain,
    scope: Object.freeze(normalizedScope),
    scopeKey,
    subjectKey: normalizedSubjectKey,
    claimKey: normalizedClaimKey,
    identityKey: [
      normalizedBusinessId,
      normalizedDomain,
      scopeKey,
      normalizedSubjectKey,
      normalizedClaimKey,
    ].join("::"),
  });
}

module.exports = { buildKnowledgeIdentity };
