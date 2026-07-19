const assert = require("node:assert/strict");
const { createKnowledgeService } = require("../index");
const { HARD_MAX_ITEMS } = require("./createKnowledgeSliceService");
const { MODULE_DOMAIN_ALLOWLISTS } = require("./moduleDomainAllowlists");

const BUSINESS_ID = "business-1";
const AS_OF = "2026-07-19T12:00:00.000Z";

function version(id, domain, overrides = {}) {
  return {
    id,
    business_id: BUSINESS_ID,
    identity_key: `identity-${id}`,
    scope_key: `business:${BUSINESS_ID}`,
    domain,
    subject_key: "brand",
    claim_key: id,
    value: `${id} value`,
    version: 1,
    status: "approved",
    confidence: 0.8,
    scope: { businessId: BUSINESS_ID },
    valid_from: null,
    valid_until: null,
    supersedes: null,
    approved_at: "2026-07-18T00:00:00.000Z",
    ...overrides,
  };
}

function createPersistence(input) {
  let calls = 0;
  return {
    get calls() { return calls; },
    async loadKnowledgeSliceInputs(businessId) {
      calls += 1;
      assert.equal(businessId, BUSINESS_ID);
      return input;
    },
  };
}

(async () => {
  assert.deepEqual(MODULE_DOMAIN_ALLOWLISTS.research, ["constraint", "approved_fact", "brand_identity", "product", "offer", "business_model", "audience", "business_goal"]);
  assert.deepEqual(MODULE_DOMAIN_ALLOWLISTS.seo, ["constraint", "approved_fact", "brand_identity", "positioning", "value_proposition", "product", "offer", "audience", "business_goal"]);
  for (const runtimeModule of ["content", "creative", "ads", "video"]) {
    assert.deepEqual(MODULE_DOMAIN_ALLOWLISTS[runtimeModule], ["constraint", "approved_fact", "brand_identity", "tone_rule", "positioning", "value_proposition", "product", "offer", "audience"]);
  }
  assert(!MODULE_DOMAIN_ALLOWLISTS.analytics.includes("validated_learning"));
  assert.equal(MODULE_DOMAIN_ALLOWLISTS.analytics.length, 11);

  const versions = [
    version("constraint", "constraint", { confidence: 0.2 }),
    version("fact", "approved_fact", { confidence: 0.3 }),
    version("positioning", "positioning", {
      confidence: 1,
      scope: { businessId: BUSINESS_ID, brandId: "brand-1" },
    }),
    version("wrong-brand", "tone_rule", {
      scope: { businessId: BUSINESS_ID, brandId: "brand-2" },
    }),
    version("wrong-product", "product", {
      scope: { businessId: BUSINESS_ID, productId: "product-2" },
    }),
    version("wrong-domain", "business_model"),
    version("future", "offer", { valid_from: "2027-01-01T00:00:00.000Z" }),
    version("expired-validity", "offer", { valid_until: "2026-01-01T00:00:00.000Z" }),
    version("revoked", "offer", { status: "revoked" }),
    version("explicit-expired", "offer", { status: "expired" }),
    version("old", "offer"),
    version("new", "offer", { identity_key: "identity-old", version: 2, supersedes: "old" }),
    version("conflicted", "audience"),
    version("learning", "validated_learning"),
    version("other-business", "constraint", { business_id: "business-2" }),
  ];
  const evidence = versions.map((row) => ({
    version_id: row.id,
    source_id: `source-${row.id}`,
    excerpt_hash: "a".repeat(64),
  }));
  const persistence = createPersistence({
    versions,
    evidence,
    conflicts: [{ id: "conflict-1", identity_key: "identity-conflicted", status: "open" }],
    unapprovedCount: 2,
  });
  const service = createKnowledgeService({
    persistence,
    clock: () => new Date("2026-07-19T12:30:00.000Z"),
  });
  const request = {
    businessId: BUSINESS_ID,
    module: "content",
    task: "blog_post",
    scope: { brandId: "brand-1" },
    asOf: AS_OF,
    maxItems: 2,
  };
  const first = await service.getKnowledgeSlice(request);
  const second = await service.getKnowledgeSlice(request);

  assert.deepEqual(first.items.map((item) => item.domain), ["constraint", "approved_fact"]);
  assert.equal(first.items.length, 2);
  assert.equal(first.items[0].sourceIds[0], "source-constraint");
  assert(first.items.every((item) => item.validAt === AS_OF));
  assert.equal(first.diagnostics.truncated, true);
  assert(first.diagnostics.excludedByStatus >= 6);
  assert.equal(first.diagnostics.excludedByScope, 2);
  assert(first.diagnostics.excludedByValidity >= 2);
  assert(first.diagnostics.excludedByDomain >= 2);
  assert.equal(first.diagnostics.unresolvedConflictCount, 1);
  assert.deepEqual(first, second);
  assert.equal(persistence.calls, 2);
  assert(!first.items.some((item) => [
    "wrong-brand", "wrong-product", "wrong-domain", "future", "expired-validity", "revoked",
    "explicit-expired", "old", "conflicted", "learning", "other-business",
  ].includes(item.knowledgeId)));

  const manyVersions = [
    version("protected-constraint", "constraint"),
    version("protected-fact", "approved_fact"),
    ...Array.from({ length: 58 }, (_, index) => version(`offer-${index}`, "offer", {
      confidence: (100 - index) / 100,
      approved_at: new Date(Date.UTC(2026, 6, 18, 0, 0, index)).toISOString(),
    })),
  ];
  const bounded = await createKnowledgeService({
    persistence: createPersistence({ versions: manyVersions, evidence: [], conflicts: [], unapprovedCount: 0 }),
    clock: () => new Date(AS_OF),
  }).getKnowledgeSlice({
    businessId: BUSINESS_ID,
    module: "ads",
    task: "ad_copy",
    asOf: AS_OF,
    maxItems: 500,
  });
  assert.equal(bounded.items.length, HARD_MAX_ITEMS);
  assert.equal(bounded.diagnostics.truncated, true);
  assert(bounded.items.some((item) => item.domain === "constraint"));
  assert(bounded.items.some((item) => item.domain === "approved_fact"));

  await assert.rejects(() => service.getKnowledgeSlice({
    businessId: BUSINESS_ID, module: "unknown", task: "test",
  }), /module must be one of/);
  await assert.rejects(() => service.getKnowledgeSlice({
    businessId: BUSINESS_ID, module: "content", task: "test", maxItems: 0,
  }), /positive integer/);
  console.log("P2-E Knowledge Slice smoketest passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
