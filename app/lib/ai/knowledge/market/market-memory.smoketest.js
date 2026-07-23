const fs = require("node:fs");
const path = require("node:path");
const { createKnowledgeService } = require("../index");

let passed = 0; let failed = 0;
function expect(name, condition) {
  if (condition) { passed += 1; console.log(`PASS ${name}`); }
  else { failed += 1; console.error(`FAIL ${name}`); }
}

function memoryPersistence() {
  const state = { sources: [], captures: [], normalizations: [], candidates: [], versions: [], updates: [] };
  let sequence = 0;
  const id = (kind) => `${kind}-${++sequence}`;
  return {
    state,
    async registerMarketSource(record) {
      const duplicate = state.captures.find((item) => item.business_id === record.businessId && item.content_hash === record.contentHash);
      if (duplicate) return { ...state.sources.find((item) => item.id === duplicate.source_id), duplicate: true };
      let source = state.sources.find((item) => item.business_id === record.businessId && item.original_reference === record.originalReference);
      if (!source) { source = { id: id("source"), business_id: record.businessId, source_kind: record.sourceKind, source_category: record.sourceCategory, title: record.title, original_reference: record.originalReference, publisher: record.publisher, authority: record.authority, access_basis: record.accessBasis, capture_method: record.captureMethod, status: "registered", metadata: record.metadata }; state.sources.push(source); }
      const capture = { id: id("capture"), source_id: source.id, business_id: record.businessId, content_hash: record.contentHash, content_base64: record.contentBase64, content_encoding: record.contentEncoding, captured_at: record.capturedAt };
      state.captures.push(capture); return { ...source, content_hash: capture.content_hash, captured_at: capture.captured_at, duplicate: false };
    },
    async getMarketSource(businessId, sourceId) { return state.sources.find((x) => x.business_id === businessId && x.id === sourceId) || null; },
    async getMarketSourcePayload(businessId, sourceId) { return [...state.captures].reverse().find((x) => x.business_id === businessId && x.source_id === sourceId) || null; },
    async getMarketNormalization(businessId, sourceId, version, captureId) { return [...state.normalizations].reverse().find((x) => x.business_id === businessId && x.source_id === sourceId && x.normalizer_version === version && (!captureId || x.capture_id === captureId)) || null; },
    async saveMarketNormalization(record) { const row = { id: id("normalization"), business_id: record.businessId, source_id: record.sourceId, capture_id: record.captureId, normalized_text: record.normalizedText, language: record.language, sections: record.sections, warnings: record.warnings, normalizer_version: record.normalizerVersion }; state.normalizations.push(row); return row; },
    async listMarketSources(businessId) { return state.sources.filter((x) => x.business_id === businessId); },
    async persistMarketCandidate(record) { const row = { id: id("candidate"), business_id: record.businessId, identity_key: record.identityKey, scope_key: record.scopeKey, domain: record.domain, memory_type: record.memoryType, entity_key: record.entityKey, claim_key: record.claimKey, value: record.value, confidence: 0, scope: record.scope, valid_from: record.validity.validFrom, valid_until: record.validity.validUntil, freshness_class: record.freshnessClass, status: "candidate", evidence: record.evidence }; state.candidates.push(row); return row; },
    async loadMarketSynthesisCandidates(businessId, keys) { return state.candidates.filter((x) => x.business_id === businessId && keys.includes(x.identity_key)).map((x) => ({ id: x.id, identityKey: x.identity_key, evidence: x.evidence.map((e) => ({ ...e, authority: "primary" })) })); },
    async saveMarketSynthesisResult(record) { for (const update of record.updates) Object.assign(state.candidates.find((x) => x.id === update.candidateId), { confidence: update.confidence, confidence_band: update.confidenceBand, status: update.status }); return true; },
    async loadMarketReviewCandidates(businessId, keys) { return state.candidates.filter((x) => x.business_id === businessId && (!keys || keys.includes(x.identity_key)) && ["candidate", "needs_review"].includes(x.status)); },
    async loadMarketConflicts() { return []; }, async loadMarketCandidateUpdates(businessId) { return state.updates.filter((x) => x.business_id === businessId); },
    async approveMarketCandidate(record) { const candidate = state.candidates.find((x) => x.id === record.candidateId && x.business_id === record.businessId); if (!candidate || candidate.status !== "candidate") throw new Error("approvable candidate not found"); candidate.status = "promoted"; const previous = [...state.versions].reverse().find((x) => x.identity_key === candidate.identity_key); const row = { ...candidate, id: id("version"), version: (previous?.version || 0) + 1, status: "approved", supersedes: previous?.id || null, approved_at: "2026-07-22T00:00:00.000Z", approved_by: record.actorId }; state.versions.push(row); return row; },
    async rejectMarketCandidate(record) { const row = state.candidates.find((x) => x.id === record.candidateId); row.status = "rejected"; return row; }, async resolveMarketConflict() { return {}; },
    async listMarketVersions(businessId) { return state.versions.filter((x) => x.business_id === businessId); }, async getMarketVersionHistory(businessId, key) { return state.versions.filter((x) => x.business_id === businessId && x.identity_key === key); },
    async loadMarketSliceInputs(businessId) { return { versions: state.versions.filter((x) => x.business_id === businessId), evidence: state.versions.flatMap((v) => (v.evidence || []).map((e) => ({ version_id: v.id, source_id: e.sourceId }))), conflicts: [], unapprovedCount: state.candidates.filter((x) => x.business_id === businessId && ["candidate", "needs_review"].includes(x.status)).length }; },
    async loadKnowledgeSliceInputs() { return { versions: [], evidence: [], conflicts: [], unapprovedCount: 0 }; },
    async createMarketCandidateUpdate(record) { const row = { id: id("update"), business_id: record.businessId, status: "candidate", ...record }; state.updates.push(row); return row; },
    async transitionMarketVersion(record) { const current = state.versions.find((x) => x.id === record.versionId); const row = { ...current, id: id("version"), version: current.version + 1, status: record.status, supersedes: current.id, approved_by: record.actorId }; state.versions.push(row); return row; },
    async transitionMarketSource(record) { const source = state.sources.find((x) => x.id === record.sourceId); source.status = record.status; return source; },
  };
}

