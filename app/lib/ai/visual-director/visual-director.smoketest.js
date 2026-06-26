const assert = require("node:assert/strict");
const {
  buildVisualDirectorPrompt,
  normalizeVisualDirection,
} = require("./index");

const creativeStrategy = {
  concept: "Reduce graduate application anxiety with visible progress.",
  strategy: {
    visualGoal: "Make application readiness feel tangible.",
    marketingAngle: "Clarity replaces uncertainty.",
    audienceInsight: "Applicants feel overwhelmed by deadlines and documents.",
    keyMessage: "A structured process makes applications manageable.",
    desiredResponse: "Feel calm and ready to continue.",
    brandDirection: "Credible, supportive, and modern.",
  },
};
const brief = {
  campaignName: "QuestApply",
  offer: "QuestApply",
  audience: "International graduate applicants",
  industry: "Graduate admissions",
  platform: "Instagram",
};

const prompt = buildVisualDirectorPrompt({ creativeStrategy, brief });
assert.equal(prompt.systemPrompt.includes("concrete, photographable scene"), true);
assert.equal(prompt.systemPrompt.includes('"hero"'), true);
assert.equal(prompt.systemPrompt.includes('"state"'), true);

const direction = normalizeVisualDirection(
  JSON.stringify({
    scene: {
      primary_subject: "International graduate applicant",
      action: "Reviewing a printed admission checklist",
      setting: "Modern study workspace",
    },
    props: [
      "passport",
      "admission folder",
      "calendar",
      "printed documents",
    ],
    camera: {
      angle: "three-quarter",
      shot: "medium",
      focus: "student and checklist",
    },
    lighting: {
      type: "soft daylight",
      accent: "warm desk lamp",
    },
    state: {
      checklist: "completed",
      deadline: "approaching",
      documents: "organized",
    },
    mood: "confidence replacing uncertainty",
    hero: "printed admission checklist",
    complexity: "low",
    brand: {
      palette: ["navy", "violet", "white"],
      negative_space: "top-right",
      logo: false,
    },
    negative: ["flowchart"],
  }),
  { creativeStrategy, brief },
);

assert.equal(direction.scene.primarySubject, "International graduate applicant");
assert.equal(direction.hero, "printed admission checklist");
assert.equal(direction.state.documents, "organized");
assert.equal(direction.complexity, "low");
assert.equal(direction.negative.includes("dashboard"), true);
assert.equal(direction.negative.includes("abstract roadmap"), true);

console.log("Visual Director smoketest passed");
