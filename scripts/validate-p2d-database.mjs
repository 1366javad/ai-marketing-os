import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/202607190004_phase2_approval_versioning.sql");

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

async function asUser(client, userId) {
  await client.query("reset role");
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub',$1,true)", [userId]);
}
async function asAdministrator(client) {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claim.sub','',true)");
}
async function expectRejection(client, operation, message) {
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

try {
  await client.connect();
  pass("development database connection");
  const migration = fs.readFileSync(migrationPath, "utf8");
  await client.query("begin");
  try {
    await client.query(migration);
    const registry = await client.query("select to_regclass('supabase_migrations.schema_migrations') as table_name");
    if (registry.rows[0].table_name) {
      await client.query(`
        insert into supabase_migrations.schema_migrations(version,name,statements)
        values($1,$2,$3) on conflict(version) do nothing
      `, ["202607190004", "phase2_approval_versioning", [migration]]);
    }
    await client.query("commit");
    pass("P2-D migration applied or refreshed atomically");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  const schema = await client.query(`
    select
      to_regprocedure('public.approve_knowledge_candidate(uuid,uuid,uuid,text,timestamptz,timestamptz,text)') is not null as approve,
      to_regprocedure('public.reject_knowledge_candidate(uuid,uuid,uuid,text,text)') is not null as reject,
      to_regprocedure('public.resolve_knowledge_conflict(uuid,uuid,uuid,uuid,text,text)') is not null as resolve,
      to_regprocedure('public.revoke_knowledge_version(uuid,uuid,uuid,text,text)') is not null as revoke
  `);
  assert(Object.values(schema.rows[0]).every(Boolean), "P2-D management functions exist");

  await client.query("begin");
  const ownerId = randomUUID();
  const reviewerId = randomUUID();
  const outsiderId = randomUUID();
  const businessId = randomUUID();
  const sourceId = randomUUID();
  const candidate1 = randomUUID();
  const candidate2 = randomUUID();
  const candidateA = randomUUID();
  const candidateB = randomUUID();
  const candidateRejected = randomUUID();
  const candidateExpired = randomUUID();
  const conflictId = randomUUID();
  const identityKey = `positioning:${randomUUID()}`;
  const expiredIdentityKey = `offer:${randomUUID()}`;
  const scopeKey = `business:${businessId}`;

  for (const [id, label] of [[ownerId, "owner"], [reviewerId, "reviewer"], [outsiderId, "outsider"]]) {
    await client.query(`
      insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())
    `, [id, `p2d-${label}-${id}@example.invalid`]);
  }
  await client.query("insert into public.businesses(id,name,created_by) values($1,'P2-D Validation',$2)", [businessId, ownerId]);
  await client.query(`
    insert into public.business_memberships(business_id,user_id,role)
    values($1,$2,'owner'),($1,$3,'reviewer')
  `, [businessId, ownerId, reviewerId]);
  await client.query(`
    insert into public.knowledge_sources(id,business_id,source_kind,title,content_hash,authority,status,captured_at,created_by)
    values($1,$2,'text','Approved Source',$3,'authoritative','processed',now(),$4)
  `, [sourceId, businessId, hash("source"), ownerId]);

  async function insertCandidate(id, value, status = "candidate") {
    await client.query(`
      insert into public.knowledge_candidates(
        id,business_id,domain,identity_key,scope_key,subject_key,claim_key,value,value_hash,
        confidence,scope,status,extractor_version
      ) values($1,$2,'positioning',$3,$4,'brand','market_position',$5::jsonb,$6,.95,$7::jsonb,$8,'knowledge-extractor-v1')
    `, [id, businessId, identityKey, scopeKey, JSON.stringify(value), hash(value), JSON.stringify({ businessId }), status]);
    await client.query(`
      insert into public.knowledge_candidate_evidence(business_id,candidate_id,source_id,section_ordinal,excerpt_hash)
      values($1,$2,$3,0,$4)
    `, [businessId, id, sourceId, hash(`evidence-${id}`)]);
  }
  await insertCandidate(candidate1, "Premium skincare");
  await insertCandidate(candidate2, "Premium clinical skincare");
  await insertCandidate(candidateRejected, "Unsupported statement");

  await asUser(client, outsiderId);
  await expectRejection(client, () => client.query(
    "select public.approve_knowledge_candidate($1,$2,$3,'invalid actor',null,null,$4) as version",
    [businessId, candidate1, outsiderId, randomUUID()],
  ), "non-member cannot approve");

  await asUser(client, reviewerId);
  const first = await client.query(
    "select public.approve_knowledge_candidate($1,$2,$3,'verified evidence',null,null,$4) as version",
    [businessId, candidate1, reviewerId, randomUUID()],
  );
  const v1 = first.rows[0].version;
  assert(v1.version === 1 && v1.status === "approved", "reviewer approval creates immutable version one");
  await asAdministrator(client);
  await insertCandidate(candidateA, "Value A", "needs_review");
  await insertCandidate(candidateB, "Value B", "needs_review");
  await client.query(`
    insert into public.knowledge_conflicts(id,business_id,identity_key,candidate_ids,kind,status)
    values($1,$2,$3,$4::uuid[],'value_conflict','open')
  `, [conflictId, businessId, identityKey, [candidateA, candidateB]]);
  await asUser(client, reviewerId);
  await expectRejection(client, () => client.query(`
    insert into public.business_knowledge_versions(
      business_id,identity_key,scope_key,domain,subject_key,claim_key,value,version,status,
      confidence,scope,approved_at,approved_by
    ) values($1,$2,$3,'positioning','brand','forged','"forged"',99,'approved',1,$4,now(),$5)
  `, [businessId, identityKey, scopeKey, JSON.stringify({ businessId }), reviewerId]), "authenticated clients cannot bypass approval service");
  await expectRejection(client, () => client.query(
    "select public.approve_knowledge_candidate($1,$2,$3,'blocked conflict',null,null,$4)",
    [businessId, candidate2, reviewerId, randomUUID()],
  ), "open conflict blocks every candidate for its canonical identity");
  await client.query(
    "select public.resolve_knowledge_conflict($1,$2,$3,$4,'authoritative value selected',$5)",
    [businessId, conflictId, candidateA, reviewerId, randomUUID()],
  );
  const conflictState = await client.query(
    "select status,resolved_candidate_id from public.knowledge_conflicts where id=$1",
    [conflictId],
  );
  assert(conflictState.rows[0].status === "resolved" && conflictState.rows[0].resolved_candidate_id === candidateA, "human conflict resolution is recorded");
  await client.query(
    "select public.reject_knowledge_candidate($1,$2,$3,'insufficient support',$4)",
    [businessId, candidateRejected, reviewerId, randomUUID()],
  );
  const rejectedState = await client.query("select status from public.knowledge_candidates where id=$1", [candidateRejected]);
  assert(rejectedState.rows[0].status === "rejected", "human rejection is recorded without creating a version");

  const second = await client.query(
    "select public.approve_knowledge_candidate($1,$2,$3,'new approved wording',null,null,$4) as version",
    [businessId, candidate2, reviewerId, randomUUID()],
  );
  const v2 = second.rows[0].version;
  assert(v2.version === 2 && v2.supersedes === v1.id, "supersession appends version two and preserves history");
  const current = await client.query("select id from public.current_business_knowledge_versions where business_id=$1 and identity_key=$2", [businessId, identityKey]);
  assert(current.rowCount === 1 && current.rows[0].id === v2.id, "exactly one approved version is active");
  const history = await client.query("select id,version,status from public.business_knowledge_versions where business_id=$1 and identity_key=$2 order by version", [businessId, identityKey]);
  assert(history.rowCount === 2 && history.rows[0].id === v1.id, "superseded immutable history remains stored");
  await expectRejection(client, () => client.query("update public.business_knowledge_versions set value='\"changed\"' where id=$1", [v1.id]), "version history cannot be updated");
  await expectRejection(client, () => client.query(
    "select public.revoke_knowledge_version($1,$2,$3,'reviewer revoke',$4)",
    [businessId, v2.id, reviewerId, randomUUID()],
  ), "reviewer cannot revoke durable knowledge");

  await asAdministrator(client);
  await client.query(`
    insert into public.knowledge_candidates(
      id,business_id,domain,identity_key,scope_key,subject_key,claim_key,value,value_hash,
      confidence,scope,status,extractor_version
    ) values($1,$2,'offer',$3,$4,'offer','pricing','"Expired offer"',$5,.90,$6::jsonb,'candidate','knowledge-extractor-v1')
  `, [candidateExpired, businessId, expiredIdentityKey, scopeKey, hash("expired offer"), JSON.stringify({ businessId })]);
  await client.query(`
    insert into public.knowledge_candidate_evidence(business_id,candidate_id,source_id,section_ordinal,excerpt_hash)
    values($1,$2,$3,0,$4)
  `, [businessId, candidateExpired, sourceId, hash("expired evidence")]);
  await asUser(client, reviewerId);
  await client.query(
    "select public.approve_knowledge_candidate($1,$2,$3,'historical approved offer',$4,$5,$6)",
    [businessId, candidateExpired, reviewerId, "2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z", randomUUID()],
  );
  const expiredVisible = await client.query("select count(*)::int as count from public.current_business_knowledge_versions where business_id=$1 and identity_key=$2", [businessId, expiredIdentityKey]);
  assert(expiredVisible.rows[0].count === 0, "expired approved knowledge is not runtime-visible");

  await asUser(client, ownerId);
  const revokedResult = await client.query(
    "select public.revoke_knowledge_version($1,$2,$3,'no longer valid',$4) as version",
    [businessId, v2.id, ownerId, randomUUID()],
  );
  assert(revokedResult.rows[0].version.status === "revoked" && revokedResult.rows[0].version.version === 3, "owner revocation appends an auditable revoked version");
  const visibleAfterRevoke = await client.query("select count(*)::int as count from public.current_business_knowledge_versions where business_id=$1 and identity_key=$2", [businessId, identityKey]);
  assert(visibleAfterRevoke.rows[0].count === 0, "revoked, rejected, conflicted, and unapproved records are not runtime-visible");

  await asAdministrator(client);
  const evidence = await client.query("select count(*)::int as count from public.knowledge_version_evidence where business_id=$1", [businessId]);
  assert(evidence.rows[0].count === 4, "every appended version preserves exact evidence");
  const audit = await client.query(`
    select action,count(*)::int as count from public.knowledge_audit_events
    where business_id=$1 and action in (
      'knowledge_candidate_approved','knowledge_candidate_rejected','knowledge_conflict_resolved','business_knowledge_revoked'
    ) group by action
  `, [businessId]);
  const auditCounts = Object.fromEntries(audit.rows.map((row) => [row.action, row.count]));
  assert(auditCounts.knowledge_candidate_approved === 3 && auditCounts.knowledge_candidate_rejected === 1 && auditCounts.knowledge_conflict_resolved === 1 && auditCounts.business_knowledge_revoked === 1, "audit evidence exists for every successful P2-D transition");

  await client.query("rollback");
  pass("P2-D database fixtures rolled back");
  console.log("P2-D_DATABASE_VALIDATION=PASS");
} catch (error) {
  console.error("P2-D_DATABASE_VALIDATION=FAIL");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
