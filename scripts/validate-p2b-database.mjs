import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import pg from "pg";

const require = createRequire(import.meta.url);
const { normalizeSourceContent, NORMALIZER_VERSION } = require("../app/lib/ai/knowledge/normalization");
const { Client } = pg;
const root = process.cwd();
const migrationVersion = "202607190001";
const migrationPath = path.join(root, "supabase/migrations/202607190001_phase2_source_ingestion.sql");

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
function sha256(content) { return createHash("sha256").update(content).digest("hex"); }

const client = new Client({
  connectionString: env("DATABASE_URL"),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
  query_timeout: 30_000,
});

try {
  await client.connect();
  pass("development database connection");
  const installed = await client.query("select to_regclass('public.knowledge_source_payloads') as table_name");
  if (!installed.rows[0].table_name) {
    const migration = fs.readFileSync(migrationPath, "utf8");
    await client.query("begin");
    try {
      await client.query(migration);
      const registry = await client.query(`select to_regclass('supabase_migrations.schema_migrations') as table_name`);
      if (registry.rows[0].table_name) {
        await client.query(`
          insert into supabase_migrations.schema_migrations (version, name, statements)
          values ($1, $2, $3) on conflict (version) do nothing
        `, [migrationVersion, "phase2_source_ingestion", [migration]]);
      }
      await client.query("commit");
      pass("P2-B migration applied atomically");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  } else {
    pass("P2-B migration already applied");
  }

  const schema = await client.query(`
    select
      to_regclass('public.knowledge_source_payloads') is not null as payload_table,
      to_regprocedure('public.register_knowledge_source(uuid,text,text,text,text,text,timestamptz,uuid,jsonb,text,text,text)') is not null as register_function,
      to_regprocedure('public.save_knowledge_normalization(uuid,uuid,text,text,jsonb,jsonb,text,uuid,text)') is not null as normalize_function,
      to_regprocedure('public.retry_knowledge_source(uuid,uuid,uuid,text)') is not null as retry_function
  `);
  assert(Object.values(schema.rows[0]).every(Boolean), "P2-B tables and lifecycle functions exist");

  const rls = await client.query(`
    select relation.relrowsecurity
    from pg_class relation join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relname = 'knowledge_source_payloads'
  `);
  assert(rls.rows[0]?.relrowsecurity, "source payload RLS is enabled");

  const response = await fetch("https://example.com", { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`real source request failed: ${response.status}`);
  const html = await response.text();
  assert(html.includes("Example Domain"), "real website source retrieved");
  const normalized = normalizeSourceContent("website_snapshot", html);
  assert(normalized.normalizedText.includes("Example Domain"), "real website source normalized");

  await client.query("begin");
  const userId = randomUUID();
  const businessId = randomUUID();
  const correlationId = randomUUID();
  const contentBase64 = Buffer.from(html).toString("base64");
  await client.query(`
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated',
      'authenticated', $2, '', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
  `, [userId, `p2b-${userId}@example.invalid`]);
  await client.query("insert into public.businesses (id, name, created_by) values ($1, 'P2-B Validation', $2)", [businessId, userId]);
  await client.query("insert into public.business_memberships (business_id, user_id, role) values ($1, $2, 'owner')", [businessId, userId]);
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);

  const registerArgs = [
    businessId, "website_snapshot", "Example Domain", "https://example.com",
    sha256(html), "supporting", new Date().toISOString(), userId, {},
    contentBase64, "utf8", correlationId,
  ];
  const registered = await client.query(`
    select public.register_knowledge_source(
      $1::uuid,$2,$3,$4,$5,$6,$7::timestamptz,$8::uuid,$9::jsonb,$10,$11,$12
    ) as source
  `, registerArgs);
  const source = registered.rows[0].source;
  assert(source.id && source.duplicate === false, "real source registered with provenance");

  const duplicate = await client.query(`
    select public.register_knowledge_source(
      $1::uuid,$2,$3,$4,$5,$6,$7::timestamptz,$8::uuid,$9::jsonb,$10,$11,$12
    ) as source
  `, registerArgs);
  assert(duplicate.rows[0].source.id === source.id && duplicate.rows[0].source.duplicate, "duplicate snapshot does not duplicate processing");

  const changedHtml = `${html}\n<!-- changed snapshot -->`;
  const changedArgs = [
    businessId, "website_snapshot", "Example Domain Update", "https://example.com",
    sha256(changedHtml), "supporting", new Date().toISOString(), userId, {},
    Buffer.from(changedHtml).toString("base64"), "utf8", correlationId,
  ];
  const changed = await client.query(`
    select public.register_knowledge_source(
      $1::uuid,$2,$3,$4,$5,$6,$7::timestamptz,$8::uuid,$9::jsonb,$10,$11,$12
    ) as source
  `, changedArgs);
  assert(changed.rows[0].source.id !== source.id && !changed.rows[0].source.duplicate, "changed source creates a new immutable snapshot");

  await client.query(
    "select public.mark_knowledge_source_failed($1::uuid,$2::uuid,$3,true,$4::uuid,$5)",
    [businessId, changed.rows[0].source.id, "simulated_retryable_failure", userId, correlationId],
  );
  await client.query(
    "select public.retry_knowledge_source($1::uuid,$2::uuid,$3::uuid,$4)",
    [businessId, changed.rows[0].source.id, userId, correlationId],
  );
  const retryState = await client.query(
    "select status, processing_attempts, processing_error from public.knowledge_sources where id = $1",
    [changed.rows[0].source.id],
  );
  assert(
    retryState.rows[0].status === "registered" &&
      retryState.rows[0].processing_attempts === 1 &&
      retryState.rows[0].processing_error === null,
    "retryable failure returns to registered without duplicating the source",
  );

  const saved = await client.query(`
    select public.save_knowledge_normalization(
      $1::uuid,$2::uuid,$3,$4,$5::jsonb,$6::jsonb,$7,$8::uuid,$9
    ) as normalization
  `, [
    businessId,
    source.id,
    normalized.normalizedText,
    "en",
    JSON.stringify(normalized.sections),
    JSON.stringify(normalized.warnings),
    NORMALIZER_VERSION,
    userId,
    correlationId,
  ]);
  assert(saved.rows[0].normalization.normalized_text.includes("Example Domain"), "normalized source persisted");

  const state = await client.query("select status, processing_attempts from public.knowledge_sources where id = $1", [source.id]);
  assert(state.rows[0].status === "normalized" && state.rows[0].processing_attempts === 1, "processing state reaches normalized ready state");
  const counts = await client.query(`
    select
      (select count(*) from public.knowledge_sources where business_id = $1) as sources,
      (select count(*) from public.knowledge_normalizations where business_id = $1) as normalizations,
      (select count(*) from public.knowledge_candidates where business_id = $1) as candidates,
      (select count(*) from public.business_knowledge_versions where business_id = $1) as versions
  `, [businessId]);
  assert(Number(counts.rows[0].sources) === 2 && Number(counts.rows[0].normalizations) === 1, "duplicate is suppressed while changed snapshots remain distinct");
  assert(Number(counts.rows[0].candidates) === 0 && Number(counts.rows[0].versions) === 0, "P2-B creates no candidates or approved knowledge");

  await client.query("rollback");
  pass("P2-B integration fixtures rolled back");
  console.log("P2-B_DATABASE_VALIDATION=PASS");
} catch (error) {
  console.error("P2-B_DATABASE_VALIDATION=FAIL");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