async function main() {
  const persistence = memoryPersistence(); const events = [];
  const provider = async () => ({ provider: "test", model: "fixture", text: JSON.stringify({ candidates: [{ domain: "competitor", memoryType: "claim", entityKey: "competitor:acme", claimKey: "positioning", value: { statement: "Acme positions itself as premium." }, scope: { businessId: "business-a", geography: "US" }, validity: { validFrom: "2026-07-01T00:00:00.000Z", validUntil: "2026-10-01T00:00:00.000Z" }, freshnessClass: "volatile", evidence: [{ sectionOrdinal: 0, excerpt: "Acme premium positioning" }] }] }) });
  const service = createKnowledgeService({ persistence, provider, clock: () => new Date("2026-07-22T00:00:00.000Z"), logger: { info: (_name, event) => events.push(event) } });
  const base = { businessId: "business-a", createdBy: "reviewer-a", sourceKind: "text", sourceCategory: "competitor_official", title: "Acme", originalReference: "https://acme.test", publisher: "Acme", authority: "primary", accessBasis: "public", captureMethod: "manual", content: "Acme premium positioning" };
  const source = await service.registerMarketSource(base); expect("source capture is registered", source.id && !source.duplicate);
  const duplicate = await service.registerMarketSource(base); expect("exact capture hash is deduplicated", duplicate.id === source.id && duplicate.duplicate);
  const result = await service.processMarketSource({ businessId: "business-a", sourceId: source.id, actorId: "reviewer-a" });
  expect("normalization and evidence extraction create a candidate", result.normalization.normalized_text && result.candidates.length === 1);
  expect("candidate remains runtime-invisible before approval", (await service.getKnowledgeSlice({ businessId: "business-a", module: "research", task: "market_research", scope: { geography: "US" } })).items.length === 0);
  const version = await service.approveMarketCandidate({ businessId: "business-a", candidateId: result.candidates[0].id, actorId: "reviewer-a", reason: "Evidence reviewed" });
  expect("human approval creates immutable version", version.version === 1 && version.status === "approved");
  const slice = await service.getKnowledgeSlice({ businessId: "business-a", module: "research", task: "market_research", scope: { geography: "US" } });
  expect("approved market version enters canonical Knowledge Slice", slice.items.length === 1 && slice.items[0].memoryKind === "market");
  const otherBusiness = await service.getKnowledgeSlice({ businessId: "business-b", module: "research", task: "market_research", scope: { geography: "US" } });
  expect("business isolation is preserved", otherBusiness.items.length === 0);
  const update = await service.createMarketCandidateUpdate({ businessId: "business-a", proposedDomain: "competitor", memoryType: "observation", proposedIdentityKey: "competitor:acme:price", proposedValue: { price: 100 }, source: { kind: "campaign_event", referenceId: "event-1" }, evidence: [], actorId: "runtime-a" });
  expect("runtime write is candidate-only", update.status === "candidate" && persistence.state.versions.length === 1);
  const revoked = await service.transitionMarketVersion({ businessId: "business-a", versionId: persistence.state.versions[0].id, status: "revoked", actorId: "reviewer-a", reason: "No longer valid" });
  expect("revocation appends history and removes runtime visibility", revoked.version === 2 && revoked.status === "revoked" && (await service.getKnowledgeSlice({ businessId: "business-a", module: "research", task: "market_research", scope: { geography: "US" } })).items.length === 0);
  const retired = await service.transitionMarketSource({ businessId: "business-a", sourceId: source.id, status: "retired", actorId: "reviewer-a", reason: "Source discontinued" });
  expect("source retirement is explicit and auditable through service", retired.status === "retired");
  expect("observability excludes raw evidence", events.every((event) => !JSON.stringify(event).includes("premium positioning")));
  const routes = ["sources/route.js", "sources/[id]/process/route.js", "review/route.js", "candidates/[id]/approve/route.js", "candidates/[id]/reject/route.js", "conflicts/[id]/resolve/route.js", "items/route.js", "items/[identity]/history/route.js", "candidate-updates/route.js"];
  expect("high-level APIs delegate without direct persistence", routes.every((file) => { const code = fs.readFileSync(path.join(process.cwd(), "app/api/knowledge/market", file), "utf8"); return !code.includes(".from(") && !code.includes(".rpc("); }));
  console.log(`\nMarket Memory smoke: ${passed} passed, ${failed} failed.`); if (failed) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
