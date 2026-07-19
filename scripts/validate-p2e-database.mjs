import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import pg from "pg";

const require = createRequire(import.meta.url);
const { createKnowledgeService } = require("../app/lib/ai/knowledge");
const { Client } = pg;
const root = process.cwd();

function env(name) {
  const line = fs.readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((item) => new RegExp(`^\\s*${name}\\s*=`).test(item))
    .at(-1);
  if (!line) throw new Error(`${name} is missing`);
  return line.replace(new RegExp(`^\\s*${name}\\s*=\\s*`), "").trim().replace(/^(['"])(.*)\1$/, "$2");
}
function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function pass(message) { console.log(`PASS ${message}`); }
function assert(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`);
  pass(message);
}

const client = new Client({
  connectionString: env("DATABASE_URL"),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
  query_timeout: 30_000,
});

function createPgSlicePersistence() {
  return {
    async loadKnowledgeSliceInputs(businessId) {
      const versions = await client.query(
        "select * from public.business_knowledge_versions where business_id=$1",
        [businessId],
      );
      const evidence = await client.query(
        "select version_id,source_id,excerpt_hash from public.knowledge_version_evidence where business_id=$1",
        [businessId],
      );
      const conflicts = await client.query(
        "select id,identity_key,status from public.knowledge_conflicts where business_id=$1 and status='open'",
        [businessId],
      );
      const candidates = await client.query(
        "select count(*)::int as count from public.knowledge_candidates where business_id=$1 and status in ('candidate','needs_review')",
        [businessId],
      );
      return {
        versions: versions.rows,
        evidence: evidence.rows,
        conflicts: conflicts.rows,
        unapprovedCount: candidates.rows[0].count,
      };
    },
  };
}

try {
  await client.connect();
  pass("development database connection");
  await client.query("begin");
  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();
  const businessId = randomUUID();
  const otherBusinessId = randomUUID();
  const sourceId = randomUUID();
  const otherSourceId = randomUUID();
  const scopeKey = `business:${businessId}`;

  for (const [id, label] of [[ownerId, "owner"], [otherOwnerId, "other"]]) {
    await client.query(`
      insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())
    `, [id, `p2e-${label}-${id}@example.invalid`]);
  }
  await client.query("insert into public.businesses(id,name,created_by) values($1,'P2-E Validation',$2),($3,'P2-E Other',$4)", [businessId, ownerId, otherBusinessId, otherOwnerId]);
  await client.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'owner'),($3,$4,'owner')", [businessId, ownerId, otherBusinessId, otherOwnerId]);
  await client.query(`
    insert into public.knowledge_sources(id,business_id,source_kind,title,content_hash,authority,status,captured_at,created_by)
    values($1,$2,'text','P2-E Source',$3,'authoritative','processed',now(),$4),
      ($5,$6,'text','Other Source',$7,'authoritative','processed',now(),$8)
  `, [sourceId, businessId, hash("p2e-source"), ownerId, otherSourceId, otherBusinessId, hash("other-source"), otherOwnerId]);

  async function addVersion({
    id = randomUUID(),
    targetBusinessId = businessId,
    targetSourceId = sourceId,
    approverId = ownerId,
    identity = randomUUID(),
    domain = "offer",
    status = "approved",
    scope = { businessId },
    validFrom = null,
    validUntil = null,
    version = 1,
    supersedes = null,
    confidence = 0.8,
  } = {}) {
    await client.query(`
      insert into public.business_knowledge_versions(
        id,business_id,identity_key,scope_key,domain,subject_key,claim_key,value,
        version,status,confidence,scope,valid_from,valid_until,supersedes,approved_at,approved_by
      ) values($1,$2,$3,$4,$5,'brand',$6,$7::jsonb,$8,$9,$10,$11::jsonb,$12,$13,$14,now(),$15)
    `, [id, targetBusinessId, identity, `business:${targetBusinessId}`, domain, `claim-${id}`, JSON.stringify(`value-${id}`), version, status, confidence, JSON.stringify(scope), validFrom, validUntil, supersedes, approverId]);
    await client.query(`
      insert into public.knowledge_version_evidence(business_id,version_id,source_id,excerpt_hash)
      values($1,$2,$3,$4)
    `, [targetBusinessId, id, targetSourceId, hash(`evidence-${id}`)]);
    return id;
  }

  const constraintId = await addVersion({ domain: "constraint", confidence: 0.2 });
  const factId = await addVersion({ domain: "approved_fact", confidence: 0.3 });
  const positioningId = await addVersion({ domain: "positioning", scope: { businessId, brandId: "brand-1" }, confidence: 1 });
  await addVersion({ domain: "tone_rule", scope: { businessId, brandId: "brand-2" } });
  await addVersion({ domain: "business_model" });
  await addVersion({ domain: "offer", validUntil: "2026-01-01T00:00:00.000Z" });
  await addVersion({ domain: "offer", status: "revoked" });
  const chainIdentity = randomUUID();
  const oldId = await addVersion({ domain: "offer", identity: chainIdentity });
  const newId = await addVersion({ domain: "offer", identity: chainIdentity, version: 2, supersedes: oldId });
  const conflictedId = await addVersion({ domain: "audience" });
  await client.query(`
    insert into public.knowledge_conflicts(business_id,identity_key,candidate_ids,kind,status)
    select $1,identity_key,$2::uuid[],'value_conflict','open'
    from public.business_knowledge_versions where id=$3
  `, [businessId, [randomUUID(), randomUUID()], conflictedId]);
  await client.query(`
    insert into public.knowledge_candidates(
      business_id,domain,identity_key,scope_key,subject_key,claim_key,value,value_hash,
      confidence,scope,status,extractor_version
    ) values($1,'offer',$2,$3,'offer','candidate','"candidate"',$4,.7,$5::jsonb,'candidate','knowledge-extractor-v1')
  `, [businessId, randomUUID(), scopeKey, hash("candidate"), JSON.stringify({ businessId })]);
  await addVersion({
    targetBusinessId: otherBusinessId,
    targetSourceId: otherSourceId,
    approverId: otherOwnerId,
    domain: "constraint",
    scope: { businessId: otherBusinessId },
  });

  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub',$1,true)", [ownerId]);
  const persistence = createPgSlicePersistence();
  const service = createKnowledgeService({ persistence, clock: () => new Date("2026-07-19T12:00:00.000Z") });
  const beforeCount = await client.query("select count(*)::int as count from public.business_knowledge_versions where business_id=$1", [businessId]);
  const request = {
    businessId,
    module: "content",
    task: "blog_post",
    scope: { brandId: "brand-1" },
    asOf: "2026-07-19T12:00:00.000Z",
    maxItems: 2,
  };
  const first = await service.getKnowledgeSlice(request);
  const second = await service.getKnowledgeSlice(request);
  assert(first.items.length === 2 && first.diagnostics.truncated, "hard request bound truncates deterministically");
  assert(first.items.some((item) => item.knowledgeId === constraintId) && first.items.some((item) => item.knowledgeId === factId), "constraints and approved facts survive truncation");
  assert(first.items.every((item) => item.sourceIds.length === 1), "slice items retain source provenance");
  assert(JSON.stringify(first) === JSON.stringify(second), "identical requests produce deterministic slices");
  assert(first.diagnostics.excludedByStatus >= 3 && first.diagnostics.excludedByScope >= 1 && first.diagnostics.excludedByValidity >= 1 && first.diagnostics.excludedByDomain >= 1, "exclusion diagnostics cover status, scope, validity, and domain");
  assert(first.diagnostics.unresolvedConflictCount === 1, "unresolved conflict diagnostics are explicit");

  const expanded = await service.getKnowledgeSlice({ ...request, maxItems: 50 });
  const expandedIds = expanded.items.map((item) => item.knowledgeId);
  assert(expandedIds.includes(positioningId) && expandedIds.includes(newId), "valid scoped and current versions are visible");
  assert(!expandedIds.includes(oldId) && !expandedIds.includes(conflictedId), "superseded and conflicted versions remain invisible");
  const otherBusinessInputs = await persistence.loadKnowledgeSliceInputs(otherBusinessId);
  assert(otherBusinessInputs.versions.length === 0, "RLS prevents cross-business slice inputs");
  const afterCount = await client.query("select count(*)::int as count from public.business_knowledge_versions where business_id=$1", [businessId]);
  assert(afterCount.rows[0].count === beforeCount.rows[0].count, "Knowledge Slice is read-only and creates no durable mutation");

  await client.query("reset role");
  await client.query("rollback");
  pass("P2-E database fixtures rolled back");
  console.log("P2-E_DATABASE_VALIDATION=PASS");
} catch (error) {
  console.error("P2-E_DATABASE_VALIDATION=FAIL");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
