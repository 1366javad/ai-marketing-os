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

const legacyResearch = canonicalizeMemoryEvent({ type: "research_insight" });
expect(
  "legacy type does not resolve module",
  legacyResearch.module === "",
);
expect(
  "legacy type does not resolve artifact",
  legacyResearch.artifact === "",
);

const canonicalSeo = canonicalizeMemoryEvent({
  module: "seo",
  artifact: "keyword_cluster",
  type: "keyword_idea",
});
expect("canonical SEO resolves module", canonicalSeo.module === "seo");
expect(
  "canonical SEO resolves artifact",
  canonicalSeo.artifact === "keyword_cluster",
);

const canonical = canonicalizeMemoryEvent({
  module: "seo",
  artifact: "seo_strategy",
  type: "keyword_idea",
});
expect("canonical module wins", canonical.module === "seo");
expect("canonical artifact wins", canonical.artifact === "seo_strategy");
expect("legacy type mirrors artifact", canonical.type === "seo_strategy");

expect("type cannot override module", resolveMemoryModule({ type: "context_change" }) === "");
expect("type cannot override artifact", resolveMemoryArtifact({ type: "context_change" }) === "");

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
