const { randomUUID } = require("node:crypto");
const { runTextProvider } = require("../../providers");
const { NORMALIZER_VERSION } = require("../normalization");
const { emitKnowledgeLifecycleEvent } = require("../observability/emitKnowledgeLifecycleEvent");
const { synthesizeCandidateGroups } = require("../synthesis/synthesizeCandidateGroups");
const { buildKnowledgeExtractionPrompt } = require("./buildKnowledgeExtractionPrompt");
const { validateExtractedClaims } = require("./validateExtractedClaims");

const EXTRACTOR_VERSION = "knowledge-extractor-v1";

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function mapCandidate(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    identityKey: row.identity_key,
    domain: row.domain,
    subjectKey: row.subject_key,
    claimKey: row.claim_key,
    value: row.value,
    confidence: Number(row.confidence || 0),
    scope: row.scope,
    validity: { validFrom: row.valid_from || null, validUntil: row.valid_until || null },
    status: row.status,
    sourceEvidence: row.evidence || [],
    createdAt: row.created_at,
  };
}

function createExtractionService({ persistence, provider = runTextProvider, logger = console }) {
  async function synthesizeKnowledge(businessId, identityKeys, actorId, correlationId = randomUUID()) {
    const inputs = await persistence.loadSynthesisCandidates(businessId, identityKeys);
    const results = synthesizeCandidateGroups(inputs);
    for (const result of results) {
      await persistence.saveSynthesisResult({
        businessId,
        identityKey: result.identityKey,
        updates: result.updates,
        conflict: result.conflict,
        actorId,
        correlationId,
      });
    }
    return results;
  }

  async function extractCandidateClaims(input) {
    const startedAt = Date.now();
    const businessId = required(input?.businessId, "businessId");
    const sourceId = required(input?.sourceId, "sourceId");
    const actorId = required(input?.actorId, "actorId");
    const correlationId = input.correlationId || randomUUID();
    const source = await persistence.getSource(businessId, sourceId);
    if (!source) throw new Error("knowledge source not found");
    const normalization = await persistence.getNormalization(businessId, sourceId, NORMALIZER_VERSION);
    if (!normalization) throw new Error("normalized source is required before extraction");

    const { systemPrompt, userPrompt } = buildKnowledgeExtractionPrompt({ source, normalization });
    const providerResult = await provider({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 3000,
      responseFormat: "json_object",
    });
    const validated = validateExtractedClaims({
      providerText: providerResult?.text,
      businessId,
      sourceId,
      sections: normalization.sections || [],
    });
    if (validated.claims.length === 0) {
      throw new Error("provider returned no source-backed candidate claims");
    }

    const persisted = [];
    for (const claim of validated.claims) {
      const row = await persistence.persistExtractedCandidate({
        ...claim,
        businessId,
        sourceId,
        extractorVersion: EXTRACTOR_VERSION,
        actorId,
        correlationId,
      });
      persisted.push(row);
    }
    const identityKeys = [...new Set(persisted.map((row) => row.identity_key))];
    await synthesizeKnowledge(businessId, identityKeys, actorId, correlationId);
    const refreshed = await persistence.loadReviewCandidates(businessId, identityKeys);

    emitKnowledgeLifecycleEvent(logger, {
      correlationId,
      businessId,
      sourceId,
      stage: "candidate_claims_extracted",
      processorVersion: EXTRACTOR_VERSION,
      inputCount: normalization.normalized_text.length,
      outputCount: refreshed.length,
      warningCount: validated.diagnostics.length,
      durationMs: Date.now() - startedAt,
    });
    return {
      candidates: refreshed.map(mapCandidate),
      diagnostics: validated.diagnostics,
      provider: {
        name: providerResult?.provider || "unknown",
        model: providerResult?.model || "unknown",
        latencyMs: Number(providerResult?.latencyMs || 0),
        usage: providerResult?.usage || {},
      },
    };
  }

  async function listKnowledgeReviewQueue(businessId) {
    const [candidates, conflicts] = await Promise.all([
      persistence.loadReviewCandidates(required(businessId, "businessId")),
      persistence.loadOpenConflicts(businessId),
    ]);
    return { candidates: candidates.map(mapCandidate), conflicts };
  }

  return Object.freeze({
    extractCandidateClaims,
    listKnowledgeReviewQueue,
    synthesizeKnowledge,
  });
}

module.exports = { EXTRACTOR_VERSION, createExtractionService };
