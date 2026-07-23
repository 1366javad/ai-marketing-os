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
  marketSources: "market_sources",
  marketCaptures: "market_source_captures",
  marketNormalizations: "market_normalizations",
  marketEntities: "market_entities",
  marketObservations: "market_observations",
  marketCandidates: "market_candidates",
  marketCandidateEvidence: "market_candidate_evidence",
  marketConflicts: "market_conflicts",
  marketVersions: "market_versions",
  marketVersionEvidence: "market_version_evidence",
  marketCandidateUpdates: "market_candidate_updates",
  marketAuditEvents: "market_audit_events",
  learningObservations: "learning_observations",
  learningHypotheses: "learning_hypotheses",
  learningEvidence: "learning_evidence_references",
  learningValidationRuns: "learning_validation_runs",
  learningConflicts: "learning_conflicts",
  learningVersions: "learning_versions",
  learningVersionEvidence: "learning_version_evidence",
  learningDecayAssessments: "learning_decay_assessments",
  learningCandidateUpdates: "learning_candidate_updates",
  learningAuditEvents: "learning_audit_events",
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
    async loadKnowledgeSliceInputs(businessId) {
      const [versionsResult, evidenceResult, conflictsResult, candidatesResult] = await Promise.all([
        supabase.from(TABLES.versions).select("*").eq("business_id", businessId),
        supabase
          .from(TABLES.versionEvidence)
          .select("version_id, source_id, excerpt_hash")
          .eq("business_id", businessId),
        supabase
          .from(TABLES.conflicts)
          .select("id, identity_key, status")
          .eq("business_id", businessId)
          .eq("status", "open"),
        supabase
          .from(TABLES.candidates)
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("status", ["candidate", "needs_review"]),
      ]);
      for (const result of [versionsResult, evidenceResult, conflictsResult, candidatesResult]) {
        if (result.error) throw result.error;
      }
      return {
        versions: versionsResult.data || [],
        evidence: evidenceResult.data || [],
        conflicts: conflictsResult.data || [],
        unapprovedCount: candidatesResult.count || 0,
      };
    },
    async createCandidateUpdate(record) {
      const { data, error } = await supabase.rpc("create_knowledge_candidate_update", {
        p_business_id: record.businessId,
        p_proposed_domain: record.proposedDomain,
        p_proposed_identity_key: record.proposedIdentityKey,
        p_proposed_value: record.proposedValue,
        p_source_kind: record.sourceKind,
        p_source_reference_id: record.sourceReferenceId,
        p_evidence: record.evidence,
        p_actor_id: record.actorId,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    async reviewCandidateUpdate(record) {
      const { data, error } = await supabase.rpc("review_knowledge_candidate_update", {
        p_business_id: record.businessId,
        p_candidate_update_id: record.candidateUpdateId,
        p_action: record.action,
        p_actor_id: record.actorId,
        p_reason: record.reason,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    async loadCandidateUpdates(businessId) {
      const { data, error } = await supabase
        .from(TABLES.candidateUpdates)
        .select("*")
        .eq("business_id", businessId)
        .in("status", ["candidate", "under_review", "accepted_for_validation"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async registerMarketSource(record) {
      const { data, error } = await supabase.rpc("register_market_source", {
        p_business_id: record.businessId, p_source_kind: record.sourceKind,
        p_source_category: record.sourceCategory, p_title: record.title,
        p_original_reference: record.originalReference, p_publisher: record.publisher,
        p_authority: record.authority, p_access_basis: record.accessBasis,
        p_capture_method: record.captureMethod, p_content_hash: record.contentHash,
        p_content_base64: record.contentBase64, p_content_encoding: record.contentEncoding,
        p_captured_at: record.capturedAt, p_published_at: record.publishedAt,
        p_metadata: record.metadata, p_actor_id: record.actorId,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    async getMarketSource(businessId, sourceId) {
      const { data, error } = await supabase.from(TABLES.marketSources).select("*")
        .eq("business_id", businessId).eq("id", sourceId).maybeSingle();
      if (error) throw error; return data;
    },
    async getMarketSourcePayload(businessId, sourceId) {
      const { data, error } = await supabase.from(TABLES.marketCaptures).select("*")
        .eq("business_id", businessId).eq("source_id", sourceId)
        .order("captured_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error; return data;
    },
    async getMarketNormalization(businessId, sourceId, normalizerVersion, captureId) {
      let query = supabase.from(TABLES.marketNormalizations).select("*")
        .eq("business_id", businessId).eq("source_id", sourceId)
        .eq("normalizer_version", normalizerVersion);
      if (captureId) query = query.eq("capture_id", captureId);
      const { data, error } = await query.order("normalized_at", { ascending: false })
        .limit(1).maybeSingle();
      if (error) throw error; return data;
    },
    async saveMarketNormalization(record) {
      const { data, error } = await supabase.rpc("save_market_normalization", {
        p_business_id: record.businessId, p_source_id: record.sourceId,
        p_capture_id: record.captureId, p_normalized_text: record.normalizedText,
        p_language: record.language, p_sections: record.sections, p_warnings: record.warnings,
        p_normalizer_version: record.normalizerVersion, p_actor_id: record.actorId,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async listMarketSources(businessId) {
      const { data, error } = await supabase.from(TABLES.marketSources).select("*")
        .eq("business_id", businessId).order("created_at", { ascending: false });
      if (error) throw error; return data || [];
    },
    async persistMarketCandidate(record) {
      const { data: capture, error: captureError } = await supabase.from(TABLES.marketCaptures).select("id")
        .eq("business_id", record.businessId).eq("source_id", record.sourceId)
        .order("captured_at", { ascending: false }).limit(1).maybeSingle();
      if (captureError) throw captureError;
      if (!capture) throw new Error("market source capture not found");
      const { data, error } = await supabase.rpc("persist_market_candidate", {
        p_business_id: record.businessId, p_source_id: record.sourceId,
        p_capture_id: capture?.id, p_identity_key: record.identityKey,
        p_scope_key: record.scopeKey, p_domain: record.domain, p_memory_type: record.memoryType,
        p_entity_key: record.entityKey, p_claim_key: record.claimKey, p_value: record.value,
        p_value_hash: record.valueHash, p_scope: record.scope,
        p_valid_from: record.validity.validFrom, p_valid_until: record.validity.validUntil,
        p_freshness_class: record.freshnessClass, p_extractor_version: record.extractorVersion,
        p_evidence: record.evidence, p_actor_id: record.actorId,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async loadMarketSynthesisCandidates(businessId, identityKeys) {
      let query = supabase.from(TABLES.marketCandidates).select("*").eq("business_id", businessId)
        .in("status", ["candidate", "needs_review"]);
      if (identityKeys?.length) query = query.in("identity_key", identityKeys);
      const { data: candidates, error } = await query; if (error) throw error;
      if (!candidates?.length) return [];
      const { data: evidence, error: evidenceError } = await supabase.from(TABLES.marketCandidateEvidence)
        .select("candidate_id,source_id,capture_id,section_ordinal,excerpt_hash")
        .eq("business_id", businessId).in("candidate_id", candidates.map((item) => item.id));
      if (evidenceError) throw evidenceError;
      const sourceIds = [...new Set((evidence || []).map((item) => item.source_id))];
      const { data: sources, error: sourceError } = await supabase.from(TABLES.marketSources)
        .select("id,authority").eq("business_id", businessId).in("id", sourceIds);
      if (sourceError) throw sourceError;
      const authority = new Map((sources || []).map((item) => [item.id, item.authority]));
      return candidates.map((candidate) => ({
        id: candidate.id, identityKey: candidate.identity_key,
        evidence: (evidence || []).filter((item) => item.candidate_id === candidate.id)
          .map((item) => ({ sourceId: item.source_id, captureId: item.capture_id,
            sectionOrdinal: item.section_ordinal, excerptHash: item.excerpt_hash,
            authority: authority.get(item.source_id) || "unverified" })),
      }));
    },
    async saveMarketSynthesisResult(record) {
      const { data, error } = await supabase.rpc("save_market_synthesis", {
        p_business_id: record.businessId, p_identity_key: record.identityKey,
        p_updates: record.updates, p_conflict: record.conflict,
        p_actor_id: record.actorId, p_correlation_id: record.correlationId,
      });
      if (error) throw error; return data;
    },
    async loadMarketReviewCandidates(businessId, identityKeys) {
      let query = supabase.from(TABLES.marketCandidates).select("*").eq("business_id", businessId)
        .in("status", ["candidate", "needs_review"]).order("created_at", { ascending: false });
      if (identityKeys?.length) query = query.in("identity_key", identityKeys);
      const { data, error } = await query; if (error) throw error;
      if (!data?.length) return [];
      const { data: evidence, error: evidenceError } = await supabase.from(TABLES.marketCandidateEvidence)
        .select("candidate_id,source_id,capture_id,section_ordinal,excerpt_hash,evidence_role")
        .eq("business_id", businessId).in("candidate_id", data.map((item) => item.id));
      if (evidenceError) throw evidenceError;
      return data.map((item) => ({ ...item, evidence: (evidence || []).filter((e) => e.candidate_id === item.id) }));
    },
    async loadMarketConflicts(businessId) {
      const { data, error } = await supabase.from(TABLES.marketConflicts).select("*")
        .eq("business_id", businessId).eq("status", "open").order("created_at", { ascending: false });
      if (error) throw error; return data || [];
    },
    async approveMarketCandidate(record) {
      const { data, error } = await supabase.rpc("approve_market_candidate", {
        p_business_id: record.businessId, p_candidate_id: record.candidateId,
        p_actor_id: record.actorId, p_reason: record.reason,
        p_valid_from: record.validFrom, p_valid_until: record.validUntil,
        p_correlation_id: record.correlationId,
      });
      if (error) throw error; const version = Array.isArray(data) ? data[0] : data;
      const { data: evidence, error: evidenceError } = await supabase.from(TABLES.marketVersionEvidence)
        .select("source_id,capture_id,excerpt_hash").eq("version_id", version.id);
      if (evidenceError) throw evidenceError; return { ...version, evidence: evidence || [] };
    },
    async rejectMarketCandidate(record) {
      const { data, error } = await supabase.rpc("reject_market_candidate", {
        p_business_id: record.businessId, p_candidate_id: record.candidateId,
        p_actor_id: record.actorId, p_reason: record.reason,
        p_correlation_id: record.correlationId,
      }); if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async resolveMarketConflict(record) {
      const { data, error } = await supabase.rpc("resolve_market_conflict", {
        p_business_id: record.businessId, p_conflict_id: record.conflictId,
        p_selected_candidate_id: record.selectedCandidateId, p_actor_id: record.actorId,
        p_reason: record.reason, p_correlation_id: record.correlationId,
      }); if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async listMarketVersions(businessId) {
      const { data, error } = await supabase.from(TABLES.marketVersions).select("*")
        .eq("business_id", businessId).order("created_at", { ascending: false });
      if (error) throw error; return data || [];
    },
    async getMarketVersionHistory(businessId, identityKey) {
      const { data, error } = await supabase.from(TABLES.marketVersions).select("*")
        .eq("business_id", businessId).eq("identity_key", identityKey).order("version", { ascending: false });
      if (error) throw error; return data || [];
    },
    async loadMarketSliceInputs(businessId) {
      const [versions, evidence, conflicts, candidates] = await Promise.all([
        supabase.from(TABLES.marketVersions).select("*").eq("business_id", businessId),
        supabase.from(TABLES.marketVersionEvidence).select("version_id,source_id,capture_id,excerpt_hash").eq("business_id", businessId),
        supabase.from(TABLES.marketConflicts).select("identity_key,status").eq("business_id", businessId).eq("status", "open"),
        supabase.from(TABLES.marketCandidates).select("id", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["candidate", "needs_review"]),
      ]);
      for (const result of [versions, evidence, conflicts, candidates]) if (result.error) throw result.error;
      return { versions: versions.data || [], evidence: evidence.data || [], conflicts: conflicts.data || [], unapprovedCount: candidates.count || 0 };
    },
    async createMarketCandidateUpdate(record) {
      const { data, error } = await supabase.rpc("create_market_candidate_update", {
        p_business_id: record.businessId, p_proposed_domain: record.proposedDomain,
        p_memory_type: record.memoryType, p_proposed_identity_key: record.proposedIdentityKey,
        p_proposed_value: record.proposedValue, p_source_kind: record.sourceKind,
        p_source_reference_id: record.sourceReferenceId, p_evidence: record.evidence,
        p_actor_id: record.actorId, p_correlation_id: record.correlationId,
      }); if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async transitionMarketVersion(record) {
      const { data, error } = await supabase.rpc("transition_market_version", {
        p_business_id: record.businessId, p_version_id: record.versionId,
        p_status: record.status, p_actor_id: record.actorId, p_reason: record.reason,
        p_correlation_id: record.correlationId,
      }); if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async transitionMarketSource(record) {
      const { data, error } = await supabase.rpc("transition_market_source", {
        p_business_id: record.businessId, p_source_id: record.sourceId,
        p_status: record.status, p_actor_id: record.actorId, p_reason: record.reason,
        p_correlation_id: record.correlationId,
      }); if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async registerLearningObservation(record) {
      const { data, error } = await supabase.rpc("register_learning_observation", {
        p_business_id: record.businessId, p_source_kind: record.sourceKind, p_source_reference_id: record.sourceReferenceId,
        p_campaign_id: record.campaignId, p_experiment_id: record.experimentId, p_metric: record.metric, p_value: record.value,
        p_unit: record.unit, p_sample_basis: record.sampleBasis, p_scope: record.scope, p_observed_at: record.observedAt,
        p_collection_window: record.collectionWindow, p_attribution_method: record.attributionMethod, p_reliability: record.reliability,
        p_provenance_hash: record.provenanceHash, p_metadata: record.metadata, p_actor_id: record.actorId, p_correlation_id: record.correlationId,
      }); if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async registerLearningHypothesis(record) {
      const { data, error } = await supabase.rpc("register_learning_hypothesis", {
        p_business_id: record.businessId, p_identity_key: record.identityKey, p_scope_key: record.scopeKey,
        p_domain: record.domain, p_subject_key: record.subjectKey, p_pattern_key: record.patternKey,
        p_outcome_direction: record.outcomeDirection, p_statement: record.statement, p_statement_hash: record.statementHash,
        p_expected_outcome: record.expectedOutcome, p_scope: record.scope, p_evidence_window_start: record.evidenceWindowStart,
        p_evidence_window_end: record.evidenceWindowEnd, p_observation_ids: record.observationIds,
        p_actor_id: record.actorId, p_correlation_id: record.correlationId,
      }); if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async attachLearningEvidence(record) {
      const { data, error } = await supabase.rpc("attach_learning_evidence", { p_business_id: record.businessId,
        p_hypothesis_id: record.hypothesisId, p_observation_id: record.observationId, p_role: record.role,
        p_rationale: record.rationale, p_actor_id: record.actorId, p_correlation_id: record.correlationId });
      if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async loadLearningValidationBundle(businessId, hypothesisId) {
      const { data: hypothesis, error } = await supabase.from(TABLES.learningHypotheses).select("*").eq("business_id", businessId).eq("id", hypothesisId).maybeSingle(); if (error) throw error;
      if (!hypothesis) return null;
      const { data, error: evidenceError } = await supabase.from(TABLES.learningEvidence)
        .select("role,learning_observations(source_kind,source_reference_id,campaign_id,experiment_id,reliability,scope)")
        .eq("business_id", businessId).eq("hypothesis_id", hypothesisId); if (evidenceError) throw evidenceError;
      return { hypothesis, evidence: (data || []).map((item) => ({ role: item.role, ...(item.learning_observations || {}), scope_compatible: true })) };
    },
    async saveLearningValidation(record) {
      const { data, error } = await supabase.rpc("save_learning_validation", { p_business_id: record.businessId,
        p_hypothesis_id: record.hypothesisId, p_status: record.status, p_confidence: record.confidence,
        p_confidence_band: record.confidenceBand, p_validation_policy: record.validationPolicy,
        p_evidence_count: record.evidenceCount, p_independent_source_count: record.independentSourceCount,
        p_campaign_count: record.campaignCount, p_conflict: record.conflict, p_diagnostics: record.diagnostics,
        p_actor_id: record.actorId, p_correlation_id: record.correlationId });
      if (error) throw error; return Array.isArray(data) ? data[0] : data;
    },
    async listLearningHypothesesForValidation(businessId) { const { data, error } = await supabase.from(TABLES.learningHypotheses).select("id").eq("business_id", businessId).in("status", ["hypothesis", "accumulating", "needs_review"]); if (error) throw error; return data || []; },
    async approveLearningHypothesis(record) { const { data, error } = await supabase.rpc("approve_learning_hypothesis", { p_business_id: record.businessId, p_hypothesis_id: record.hypothesisId, p_conclusion: record.conclusion, p_actor_id: record.actorId, p_reason: record.reason, p_valid_from: record.validFrom, p_valid_until: record.validUntil, p_decay_policy: record.decayPolicy, p_correlation_id: record.correlationId }); if (error) throw error; return Array.isArray(data) ? data[0] : data; },
    async rejectLearningHypothesis(record) { const { data, error } = await supabase.rpc("reject_learning_hypothesis", { p_business_id: record.businessId, p_hypothesis_id: record.hypothesisId, p_actor_id: record.actorId, p_reason: record.reason, p_correlation_id: record.correlationId }); if (error) throw error; return Array.isArray(data) ? data[0] : data; },
    async resolveLearningConflict(record) { const { data, error } = await supabase.rpc("resolve_learning_conflict", { p_business_id: record.businessId, p_conflict_id: record.conflictId, p_selected_hypothesis_id: record.selectedHypothesisId, p_actor_id: record.actorId, p_reason: record.reason, p_correlation_id: record.correlationId }); if (error) throw error; return Array.isArray(data) ? data[0] : data; },
    async assessLearningDecay(record) { const { data, error } = await supabase.rpc("assess_learning_decay", { p_business_id: record.businessId, p_as_of: record.asOf, p_policy_version: record.policyVersion, p_actor_id: record.actorId, p_correlation_id: record.correlationId }); if (error) throw error; return data || []; },
    async transitionLearningVersion(record) { const { data, error } = await supabase.rpc("transition_learning_version", { p_business_id: record.businessId, p_version_id: record.versionId, p_status: record.status, p_actor_id: record.actorId, p_reason: record.reason, p_correlation_id: record.correlationId }); if (error) throw error; return Array.isArray(data) ? data[0] : data; },
    async createLearningCandidateUpdate(record) { const { data, error } = await supabase.rpc("create_learning_candidate_update", { p_business_id: record.businessId, p_proposed_domain: record.proposedDomain, p_proposed_identity_key: record.proposedIdentityKey, p_proposed_value: record.proposedValue, p_source_kind: record.sourceKind, p_source_reference_id: record.sourceReferenceId, p_evidence: record.evidence, p_actor_id: record.actorId, p_correlation_id: record.correlationId }); if (error) throw error; return Array.isArray(data) ? data[0] : data; },
    async loadLearningReviewQueue(businessId) {
      const [hypotheses, conflicts, decay, updates] = await Promise.all([
        supabase.from(TABLES.learningHypotheses).select("*").eq("business_id", businessId).in("status", ["hypothesis", "accumulating", "needs_review", "validated"]),
        supabase.from(TABLES.learningConflicts).select("*").eq("business_id", businessId).eq("status", "open"),
        supabase.from(TABLES.learningDecayAssessments).select("*").eq("business_id", businessId).eq("eligible", false),
        supabase.from(TABLES.learningCandidateUpdates).select("*").eq("business_id", businessId).in("status", ["candidate", "under_review", "accepted_for_validation"]),
      ]); for (const result of [hypotheses, conflicts, decay, updates]) if (result.error) throw result.error;
      return { hypotheses: hypotheses.data || [], conflicts: conflicts.data || [], decayReviews: decay.data || [], candidateUpdates: updates.data || [] };
    },
    async listLearningVersions(businessId) { const { data, error } = await supabase.from(TABLES.learningVersions).select("*").eq("business_id", businessId).order("created_at", { ascending: false }); if (error) throw error; return data || []; },
    async getLearningVersionHistory(businessId, identityKey) { const { data, error } = await supabase.from(TABLES.learningVersions).select("*").eq("business_id", businessId).eq("identity_key", identityKey).order("version", { ascending: false }); if (error) throw error; return data || []; },
    async loadLearningSliceInputs(businessId) {
      const [versions, evidence, conflicts, decay, hypotheses] = await Promise.all([
        supabase.from(TABLES.learningVersions).select("*").eq("business_id", businessId), supabase.from(TABLES.learningVersionEvidence).select("version_id,observation_id,role").eq("business_id", businessId),
        supabase.from(TABLES.learningConflicts).select("identity_key,status").eq("business_id", businessId).eq("status", "open"), supabase.from(TABLES.learningDecayAssessments).select("version_id,decayed_confidence,eligible,assessed_at").eq("business_id", businessId).order("assessed_at", { ascending: false }),
        supabase.from(TABLES.learningHypotheses).select("id", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["hypothesis", "accumulating", "needs_review", "validated"]),
      ]); for (const result of [versions, evidence, conflicts, decay, hypotheses]) if (result.error) throw result.error;
      return { versions: versions.data || [], evidence: evidence.data || [], conflicts: conflicts.data || [], decay: decay.data || [], unapprovedCount: hypotheses.count || 0 };
    },
    async loadMarketCandidateUpdates(businessId) {
      const { data, error } = await supabase.from(TABLES.marketCandidateUpdates).select("*")
        .eq("business_id", businessId).in("status", ["candidate", "under_review", "accepted_for_validation"])
        .order("created_at", { ascending: false });
      if (error) throw error; return data || [];
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
