const assert = require("node:assert/strict");
const { createKnowledgeService } = require("../index");

function createPersistence() {
  const candidates = new Map();
  const conflicts = new Map();
  const versions = [];
  const audit = [];
  let sliceReads = 0;
  let sequence = 0;

  function authorize(actorId, allowReviewer = true) {
    const role = { owner: "owner", reviewer: "reviewer", outsider: null }[actorId];
    if (!role || (!allowReviewer && role === "reviewer")) throw new Error("authorized human required");
  }

  function effectiveHistory(rows) {
    const superseded = new Set(rows.map((row) => row.supersedes).filter(Boolean));
    return rows.map((row) => ({
      ...row,
      status: row.status === "approved" && superseded.has(row.id) ? "superseded" : row.status,
    }));
  }

  return {
    candidates,
    conflicts,
    versions,
    audit,
    get sliceReads() { return sliceReads; },
    async loadKnowledgeSliceInputs() {
      sliceReads += 1;
      return { versions: [], evidence: [], conflicts: [], unapprovedCount: 0 };
    },
    async getCandidateForPromotion(businessId, candidateId) {
      const candidate = candidates.get(candidateId);
      if (!candidate || candidate.business_id !== businessId) return null;
      return {
        ...candidate,
        openConflict: [...conflicts.values()].some((conflict) =>
          conflict.status === "open" && conflict.identity_key === candidate.identity_key),
      };
    },
    async approveCandidate(record) {
      authorize(record.actorId);
      const candidate = candidates.get(record.candidateId);
      const current = versions
        .filter((version) => version.business_id === record.businessId && version.identity_key === candidate.identity_key)
        .sort((left, right) => right.version - left.version)[0] || null;
      const row = {
        id: `version-${++sequence}`,
        business_id: record.businessId,
        identity_key: candidate.identity_key,
        domain: candidate.domain,
        subject_key: candidate.subject_key,
        claim_key: candidate.claim_key,
        value: candidate.value,
        version: (current?.version || 0) + 1,
        status: "approved",
        confidence: candidate.confidence,
        scope: candidate.scope,
        valid_from: record.validFrom,
        valid_until: record.validUntil,
        evidence: candidate.evidence.map(({ sourceId, excerptHash }) => ({ sourceId, excerptHash })),
        conflict_ids: [],
        supersedes: current?.id || null,
        approved_at: "2026-07-19T10:00:00.000Z",
        approved_by: record.actorId,
        created_at: "2026-07-19T10:00:00.000Z",
      };
      versions.push(row);
      candidate.status = "promoted";
      audit.push({ action: "knowledge_candidate_approved", targetId: row.id, actorId: record.actorId });
      return row;
    },
    async rejectCandidate(record) {
      authorize(record.actorId);
      const candidate = candidates.get(record.candidateId);
      candidate.status = "rejected";
      audit.push({ action: "knowledge_candidate_rejected", targetId: candidate.id, actorId: record.actorId });
      return candidate;
    },
    async resolveConflict(record) {
      authorize(record.actorId);
      const conflict = conflicts.get(record.conflictId);
      for (const candidateId of conflict.candidate_ids) {
        candidates.get(candidateId).status = candidateId === record.selectedCandidateId ? "candidate" : "rejected";
      }
      conflict.status = "resolved";
      conflict.resolved_candidate_id = record.selectedCandidateId;
      audit.push({ action: "knowledge_conflict_resolved", targetId: conflict.id, actorId: record.actorId });
      return conflict;
    },
    async revokeVersion(record) {
      authorize(record.actorId, false);
      const current = versions.find((version) => version.id === record.versionId);
      const row = {
        ...current,
        id: `version-${++sequence}`,
        version: current.version + 1,
        status: "revoked",
        supersedes: current.id,
        approved_by: record.actorId,
      };
      versions.push(row);
      audit.push({ action: "business_knowledge_revoked", targetId: row.id, actorId: record.actorId });
      return row;
    },
    async getVersionHistory(businessId, identityKey) {
      return effectiveHistory(versions.filter((row) => row.business_id === businessId && row.identity_key === identityKey));
    },
    async listKnowledgeVersions(businessId) {
      return effectiveHistory(versions.filter((row) => row.business_id === businessId));
    },
  };
}

