const { randomUUID } = require("node:crypto");
const { KNOWLEDGE_DOMAINS, assertEnum } = require("../contracts");
const { emitKnowledgeLifecycleEvent } = require("../observability/emitKnowledgeLifecycleEvent");

const CANDIDATE_UPDATE_SOURCE_KINDS = Object.freeze([
  "campaign_event",
  "analytics_observation",
  "human_note",
]);
const REVIEW_ACTIONS = Object.freeze(["start_review", "accept_for_validation", "reject"]);

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function mapCandidateUpdate(row) {
  if (!row) return null;
  return {
    id: row.id,
    businessId: row.business_id,
    proposedDomain: row.proposed_domain,
    proposedIdentityKey: row.proposed_identity_key,
    proposedValue: row.proposed_value,
    source: {
      kind: row.source_kind,
      referenceId: row.source_reference_id,
    },
    evidence: row.evidence || [],
    status: row.status,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function validateProposedValue(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  throw new TypeError("proposedValue must be a non-empty string or object");
}

function validateEvidence(value) {
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new TypeError("evidence must be an array of objects");
  }
  return value;
}

function createCandidateUpdateService({ persistence, logger = console }) {
  async function createCandidateUpdate(input) {
    const startedAt = Date.now();
    const businessId = required(input?.businessId, "businessId");
    const actorId = required(input?.createdBy || input?.actorId, "createdBy");
    const proposedDomain = assertEnum(
      "proposedDomain",
      input?.proposedDomain,
      KNOWLEDGE_DOMAINS,
    );
    const sourceKind = assertEnum(
      "source.kind",
      input?.source?.kind,
      CANDIDATE_UPDATE_SOURCE_KINDS,
    );
    const correlationId = input?.correlationId || randomUUID();
    const row = await persistence.createCandidateUpdate({
      businessId,
      proposedDomain,
      proposedIdentityKey: required(input?.proposedIdentityKey, "proposedIdentityKey"),
      proposedValue: validateProposedValue(input?.proposedValue),
      sourceKind,
      sourceReferenceId: required(input?.source?.referenceId, "source.referenceId"),
      evidence: validateEvidence(input?.evidence || []),
      actorId,
      correlationId,
    });
    emitKnowledgeLifecycleEvent(logger, {
      correlationId,
      businessId,
      candidateId: row.id,
      stage: "candidate_update_created",
      inputCount: 1,
      outputCount: 1,
      evidenceCount: row.evidence?.length || 0,
      durationMs: Date.now() - startedAt,
    });
    return mapCandidateUpdate(row);
  }

  async function reviewCandidateUpdate(input) {
    const action = assertEnum("action", input?.action, REVIEW_ACTIONS);
    const businessId = required(input?.businessId, "businessId");
    const candidateUpdateId = required(input?.candidateUpdateId, "candidateUpdateId");
    const correlationId = input?.correlationId || randomUUID();
    const row = await persistence.reviewCandidateUpdate({
      businessId,
      candidateUpdateId,
      action,
      actorId: required(input?.actorId, "actorId"),
      reason: required(input?.reason, "reason"),
      correlationId,
    });
    emitKnowledgeLifecycleEvent(logger, {
      correlationId,
      businessId,
      candidateId: candidateUpdateId,
      stage: `candidate_update_${row.status}`,
      inputCount: 1,
      outputCount: 1,
    });
    return mapCandidateUpdate(row);
  }

  async function listCandidateUpdates(businessId) {
    return (await persistence.loadCandidateUpdates(
      required(businessId, "businessId"),
    )).map(mapCandidateUpdate);
  }

  return Object.freeze({
    createCandidateUpdate,
    listCandidateUpdates,
    reviewCandidateUpdate,
  });
}

module.exports = {
  CANDIDATE_UPDATE_SOURCE_KINDS,
  REVIEW_ACTIONS,
  createCandidateUpdateService,
  mapCandidateUpdate,
};
