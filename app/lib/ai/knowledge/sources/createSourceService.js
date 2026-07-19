const { randomUUID } = require("node:crypto");
const { SOURCE_AUTHORITIES, SOURCE_KINDS, assertEnum } = require("../contracts");
const { NORMALIZER_VERSION, normalizeSourceContent } = require("../normalization");
const { emitKnowledgeLifecycleEvent } = require("../observability/emitKnowledgeLifecycleEvent");
const { hashSourceContent, toSourceBuffer } = require("./hashSourceContent");

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function mapSource(row) {
  if (!row) return null;
  return {
    id: row.id || row.source_id,
    businessId: row.business_id,
    sourceKind: row.source_kind,
    title: row.title,
    originalReference: row.original_reference || null,
    contentHash: row.content_hash,
    authority: row.authority,
    status: row.status,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    metadata: row.metadata || {},
    duplicate: Boolean(row.duplicate),
  };
}

function mapNormalization(row) {
  if (!row) return null;
  return {
    sourceId: row.source_id,
    businessId: row.business_id,
    normalizedText: row.normalized_text,
    language: row.language,
    sections: row.sections || [],
    warnings: row.warnings || [],
    normalizedAt: row.normalized_at,
    normalizerVersion: row.normalizer_version,
  };
}

function detectLanguage(text, requestedLanguage) {
  if (requestedLanguage) return String(requestedLanguage).trim().toLowerCase();
  return /[\u0600-\u06ff]/.test(text) ? "fa" : "en";
}

function createSourceService({ persistence, logger = console, clock = () => new Date() }) {
  if (!persistence) throw new TypeError("knowledge persistence is required");

  async function registerKnowledgeSource(input) {
    const startedAt = Date.now();
    const businessId = required(input?.businessId, "businessId");
    const createdBy = required(input?.createdBy, "createdBy");
    const sourceKind = assertEnum("sourceKind", input?.sourceKind, SOURCE_KINDS);
    const authority = assertEnum("authority", input?.authority || "unverified", SOURCE_AUTHORITIES);
    const content = toSourceBuffer(input?.content);
    if (content.length === 0) throw new TypeError("source content is required");
    if (content.length > MAX_SOURCE_BYTES) throw new RangeError("source content exceeds 5 MB");
    const correlationId = input.correlationId || randomUUID();
    const row = await persistence.registerSource({
      businessId,
      sourceKind,
      title: required(input.title, "title"),
      originalReference: input.originalReference || null,
      contentHash: hashSourceContent(content),
      authority,
      capturedAt: input.capturedAt || clock().toISOString(),
      createdBy,
      metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
      contentBase64: content.toString("base64"),
      contentEncoding: Buffer.isBuffer(input.content) ? "binary" : "utf8",
      correlationId,
    });
    const source = mapSource(row);
    emitKnowledgeLifecycleEvent(logger, {
      correlationId,
      businessId,
      sourceId: source.id,
      stage: source.duplicate ? "source_duplicate" : "source_registered",
      inputCount: content.length,
      outputCount: source.duplicate ? 0 : 1,
      durationMs: Date.now() - startedAt,
    });
    return source;
  }

  async function normalizeKnowledgeSource(input) {
    const startedAt = Date.now();
    const businessId = required(input?.businessId, "businessId");
    const sourceId = required(input?.sourceId, "sourceId");
    const actorId = required(input?.actorId, "actorId");
    const correlationId = input.correlationId || randomUUID();
    const existing = await persistence.getNormalization(businessId, sourceId, NORMALIZER_VERSION);
    if (existing) return { ...mapNormalization(existing), idempotent: true };
    const source = await persistence.getSource(businessId, sourceId);
    if (!source) throw new Error("knowledge source not found");
    if (source.status === "archived") throw new Error("archived source cannot be normalized");
    if (source.status === "failed") {
      await persistence.resetSourceForRetry({ businessId, sourceId, actorId, correlationId });
    }

    try {
      const payload = await persistence.getSourcePayload(businessId, sourceId);
      if (!payload?.content_base64) throw new Error("source payload not found");
      const buffer = Buffer.from(payload.content_base64, "base64");
      const content = payload.content_encoding === "binary" ? buffer : buffer.toString("utf8");
      const normalized = normalizeSourceContent(source.source_kind, content);
      if (!normalized.normalizedText) throw new Error("normalization produced empty content");
      const saved = await persistence.saveNormalization({
        businessId,
        sourceId,
        normalizedText: normalized.normalizedText,
        language: detectLanguage(normalized.normalizedText, input.language),
        sections: normalized.sections,
        warnings: normalized.warnings,
        normalizerVersion: NORMALIZER_VERSION,
        actorId,
        correlationId,
      });
      emitKnowledgeLifecycleEvent(logger, {
        correlationId,
        businessId,
        sourceId,
        stage: "source_normalized",
        processorVersion: NORMALIZER_VERSION,
        inputCount: buffer.length,
        outputCount: normalized.normalizedText.length,
        warningCount: normalized.warnings.length,
        durationMs: Date.now() - startedAt,
      });
      return { ...mapNormalization(saved), idempotent: false };
    } catch (error) {
      await persistence.markSourceFailed({
        businessId,
        sourceId,
        errorCategory: "normalization_failed",
        retryable: true,
        actorId,
        correlationId,
      });
      emitKnowledgeLifecycleEvent(logger, {
        correlationId,
        businessId,
        sourceId,
        stage: "source_failed",
        processorVersion: NORMALIZER_VERSION,
        errorCategory: "normalization_failed",
        retryable: true,
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  async function listKnowledgeSources(businessId) {
    return (await persistence.listSources(required(businessId, "businessId"))).map(mapSource);
  }

  return Object.freeze({
    listKnowledgeSources,
    normalizeKnowledgeSource,
    registerKnowledgeSource,
  });
}

module.exports = { MAX_SOURCE_BYTES, createSourceService };
