const fs = require("node:fs");
const path = require("node:path");
const { buildKnowledgeIdentity, KNOWLEDGE_DOMAINS } = require("./index");
const {
  TABLES,
  createSupabaseKnowledgePersistence,
} = require("./adapters/createSupabaseKnowledgePersistence");

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

function expectThrows(name, operation) {
  try {
    operation();
    expect(name, false);
  } catch {
    expect(name, true);
  }
}

const identity = buildKnowledgeIdentity({
  businessId: " Business-A ",
  domain: "POSITIONING",
  scope: { brandId: " Brand-One " },
  subjectKey: " Primary ",
  claimKey: " Market-Position ",
});

expect("all frozen knowledge domains are registered", KNOWLEDGE_DOMAINS.length === 12);
expect("identity normalizes business", identity.businessId === "business-a");
expect("identity normalizes domain", identity.domain === "positioning");
expect("identity has deterministic scope", identity.scopeKey === "business:business-a|brand:brand-one|product:*");
expect("identity is deterministic", identity.identityKey === buildKnowledgeIdentity({
  businessId: "business-a",
  domain: "positioning",
  scope: { brandId: "brand-one" },
  subjectKey: "primary",
  claimKey: "market-position",
}).identityKey);
expectThrows("unknown domains are rejected", () => buildKnowledgeIdentity({
  businessId: "business-a",
  domain: "future_domain",
  subjectKey: "primary",
  claimKey: "claim",
}));
expectThrows("cross-business scope override is impossible", () => buildKnowledgeIdentity({
  businessId: "business-a",
  domain: "product",
  scope: { businessId: "business-b" },
  subjectKey: "product",
  claimKey: "name",
}));

const calls = [];
const fakeSupabase = {
  from(table) {
    calls.push(table);
    return {
      insert() { return this; },
      select() { return this; },
      async single() { return { data: { id: "row-1" }, error: null }; },
    };
  },
};
const persistence = createSupabaseKnowledgePersistence(fakeSupabase);
expect("persistence adapter covers every required record", Object.keys(TABLES).length === 9);
expectThrows("adapter rejects unscoped writes", () => persistence.insertSource({}));

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/202607180001_phase2_knowledge_foundation.sql"),
  "utf8",
);
for (const table of Object.values(TABLES)) {
  expect(`migration defines ${table}`, migration.includes(`public.${table}`));
}
expect("all knowledge tables enable RLS", (migration.match(/enable row level security/g) || []).length >= 11);
expect("business access is membership scoped", migration.includes("is_business_member(business_id)"));
expect("new businesses can establish ownership", migration.includes("is_business_creator(business_id)"));
expect("versions reject update and delete", migration.includes("knowledge_versions_are_append_only"));
expect("version chains allow only one successor", migration.includes("business_knowledge_versions_single_successor_idx"));
expect("version chain inserts are serialized", migration.includes("pg_advisory_xact_lock"));
expect("runtime-current versions are derived without mutation", migration.includes("current_business_knowledge_versions"));
expect("audit trail is append-only", migration.includes("knowledge_audit_is_append_only"));
expect("source snapshots are immutable", migration.includes("knowledge_sources_are_immutable"));
expect("normalizations are append-only", migration.includes("knowledge_normalizations_are_append_only"));
expect("evidence is append-only", migration.includes("knowledge_version_evidence_is_append_only"));
expect("routes do not own knowledge persistence", !migration.includes("campaign_id"));

const runtimeOwners = ["app/api", "app/lib/ai/agents", "app/lib/ai/orchestrator"];
for (const owner of runtimeOwners) {
  const files = fs.existsSync(owner)
    ? fs.readdirSync(owner, { recursive: true }).filter((file) => /\.(js|jsx)$/.test(file))
    : [];
  const ownsTables = files.some((file) => {
    const source = fs.readFileSync(path.join(owner, file), "utf8");
    return Object.values(TABLES).some((table) => source.includes(`.from("${table}")`) || source.includes(`.from('${table}')`));
  });
  expect(`${owner} does not directly access knowledge tables`, !ownsTables);
}

Promise.all([
  persistence.insertSource({ business_id: "business-a" }),
  persistence.insertVersion({ business_id: "business-a" }),
  persistence.appendAuditEvent({ business_id: "business-a" }),
]).then(() => {
  expect("adapter targets only canonical tables", calls.every((table) => Object.values(TABLES).includes(table)));
  console.log(`\nKnowledge foundation smoke: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
});
