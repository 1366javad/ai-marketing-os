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