function candidate(id, value, overrides = {}) {
  return {
    id,
    business_id: "business-1",
    identity_key: "identity-1",
    domain: "positioning",
    subject_key: "brand",
    claim_key: "market_position",
    value,
    confidence: 0.9,
    scope: { businessId: "business-1" },
    validity: { validFrom: null, validUntil: null },
    evidence: [{ sourceId: "source-1", excerptHash: "a".repeat(64) }],
    status: "candidate",
    ...overrides,
  };
}

async function expectReject(action, pattern) {
  await assert.rejects(action, pattern);
}

(async () => {
  const persistence = createPersistence();
  const service = createKnowledgeService({ persistence });

  persistence.candidates.set("invalid", candidate("invalid", "invalid", { evidence: [] }));
  await expectReject(() => service.approveKnowledgeCandidate({
    businessId: "business-1", candidateId: "invalid", actorId: "owner", reason: "approve",
  }), /missing_evidence/);

  persistence.candidates.set("candidate-1", candidate("candidate-1", "Premium skincare"));
  await expectReject(() => service.approveKnowledgeCandidate({
    businessId: "business-1", candidateId: "candidate-1", actorId: "outsider", reason: "approve",
  }), /authorized human/);

  const v1 = await service.approveKnowledgeCandidate({
    businessId: "business-1", candidateId: "candidate-1", actorId: "reviewer", reason: "verified source",
  });
  assert.equal(v1.version, 1);
  assert.equal(v1.status, "approved");
  assert.equal(v1.sourceEvidence.length, 1);

  persistence.candidates.set("candidate-2", candidate("candidate-2", "Premium clinical skincare"));
  const v2 = await service.approveKnowledgeCandidate({
    businessId: "business-1", candidateId: "candidate-2", actorId: "reviewer", reason: "new approved wording",
  });
  assert.equal(v2.version, 2);
  assert.equal(v2.supersedes, v1.id);
  const history = await service.getKnowledgeHistory("business-1", "identity-1");
  assert.deepEqual(history.map((item) => item.status), ["superseded", "approved"]);
  assert.equal(history.filter((item) => item.status === "approved").length, 1);

  persistence.candidates.set("rejected", candidate("rejected", "Unsupported claim"));
  await service.rejectKnowledgeCandidate({
    businessId: "business-1", candidateId: "rejected", actorId: "reviewer", reason: "unsupported",
  });
  assert.equal(persistence.candidates.get("rejected").status, "rejected");

  persistence.candidates.set("conflict-a", candidate("conflict-a", "Value A", { status: "needs_review" }));
  persistence.candidates.set("conflict-b", candidate("conflict-b", "Value B", { status: "needs_review" }));
  persistence.conflicts.set("conflict-1", {
    id: "conflict-1", status: "open", identity_key: "identity-1", candidate_ids: ["conflict-a", "conflict-b"],
  });
  await expectReject(() => service.approveKnowledgeCandidate({
    businessId: "business-1", candidateId: "conflict-a", actorId: "reviewer", reason: "premature",
  }), /open_conflict|candidate_not_approvable/);
  await service.resolveKnowledgeConflict({
    businessId: "business-1", conflictId: "conflict-1", selectedCandidateId: "conflict-a",
    actorId: "reviewer", reason: "authoritative evidence",
  });
  assert.equal(persistence.candidates.get("conflict-a").status, "candidate");
  assert.equal(persistence.candidates.get("conflict-b").status, "rejected");

  await expectReject(() => service.revokeKnowledgeVersion({
    businessId: "business-1", versionId: v2.id, actorId: "reviewer", reason: "revoke",
  }), /authorized human/);
  const revoked = await service.revokeKnowledgeVersion({
    businessId: "business-1", versionId: v2.id, actorId: "owner", reason: "no longer valid",
  });
  assert.equal(revoked.status, "revoked");
  assert.equal(revoked.version, 3);
  const finalHistory = await service.getKnowledgeHistory("business-1", "identity-1");
  assert.deepEqual(finalHistory.map((item) => item.status), ["superseded", "superseded", "revoked"]);
  assert.deepEqual(persistence.audit.map((event) => event.action), [
    "knowledge_candidate_approved",
    "knowledge_candidate_approved",
    "knowledge_candidate_rejected",
    "knowledge_conflict_resolved",
    "business_knowledge_revoked",
  ]);
  assert.equal(persistence.sliceReads, 0);
  console.log("P2-D versioning smoketest passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
