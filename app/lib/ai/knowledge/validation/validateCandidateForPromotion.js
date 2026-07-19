const { KNOWLEDGE_DOMAINS } = require("../contracts");

function validateCandidateForPromotion(candidate) {
  const issues = [];
  if (!candidate?.id || !candidate?.business_id || !candidate?.identity_key) issues.push("invalid_identity");
  if (!KNOWLEDGE_DOMAINS.includes(candidate?.domain)) issues.push("invalid_domain");
  if (!candidate?.scope || candidate.scope.businessId !== candidate.business_id) issues.push("invalid_scope");
  if (!candidate?.validity || !("validFrom" in candidate.validity) || !("validUntil" in candidate.validity)) {
    issues.push("missing_validity_state");
  }
  if (!Array.isArray(candidate?.evidence) || candidate.evidence.length === 0) issues.push("missing_evidence");
  if (candidate?.openConflict) issues.push("open_conflict");
  if (candidate?.status !== "candidate") issues.push("candidate_not_approvable");
  return Object.freeze({ valid: issues.length === 0, issues });
}

module.exports = { validateCandidateForPromotion };
