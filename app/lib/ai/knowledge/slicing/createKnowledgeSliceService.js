const { PROTECTED_DOMAINS, getModuleDomainAllowlist } = require("./moduleDomainAllowlists");

const DEFAULT_MAX_ITEMS = 30;
const HARD_MAX_ITEMS = 50;

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function normalizeDate(value, field) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} must be a valid date`);
  return date;
}

function normalizeMaxItems(value) {
  if (value === undefined || value === null) return DEFAULT_MAX_ITEMS;
  if (!Number.isInteger(value) || value < 1) throw new TypeError("maxItems must be a positive integer");
  return Math.min(value, HARD_MAX_ITEMS);
}

function normalizeScope(businessId, scope) {
  const normalized = { businessId };
  if (scope?.brandId) normalized.brandId = required(scope.brandId, "scope.brandId");
  if (scope?.productId) normalized.productId = required(scope.productId, "scope.productId");
  return normalized;
}

function scopeSpecificity(itemScope, requestScope) {
  if (itemScope?.businessId !== requestScope.businessId) return -1;
  let specificity = 0;
  for (const field of ["brandId", "productId"]) {
    if (!itemScope?.[field]) continue;
    if (!requestScope[field] || itemScope[field] !== requestScope[field]) return -1;
    specificity += 1;
  }
  return specificity;
}

function compareEligible(left, right, domainRank) {
  const leftProtected = PROTECTED_DOMAINS.includes(left.row.domain) ? 1 : 0;
  const rightProtected = PROTECTED_DOMAINS.includes(right.row.domain) ? 1 : 0;
  return rightProtected - leftProtected
    || right.specificity - left.specificity
    || domainRank.get(left.row.domain) - domainRank.get(right.row.domain)
    || Number(right.row.confidence) - Number(left.row.confidence)
    || new Date(right.row.approved_at).getTime() - new Date(left.row.approved_at).getTime()
    || left.row.identity_key.localeCompare(right.row.identity_key)
    || Number(right.row.version) - Number(left.row.version);
}

function createKnowledgeSliceService({ persistence, clock = () => new Date() }) {
  async function getKnowledgeSlice(request) {
    const businessId = required(request?.businessId, "businessId");
    const runtimeModule = required(request?.module, "module");
    required(request?.task, "task");
    const allowlist = getModuleDomainAllowlist(runtimeModule);
    const allowedDomains = new Set(allowlist);
    const domainRank = new Map(allowlist.map((domain, index) => [domain, index]));
    const requestScope = normalizeScope(businessId, request?.scope);
    const asOf = request?.asOf ? normalizeDate(request.asOf, "asOf") : normalizeDate(clock(), "clock");
    const maxItems = normalizeMaxItems(request?.maxItems);
    const inputs = await persistence.loadKnowledgeSliceInputs(businessId);
    const versions = inputs?.versions || [];
    const evidence = inputs?.evidence || [];
    const conflicts = (inputs?.conflicts || []).filter((conflict) => conflict.status === "open");
    const openConflictIdentities = new Set(conflicts.map((conflict) => conflict.identity_key));
    const supersededIds = new Set(versions.map((version) => version.supersedes).filter(Boolean));
    const diagnostics = {
      excludedByDomain: 0,
      excludedByScope: 0,
      excludedByValidity: 0,
      excludedByStatus: Number(inputs?.unapprovedCount || 0),
      unresolvedConflictCount: conflicts.length,
      truncated: false,
    };
    const eligible = [];

    for (const row of versions) {
      if (row.business_id !== businessId || row.status !== "approved" || supersededIds.has(row.id)) {
        diagnostics.excludedByStatus += 1;
        continue;
      }
      const validFrom = row.valid_from ? new Date(row.valid_from) : null;
      const validUntil = row.valid_until ? new Date(row.valid_until) : null;
      if ((validFrom && validFrom > asOf) || (validUntil && validUntil <= asOf)) {
        diagnostics.excludedByValidity += 1;
        continue;
      }
      const specificity = scopeSpecificity(row.scope || {}, requestScope);
      if (specificity < 0) {
        diagnostics.excludedByScope += 1;
        continue;
      }
      if (!allowedDomains.has(row.domain)) {
        diagnostics.excludedByDomain += 1;
        continue;
      }
      if (openConflictIdentities.has(row.identity_key)) continue;
      eligible.push({ row, specificity });
    }

    eligible.sort((left, right) => compareEligible(left, right, domainRank));
    diagnostics.truncated = eligible.length > maxItems;
    const selected = eligible.slice(0, maxItems).map(({ row }) => ({
      knowledgeId: row.id,
      identityKey: row.identity_key,
      domain: row.domain,
      value: row.value,
      version: Number(row.version),
      confidence: Number(row.confidence),
      sourceIds: [...new Set(evidence
        .filter((item) => item.version_id === row.id)
        .map((item) => item.source_id))].sort(),
      validAt: asOf.toISOString(),
    }));

    return Object.freeze({
      businessId,
      items: Object.freeze(selected),
      diagnostics: Object.freeze(diagnostics),
      generatedAt: normalizeDate(clock(), "clock").toISOString(),
    });
  }

  return Object.freeze({ getKnowledgeSlice });
}

module.exports = {
  DEFAULT_MAX_ITEMS,
  HARD_MAX_ITEMS,
  createKnowledgeSliceService,
  normalizeMaxItems,
  scopeSpecificity,
};
