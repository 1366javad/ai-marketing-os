import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();
const migrationPath = path.join(
  root,
  "supabase/migrations/202607180001_phase2_knowledge_foundation.sql",
);

function readEnvValue(name) {
  const source = fs.readFileSync(path.join(root, ".env.local"), "utf8");
  const line = source
    .split(/\r?\n/)
    .filter((item) => new RegExp(`^\\s*${name}\\s*=`).test(item))
    .at(-1);
  if (!line) throw new Error(`${name} is missing from .env.local`);
  return line
    .replace(new RegExp(`^\\s*${name}\\s*=\\s*`), "")
    .trim()
    .replace(/^(['"])(.*)\1$/, "$2");
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`);
  pass(message);
}

async function expectDatabaseRejection(client, operation, message) {
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

async function setAuthenticatedUser(client, userId) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
    userId,
  ]);
}

async function resetDatabaseRole(client) {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claim.sub', '', true)");
}

const databaseUrl = readEnvValue("DATABASE_URL");
const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
});

const requiredTables = [
  "businesses",
  "business_memberships",
  "knowledge_sources",
  "knowledge_normalizations",
  "knowledge_candidates",
  "knowledge_candidate_evidence",
  "knowledge_conflicts",
  "business_knowledge_versions",
  "knowledge_version_evidence",
  "knowledge_candidate_updates",
  "knowledge_audit_events",
];

try {
  await client.connect();
  pass("development database connection");

  const migration = fs.readFileSync(migrationPath, "utf8");
  const migrationRegistry = await client.query(`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'supabase_migrations'
        and table_name = 'schema_migrations'
    ) as exists
  `);
  const alreadyApplied = migrationRegistry.rows[0].exists
    ? await client.query(
        "select 1 from supabase_migrations.schema_migrations where version = $1",
        ["202607180001"],
      )
    : { rowCount: 0 };
  const installedFoundation = await client.query(`
    select count(*)::int as count
    from information_schema.tables
    where table_schema = 'public' and table_name = any($1::text[])
  `, [requiredTables]);

  if (
    alreadyApplied.rowCount > 0 ||
    installedFoundation.rows[0].count === requiredTables.length
  ) {
    pass("foundation migration already registered");
  } else {
    await client.query("begin");
    try {
      await client.query(migration);
      if (migrationRegistry.rows[0].exists) {
      await client.query(`
        insert into supabase_migrations.schema_migrations (version, name, statements)
        values ($1, $2, $3)
        on conflict (version) do nothing
      `, ["202607180001", "phase2_knowledge_foundation", [migration]]);
      }
      await client.query("commit");
      pass("foundation migration applied atomically");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_name = any($1::text[])
  `, [requiredTables]);
  assert(tables.rowCount === requiredTables.length, "all foundation tables exist");

  const rls = await client.query(`
    select relname
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any($1::text[])
      and relation.relrowsecurity
  `, [requiredTables]);
  assert(rls.rowCount === requiredTables.length, "RLS enabled on all foundation tables");

  const policies = await client.query(`
    select count(*)::int as count
    from pg_policies
    where schemaname = 'public'
      and tablename = any($1::text[])
  `, [requiredTables]);
  assert(policies.rows[0].count >= 13, "foundation RLS policies installed");

  const triggers = await client.query(`
    select distinct trigger_name
    from information_schema.triggers
    where event_object_schema = 'public'
      and trigger_name = any($1::text[])
  `, [[
    "knowledge_versions_enforce_chain",
    "knowledge_versions_are_append_only",
    "knowledge_sources_are_immutable",
    "knowledge_normalizations_are_append_only",
    "knowledge_candidate_evidence_is_append_only",
    "knowledge_version_evidence_is_append_only",
    "knowledge_audit_is_append_only",
  ]]);
  assert(triggers.rowCount === 7, "append-only and lifecycle triggers installed");

  await client.query("begin");
  const userA = randomUUID();
  const userB = randomUUID();
  const businessA = randomUUID();
  const businessB = randomUUID();
  const sourceA = randomUUID();
  const sourceB = randomUUID();
  const versionA = randomUUID();

  await client.query(`
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values
      ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
      ($3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $4, '', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
  `, [userA, `p2a-${userA}@example.invalid`, userB, `p2a-${userB}@example.invalid`]);

  await client.query(`
    insert into public.businesses (id, name, created_by)
    values ($1, 'P2-A Business A', $2), ($3, 'P2-A Business B', $4)
  `, [businessA, userA, businessB, userB]);
  await client.query(`
    insert into public.business_memberships (business_id, user_id, role)
    values ($1, $2, 'owner'), ($3, $4, 'owner')
  `, [businessA, userA, businessB, userB]);
  await client.query(`
    insert into public.knowledge_sources (
      id, business_id, source_kind, title, content_hash, authority,
      captured_at, created_by
    ) values
      ($1, $2, 'text', 'Source A', $3, 'authoritative', now(), $4),
      ($5, $6, 'text', 'Source B', $7, 'authoritative', now(), $8)
  `, [sourceA, businessA, "a".repeat(64), userA, sourceB, businessB, "b".repeat(64), userB]);

  await setAuthenticatedUser(client, userA);
  const visibleToA = await client.query("select id from public.knowledge_sources order by id");
  assert(visibleToA.rowCount === 1 && visibleToA.rows[0].id === sourceA, "User A sees only Business A knowledge");
  await expectDatabaseRejection(client, () => client.query(`
    insert into public.knowledge_sources (
      business_id, source_kind, title, content_hash, authority, captured_at, created_by
    ) values ($1, 'text', 'Cross-business write', $2, 'unverified', now(), $3)
  `, [businessB, "c".repeat(64), userA]), "User A cannot write Business B knowledge");

  await resetDatabaseRole(client);
  await setAuthenticatedUser(client, userB);
  const visibleToB = await client.query("select id from public.knowledge_sources order by id");
  assert(visibleToB.rowCount === 1 && visibleToB.rows[0].id === sourceB, "User B sees only Business B knowledge");

  await resetDatabaseRole(client);
  await client.query(`
    insert into public.business_knowledge_versions (
      id, business_id, identity_key, scope_key, domain, subject_key,
      claim_key, value, version, status, confidence, scope,
      approved_at, approved_by
    ) values (
      $1::uuid, $2::uuid, 'identity-a', 'scope-a', 'positioning', 'brand',
      'position', '"premium"'::jsonb, 1, 'approved', 0.9,
      jsonb_build_object('businessId', ($2::uuid)::text), now(), $3::uuid
    )
  `, [versionA, businessA, userA]);
  await expectDatabaseRejection(client, () => client.query(
    "update public.business_knowledge_versions set value = '\"changed\"'::jsonb where id = $1",
    [versionA],
  ), "approved versions reject mutation");
  await expectDatabaseRejection(client, () => client.query(
    "delete from public.business_knowledge_versions where id = $1",
    [versionA],
  ), "approved versions reject deletion");
  await expectDatabaseRejection(client, () => client.query(
    "delete from public.knowledge_sources where id = $1",
    [sourceA],
  ), "source snapshots reject deletion");

  await client.query("rollback");
  pass("validation fixtures rolled back without touching durable application data");
  console.log("P2-A_DATABASE_VALIDATION=PASS");
} catch (error) {
  console.error("P2-A_DATABASE_VALIDATION=FAIL");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
