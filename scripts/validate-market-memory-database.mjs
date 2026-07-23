import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg; const root = process.cwd();
function env(name) { const line = fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/).filter((x) => new RegExp(`^\\s*${name}\\s*=`).test(x)).at(-1); if (!line) throw new Error(`${name} is missing`); return line.replace(new RegExp(`^\\s*${name}\\s*=\\s*`), "").trim().replace(/^(['"])(.*)\1$/, "$2"); }
function pass(message) { console.log(`PASS ${message}`); } function assert(value, message) { if (!value) throw new Error(`FAIL ${message}`); pass(message); }
async function asUser(client, user) { await client.query("reset role"); await client.query("set local role authenticated"); await client.query("select set_config('request.jwt.claim.sub',$1,true)", [user]); }
async function reject(client, operation, message) { await client.query("savepoint expected"); try { await operation(); } catch { await client.query("rollback to savepoint expected"); pass(message); return; } await client.query("rollback to savepoint expected"); throw new Error(`FAIL ${message}`); }
const client = new Client({ connectionString: env("DATABASE_URL"), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 60000, query_timeout: 60000 });
try {
  await client.connect(); pass("development database connection");
  const migration = fs.readFileSync(path.join(root, "supabase/migrations/202607220001_market_memory.sql"), "utf8");
  await client.query("begin"); try { await client.query(migration); await client.query("commit"); pass("Market Memory migration applied atomically"); } catch (error) { await client.query("rollback"); throw error; }
  const schema = await client.query(`select to_regclass('public.market_sources') is not null sources,to_regclass('public.market_versions') is not null versions,to_regprocedure('public.approve_market_candidate(uuid,uuid,uuid,text,timestamptz,timestamptz,text)') is not null approve`);
  assert(Object.values(schema.rows[0]).every(Boolean), "schema and lifecycle functions exist");
  await client.query("begin"); const owner=randomUUID(), outsider=randomUUID(), business=randomUUID(), other=randomUUID();
  for (const [id,label] of [[owner,"owner"],[outsider,"outsider"]]) await client.query(`insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())`,[id,`market-${label}-${id}@example.invalid`]);
  await client.query("insert into public.businesses(id,name,created_by) values($1,'Market Validation',$2),($3,'Other',$4)",[business,owner,other,outsider]);
  await client.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'owner'),($3,$4,'owner')",[business,owner,other,outsider]);
  await asUser(client, owner);
  const source=(await client.query("select public.register_market_source($1,'text','competitor_official','Source','https://example.test','Publisher','primary','public','manual',$2,$3,'utf8',now(),null,'{}',$4,'db-test') row",[business,"a".repeat(64),Buffer.from("market evidence").toString("base64"),owner])).rows[0].row;
  assert(source.id && source.duplicate === false, "source registration and immutable capture pass");
  await reject(client,()=>client.query("insert into public.market_versions(business_id,identity_key,scope_key,domain,memory_type,entity_key,claim_key,value,version,status,confidence,scope,approved_at,approved_by) values($1,'x','x','competitor','claim','x','x','{}',1,'approved',1,'{}',now(),$2)",[business,owner]),"direct durable version insertion is blocked");
  await asUser(client, outsider); const hidden=await client.query("select count(*)::int count from public.market_sources where business_id=$1",[business]); assert(hidden.rows[0].count===0,"cross-business RLS isolation passes");
  await reject(client,()=>client.query("select public.register_market_source($1,'text','competitor_official','X','x','X','primary','public','manual',$2,$3,'utf8',now(),null,'{}',$4,'x')",[business,"b".repeat(64),Buffer.from("x").toString("base64"),outsider]),"cross-business writes are blocked");
  await client.query("reset role"); const audit=await client.query("select count(*)::int count from public.market_audit_events where business_id=$1",[business]); assert(audit.rows[0].count===1,"source transition is audited");
  await client.query("rollback"); pass("database validation fixtures rolled back"); console.log("MARKET_MEMORY_DATABASE_VALIDATION=PASS");
} catch (error) { console.error("MARKET_MEMORY_DATABASE_VALIDATION=FAIL"); console.error(error.message); process.exitCode=1; } finally { await client.end().catch(()=>{}); }
