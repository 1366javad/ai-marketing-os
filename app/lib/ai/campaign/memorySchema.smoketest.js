const {
  canonicalizeMemoryEvent,
  matchesArtifactSelectors,
  resolveMemoryArtifact,
  resolveMemoryModule,
} = require("./memorySchema");

let passed = 0;
let failed = 0;

function expect(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}`);
    return;
  }

  failed += 1;
  console.error(`FAIL ${name}`);
}

const legacyResearch = canonicalizeMemoryEvent({
  type: "research_insight",
  task: "audience",
});
expect(
  "legacy research resolves module",
  legacyResearch.module === "research",
);
expect(
  "legacy research resolves artifact",
  legacyResearch.artifact === "audience_analysis",
);

const legacySeo = canonicalizeMemoryEvent({
  type: "keyword_idea",
  task: "keyword_clusters",
});
expect("legacy SEO resolves module", legacySeo.module === "seo");
expect(
  "legacy SEO resolves artifact",
  legacySeo.artifact === "keyword_cluster",
);

const canonical = canonicalizeMemoryEvent({
  module: "seo",
  artifact: "seo_strategy",
  type: "keyword_idea",
});
expect("canonical module wins", canonical.module === "seo");
expect("canonical artifact wins", canonical.artifact === "seo_strategy");
expect("legacy type mirrors artifact", canonical.type === "seo_strategy");

expect(
  "special legacy event resolves module",
  resolveMemoryModule({ type: "context_change" }) === "special",
);
expect(
  "special legacy event resolves artifact",
  resolveMemoryArtifact({ type: "context_change" }) === "context_change",
);

expect(
  "selector requires module and artifact",
  !matchesArtifactSelectors(
    { module: "research", artifact: "market_research" },
    [{ module: "seo", artifact: "market_research" }],
  ),
);
expect(
  "selector accepts canonical identity",
  matchesArtifactSelectors(
    { module: "research", artifact: "market_research" },
    [{ module: "research", artifact: "market_research" }],
  ),
);

console.log(`\nMemory schema smoke: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
