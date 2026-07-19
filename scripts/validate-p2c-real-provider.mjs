import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runTextProvider } = require("../app/lib/ai/providers");
const { buildKnowledgeExtractionPrompt } = require("../app/lib/ai/knowledge/extraction/buildKnowledgeExtractionPrompt");
const { validateExtractedClaims } = require("../app/lib/ai/knowledge/extraction/validateExtractedClaims");
const { synthesizeCandidateGroups } = require("../app/lib/ai/knowledge/synthesis/synthesizeCandidateGroups");

const root = process.cwd();
const envSource = fs.readFileSync(path.join(root, ".env.local"), "utf8");
for (const name of ["OPENAI_API_KEY", "OPENAI_MODEL", "GROQ_API_KEY", "GROQ_MODEL"]) {
  const line = envSource.split(/\r?\n/).filter((item) => new RegExp(`^\\s*${name}\\s*=`).test(item)).at(-1);
  if (line) process.env[name] = line.replace(new RegExp(`^\\s*${name}\\s*=\\s*`), "").trim().replace(/^(['"])(.*)\1$/, "$2");
}

function pass(message) { console.log(`PASS ${message}`); }
function assert(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`);
  pass(message);
}

const businessId = "00000000-0000-4000-8000-0000000000c1";
const fixtures = [
  {
    id: "00000000-0000-4000-8000-0000000000a1",
    authority: "authoritative",
    text: "Canonical durable business claim: Acme's market position is premium skincare.",
  },
  {
    id: "00000000-0000-4000-8000-0000000000b1",
    authority: "supporting",
    text: "The approved sales deck confirms this durable claim: Acme's market position is premium skincare.",
  },
];

try {
  const extracted = [];
  for (const fixture of fixtures) {
    const source = {
      id: fixture.id,
      source_kind: "text",
      title: "Acme positioning source",
      authority: fixture.authority,
    };
    const normalization = {
      language: "en",
      sections: [{ heading: "Positioning", text: fixture.text, ordinal: 0 }],
    };
    const prompt = buildKnowledgeExtractionPrompt({ source, normalization });
    const providerResult = await runTextProvider({
      ...prompt,
      temperature: 0.1,
      maxTokens: 1200,
      responseFormat: "json_object",
    });
    const validated = validateExtractedClaims({
      providerText: providerResult.text,
      businessId,
      sourceId: fixture.id,
      sections: normalization.sections,
    });
    assert(validated.claims.length > 0, `real provider returned source-backed claims for ${fixture.authority} source`);
    extracted.push({ fixture, providerResult, claims: validated.claims });
  }

  const grouped = new Map();
  let sequence = 0;
  for (const result of extracted) {
    for (const claim of result.claims) {
      const key = `${claim.identityKey}:${claim.valueHash}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: `real-provider-candidate-${++sequence}`,
          identityKey: claim.identityKey,
          valueHash: claim.valueHash,
          evidence: [],
        });
      }
      grouped.get(key).evidence.push(...claim.evidence.map((item) => ({
        ...item,
        authority: result.fixture.authority,
      })));
    }
  }

  const synthesis = synthesizeCandidateGroups([...grouped.values()]);
  const agreement = [...grouped.values()].find((candidate) => new Set(candidate.evidence.map((item) => item.sourceId)).size === 2);
  assert(agreement, "real-provider claims agree on at least one canonical identity and value");
  const agreementResult = synthesis.find((result) => result.updates.some((update) => update.candidateId === agreement.id));
  assert(agreementResult && !agreementResult.conflict, "real-provider agreement synthesizes without conflict");
  assert(agreement.evidence.every((item) => item.excerptHash && Number.isInteger(item.sectionOrdinal)), "real-provider synthesis preserves exact evidence provenance");
  assert(agreementResult.updates.every((update) => update.status === "candidate"), "real provider cannot approve or expose candidates");
  console.log(`REAL_PROVIDER=${extracted.map((item) => item.providerResult.provider).join(",")}`);
  console.log("P2-C_REAL_PROVIDER_VALIDATION=PASS");
} catch (error) {
  console.error("P2-C_REAL_PROVIDER_VALIDATION=FAIL");
  console.error(error.message);
  process.exitCode = 1;
}
