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

async function attachVersionEvidence(supabase, versions) {
  if (!versions?.length) return [];
  const { data: evidence, error } = await supabase
    .from(TABLES.versionEvidence)
    .select("version_id, source_id, excerpt_hash")
    .in("version_id", versions.map((version) => version.id));
  if (error) throw error;
  const supersededIds = new Set(versions.map((version) => version.supersedes).filter(Boolean));
  return versions.map((version) => ({
    ...version,
    status: version.status === "approved" && supersededIds.has(version.id)
      ? "superseded"
      : version.status,
    evidence: (evidence || [])
      .filter((item) => item.version_id === version.id)
      .map((item) => ({ sourceId: item.source_id, excerptHash: item.excerpt_hash })),
  }));
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
    async persistExtractedCandidate(record) {
      const { data, error } = await supabase.rpc("persist_knowledge_candidate", {
        p_business_id: record.businessId,
        p_source_id: record.sourceId,
        p_identity_key: record.identityKey,
        p_scope_key: record.scopeKey,
        p_domain: record.domain,
        p_subject_key: record.subjectKey,
        p_claim_key: record.claimKey,
        p_value: record.value,
        p_value_hash: record.valueHash,
        p_scope: record.scope,
        p_valid_from: record.validity.validFrom,
        p_valid_until: record.validity.validUntil,
        p_extractor_version: record.extractorVersion,
        p_evidence: record.evidence,
        p_actor_id: record.actorId,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    async loadSynthesisCandidates(businessId, identityKeys) {
      let candidateQuery = supabase
        .from(TABLES.candidates)
        .select("*")
        .eq("business_id", businessId)
        .in("status", ["candidate", "needs_review"]);
      if (identityKeys?.length) candidateQuery = candidateQuery.in("identity_key", identityKeys);
      const { data: candidates, error: candidateError } = await candidateQuery;
      if (candidateError) throw candidateError;
      if (!candidates?.length) return [];
      const candidateIds = candidates.map((candidate) => candidate.id);
      const { data: evidence, error: evidenceError } = await supabase
        .from(TABLES.candidateEvidence)
        .select("candidate_id, source_id, section_ordinal, excerpt_hash")
        .eq("business_id", businessId)
        .in("candidate_id", candidateIds);
      if (evidenceError) throw evidenceError;
      const sourceIds = [...new Set((evidence || []).map((item) => item.source_id))];
      const { data: sources, error: sourceError } = await supabase
        .from(TABLES.sources)
        .select("id, authority")
        .eq("business_id", businessId)
        .in("id", sourceIds);
      if (sourceError) throw sourceError;
      const authorityBySource = new Map((sources || []).map((source) => [source.id, source.authority]));
      return candidates.map((candidate) => ({
        id: candidate.id,
        identityKey: candidate.identity_key,
        valueHash: candidate.value_hash,
        evidence: (evidence || [])
          .filter((item) => item.candidate_id === candidate.id)
          .map((item) => ({
            sourceId: item.source_id,
            sectionOrdinal: item.section_ordinal,
            excerptHash: item.excerpt_hash,
            authority: authorityBySource.get(item.source_id) || "unverified",
          })),
      }));
    },
    async saveSynthesisResult(record) {
      const { data, error } = await supabase.rpc("save_knowledge_synthesis", {
        p_business_id: record.businessId,
        p_identity_key: record.identityKey,
        p_updates: record.updates,
        p_conflict: record.conflict,
        p_actor_id: record.actorId,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return data;
    },
    async loadReviewCandidates(businessId, identityKeys) {
      let query = supabase
        .from(TABLES.candidates)
        .select("*")
        .eq("business_id", businessId)
        .in("status", ["candidate", "needs_review"])
        .order("created_at", { ascending: false });
      if (identityKeys?.length) query = query.in("identity_key", identityKeys);
      const { data: candidates, error } = await query;
      if (error) throw error;
      if (!candidates?.length) return [];
      const { data: evidence, error: evidenceError } = await supabase
        .from(TABLES.candidateEvidence)
        .select("candidate_id, source_id, section_ordinal, excerpt_hash")
        .eq("business_id", businessId)
        .in("candidate_id", candidates.map((candidate) => candidate.id));
      if (evidenceError) throw evidenceError;
      return candidates.map((candidate) => ({
        ...candidate,
        evidence: (evidence || [])
          .filter((item) => item.candidate_id === candidate.id)
          .map((item) => ({
            sourceId: item.source_id,
            sectionOrdinal: item.section_ordinal,
            excerptHash: item.excerpt_hash,
          })),
      }));
    },
    async loadOpenConflicts(businessId) {
      const { data, error } = await supabase
        .from(TABLES.conflicts)
        .select("*")
        .eq("business_id", businessId)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async getCandidateForPromotion(businessId, candidateId) {
      const { data: candidate, error } = await supabase
        .from(TABLES.candidates)
        .select("*")
        .eq("business_id", businessId)
        .eq("id", candidateId)
        .maybeSingle();
      if (error) throw error;
      if (!candidate) return null;
      const [{ data: evidence, error: evidenceError }, { data: conflicts, error: conflictError }] = await Promise.all([
        supabase
          .from(TABLES.candidateEvidence)
          .select("source_id, section_ordinal, excerpt_hash")
          .eq("business_id", businessId)
          .eq("candidate_id", candidateId),
        supabase
          .from(TABLES.conflicts)
          .select("id")
          .eq("business_id", businessId)
          .eq("status", "open")
          .eq("identity_key", candidate.identity_key),
      ]);
      if (evidenceError) throw evidenceError;
      if (conflictError) throw conflictError;
      return {
        ...candidate,
        evidence: evidence || [],
        validity: { validFrom: candidate.valid_from || null, validUntil: candidate.valid_until || null },
        openConflict: Boolean(conflicts?.length),
      };
    },
    async approveCandidate(record) {
      const { data, error } = await supabase.rpc("approve_knowledge_candidate", {
        p_business_id: record.businessId,
        p_candidate_id: record.candidateId,
        p_actor_id: record.actorId,
        p_reason: record.reason,
        p_valid_from: record.validFrom,
        p_valid_until: record.validUntil,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      const version = Array.isArray(data) ? data[0] : data;
      return (await attachVersionEvidence(supabase, [version]))[0];
    },
    async rejectCandidate(record) {
      const { data, error } = await supabase.rpc("reject_knowledge_candidate", {
        p_business_id: record.businessId,
        p_candidate_id: record.candidateId,
        p_actor_id: record.actorId,
        p_reason: record.reason,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    async resolveConflict(record) {
      const { data, error } = await supabase.rpc("resolve_knowledge_conflict", {
        p_business_id: record.businessId,
        p_conflict_id: record.conflictId,
        p_selected_candidate_id: record.selectedCandidateId,
        p_actor_id: record.actorId,
        p_reason: record.reason,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    async revokeVersion(record) {
      const { data, error } = await supabase.rpc("revoke_knowledge_version", {
        p_business_id: record.businessId,
        p_version_id: record.versionId,
        p_actor_id: record.actorId,
        p_reason: record.reason,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      const version = Array.isArray(data) ? data[0] : data;
      return (await attachVersionEvidence(supabase, [version]))[0];
    },
    async getVersionHistory(businessId, identityKey) {
      const { data, error } = await supabase
        .from(TABLES.versions)
        .select("*")
        .eq("business_id", businessId)
        .eq("identity_key", identityKey)
        .order("version", { ascending: false });
      if (error) throw error;
      return attachVersionEvidence(supabase, data || []);
    },
    async listKnowledgeVersions(businessId) {
      const { data, error } = await supabase
        .from(TABLES.versions)
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return attachVersionEvidence(supabase, data || []);
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
