const { createHash } = require("node:crypto");
const { LEARNING_DOMAINS, OUTCOME_DIRECTIONS, assertLearningEnum } = require("../contracts");
function required(value, field) { const text = String(value || "").trim(); if (!text) throw new TypeError(`${field} is required`); return text; }
function key(value, field) { return required(value, field).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 160); }
function normalizeLearningScope(businessId, input = {}) {
  const business = required(businessId, "businessId");
  if (input.businessId && required(input.businessId, "scope.businessId") !== business) throw new TypeError("scope.businessId must match businessId");
  const scope = { businessId: business };
  for (const field of ["audience", "offer", "channel", "goal", "market"]) if (input[field]) scope[field] = key(input[field], `scope.${field}`);
  return scope;
}
function buildLearningIdentity({ businessId, domain, subjectKey, patternKey, outcomeDirection, scope }) {
  const business = required(businessId, "businessId"); const normalizedScope = normalizeLearningScope(business, scope);
  const normalizedDomain = assertLearningEnum("domain", String(domain || "").toLowerCase(), LEARNING_DOMAINS);
  const outcome = assertLearningEnum("outcomeDirection", String(outcomeDirection || "").toLowerCase(), OUTCOME_DIRECTIONS);
  const scopeKey = ["audience", "offer", "channel", "goal", "market"].map((field) => `${field}:${normalizedScope[field] || "*"}`).join("|");
  return Object.freeze({ businessId: business, domain: normalizedDomain, subjectKey: key(subjectKey, "subjectKey"), patternKey: key(patternKey, "patternKey"), outcomeDirection: outcome, scope: Object.freeze(normalizedScope), scopeKey, identityKey: [business, "learning", normalizedDomain, key(subjectKey, "subjectKey"), key(patternKey, "patternKey"), outcome, scopeKey].join("::") });
}
function hashLearningValue(value) { const canonical = typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : JSON.stringify(value, Object.keys(value || {}).sort()); return createHash("sha256").update(canonical).digest("hex"); }
module.exports = { buildLearningIdentity, hashLearningValue, normalizeLearningScope };
