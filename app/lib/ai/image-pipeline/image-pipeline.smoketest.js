const assert = require("node:assert/strict");
const { runImagePipeline } = require("./index");
const {
  buildOpenAIPrompt,
  buildPollinationsPrompt,
} = require("./prompt-builders");

const visualDirection = {
  scene: {
    primarySubject: "An international graduate applicant",
    action: "calmly organizing university application documents",
    setting:
      "a clean study desk with printed admission materials and university folders",
  },
  props: [
    "printed admission checklist",
    "passport",
    "calendar with highlighted deadline",
  ],
  state: {
    checklist: "completed",
    deadline: "approaching",
    documents: "organized",
  },
  camera: {
    angle: "three-quarter",
    shot: "medium",
    focus: "student and printed checklist",
  },
  lighting: {
    type: "soft natural daylight",
    accent: "warm desk lamp",
  },
  mood: "Relieved, focused, and confident",
  hero: "printed admission checklist",
  complexity: "low",
  brand: {
    palette: ["navy", "violet", "white"],
    negativeSpace: "top-right",
    logo: false,
  },
  negative: [
    "text",
    "dashboard",
    "small ui",
    "buttons",
    "phone interface",
    "forms",
    "tiny icons",
  ],
};

const pollinationsPrompt = buildPollinationsPrompt(visualDirection);
const openAiPrompt = buildOpenAIPrompt(visualDirection);
assert.equal(pollinationsPrompt.wordCount <= 80, true);
assert.notEqual(openAiPrompt.version, pollinationsPrompt.version);
assert.equal(/supporting props include/i.test(openAiPrompt.text), true);
assert.equal(pollinationsPrompt.negativePrompt.includes("dashboard"), true);

async function main() {
  let generations = 0;
  let reviews = 0;
  const result = await runImagePipeline({
    visualDirection,
    generator: async ({ provider }) => {
      generations += 1;
      if (provider === "openai") {
        throw new Error("Simulated OpenAI image outage");
      }
      return {
        provider,
        model: "pollinations",
        mimeType: "image/jpeg",
        imageData: Buffer.alloc(25000).toString("base64"),
        remoteUrl: "",
        latencyMs: 10,
        usage: null,
      };
    },
    reviewer: async () => {
      reviews += 1;
      return {
        score: reviews === 1 ? 60 : 85,
        passed: reviews > 1,
        mode: "test",
        issues: reviews === 1 ? ["composition"] : [],
        limitations: [],
      };
    },
  });

  assert.equal(generations, 3);
  assert.equal(result.provider, "pollinations");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.fallbackProvider, "pollinations");
  assert.equal(result.attempts, 2);
  assert.equal(result.approved, true);
  assert.equal(result.review.score, 85);
  console.log("Image pipeline smoketest passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
