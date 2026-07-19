const assert = require("node:assert/strict");
const { createKnowledgeService } = require("../index");

function createPersistence() {
  const updates = new Map();
  const audit = [];
  let versionsWritten = 0;
  let candidatesWritten = 0;
  let sequence = 0;
  const roles = { owner: "owner", reviewer: "reviewer", member: "member", outsider: null };

  function member(actorId) {
    if (!roles[actorId]) throw new Error("business member identity required");
  }
  function reviewer(actorId) {
    if (!["owner", "reviewer"].includes(roles[actorId])) throw new Error("authorized human reviewer required");
  }
  return {
    updates,
    audit,
    get versionsWritten() { return versionsWritten; },
    get candidatesWritten() { return candidatesWritten; },
    async createCandidateUpdate(record) {
      member(record.actorId);
      const row = {
        id: `update-${++sequence}`,
        business_id: record.businessId,
        proposed_domain: record.proposedDomain,
        proposed_identity_key: record.proposedIdentityKey,
        proposed_value: record.proposedValue,
        source_kind: record.sourceKind,
        source_reference_id: record.sourceReferenceId,
        evidence: record.evidence,
        status: "candidate",
        created_at: "2026-07-19T00:00:00.000Z",
        created_by: record.actorId,
      };
      updates.set(row.id, row);
      audit.push({ action: "knowledge_candidate_update_created", id: row.id });
      return row;
    },
    async reviewCandidateUpdate(record) {
      reviewer(record.actorId);
      const row = updates.get(record.candidateUpdateId);
      const transitions = {
        candidate: { start_review: "under_review", reject: "rejected" },
        under_review: { accept_for_validation: "accepted_for_validation", reject: "rejected" },
      };
      const status = transitions[row.status]?.[record.action];
      if (!status) throw new Error("invalid candidate update review transition");
      row.status = status;
      audit.push({ action: `knowledge_candidate_update_${status}`, id: row.id });
      return row;
    },
    async loadCandidateUpdates(businessId) {
      return [...updates.values()].filter((row) =>
        row.business_id === businessId && row.status !== "rejected");
    },
    async loadReviewCandidates() { return []; },
    async loadOpenConflicts() { return []; },
    async loadKnowledgeSliceInputs() {
      return { versions: [], evidence: [], conflicts: [], unapprovedCount: 0 };
    },
    async insertVersion() { versionsWritten += 1; },
    async insertCandidate() { candidatesWritten += 1; },
  };
}

(async () => {
  const persistence = createPersistence();
  const lifecycleEvents = [];
  const logger = { info(_name, event) { lifecycleEvents.push(event); } };
  const service = createKnowledgeService({ persistence, logger, clock: () => new Date("2026-07-19T12:00:00.000Z") });
  const sources = [
    ["campaign_event", "campaign-event-1", "positioning"],
    ["analytics_observation", "analytics-event-1", "validated_learning"],
    ["human_note", "human-note-1", "tone_rule"],
  ];
  const created = [];
  for (const [kind, referenceId, domain] of sources) {
    created.push(await service.createCandidateUpdate({
      businessId: "business-1",
      proposedDomain: domain,
      proposedIdentityKey: `${domain}:brand:primary`,
      proposedValue: `${kind} proposed value`,
      source: { kind, referenceId },
      evidence: [{ referenceId, observationHash: "a".repeat(64) }],
      createdBy: "member",
    }));
  }
  assert(created.every((item) => item.status === "candidate"));
  assert.equal(created[1].proposedDomain, "validated_learning");
  assert.equal(persistence.versionsWritten, 0);
  assert.equal(persistence.candidatesWritten, 0);

  await assert.rejects(() => service.createCandidateUpdate({
    businessId: "business-1",
    proposedDomain: "positioning",
    proposedIdentityKey: "positioning:brand:primary",
    proposedValue: "forged",
    source: { kind: "campaign_event", referenceId: "event-forged" },
    evidence: [],
    createdBy: "outsider",
  }), /business member/);

  await assert.rejects(() => service.reviewCandidateUpdate({
    businessId: "business-1",
    candidateUpdateId: created[0].id,
    action: "start_review",
    actorId: "member",
    reason: "review",
  }), /authorized human reviewer/);
  const underReview = await service.reviewCandidateUpdate({
    businessId: "business-1",
    candidateUpdateId: created[0].id,
    action: "start_review",
    actorId: "reviewer",
    reason: "source requires validation",
  });
  assert.equal(underReview.status, "under_review");
  await assert.rejects(() => service.reviewCandidateUpdate({
    businessId: "business-1",
    candidateUpdateId: created[1].id,
    action: "accept_for_validation",
    actorId: "reviewer",
    reason: "skip review",
  }), /invalid candidate update review transition/);
  const accepted = await service.reviewCandidateUpdate({
    businessId: "business-1",
    candidateUpdateId: created[0].id,
    action: "accept_for_validation",
    actorId: "reviewer",
    reason: "send to source-backed validation",
  });
  assert.equal(accepted.status, "accepted_for_validation");
  const queue = await service.listKnowledgeReviewQueue("business-1");
  assert(queue.candidateUpdates.some((item) => item.id === accepted.id && item.status === "accepted_for_validation"));

  const slice = await service.getKnowledgeSlice({
    businessId: "business-1", module: "analytics", task: "evaluate_campaign",
  });
  assert.equal(slice.items.length, 0);
  assert.equal(persistence.versionsWritten, 0);
  assert.equal(persistence.candidatesWritten, 0);
  assert(!JSON.stringify(lifecycleEvents).includes("campaign_event proposed value"));
  assert.deepEqual(persistence.audit.map((event) => event.action), [
    "knowledge_candidate_update_created",
    "knowledge_candidate_update_created",
    "knowledge_candidate_update_created",
    "knowledge_candidate_update_under_review",
    "knowledge_candidate_update_accepted_for_validation",
  ]);
  console.log("P2-G Candidate Update smoketest passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
