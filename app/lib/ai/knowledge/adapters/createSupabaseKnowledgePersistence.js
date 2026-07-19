const TABLES = Object.freeze({
  sources: "knowledge_sources",
  normalizations: "knowledge_normalizations",
  candidates: "knowledge_candidates",
  candidateEvidence: "knowledge_candidate_evidence",
  conflicts: "knowledge_conflicts",
  versions: "business_knowledge_versions",
  versionEvidence: "knowledge_version_evidence",
  candidateUpdates: "knowledge_candidate_updates",
  auditEvents: "knowledge_audit_events",
});

function assertSupabaseClient(supabase) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new TypeError("A Supabase client is required");
  }
}

function insertOne(supabase, table, record) {
  if (!record || !record.business_id) {
    throw new TypeError(`${table} writes require business_id`);
  }
  return (async () => {
    const { data, error } = await supabase
      .from(table)
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  })();
}

function createSupabaseKnowledgePersistence(supabase) {
  assertSupabaseClient(supabase);

  return Object.freeze({
    async registerSource(record) {
      const { data, error } = await supabase.rpc("register_knowledge_source", {
        p_business_id: record.businessId,
        p_source_kind: record.sourceKind,
        p_title: record.title,
        p_original_reference: record.originalReference,
        p_content_hash: record.contentHash,
        p_authority: record.authority,
        p_captured_at: record.capturedAt,
        p_created_by: record.createdBy,
        p_metadata: record.metadata,
        p_content_base64: record.contentBase64,
        p_content_encoding: record.contentEncoding,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    async getSource(businessId, sourceId) {
      const { data, error } = await supabase
        .from(TABLES.sources)
        .select("*")
        .eq("business_id", businessId)
        .eq("id", sourceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async getSourcePayload(businessId, sourceId) {
      const { data, error } = await supabase
        .from("knowledge_source_payloads")
        .select("content_base64, content_encoding")
        .eq("business_id", businessId)
        .eq("source_id", sourceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async getNormalization(businessId, sourceId, normalizerVersion) {
      const { data, error } = await supabase
        .from(TABLES.normalizations)
        .select("*")
        .eq("business_id", businessId)
        .eq("source_id", sourceId)
        .eq("normalizer_version", normalizerVersion)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async saveNormalization(record) {
      const { data, error } = await supabase.rpc("save_knowledge_normalization", {
        p_business_id: record.businessId,
        p_source_id: record.sourceId,
        p_normalized_text: record.normalizedText,
        p_language: record.language,
        p_sections: record.sections,
        p_warnings: record.warnings,
        p_normalizer_version: record.normalizerVersion,
        p_actor_id: record.actorId,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    async markSourceFailed(record) {
      const { data, error } = await supabase.rpc("mark_knowledge_source_failed", {
        p_business_id: record.businessId,
        p_source_id: record.sourceId,
        p_error_category: record.errorCategory,
        p_retryable: record.retryable,
        p_actor_id: record.actorId,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return data;
    },
    async resetSourceForRetry(record) {
      const { data, error } = await supabase.rpc("retry_knowledge_source", {
        p_business_id: record.businessId,
        p_source_id: record.sourceId,
        p_actor_id: record.actorId,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return data;
    },
    async listSources(businessId) {
      const { data, error } = await supabase
        .from(TABLES.sources)
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    insertSource: (record) => insertOne(supabase, TABLES.sources, record),
    insertNormalization: (record) =>
      insertOne(supabase, TABLES.normalizations, record),
    insertCandidate: (record) =>
      insertOne(supabase, TABLES.candidates, record),
    insertCandidateEvidence: (record) =>
      insertOne(supabase, TABLES.candidateEvidence, record),
    insertConflict: (record) => insertOne(supabase, TABLES.conflicts, record),
    insertVersion: (record) => insertOne(supabase, TABLES.versions, record),
    insertVersionEvidence: (record) =>
      insertOne(supabase, TABLES.versionEvidence, record),
    insertCandidateUpdate: (record) =>
      insertOne(supabase, TABLES.candidateUpdates, record),
    appendAuditEvent: (record) =>
      insertOne(supabase, TABLES.auditEvents, record),
  });
}

module.exports = { TABLES, createSupabaseKnowledgePersistence };
