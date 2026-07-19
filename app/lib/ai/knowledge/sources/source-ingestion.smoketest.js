const fs = require("node:fs");
const path = require("node:path");
const { createKnowledgeService } = require("../index");
const { hashSourceContent } = require("./hashSourceContent");

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

function createMemoryPersistence() {
  const sources = new Map();
  const payloads = new Map();
  const normalizations = new Map();
  const calls = [];
  let sequence = 0;
  return {
    calls,
    payloads,
    sources,
    async registerSource(record) {
      calls.push("registerSource");
      const duplicate = [...sources.values()].find(
        (source) => source.business_id === record.businessId && source.content_hash === record.contentHash,
      );
      if (duplicate) return { ...duplicate, duplicate: true };
      const id = `source-${++sequence}`;
      const row = {
        id,
        business_id: record.businessId,
        source_kind: record.sourceKind,
        title: record.title,
        original_reference: record.originalReference,
        content_hash: record.contentHash,
        authority: record.authority,
        status: "registered",
        captured_at: record.capturedAt,
        created_at: record.capturedAt,
        created_by: record.createdBy,
        metadata: record.metadata,
      };
      sources.set(id, row);
      payloads.set(id, {
        content_base64: record.contentBase64,
        content_encoding: record.contentEncoding,
      });
      return { ...row, duplicate: false };
    },
    async getSource(businessId, sourceId) {
      calls.push("getSource");
      const row = sources.get(sourceId);
      return row?.business_id === businessId ? row : null;
    },
    async getSourcePayload(businessId, sourceId) {
      calls.push("getSourcePayload");
      return sources.get(sourceId)?.business_id === businessId ? payloads.get(sourceId) : null;
    },
    async getNormalization(businessId, sourceId, version) {
      calls.push("getNormalization");
      return normalizations.get(`${businessId}:${sourceId}:${version}`) || null;
    },
    async saveNormalization(record) {
      calls.push("saveNormalization");
      const row = {
        source_id: record.sourceId,
        business_id: record.businessId,
        normalized_text: record.normalizedText,
        language: record.language,
        sections: record.sections,
        warnings: record.warnings,
        normalized_at: "2026-07-19T00:00:00.000Z",
        normalizer_version: record.normalizerVersion,
      };
      normalizations.set(`${record.businessId}:${record.sourceId}:${record.normalizerVersion}`, row);
      sources.get(record.sourceId).status = "normalized";
      return row;
    },
    async markSourceFailed(record) {
      calls.push("markSourceFailed");
      sources.get(record.sourceId).status = "failed";
      return true;
    },
    async resetSourceForRetry(record) {
      calls.push("resetSourceForRetry");
      sources.get(record.sourceId).status = "registered";
      return true;
    },
    async listSources(businessId) {
      calls.push("listSources");
      return [...sources.values()].filter((source) => source.business_id === businessId);
    },
  };
}

async function main() {
  const persistence = createMemoryPersistence();
  const lifecycleEvents = [];
  const service = createKnowledgeService({
    persistence,
    clock: () => new Date("2026-07-19T00:00:00.000Z"),
    logger: { info: (_name, event) => lifecycleEvents.push(event) },
  });
  const base = {
    businessId: "business-a",
    createdBy: "user-a",
    title: "Brand Source",
    authority: "authoritative",
  };

  const source = await service.registerKnowledgeSource({ ...base, sourceKind: "text", content: "Premium\r\n\r\n  Skincare" });
  expect("source registration creates immutable snapshot identity", source.id === "source-1" && !source.duplicate);
  expect("source hashing is deterministic", source.contentHash === hashSourceContent("Premium\r\n\r\n  Skincare"));
  const duplicate = await service.registerKnowledgeSource({ ...base, sourceKind: "text", content: "Premium\r\n\r\n  Skincare" });
  expect("duplicate content returns existing source", duplicate.id === source.id && duplicate.duplicate);
  const update = await service.registerKnowledgeSource({ ...base, sourceKind: "text", content: "Updated premium skincare" });
  expect("changed content creates new immutable snapshot", update.id !== source.id && !update.duplicate);

  const text = await service.normalizeKnowledgeSource({ businessId: "business-a", sourceId: source.id, actorId: "user-a" });
  expect("text adapter normalizes deterministically", text.normalizedText === "Premium\n\nSkincare");
  expect("text source becomes normalization-ready", persistence.sources.get(source.id).status === "normalized");
  const repeated = await service.normalizeKnowledgeSource({ businessId: "business-a", sourceId: source.id, actorId: "user-a" });
  expect("normalization is idempotent by source and processor version", repeated.idempotent === true);

  const fixtures = [
    ["document", Buffer.from("Page one\fPage two"), "Page one\n\nPage two"],
    ["website_snapshot", "<html><style>secret{}</style><body><h1>Brand</h1><script>ignore()</script><p>Premium &amp; clean</p></body></html>", "Brand\n\nPremium & clean"],
    ["transcript", "1\n00:00:01,000 --> 00:00:03,000\nFounder: Premium care", "Founder: Premium care"],
  ];
  for (const [sourceKind, content, expected] of fixtures) {
    const registered = await service.registerKnowledgeSource({ ...base, title: sourceKind, sourceKind, content });
    const normalized = await service.normalizeKnowledgeSource({ businessId: "business-a", sourceId: registered.id, actorId: "user-a" });
    expect(`${sourceKind} adapter is deterministic`, normalized.normalizedText === expected);
  }

  const retrySource = await service.registerKnowledgeSource({ ...base, title: "Retry", sourceKind: "text", content: "Retry content" });
  persistence.payloads.set(retrySource.id, null);
  let failedOnce = false;
  try {
    await service.normalizeKnowledgeSource({ businessId: "business-a", sourceId: retrySource.id, actorId: "user-a" });
  } catch {
    failedOnce = true;
  }
  expect("normalization failure records failed state", failedOnce && persistence.sources.get(retrySource.id).status === "failed");
  persistence.payloads.set(retrySource.id, { content_base64: Buffer.from("Retry content").toString("base64"), content_encoding: "utf8" });
  const retried = await service.normalizeKnowledgeSource({ businessId: "business-a", sourceId: retrySource.id, actorId: "user-a" });
  expect("failed normalization is retryable", retried.normalizedText === "Retry content" && persistence.calls.includes("resetSourceForRetry"));

  expect("observability never contains raw source text", lifecycleEvents.every((event) => !JSON.stringify(event).includes("Premium care")));
  expect("P2-B never writes candidates or approved versions", persistence.calls.every((call) => !/candidate|version|slice|synth|extract/i.test(call)));

  const routeFiles = [
    "app/api/knowledge/sources/route.js",
    "app/api/knowledge/sources/[id]/process/route.js",
  ];
  expect("routes delegate only to KnowledgeService", routeFiles.every((file) => {
    const code = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    return code.includes("createKnowledgeService") && !code.includes(".from(") && !code.includes(".rpc(");
  }));

  console.log(`\nP2-B source ingestion smoke: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
