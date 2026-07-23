const { PROTECTED_DOMAINS, getModuleDomainAllowlist } = require("./moduleDomainAllowlists");
const { getModuleMarketDomainAllowlist } = require("../market/slicing/moduleMarketDomainAllowlists");
const { getModuleLearningDomainAllowlist } = require("../learning/slicing/moduleLearningDomainAllowlists");

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
  for (const field of ["geography", "segment", "category", "channel", "audience", "offer", "goal", "market"]) {
    if (scope?.[field]) normalized[field] = required(scope[field], `scope.${field}`)
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }
  return normalized;
}

function scopeSpecificity(itemScope, requestScope) {
  if (itemScope?.businessId !== requestScope.businessId) return -1;
  let specificity = 0;
  for (const field of ["brandId", "productId", "geography", "segment", "category", "channel", "audience", "offer", "goal", "market"]) {
    if (!itemScope?.[field]) continue;
    if (!requestScope[field] || itemScope[field] !== requestScope[field]) return -1;
    specificity += 1;
  }
  return specificity;
}

function compareEligible(left, right, domainRank) {
  const leftProtected = left.memoryKind === "business" && PROTECTED_DOMAINS.includes(left.row.domain) ? 1 : 0;
  const rightProtected = right.memoryKind === "business" && PROTECTED_DOMAINS.includes(right.row.domain) ? 1 : 0;
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
    const marketAllowlist = getModuleMarketDomainAllowlist(runtimeModule);
    const learningAllowlist = getModuleLearningDomainAllowlist(runtimeModule);
    const allowedDomains = new Set(allowlist);
    const allowedMarketDomains = new Set(marketAllowlist);
    const allowedLearningDomains = new Set(learningAllowlist);
    const domainRank = new Map([...allowlist, ...marketAllowlist, ...learningAllowlist].map((domain, index) => [domain, index]));
    const requestScope = normalizeScope(businessId, request?.scope);
    const asOf = request?.asOf ? normalizeDate(request.asOf, "asOf") : normalizeDate(clock(), "clock");
    const maxItems = normalizeMaxItems(request?.maxItems);
    const inputs = await persistence.loadKnowledgeSliceInputs(businessId);
    const marketInputs = typeof persistence.loadMarketSliceInputs === "function"
      ? await persistence.loadMarketSliceInputs(businessId)
      : { versions: [], evidence: [], conflicts: [], unapprovedCount: 0 };
    const learningInputs = typeof persistence.loadLearningSliceInputs === "function"
      ? await persistence.loadLearningSliceInputs(businessId)
      : { versions: [], evidence: [], conflicts: [], decay: [], unapprovedCount: 0 };
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
      marketExcludedByDomain: 0,
      marketExcludedByScope: 0,
      marketExcludedByValidity: 0,
      marketExcludedByStatus: Number(marketInputs?.unapprovedCount || 0),
      marketUnresolvedConflictCount: (marketInputs?.conflicts || []).length,
      learningExcludedByDomain: 0,
      learningExcludedByScope: 0,
      learningExcludedByValidity: 0,
      learningExcludedByStatus: Number(learningInputs?.unapprovedCount || 0),
      learningExcludedByDecay: 0,
      learningUnresolvedConflictCount: (learningInputs?.conflicts || []).length,
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
      eligible.push({ row, specificity, memoryKind: "business" });
    }

    const marketVersions = marketInputs?.versions || [];
    const marketEvidence = marketInputs?.evidence || [];
    const marketConflicts = (marketInputs?.conflicts || []).filter((item) => item.status === "open");
    const marketConflictIdentities = new Set(marketConflicts.map((item) => item.identity_key));
    const marketSuperseded = new Set(marketVersions.map((item) => item.supersedes).filter(Boolean));
    for (const row of marketVersions) {
      if (row.business_id !== businessId || row.status !== "approved" || marketSuperseded.has(row.id)) {
        diagnostics.marketExcludedByStatus += 1; continue;
      }
      const validFrom = row.valid_from ? new Date(row.valid_from) : null;
      const validUntil = row.valid_until ? new Date(row.valid_until) : null;
      if ((validFrom && validFrom > asOf) || (validUntil && validUntil <= asOf)) {
        diagnostics.marketExcludedByValidity += 1; continue;
      }
      const specificity = scopeSpecificity(row.scope || {}, requestScope);
      if (specificity < 0) { diagnostics.marketExcludedByScope += 1; continue; }
      if (!allowedMarketDomains.has(row.domain)) { diagnostics.marketExcludedByDomain += 1; continue; }
      if (marketConflictIdentities.has(row.identity_key)) continue;
      eligible.push({ row, specificity, memoryKind: "market" });
    }

    const learningVersions = learningInputs?.versions || [];
    const learningEvidence = learningInputs?.evidence || [];
    const learningConflicts = (learningInputs?.conflicts || []).filter((item) => item.status === "open");
    const learningConflictIdentities = new Set(learningConflicts.map((item) => item.identity_key));
    const learningSuperseded = new Set(learningVersions.map((item) => item.supersedes).filter(Boolean));
    const latestDecay = new Map();
    for (const item of learningInputs?.decay || []) if (!latestDecay.has(item.version_id)) latestDecay.set(item.version_id, item);
    for (const row of learningVersions) {
      if (row.business_id !== businessId || row.status !== "approved" || learningSuperseded.has(row.id)) { diagnostics.learningExcludedByStatus += 1; continue; }
      const validFrom = row.valid_from ? new Date(row.valid_from) : null; const validUntil = row.valid_until ? new Date(row.valid_until) : null;
      if ((validFrom && validFrom > asOf) || (validUntil && validUntil <= asOf)) { diagnostics.learningExcludedByValidity += 1; continue; }
      const decay = latestDecay.get(row.id); if (decay && !decay.eligible) { diagnostics.learningExcludedByDecay += 1; continue; }
      const specificity = scopeSpecificity(row.scope || {}, requestScope); if (specificity < 0) { diagnostics.learningExcludedByScope += 1; continue; }
      if (!allowedLearningDomains.has(row.domain)) { diagnostics.learningExcludedByDomain += 1; continue; }
      if (learningConflictIdentities.has(row.identity_key)) continue;
      eligible.push({ row: { ...row, value: row.conclusion, confidence: decay ? decay.decayed_confidence : row.confidence }, specificity, memoryKind: "learning" });
    }

    eligible.sort((left, right) => compareEligible(left, right, domainRank));
    diagnostics.truncated = eligible.length > maxItems;
    const selected = eligible.slice(0, maxItems).map(({ row, memoryKind }) => ({
      knowledgeId: row.id,
      memoryKind,
      identityKey: row.identity_key,
      domain: row.domain,
      value: row.value,
      version: Number(row.version),
      confidence: Number(row.confidence),
      sourceIds: [...new Set((memoryKind === "market" ? marketEvidence : memoryKind === "learning" ? learningEvidence : evidence)
        .filter((item) => item.version_id === row.id)
        .map((item) => item.source_id || item.observation_id))].sort(),
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
