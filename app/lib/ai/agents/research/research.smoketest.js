const {
  buildResearchPrompt,
  normalizeResearchOutput,
  toResearchMemoryEvent,
} = require("./index");
const { normalizeResearchTask, RESEARCH_TASKS } = require("./buildResearchPrompt");
const { runQualityChecks } = require("../../quality");

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL: ${label}`);
  }
}

const tasks = [
  "market",
  "audience",
  "competitor",
  "trends",
  "pain_points",
  "opportunities",
];

for (const task of tasks) {
  const taskKey = normalizeResearchTask(task);
  const expectedType = RESEARCH_TASKS[taskKey].type;
  const brief = {
    campaignId: "camp_123",
    mode: "campaign",
    module: "research",
    task,
    normalizedPrompt: `Generate ${task} research for QuestApply`,
    industry: "EdTech",
    offer: "QuestApply",
    audience: "International Students",
    goal: "lead_generation",
    competitors: ["ApplyBoard", "IDP"],
    relevantEvents: [],
  };
  const executionPlan = {
    mode: "campaign",
    module: "research",
    task,
    campaignId: "camp_123",
    riskLevel: "low",
    needsContext: true,
    needsApproval: false,
    agent: "researchAgent",
  };

  const prompt = buildResearchPrompt({ brief, executionPlan });
  assert(`${task}: prompt includes Research Agent V2`, prompt.systemPrompt.includes("Research Agent V2"));
  assert(`${task}: prompt includes task`, prompt.userPrompt.includes("Research task:"));
  assert(`${task}: prompt includes output type`, prompt.userPrompt.includes(`Output type: ${expectedType}`));
  assert(`${task}: prompt requires risks`, prompt.userPrompt.includes("- risks:"));
  assert(`${task}: prompt requires nextActions`, prompt.systemPrompt.includes('"nextActions"'));

  const normalized = normalizeResearchOutput(
    {
      provider: "smoke",
      text: JSON.stringify({
        type: expectedType,
        title: `${task} research for QuestApply`,
        summary:
          "QuestApply addresses a meaningful graduate admissions challenge for international students by reducing uncertainty around program discovery, fit evaluation, document preparation, and application readiness.",
        insights: [
          "International students need clearer guidance before committing time and money to applications.",
          "Program discovery and fit evaluation are high-friction moments where AI can provide visible value.",
          "Trust-building content should reduce uncertainty before asking users to start an application.",
        ],
        recommendations: [
          {
            action:
              "Lead with clarity, confidence, and reduced application stress in research-backed messaging.",
            impact: "Improves relevance for anxious students.",
            reasoning: "The campaign needs to reduce uncertainty before conversion.",
          },
          {
            action:
              "Segment content by student stage: discovery, shortlisting, document preparation, and submission.",
            impact: "Makes messaging more specific.",
            reasoning: "Different stages carry different anxieties and needs.",
          },
          {
            action:
              "Use proof-oriented education before stronger conversion calls to action.",
            impact: "Builds trust before asking for sign-up.",
            reasoning: "Students need confidence before sharing application intent.",
          },
        ],
        risks: [
          {
            risk:
              "If messaging overpromises admissions outcomes, students may lose trust before conversion.",
            mitigation: "Keep claims focused on guidance and readiness, not admission guarantees.",
          },
          {
            risk:
              "If the campaign stays too broad, it may miss stage-specific anxieties that drive action.",
            mitigation: "Create separate angles for discovery, shortlisting, and document preparation.",
          },
          {
            risk:
              "If competitor claims are not verified, differentiation may become generic or inaccurate.",
            mitigation: "Review competitor positioning pages before publishing claims.",
          },
        ],
        nextActions: [
          {
            action: "Map the top student stages and attach one research question to each stage.",
            impact: "Creates a sharper research plan.",
            reasoning: "Stage-based research prevents generic insights.",
          },
          {
            action: "Turn the strongest insight into a landing page section or email angle.",
            impact: "Moves research into execution.",
            reasoning: "Insights should become concrete campaign assets.",
          },
          {
            action: "Review competitor positioning pages before finalizing differentiation claims.",
            impact: "Reduces risk of weak differentiation.",
            reasoning: "Competitor claims need verification before use.",
          },
        ],
        metadata: { confidence: 0.86 },
      }),
    },
    { brief, executionPlan },
  );

  assert(`${task}: normalizes contract type`, normalized.type === expectedType);
  assert(`${task}: has 3 insights`, normalized.insights.length >= 3);
  assert(`${task}: has 3 recommendations`, normalized.recommendations.length >= 3);
  assert(`${task}: has 3 risks`, normalized.risks.length >= 3);
  assert(`${task}: has 3 next actions`, normalized.nextActions.length >= 3);
  assert(`${task}: recommendations are strings`, typeof normalized.recommendations[0] === "string");
  assert(`${task}: risks are strings`, typeof normalized.risks[0] === "string");
  assert(`${task}: next actions are strings`, typeof normalized.nextActions[0] === "string");
  assert(`${task}: includes provider metadata`, normalized.metadata.provider === "smoke");
  assert(`${task}: includes generatedAt metadata`, Boolean(normalized.metadata.generatedAt));

  const event = toResearchMemoryEvent(normalized, { brief, executionPlan });
  const quality = runQualityChecks(event, executionPlan, brief);

  assert(`${task}: maps to research_insight`, event.eventType === "research_insight");
  assert(`${task}: memory payload includes risks`, event.payload.risks.length >= 3);
  assert(`${task}: memory payload includes next actions`, event.payload.nextActions.length >= 3);
  assert(`${task}: quality passes`, quality.passed === true);
  assert(`${task}: quality risk is low`, quality.riskLevel === "low");
  assert(`${task}: auto-saves without review`, quality.approvalRequired === false);
}

assert("legacy trend alias maps to trends", normalizeResearchTask("trend") === "trends");
assert("legacy painpoints alias maps to pain_points", normalizeResearchTask("painpoints") === "pain_points");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
