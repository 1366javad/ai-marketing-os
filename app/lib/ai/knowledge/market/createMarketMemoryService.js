const { randomUUID } = require("node:crypto");
const { runTextProvider } = require("../../providers");
const { normalizeSourceContent } = require("../normalization");
const { normalizeText } = require("../normalization/normalizeText");
const { hashSourceContent, toSourceBuffer } = require("../sources/hashSourceContent");
const { emitKnowledgeLifecycleEvent } = require("../observability/emitKnowledgeLifecycleEvent");
const { calculateMarketConfidence, confidenceBand } = require("./confidence/calculateMarketConfidence");
const { buildMarketExtractionPrompt } = require("./extraction/buildMarketExtractionPrompt");
const { validateMarketCandidates } = require("./extraction/validateMarketCandidates");
const { mapMarketCandidate, mapMarketSource, mapMarketVersion } = require("./domain/models");
const {
  MARKET_DOMAINS, MARKET_MEMORY_TYPES, MARKET_SOURCE_AUTHORITIES,
  MARKET_SOURCE_CATEGORIES, MARKET_SOURCE_KINDS, assertMarketEnum,
} = require("./contracts");

const MARKET_NORMALIZER_VERSION = "market-normalizer-v1";
const MARKET_EXTRACTOR_VERSION = "market-extractor-v1";
const MAX_MARKET_SOURCE_BYTES = 5 * 1024 * 1024;

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function createMarketMemoryService({ persistence, provider = runTextProvider, logger = console, clock = () => new Date() }) {
  async function registerMarketSource(input) {
    const content = toSourceBuffer(input?.content);
    if (!content.length) throw new TypeError("content is required");
    if (content.length > MAX_MARKET_SOURCE_BYTES) throw new RangeError("market source content exceeds 5 MB");
    const businessId = required(input?.businessId, "businessId");
    const actorId = required(input?.createdBy, "createdBy");
    const correlationId = input?.correlationId || randomUUID();
    const row = await persistence.registerMarketSource({
      businessId,
      sourceKind: assertMarketEnum("sourceKind", input.sourceKind, MARKET_SOURCE_KINDS),
      sourceCategory: assertMarketEnum("sourceCategory", input.sourceCategory, MARKET_SOURCE_CATEGORIES),
      title: required(input.title, "title"),
      originalReference: required(input.originalReference, "originalReference"),
      publisher: required(input.publisher, "publisher"),
      authority: assertMarketEnum("authority", input.authority || "unverified", MARKET_SOURCE_AUTHORITIES),
      accessBasis: required(input.accessBasis, "accessBasis"),
      captureMethod: required(input.captureMethod, "captureMethod"),
      contentHash: hashSourceContent(content),
      capturedAt: input.capturedAt || clock().toISOString(),
      publishedAt: input.publishedAt || null,
      metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
      contentBase64: content.toString("base64"),
      contentEncoding: Buffer.isBuffer(input.content) ? "binary" : "utf8",
      actorId, correlationId,
    });
    emitKnowledgeLifecycleEvent(logger, {
      correlationId, businessId, sourceId: row.id || row.source_id,
      stage: row.duplicate ? "market_source_duplicate" : "market_source_registered",
      inputCount: content.length, outputCount: row.duplicate ? 0 : 1,
    });
    return mapMarketSource(row);
  }

  async function normalizeMarketSource(input) {
    const businessId = required(input?.businessId, "businessId");
    const sourceId = required(input?.sourceId, "sourceId");
    const actorId = required(input?.actorId, "actorId");
    const source = await persistence.getMarketSource(businessId, sourceId);
    if (!source) throw new Error("market source not found");
    const payload = await persistence.getMarketSourcePayload(businessId, sourceId);
    if (!payload?.content_base64) throw new Error("market source payload not found");
    const existing = await persistence.getMarketNormalization(
      businessId,
      sourceId,
      MARKET_NORMALIZER_VERSION,
      payload.id || payload.capture_id,
    );
    if (existing) return { ...existing, idempotent: true };
    const buffer = Buffer.from(payload.content_base64, "base64");
    const raw = payload.content_encoding === "binary" ? buffer : buffer.toString("utf8");
    const normalized = source.source_kind === "structured_dataset"
      ? normalizeText(typeof raw === "string" ? raw : raw.toString("utf8"))
      : normalizeSourceContent(source.source_kind, raw);
    if (!normalized.normalizedText) throw new Error("market normalization produced empty content");
    return {
      ...(await persistence.saveMarketNormalization({
        businessId, sourceId, captureId: payload.id || payload.capture_id, normalizedText: normalized.normalizedText,
        language: input.language || (/[؀-ۿ]/.test(normalized.normalizedText) ? "fa" : "en"),
        sections: normalized.sections, warnings: normalized.warnings,
        normalizerVersion: MARKET_NORMALIZER_VERSION, actorId,
        correlationId: input.correlationId || randomUUID(),
      })), idempotent: false,
    };
  }

  async function synthesizeMarketCandidates(businessId, identityKeys, actorId, correlationId) {
    const groups = await persistence.loadMarketSynthesisCandidates(businessId, identityKeys);
    const byIdentity = new Map();
    for (const candidate of groups) {
      if (!byIdentity.has(candidate.identityKey)) byIdentity.set(candidate.identityKey, []);
      byIdentity.get(candidate.identityKey).push(candidate);
    }
    const results = [];
    for (const [identityKey, candidates] of byIdentity) {
      const allSources = new Set(candidates.flatMap((candidate) => candidate.evidence.map((item) => item.sourceId)));
      const conflict = candidates.length > 1;
      const updates = candidates.map((candidate) => {
        const sourceCount = new Set(candidate.evidence.map((item) => item.sourceId)).size;
        const confidence = calculateMarketConfidence({
          authorities: candidate.evidence.map((item) => item.authority),
          independentSources: sourceCount,
          evidenceCoverage: candidate.evidence.length ? 1 : 0,
          recency: 1,
          conflict,
        });
        return { candidateId: candidate.id, confidence, confidenceBand: confidenceBand(confidence), status: conflict ? "needs_review" : "candidate" };
      });
      const result = { identityKey, updates, conflict: conflict ? { kind: "value_conflict", candidateIds: candidates.map((item) => item.id) } : null };
      await persistence.saveMarketSynthesisResult({ businessId, ...result, actorId, correlationId });
      results.push(result);
    }
    return results;
  }

  async function extractMarketCandidates(input) {
    const businessId = required(input?.businessId, "businessId");
    const sourceId = required(input?.sourceId, "sourceId");
    const actorId = required(input?.actorId, "actorId");
    const correlationId = input.correlationId || randomUUID();
    const source = await persistence.getMarketSource(businessId, sourceId);
    const normalization = await persistence.getMarketNormalization(businessId, sourceId, MARKET_NORMALIZER_VERSION);
    if (!source || !normalization) throw new Error("normalized market source is required");
    const prompt = buildMarketExtractionPrompt({ source, normalization });
    const providerResult = await provider({ ...prompt, temperature: 0.1, maxTokens: 3500, responseFormat: "json_object" });
    const validated = validateMarketCandidates({ providerText: providerResult?.text, businessId, sourceId, sections: normalization.sections || [] });
    if (!validated.candidates.length) throw new Error("provider returned no source-backed market candidates");
    const rows = [];
    for (const candidate of validated.candidates) {
      rows.push(await persistence.persistMarketCandidate({
        ...candidate, businessId, sourceId, extractorVersion: MARKET_EXTRACTOR_VERSION,
        actorId, correlationId,
      }));
    }
    const identityKeys = [...new Set(rows.map((row) => row.identity_key))];
    await synthesizeMarketCandidates(businessId, identityKeys, actorId, correlationId);
    return {
      candidates: (await persistence.loadMarketReviewCandidates(businessId, identityKeys)).map(mapMarketCandidate),
      diagnostics: validated.diagnostics,
      provider: { name: providerResult?.provider || "unknown", model: providerResult?.model || "unknown" },
    };
  }

  async function processMarketSource(input) {
    const normalization = await normalizeMarketSource(input);
    const extraction = await extractMarketCandidates(input);
    return { normalization, ...extraction };
  }

  async function listMarketReviewQueue(businessId) {
    return {
      candidates: (await persistence.loadMarketReviewCandidates(required(businessId, "businessId"))).map(mapMarketCandidate),
      conflicts: await persistence.loadMarketConflicts(businessId),
      candidateUpdates: await persistence.loadMarketCandidateUpdates(businessId),
    };
  }

  async function approveMarketCandidate(input) {
    return mapMarketVersion(await persistence.approveMarketCandidate({
      businessId: required(input?.businessId, "businessId"), candidateId: required(input?.candidateId, "candidateId"),
      actorId: required(input?.actorId, "actorId"), reason: required(input?.reason, "reason"),
      validFrom: input.validFrom || null, validUntil: input.validUntil || null,
      correlationId: input.correlationId || randomUUID(),
    }));
  }

  async function rejectMarketCandidate(input) {
    return persistence.rejectMarketCandidate({
      businessId: required(input?.businessId, "businessId"), candidateId: required(input?.candidateId, "candidateId"),
      actorId: required(input?.actorId, "actorId"), reason: required(input?.reason, "reason"),
      correlationId: input.correlationId || randomUUID(),
    });
  }

  async function resolveMarketConflict(input) {
    return persistence.resolveMarketConflict({
      businessId: required(input?.businessId, "businessId"), conflictId: required(input?.conflictId, "conflictId"),
      selectedCandidateId: required(input?.selectedCandidateId, "selectedCandidateId"),
      actorId: required(input?.actorId, "actorId"), reason: required(input?.reason, "reason"),
      correlationId: input.correlationId || randomUUID(),
    });
  }

  async function createMarketCandidateUpdate(input) {
    const proposedDomain = assertMarketEnum("proposedDomain", input?.proposedDomain, MARKET_DOMAINS);
    const memoryType = assertMarketEnum("memoryType", input?.memoryType, MARKET_MEMORY_TYPES);
    return persistence.createMarketCandidateUpdate({
      businessId: required(input?.businessId, "businessId"), proposedDomain, memoryType,
      proposedIdentityKey: required(input?.proposedIdentityKey, "proposedIdentityKey"),
      proposedValue: input?.proposedValue,
      sourceKind: required(input?.source?.kind, "source.kind"),
      sourceReferenceId: required(input?.source?.referenceId, "source.referenceId"),
      evidence: Array.isArray(input?.evidence) ? input.evidence : [],
      actorId: required(input?.actorId || input?.createdBy, "actorId"),
      correlationId: input.correlationId || randomUUID(),
    });
  }

  async function transitionMarketVersion(input) {
    const status = assertMarketEnum("status", input?.status, ["revoked", "expired", "archived", "retired"]);
    return mapMarketVersion(await persistence.transitionMarketVersion({
      businessId: required(input?.businessId, "businessId"), versionId: required(input?.versionId, "versionId"),
      status, actorId: required(input?.actorId, "actorId"), reason: required(input?.reason, "reason"),
      correlationId: input.correlationId || randomUUID(),
    }));
  }

  async function transitionMarketSource(input) {
    const status = assertMarketEnum("status", input?.status, ["paused", "archived", "retired"]);
    return mapMarketSource(await persistence.transitionMarketSource({
      businessId: required(input?.businessId, "businessId"), sourceId: required(input?.sourceId, "sourceId"),
      status, actorId: required(input?.actorId, "actorId"), reason: required(input?.reason, "reason"),
      correlationId: input.correlationId || randomUUID(),
    }));
  }

  async function listMarketSources(businessId) { return (await persistence.listMarketSources(required(businessId, "businessId"))).map(mapMarketSource); }
  async function listMarketMemory(businessId) { return (await persistence.listMarketVersions(required(businessId, "businessId"))).map(mapMarketVersion); }
  async function getMarketMemoryHistory(businessId, identityKey) { return (await persistence.getMarketVersionHistory(required(businessId, "businessId"), required(identityKey, "identityKey"))).map(mapMarketVersion); }

  return Object.freeze({
    approveMarketCandidate, createMarketCandidateUpdate, extractMarketCandidates,
    getMarketMemoryHistory, listMarketMemory, listMarketReviewQueue, listMarketSources,
    normalizeMarketSource, processMarketSource, registerMarketSource,
    rejectMarketCandidate, resolveMarketConflict, synthesizeMarketCandidates,
    transitionMarketSource, transitionMarketVersion,
  });
}

module.exports = {
  MARKET_EXTRACTOR_VERSION, MARKET_NORMALIZER_VERSION, MAX_MARKET_SOURCE_BYTES,
  createMarketMemoryService,
};
