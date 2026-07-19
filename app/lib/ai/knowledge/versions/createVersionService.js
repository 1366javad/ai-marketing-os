const { validateCandidateForPromotion } = require("../validation/validateCandidateForPromotion");

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function mapVersion(row) {
  if (!row) return null;
  return {
    id: row.id,
    businessId: row.business_id,
    identityKey: row.identity_key,
    domain: row.domain,
    subjectKey: row.subject_key,
    claimKey: row.claim_key,
    value: row.value,
    version: Number(row.version),
    status: row.status,
    confidence: Number(row.confidence),
    scope: row.scope,
    validity: { validFrom: row.valid_from || null, validUntil: row.valid_until || null },
    sourceEvidence: row.evidence || [],
    conflictIds: row.conflict_ids || [],
    supersedes: row.supersedes || null,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
  };
}

function createVersionService({ persistence }) {
  async function approveKnowledgeCandidate(input) {
    const businessId = required(input?.businessId, "businessId");
    const candidateId = required(input?.candidateId, "candidateId");
    const actorId = required(input?.actorId, "actorId");
    const candidate = await persistence.getCandidateForPromotion(businessId, candidateId);
    if (!candidate) throw new Error("knowledge candidate not found");
    const validation = validateCandidateForPromotion(candidate);
    if (!validation.valid) {
      const error = new Error(`candidate validation failed: ${validation.issues.join(", ")}`);
      error.code = "candidate_validation_failed";
      throw error;
    }
    return mapVersion(await persistence.approveCandidate({
      businessId,
      candidateId,
      actorId,
      reason: required(input?.reason, "reason"),
      validFrom: input.validFrom || candidate.validity.validFrom,
      validUntil: input.validUntil || candidate.validity.validUntil,
      correlationId: input.correlationId || null,
    }));
  }

  async function rejectKnowledgeCandidate(input) {
    return persistence.rejectCandidate({
      businessId: required(input?.businessId, "businessId"),
      candidateId: required(input?.candidateId, "candidateId"),
      actorId: required(input?.actorId, "actorId"),
      reason: required(input?.reason, "reason"),
      correlationId: input.correlationId || null,
    });
  }

  async function resolveKnowledgeConflict(input) {
    return persistence.resolveConflict({
      businessId: required(input?.businessId, "businessId"),
      conflictId: required(input?.conflictId, "conflictId"),
      selectedCandidateId: required(input?.selectedCandidateId, "selectedCandidateId"),
      actorId: required(input?.actorId, "actorId"),
      reason: required(input?.reason, "reason"),
      correlationId: input.correlationId || null,
    });
  }

  async function revokeKnowledgeVersion(input) {
    return mapVersion(await persistence.revokeVersion({
      businessId: required(input?.businessId, "businessId"),
      versionId: required(input?.versionId, "versionId"),
      actorId: required(input?.actorId, "actorId"),
      reason: required(input?.reason, "reason"),
      correlationId: input.correlationId || null,
    }));
  }

  async function getKnowledgeHistory(businessId, identityKey) {
    return (await persistence.getVersionHistory(
      required(businessId, "businessId"),
      required(identityKey, "identityKey"),
    )).map(mapVersion);
  }

  async function listBusinessKnowledge(businessId) {
    return (await persistence.listKnowledgeVersions(required(businessId, "businessId"))).map(mapVersion);
  }

  return Object.freeze({
    approveKnowledgeCandidate,
    getKnowledgeHistory,
    listBusinessKnowledge,
    rejectKnowledgeCandidate,
    resolveKnowledgeConflict,
    revokeKnowledgeVersion,
  });
}

module.exports = { createVersionService, mapVersion };
