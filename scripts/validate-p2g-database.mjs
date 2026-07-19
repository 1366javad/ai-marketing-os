import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/202607190005_phase2_candidate_updates.sql");
const rollbackPath = path.join(root, "supabase/rollbacks/202607190005_phase2_candidate_updates.down.sql");
function env(name) {
  const line = fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)
    .filter((item) => new RegExp(`^\\s*${name}\\s*=`).test(item)).at(-1);
  if (!line) throw new Error(`${name} is missing`);
  return line.replace(new RegExp(`^\\s*${name}\\s*=\\s*`), "").trim().replace(/^(['"])(.*)\1$/, "$2");
}
function pass(message) { console.log(`PASS ${message}`); }
function assert(condition, message) { if (!condition) throw new Error(`FAIL ${message}`); pass(message); }
async function asUser(client, id) {
  await client.query("reset role"); await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
}
async function admin(client) { await client.query("reset role"); await client.query("select set_config('request.jwt.claim.sub','',true)"); }
async function reject(client, operation, message) {
  await client.query("savepoint expected_failure");
  try { await operation(); } catch { await client.query("rollback to savepoint expected_failure"); pass(message); return; }
  await client.query("rollback to savepoint expected_failure"); throw new Error(`FAIL ${message}`);
}
const client = new Client({ connectionString: env("DATABASE_URL"), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000, query_timeout: 30000 });
try {
  await client.connect(); pass("development database connection");
  const migration = fs.readFileSync(migrationPath, "utf8");
  await client.query("begin");
  try { await client.query(migration); await client.query("commit"); pass("P2-G migration applied atomically"); }
  catch (error) { await client.query("rollback"); throw error; }
  const functions = await client.query(`select
    to_regprocedure('public.create_knowledge_candidate_update(uuid,text,text,jsonb,text,text,jsonb,uuid,text)') is not null as create_update,
    to_regprocedure('public.review_knowledge_candidate_update(uuid,uuid,text,uuid,text,text)') is not null as review_update`);
  assert(Object.values(functions.rows[0]).every(Boolean), "Candidate Update functions exist");

  await client.query("begin");
  const owner=randomUUID(), reviewer=randomUUID(), member=randomUUID(), outsider=randomUUID(), business=randomUUID(), other=randomUUID();
  for (const [id,label] of [[owner,"owner"],[reviewer,"reviewer"],[member,"member"],[outsider,"outsider"]]) {
    await client.query(`insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())`, [id,`p2g-${label}-${id}@example.invalid`]);
  }
  await client.query("insert into public.businesses(id,name,created_by) values($1,'P2-G Validation',$2),($3,'Other Business',$4)",[business,owner,other,outsider]);
  await client.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'owner'),($1,$3,'reviewer'),($1,$4,'member'),($5,$6,'owner')",[business,owner,reviewer,member,other,outsider]);
  const create = (kind, domain="positioning", value="Premium positioning", evidence=[]) => client.query(
    "select public.create_knowledge_candidate_update($1,$2,$3,$4::jsonb,$5,$6,$7::jsonb,$8,$9) as row",
    [business,domain,`${domain}:brand`,JSON.stringify(value),kind,`${kind}-${randomUUID()}`,JSON.stringify(evidence),member,randomUUID()]);
  await asUser(client, member);
  const campaign=(await create("campaign_event", "positioning", "Premium positioning", [{eventId:"event-1"}])).rows[0].row;
  const analytics=(await create("analytics_observation", "validated_learning", "CTR was 4%", [{metric:"ctr",value:0.04}])).rows[0].row;
  const note=(await create("human_note", "tone_rule", "Use a calm tone", [{noteId:"note-1"}])).rows[0].row;
  assert([campaign,analytics,note].every((row)=>row.status==="candidate"), "all approved provenance kinds create review-only candidates");
  await reject(client, ()=>client.query("insert into public.knowledge_candidate_updates(business_id,proposed_domain,proposed_identity_key,proposed_value,source_kind,source_reference_id,evidence,created_by) values($1,'positioning','x','\"x\"','human_note','x','[]',$2)",[business,member]), "direct authenticated Candidate Update insertion is blocked");
  await reject(client, ()=>client.query("update public.knowledge_candidate_updates set status='accepted_for_validation' where id=$1",[campaign.id]), "direct authenticated status mutation is blocked");
  await reject(client, ()=>create("unknown"), "invalid provenance is rejected");
  await reject(client, ()=>create("human_note", "invalid_domain"), "invalid domain is rejected");
  await asUser(client, outsider);
  await reject(client, ()=>client.query("select public.create_knowledge_candidate_update($1,'positioning','x','\"x\"','human_note','x','[]',$2,'x')",[business,outsider]), "cross-business creation is blocked");
  const hidden=await client.query("select count(*)::int count from public.knowledge_candidate_updates where business_id=$1",[business]);
  assert(hidden.rows[0].count===0, "cross-business Candidate Updates are invisible");
  await asUser(client, member);
  await reject(client, ()=>client.query("select public.review_knowledge_candidate_update($1,$2,'start_review',$3,'member review','x')",[business,campaign.id,member]), "ordinary members cannot review");
  await asUser(client, reviewer);
  await reject(client, ()=>client.query("select public.review_knowledge_candidate_update($1,$2,'accept_for_validation',$3,'skip review','x')",[business,campaign.id,reviewer]), "validation acceptance cannot skip human review");
  await client.query("select public.review_knowledge_candidate_update($1,$2,'start_review',$3,'review started','x')",[business,campaign.id,reviewer]);
  const accepted=await client.query("select public.review_knowledge_candidate_update($1,$2,'accept_for_validation',$3,'provenance verified','x') row",[business,campaign.id,reviewer]);
  assert(accepted.rows[0].row.status==="accepted_for_validation", "accepted feedback re-enters validation only");
  await client.query("select public.review_knowledge_candidate_update($1,$2,'reject',$3,'observation is not learning','x')",[business,analytics.id,reviewer]);
  const states=await client.query("select source_kind,status from public.knowledge_candidate_updates where business_id=$1",[business]);
  assert(states.rows.find((row)=>row.source_kind==="analytics_observation").status==="rejected", "analytics observation is never automatically promoted");
  const durable=await client.query("select (select count(*) from public.knowledge_candidates where business_id=$1)::int candidates,(select count(*) from public.business_knowledge_versions where business_id=$1)::int versions",[business]);
  assert(durable.rows[0].candidates===0 && durable.rows[0].versions===0, "Candidate Updates cannot bypass extraction, validation, or approval");
  const audit=await client.query("select count(*)::int count from public.knowledge_audit_events where business_id=$1 and target_kind='knowledge_candidate_update'",[business]);
  assert(audit.rows[0].count===6, "every successful Candidate Update transition is audited");
  await admin(client);
  await client.query("savepoint rollback_validation");
  await client.query(fs.readFileSync(rollbackPath,"utf8"));
  const rolled=await client.query("select to_regclass('public.knowledge_candidate_updates') is not null as history, to_regprocedure('public.create_knowledge_candidate_update(uuid,text,text,jsonb,text,text,jsonb,uuid,text)') is null as function_removed");
  assert(rolled.rows[0].history && rolled.rows[0].function_removed, "rollback removes P2-G behavior without deleting knowledge history");
  await client.query("rollback to savepoint rollback_validation");
  await client.query("rollback"); pass("P2-G validation fixtures rolled back");
  console.log("P2G_DATABASE_VALIDATION=PASS");
} catch(error) { console.error(error); process.exitCode=1; }
finally { await client.end().catch(()=>{}); }
