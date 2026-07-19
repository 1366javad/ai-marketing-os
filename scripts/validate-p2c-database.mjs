import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import pg from "pg";

const require = createRequire(import.meta.url);
const { buildKnowledgeIdentity } = require("../app/lib/ai/knowledge/versions/buildKnowledgeIdentity");
const { synthesizeCandidateGroups } = require("../app/lib/ai/knowledge/synthesis/synthesizeCandidateGroups");
const { Client } = pg;
const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/202607190002_phase2_candidate_extraction.sql");
const boundaryMigrationPath = path.join(root, "supabase/migrations/202607190003_phase2_candidate_write_boundary.sql");

function env(name) {
  const line = fs.readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((item) => new RegExp(`^\\s*${name}\\s*=`).test(item))
    .at(-1);
  if (!line) throw new Error(`${name} is missing`);
  return line.replace(new RegExp(`^\\s*${name}\\s*=\\s*`), "").trim().replace(/^(['"])(.*)\1$/, "$2");
}
function pass(message) { console.log(`PASS ${message}`); }
function assert(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`);
  pass(message);
}
function hash(value) { return createHash("sha256").update(value).digest("hex"); }

async function expectRejection(operation, message) {
  await client.query("savepoint expected_rejection");
  try {
    await operation();
  } catch {
    await client.query("rollback to savepoint expected_rejection");
    pass(message);
    return;
  }
  await client.query("rollback to savepoint expected_rejection");
  throw new Error(`FAIL ${message}`);
}

const client = new Client({
  connectionString: env("DATABASE_URL"),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
  query_timeout: 30_000,
});

async function persistCandidate({ businessId, sourceId, identity, value, excerptHash, actorId, correlationId }) {
  const result = await client.query(`
    select public.persist_knowledge_candidate(
      $1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,
      null,null,$11,$12::jsonb,$13::uuid,$14
    ) as candidate
  `, [
    businessId,
    sourceId,
    identity.identityKey,
    identity.scopeKey,
    identity.domain,
    identity.subjectKey,
    identity.claimKey,
    JSON.stringify(value),
    hash(String(value).toLowerCase()),
    JSON.stringify(identity.scope),
    "knowledge-extractor-v1",
    JSON.stringify([{ sourceId, sectionOrdinal: 0, excerptHash }]),
    actorId,
    correlationId,
  ]);
  return result.rows[0].candidate;
}

async function loadSynthesisInputs(businessId, identityKey) {
  const rows = await client.query(`
    select candidate.id, candidate.identity_key, candidate.value_hash,
      jsonb_agg(jsonb_build_object(
        'sourceId', evidence.source_id,
        'sectionOrdinal', evidence.section_ordinal,
        'excerptHash', evidence.excerpt_hash,
        'authority', source.authority
      ) order by evidence.source_id) as evidence
    from public.knowledge_candidates candidate
    join public.knowledge_candidate_evidence evidence on evidence.candidate_id = candidate.id
    join public.knowledge_sources source on source.id = evidence.source_id
    where candidate.business_id = $1 and candidate.identity_key = $2
    group by candidate.id
  `, [businessId, identityKey]);
  return rows.rows.map((row) => ({
    id: row.id,
    identityKey: row.identity_key,
    valueHash: row.value_hash,
    evidence: row.evidence,
  }));
}

async function saveSynthesis(businessId, result, actorId, correlationId) {
  await client.query(`
    select public.save_knowledge_synthesis($1::uuid,$2,$3::jsonb,$4::jsonb,$5::uuid,$6)
  `, [
    businessId,
    result.identityKey,
    JSON.stringify(result.updates),
    result.conflict ? JSON.stringify(result.conflict) : null,
    actorId,
    correlationId,
  ]);
}

try {
  await client.connect();
  pass("development database connection");
  const installed = await client.query("select to_regprocedure('public.persist_knowledge_candidate(uuid,uuid,text,text,text,text,text,jsonb,text,jsonb,timestamptz,timestamptz,text,jsonb,uuid,text)') as function_name");
  if (!installed.rows[0].function_name) {
    const migration = fs.readFileSync(migrationPath, "utf8");
    await client.query("begin");
    try {
      await client.query(migration);
      const registry = await client.query("select to_regclass('supabase_migrations.schema_migrations') as table_name");
      if (registry.rows[0].table_name) {
        await client.query(`
          insert into supabase_migrations.schema_migrations (version, name, statements)
          values ($1,$2,$3) on conflict (version) do nothing
        `, ["202607190002", "phase2_candidate_extraction", [migration]]);
      }
      await client.query("commit");
      pass("P2-C migration applied atomically");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  } else pass("P2-C migration already applied");

  const boundary = await client.query(`
    select routine.prosecdef
    from pg_proc routine
    where routine.oid = 'public.save_knowledge_synthesis(uuid,text,jsonb,jsonb,uuid,text)'::regprocedure
  `);
  if (!boundary.rows[0]?.prosecdef) {
    const migration = fs.readFileSync(boundaryMigrationPath, "utf8");
    await client.query("begin");
    try {
      await client.query(migration);
      const registry = await client.query("select to_regclass('supabase_migrations.schema_migrations') as table_name");
      if (registry.rows[0].table_name) {
        await client.query(`
          insert into supabase_migrations.schema_migrations (version, name, statements)
          values ($1,$2,$3) on conflict (version) do nothing
        `, ["202607190003", "phase2_candidate_write_boundary", [migration]]);
      }
      await client.query("commit");
      pass("P2-C deterministic write boundary migration applied atomically");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  } else pass("P2-C deterministic write boundary already applied");

  const schema = await client.query(`
    select
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='knowledge_candidates' and column_name='value_hash') as value_hash,
      to_regprocedure('public.save_knowledge_synthesis(uuid,text,jsonb,jsonb,uuid,text)') is not null as synthesis,
      to_regclass('public.knowledge_conflicts_open_identity_idx') is not null as conflict_index
  `);
  assert(Object.values(schema.rows[0]).every(Boolean), "P2-C schema and deterministic functions exist");

  await client.query("begin");
  const userId = randomUUID();
  const businessId = randomUUID();
  const correlationId = randomUUID();
  const sourceA = randomUUID();
  const sourceB = randomUUID();
  const sourceC = randomUUID();
  await client.query(`
    insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values ($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())
  `, [userId, `p2c-${userId}@example.invalid`]);
  await client.query("insert into public.businesses(id,name,created_by) values($1,'P2-C Validation',$2)", [businessId, userId]);
  await client.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'owner')", [businessId, userId]);
  await client.query(`
    insert into public.knowledge_sources(id,business_id,source_kind,title,content_hash,authority,status,captured_at,created_by)
    values
      ($1,$2,'text','Official Guide',$3,'authoritative','normalized',now(),$4),
      ($5,$2,'text','Sales Deck',$6,'supporting','normalized',now(),$4),
      ($7,$2,'text','Unverified Note',$8,'unverified','normalized',now(),$4)
  `, [sourceA, businessId, "a".repeat(64), userId, sourceB, "b".repeat(64), sourceC, "c".repeat(64)]);
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub',$1,true)", [userId]);

  await expectRejection(
    () => client.query(`
      insert into public.knowledge_candidates(
        business_id,domain,identity_key,scope_key,subject_key,claim_key,value,
        value_hash,confidence,scope,status,extractor_version
      ) values($1,'positioning','forged','forged','brand','position','"forged"',
        $2,1,'{}','promoted','forged')
    `, [businessId, hash("forged")]),
    "authenticated clients cannot write candidate tables directly",
  );

  const identity = buildKnowledgeIdentity({
    businessId,
    domain: "positioning",
    scope: { businessId },
    subjectKey: "brand",
    claimKey: "market_position",
  });
  const premiumA = await persistCandidate({ businessId, sourceId: sourceA, identity, value: "premium skincare", excerptHash: hash("premium evidence a"), actorId: userId, correlationId });
  const premiumB = await persistCandidate({ businessId, sourceId: sourceB, identity, value: "premium skincare", excerptHash: hash("premium evidence b"), actorId: userId, correlationId });
  assert(premiumA.id === premiumB.id, "agreeing source claims collapse to one candidate");
  let inputs = await loadSynthesisInputs(businessId, identity.identityKey);
  let synthesis = synthesizeCandidateGroups(inputs)[0];
  const forgedUpdates = synthesis.updates.map((update) => ({ ...update, confidence: 1 }));
  await expectRejection(
    () => client.query(
      "select public.save_knowledge_synthesis($1::uuid,$2,$3::jsonb,null,$4::uuid,$5)",
      [businessId, identity.identityKey, JSON.stringify(forgedUpdates), userId, correlationId],
    ),
    "RPC rejects provider or client supplied confidence",
  );
  await saveSynthesis(businessId, synthesis, userId, correlationId);
  const agreement = await client.query(`
    select candidate.confidence, candidate.status, count(evidence.id)::int as evidence_count
    from public.knowledge_candidates candidate
    join public.knowledge_candidate_evidence evidence on evidence.candidate_id=candidate.id
    where candidate.id=$1 group by candidate.id
  `, [premiumA.id]);
  assert(agreement.rows[0].evidence_count === 2 && Number(agreement.rows[0].confidence) === 0.94, "agreement preserves evidence and frozen confidence");

  await persistCandidate({ businessId, sourceId: sourceC, identity, value: "affordable skincare", excerptHash: hash("affordable evidence"), actorId: userId, correlationId });
  inputs = await loadSynthesisInputs(businessId, identity.identityKey);
  synthesis = synthesizeCandidateGroups(inputs)[0];
  await saveSynthesis(businessId, synthesis, userId, correlationId);
  const conflict = await client.query("select status,candidate_ids from public.knowledge_conflicts where business_id=$1 and identity_key=$2", [businessId, identity.identityKey]);
  const candidates = await client.query("select status from public.knowledge_candidates where business_id=$1 and identity_key=$2", [businessId, identity.identityKey]);
  assert(conflict.rowCount === 1 && conflict.rows[0].status === "open" && conflict.rows[0].candidate_ids.length === 2, "conflicting sources create one open conflict");
  assert(candidates.rows.every((candidate) => candidate.status === "needs_review"), "open conflict gates every candidate for review");
  const versions = await client.query("select count(*)::int as count from public.business_knowledge_versions where business_id=$1", [businessId]);
  assert(versions.rows[0].count === 0, "P2-C creates no Knowledge Version or approval");

  await client.query("rollback");
  pass("P2-C database fixtures rolled back");
  console.log("P2-C_DATABASE_VALIDATION=PASS");
} catch (error) {
  console.error("P2-C_DATABASE_VALIDATION=FAIL");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
