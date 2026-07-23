function mapMarketSource(row) {
  if (!row) return null;
  return {
    id: row.id || row.source_id,
    businessId: row.business_id,
    sourceKind: row.source_kind,
    sourceCategory: row.source_category,
    title: row.title,
    originalReference: row.original_reference,
    publisher: row.publisher,
    authority: row.authority,
    accessBasis: row.access_basis,
    captureMethod: row.capture_method,
    contentHash: row.content_hash,
    status: row.status,
    capturedAt: row.captured_at,
    publishedAt: row.published_at,
    metadata: row.metadata || {},
    duplicate: Boolean(row.duplicate),
  };
}

function mapMarketCandidate(row) {
  if (!row) return null;
  return {
    id: row.id,
    businessId: row.business_id,
    identityKey: row.identity_key,
    domain: row.domain,
    memoryType: row.memory_type,
    entityKey: row.entity_key,
    claimKey: row.claim_key,
    value: row.value,
    confidence: Number(row.confidence || 0),
    confidenceBand: row.confidence_band || "low",
    scope: row.scope || {},
    validity: { validFrom: row.valid_from || null, validUntil: row.valid_until || null },
    freshnessClass: row.freshness_class,
    status: row.status,
    evidence: row.evidence || [],
    createdAt: row.created_at,
  };
}

function mapMarketVersion(row) {
  if (!row) return null;
  return {
    marketMemoryId: row.id,
    businessId: row.business_id,
    identityKey: row.identity_key,
    domain: row.domain,
    memoryType: row.memory_type,
    entityKey: row.entity_key,
    claimKey: row.claim_key,
    value: row.value,
    version: Number(row.version),
    status: row.status,
    confidence: Number(row.confidence),
    confidenceBand: row.confidence_band,
    scope: row.scope || {},
    freshnessClass: row.freshness_class,
    validity: { validFrom: row.valid_from || null, validUntil: row.valid_until || null },
    evidence: row.evidence || [],
    supersedes: row.supersedes || null,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
  };
}

module.exports = { mapMarketCandidate, mapMarketSource, mapMarketVersion };
