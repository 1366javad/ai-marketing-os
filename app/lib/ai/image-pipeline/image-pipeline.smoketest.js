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
assert.equal(pollinationsPrompt.text.includes("Avoid:"), true);
assert.notEqual(openAiPrompt.version, pollinationsPrompt.version);
assert.equal(/visible props:/i.test(openAiPrompt.text), true);
assert.equal(pollinationsPrompt.negativePrompt.includes("dashboard"), true);

async function main() {
  let generations = 0;
  let reviews = 0;
  const result = await runImagePipeline({
    visualDirection,
    provider: "pollinations",
    generator: async ({ provider }) => {
      generations += 1;
      return {
        provider,
        mimeType: "image/jpeg",
        imageData: Buffer.alloc(25000).toString("base64"),
        remoteUrl: "",
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

  assert.equal(generations, 2);
  assert.equal(result.attempts, 2);
  assert.equal(result.approved, true);
  assert.equal(result.review.score, 85);
  console.log("Image pipeline smoketest passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
