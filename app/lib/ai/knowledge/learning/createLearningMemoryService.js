const { randomUUID } = require("node:crypto");
const { emitKnowledgeLifecycleEvent } = require("../observability/emitKnowledgeLifecycleEvent");
const { calculateLearningConfidence, confidenceBand } = require("./confidence/calculateLearningConfidence");
const { buildLearningIdentity, hashLearningValue } = require("./domain/buildLearningIdentity");
const { mapHypothesis, mapLearningVersion, mapObservation } = require("./domain/models");
const { EVIDENCE_ROLES, OBSERVATION_SOURCES, assertLearningEnum } = require("./contracts");
const VALIDATION_POLICY = "learning-validation-v1"; const DECAY_POLICY = "learning-decay-v1";
function required(value, field) { const text = String(value || "").trim(); if (!text) throw new TypeError(`${field} is required`); return text; }
function object(value, field) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} must be an object`); return value; }
function createLearningMemoryService({ persistence, logger = console, clock = () => new Date() }) {
  async function registerLearningObservation(input) {
    const businessId = required(input?.businessId, "businessId"); const actorId = required(input?.actorId || input?.createdBy, "actorId");
    const sourceKind = assertLearningEnum("sourceKind", input?.sourceKind, OBSERVATION_SOURCES);
    const row = await persistence.registerLearningObservation({ businessId, sourceKind, sourceReferenceId: required(input?.sourceReferenceId, "sourceReferenceId"), campaignId: input?.campaignId || null, experimentId: input?.experimentId || null, metric: required(input?.metric, "metric"), value: object(input?.value, "value"), unit: required(input?.unit, "unit"), sampleBasis: object(input?.sampleBasis, "sampleBasis"), scope: object(input?.scope, "scope"), observedAt: input?.observedAt || clock().toISOString(), collectionWindow: object(input?.collectionWindow, "collectionWindow"), attributionMethod: required(input?.attributionMethod, "attributionMethod"), reliability: Math.max(0, Math.min(1, Number(input?.reliability || 0))), provenanceHash: required(input?.provenanceHash, "provenanceHash"), metadata: input?.metadata || {}, actorId, correlationId: input?.correlationId || randomUUID() });
    emitKnowledgeLifecycleEvent(logger, { correlationId: input?.correlationId, businessId, sourceId: row.id, stage: row.duplicate ? "learning_observation_duplicate" : "learning_observation_registered", inputCount: 1, outputCount: row.duplicate ? 0 : 1 });
    return mapObservation(row);
  }
  async function registerLearningHypothesis(input) {
    const identity = buildLearningIdentity(input || {}); const actorId = required(input?.actorId || input?.createdBy, "actorId");
    const observationIds = [...new Set(input?.observationIds || [])].map((id) => required(id, "observationId"));
    if (!observationIds.length) throw new TypeError("at least one observation is required");
    return mapHypothesis(await persistence.registerLearningHypothesis({ ...identity, statement: required(input?.statement, "statement"), expectedOutcome: object(input?.expectedOutcome, "expectedOutcome"), statementHash: hashLearningValue(input.statement), evidenceWindowStart: input?.evidenceWindow?.start || null, evidenceWindowEnd: input?.evidenceWindow?.end || null, observationIds, actorId, correlationId: input?.correlationId || randomUUID() }));
  }
  async function attachLearningEvidence(input) {
    return persistence.attachLearningEvidence({ businessId: required(input?.businessId, "businessId"), hypothesisId: required(input?.hypothesisId, "hypothesisId"), observationId: required(input?.observationId, "observationId"), role: assertLearningEnum("role", input?.role, EVIDENCE_ROLES), rationale: required(input?.rationale, "rationale"), actorId: required(input?.actorId, "actorId"), correlationId: input?.correlationId || randomUUID() });
  }
  async function validateLearningHypothesis(input) {
    const businessId = required(input?.businessId, "businessId"); const hypothesisId = required(input?.hypothesisId, "hypothesisId"); const actorId = required(input?.actorId, "actorId");
    const bundle = await persistence.loadLearningValidationBundle(businessId, hypothesisId); if (!bundle?.hypothesis) throw new Error("learning hypothesis not found");
    const evidence = bundle.evidence || []; const campaigns = new Set(evidence.map((item) => item.campaign_id).filter(Boolean)); const experiments = new Set(evidence.map((item) => item.experiment_id).filter(Boolean));
    const independent = new Set(evidence.map((item) => `${item.source_kind}:${item.source_reference_id}`)); const supporting = evidence.filter((x) => x.role === "supporting").length; const contradicting = evidence.filter((x) => x.role === "contradicting").length;
    const comparable = evidence.filter((x) => x.scope_compatible !== false).length; const sufficient = evidence.length >= 2 && (campaigns.size >= 2 || experiments.size >= 1) && supporting >= 2;
    const confidence = calculateLearningConfidence({ reliability: evidence.reduce((sum, x) => sum + Number(x.reliability || 0), 0) / Math.max(1, evidence.length), sufficiency: Math.min(1, evidence.length / 4), independence: Math.min(1, independent.size / Math.max(2, evidence.length)), repeatability: Math.min(1, Math.max(campaigns.size, experiments.size * 2) / 3), consistency: supporting / Math.max(1, supporting + contradicting), scopeFit: comparable / Math.max(1, evidence.length), recency: 1, contradiction: contradicting / Math.max(1, evidence.length) });
    const conflict = supporting > 0 && contradicting > 0; const status = sufficient && !conflict && confidence >= .5 ? "validated" : "needs_review";
    const result = { businessId, hypothesisId, status, confidence, confidenceBand: confidenceBand(confidence), validationPolicy: VALIDATION_POLICY, evidenceCount: evidence.length, independentSourceCount: independent.size, campaignCount: campaigns.size, conflict, diagnostics: { sufficient, supporting, contradicting, comparable }, actorId, correlationId: input?.correlationId || randomUUID() };
    return persistence.saveLearningValidation(result);
  }
  async function consolidateLearning(input) {
    const businessId = required(input?.businessId, "businessId"); const results = [];
    for (const hypothesis of await persistence.listLearningHypothesesForValidation(businessId)) results.push(await validateLearningHypothesis({ businessId, hypothesisId: hypothesis.id, actorId: required(input?.actorId, "actorId"), correlationId: input?.correlationId }));
    return results;
  }
  async function approveLearningHypothesis(input) { return mapLearningVersion(await persistence.approveLearningHypothesis({ businessId: required(input?.businessId, "businessId"), hypothesisId: required(input?.hypothesisId, "hypothesisId"), conclusion: object(input?.conclusion, "conclusion"), actorId: required(input?.actorId, "actorId"), reason: required(input?.reason, "reason"), validFrom: input?.validFrom || null, validUntil: input?.validUntil || null, decayPolicy: input?.decayPolicy || { id: DECAY_POLICY, halfLifeDays: 90, minimumConfidence: .5 }, correlationId: input?.correlationId || randomUUID() })); }
  async function rejectLearningHypothesis(input) { return persistence.rejectLearningHypothesis({ businessId: required(input?.businessId, "businessId"), hypothesisId: required(input?.hypothesisId, "hypothesisId"), actorId: required(input?.actorId, "actorId"), reason: required(input?.reason, "reason"), correlationId: input?.correlationId || randomUUID() }); }
  async function assessLearningDecay(input) { const businessId = required(input?.businessId, "businessId"); const asOf = input?.asOf ? new Date(input.asOf) : clock(); if (Number.isNaN(asOf.getTime())) throw new TypeError("asOf must be a date"); return persistence.assessLearningDecay({ businessId, asOf: asOf.toISOString(), policyVersion: DECAY_POLICY, actorId: required(input?.actorId, "actorId"), correlationId: input?.correlationId || randomUUID() }); }
  async function resolveLearningConflict(input) { return persistence.resolveLearningConflict({ businessId: required(input?.businessId, "businessId"), conflictId: required(input?.conflictId, "conflictId"), selectedHypothesisId: required(input?.selectedHypothesisId, "selectedHypothesisId"), actorId: required(input?.actorId, "actorId"), reason: required(input?.reason, "reason"), correlationId: input?.correlationId || randomUUID() }); }
  async function transitionLearningVersion(input) { return mapLearningVersion(await persistence.transitionLearningVersion({ businessId: required(input?.businessId, "businessId"), versionId: required(input?.versionId, "versionId"), status: assertLearningEnum("status", input?.status, ["revoked", "expired", "archived", "retired"]), actorId: required(input?.actorId, "actorId"), reason: required(input?.reason, "reason"), correlationId: input?.correlationId || randomUUID() })); }
  async function createLearningCandidateUpdate(input) { return persistence.createLearningCandidateUpdate({ businessId: required(input?.businessId, "businessId"), proposedDomain: required(input?.proposedDomain, "proposedDomain"), proposedIdentityKey: required(input?.proposedIdentityKey, "proposedIdentityKey"), proposedValue: object(input?.proposedValue, "proposedValue"), sourceKind: assertLearningEnum("sourceKind", input?.source?.kind, OBSERVATION_SOURCES), sourceReferenceId: required(input?.source?.referenceId, "source.referenceId"), evidence: Array.isArray(input?.evidence) ? input.evidence : [], actorId: required(input?.actorId, "actorId"), correlationId: input?.correlationId || randomUUID() }); }
  async function listLearningReviewQueue(businessId) { return persistence.loadLearningReviewQueue(required(businessId, "businessId")); }
  async function listLearningMemory(businessId) { return (await persistence.listLearningVersions(required(businessId, "businessId"))).map(mapLearningVersion); }
  async function getLearningMemoryHistory(businessId, identityKey) { return (await persistence.getLearningVersionHistory(required(businessId, "businessId"), required(identityKey, "identityKey"))).map(mapLearningVersion); }
  return Object.freeze({ assessLearningDecay, approveLearningHypothesis, attachLearningEvidence, consolidateLearning, createLearningCandidateUpdate, getLearningMemoryHistory, listLearningMemory, listLearningReviewQueue, registerLearningHypothesis, registerLearningObservation, rejectLearningHypothesis, resolveLearningConflict, transitionLearningVersion, validateLearningHypothesis });
}
module.exports = { DECAY_POLICY, VALIDATION_POLICY, createLearningMemoryService };
