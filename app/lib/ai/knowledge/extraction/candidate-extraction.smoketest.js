const { createKnowledgeService } = require("../index");

let passed = 0;
let failed = 0;
function expect(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`);
  }
}

function createPersistence() {
  const sources = new Map();
  const normalizations = new Map();
  const candidates = new Map();
  const conflicts = new Map();
  const forbiddenWrites = [];
  let sequence = 0;
  return {
    sources,
    normalizations,
    candidates,
    conflicts,
    forbiddenWrites,
    async getSource(businessId, sourceId) {
      const source = sources.get(sourceId);
      return source?.business_id === businessId ? source : null;
    },
    async getNormalization(businessId, sourceId) {
      const normalization = normalizations.get(sourceId);
      return normalization?.business_id === businessId ? normalization : null;
    },
    async persistExtractedCandidate(record) {
      const key = `${record.identityKey}:${record.valueHash}:${record.extractorVersion}`;
      let row = candidates.get(key);
      if (!row) {
        row = {
          id: `candidate-${++sequence}`,
          business_id: record.businessId,
          identity_key: record.identityKey,
          domain: record.domain,
          subject_key: record.subjectKey,
          claim_key: record.claimKey,
          value: record.value,
          value_hash: record.valueHash,
          confidence: 0,
          scope: record.scope,
          valid_from: record.validity.validFrom,
          valid_until: record.validity.validUntil,
          status: "candidate",
          created_at: "2026-07-19T00:00:00.000Z",
          evidence: [],
        };
        candidates.set(key, row);
      }
      for (const evidence of record.evidence) {
        if (!row.evidence.some((item) => item.sourceId === evidence.sourceId && item.excerptHash === evidence.excerptHash)) {
          row.evidence.push(evidence);
        }
      }
      return row;
    },
    async loadSynthesisCandidates(businessId, identityKeys) {
      return [...candidates.values()]
        .filter((candidate) => candidate.business_id === businessId && (!identityKeys?.length || identityKeys.includes(candidate.identity_key)))
        .map((candidate) => ({
          id: candidate.id,
          identityKey: candidate.identity_key,
          valueHash: candidate.value_hash,
          evidence: candidate.evidence.map((item) => ({
            ...item,
            authority: sources.get(item.sourceId).authority,
          })),
        }));
    },
    async saveSynthesisResult(record) {
      for (const update of record.updates) {
        const candidate = [...candidates.values()].find((item) => item.id === update.candidateId);
        candidate.confidence = update.confidence;
        candidate.status = update.status;
      }
      if (record.conflict) {
        conflicts.set(record.identityKey, {
          business_id: record.businessId,
          identity_key: record.identityKey,
          candidate_ids: record.conflict.candidateIds,
          kind: record.conflict.kind,
          status: "open",
        });
      }
      return true;
    },
    async loadReviewCandidates(businessId, identityKeys) {
      return [...candidates.values()].filter(
        (candidate) => candidate.business_id === businessId && (!identityKeys?.length || identityKeys.includes(candidate.identity_key)),
      );
    },
    async loadOpenConflicts(businessId) {
      return [...conflicts.values()].filter((conflict) => conflict.business_id === businessId && conflict.status === "open");
    },
    async loadCandidateUpdates() {
      return [];
    },
    insertVersion() { forbiddenWrites.push("version"); },
    getKnowledgeSlice() { forbiddenWrites.push("slice"); },
  };
}

function addSource(persistence, { id, authority, text }) {
  persistence.sources.set(id, {
    id,
    business_id: "business-a",
    source_kind: "text",
    title: id,
    authority,
    status: "normalized",
  });
  persistence.normalizations.set(id, {
    source_id: id,
    business_id: "business-a",
    normalized_text: text,
    language: "en",
    sections: [{ heading: null, text, ordinal: 0 }],
    warnings: [],
    normalizer_version: "knowledge-normalizer-v1",
  });
}

function providerFor(value, excerpt, extras = {}) {
  return async () => ({
    provider: "test-provider",
    model: "test-model",
    text: JSON.stringify({
      claims: [{
        domain: "positioning",
        subjectKey: "brand",
        claimKey: "market_position",
        value,
        evidence: [{ sectionOrdinal: 0, excerpt }],
        status: "approved",
        visibility: "runtime",
        confidence: 1,
        ...extras,
      }],
    }),
  });
}

async function extract(persistence, sourceId, provider) {
  const service = createKnowledgeService({
    persistence,
    provider,
    logger: { info() {} },
  });
  return service.extractCandidateClaims({ businessId: "business-a", sourceId, actorId: "user-a" });
}

async function main() {
  const persistence = createPersistence();
  addSource(persistence, { id: "source-a", authority: "authoritative", text: "Our brand is positioned as premium skincare." });
  addSource(persistence, { id: "source-b", authority: "supporting", text: "The company uses premium skincare positioning." });
  addSource(persistence, { id: "source-c", authority: "unverified", text: "The brand competes as affordable skincare." });

  const first = await extract(persistence, "source-a", providerFor("premium skincare", "positioned as premium skincare"));
  expect("provider claim becomes a candidate only", first.candidates[0].status === "candidate");
  expect("provider cannot set approval or visibility", first.candidates[0].status !== "approved" && !("visibility" in first.candidates[0]));
  expect("single-source confidence follows frozen formula", first.candidates[0].confidence === 0.83);
  expect("candidate preserves exact evidence", first.candidates[0].sourceEvidence.length === 1 && first.candidates[0].sourceEvidence[0].sourceId === "source-a");

  const agreeing = await extract(persistence, "source-b", providerFor("premium skincare", "premium skincare positioning"));
  expect("agreeing sources synthesize one candidate", agreeing.candidates.length === 1);
  expect("agreement preserves both evidence references", agreeing.candidates[0].sourceEvidence.length === 2);
  expect("agreement raises deterministic confidence", agreeing.candidates[0].confidence === 0.94);

  const conflicting = await extract(persistence, "source-c", providerFor("affordable skincare", "affordable skincare"));
  expect("materially different values remain separate candidates", conflicting.candidates.length === 2);
  expect("conflicting candidates require review", conflicting.candidates.every((candidate) => candidate.status === "needs_review"));
  const queue = await createKnowledgeService({ persistence, provider: providerFor("unused", "unused"), logger: { info() {} } })
    .listKnowledgeReviewQueue("business-a");
  expect("conflicting sources create an open conflict", queue.conflicts.length === 1 && queue.conflicts[0].status === "open");
  expect("conflict retains every candidate id", queue.conflicts[0].candidate_ids.length === 2);
  expect("P2-C never creates versions or slices", persistence.forbiddenWrites.length === 0);

  addSource(persistence, { id: "source-invalid", authority: "supporting", text: "A factual source sentence." });
  let invalidRejected = false;
  try {
    await extract(persistence, "source-invalid", providerFor("unsupported", "not present in source"));
  } catch {
    invalidRejected = true;
  }
  expect("claims without exact source evidence are rejected", invalidRejected);

  console.log(`\nP2-C candidate extraction smoke: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
