const {
  buildContentPrompt,
  buildContentStrategy,
  normalizeContentOutput,
  toContentMemoryEvent,
} = require("./index");
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

const brief = {
  campaignId: "camp_123",
  mode: "campaign",
  module: "content",
  task: "blog_post",
  normalizedPrompt: "Create a blog post launching QuestApply",
  offer: "QuestApply",
  audience: "International Students",
  goal: "lead_generation",
  tone: "professional",
  platforms: ["blog"],
  relevantEvents: [
    {
      type: "research_insight",
      summary: "International students need clearer graduate admissions guidance.",
    },
  ],
};

const executionPlan = {
  mode: "campaign",
  module: "content",
  task: "blog_post",
  campaignId: "camp_123",
  riskLevel: "medium",
  needsContext: true,
  needsApproval: true,
  agent: "contentAgent",
};

const prompt = buildContentPrompt({ brief, executionPlan });
assert("builds system prompt", prompt.systemPrompt.includes("Content Agent V2"));
assert("includes offer", prompt.userPrompt.includes("QuestApply"));
assert("blog strategy is educational", prompt.userPrompt.includes("educational SEO-style blog post"));
assert("blog strategy uses soft CTA", prompt.userPrompt.includes("CTA style: soft"));
assert("blog strategy rejects landing page shape", prompt.userPrompt.includes("sales-page language"));
assert(
  "blog prompt requires structured sections",
  prompt.systemPrompt.includes('"metaDescription"') &&
    prompt.systemPrompt.includes('"sections"') &&
    prompt.systemPrompt.includes('"primaryKeyword"'),
);

const emailStrategy = buildContentStrategy({ task: "email" });
const landingStrategy = buildContentStrategy({ task: "landing_page" });
const linkedinStrategy = buildContentStrategy({ task: "linkedin_post" });

assert("email has direct CTA strategy", emailStrategy.ctaStyle === "direct");
assert("landing page has conversion structure", landingStrategy.structure.includes("hero headline"));
assert("LinkedIn has conversation CTA strategy", linkedinStrategy.ctaStyle === "conversation");
assert(
  "landing page has its own output contract",
  landingStrategy.outputShape.hero.headline === "" &&
    Array.isArray(landingStrategy.outputShape.benefits),
);

const structuredBlog = normalizeContentOutput(
  {
    provider: "smoke",
    text: JSON.stringify({
      type: "blog_post",
      title: "How International Students Can Organize Graduate Applications",
      metaDescription:
        "A practical guide to organizing graduate applications across the US and Canada.",
      hook: "Graduate applications become manageable when every requirement has a place.",
      introduction:
        "International applicants often coordinate requirements across several universities and countries.",
      sections: [
        {
          heading: "Why application planning becomes difficult",
          body: "Deadlines, document rules, and eligibility criteria vary by institution.",
        },
        {
          heading: "Build one reliable application workflow",
          body: "Use a central checklist to track requirements, decisions, and next actions.",
        },
        {
          heading: "Review progress before every deadline",
          body: "A weekly review keeps missing documents and late submissions visible.",
        },
      ],
      conclusion:
        "A structured workflow gives applicants more time to improve application quality.",
      cta: "Create your graduate application plan with QuestApply.",
      targetAudience: "International graduate applicants",
      primaryKeyword: "graduate application checklist",
      secondaryKeywords: ["international graduate admissions"],
    }),
  },
  { brief, executionPlan },
);

assert(
  "structured blog renders named H2 sections",
  structuredBlog.content.includes(
    "## Why application planning becomes difficult",
  ),
);
assert(
  "structured blog does not render generic numbered headings",
  !/^## \d+\)/m.test(structuredBlog.content),
);

const normalized = normalizeContentOutput(
  {
    provider: "smoke",
    text: JSON.stringify({
      title: "Introducing QuestApply",
      content:
        "International students need a simpler way to understand graduate admissions. QuestApply helps them compare requirements, prepare documents, and move toward application readiness with more confidence. Learn more about how QuestApply supports your next step today.",
      cta: "Learn more",
      metadata: { wordCount: 35 },
    }),
  },
  { brief, executionPlan },
);

assert("normalizes type", normalized.type === "blog_post");
assert("normalizes title", normalized.title === "Introducing QuestApply");
assert("counts words", normalized.metadata.wordCount > 20);

const looseJsonOutput = normalizeContentOutput(
  {
    provider: "groq",
    text:
      '{"title":"Get Ready to Simplify Your Graduate School Application Journey",\n' +
      '"content":"\\\nWe are excited to introduce QuestApply to international students.\\\n\\\nUse it to discover programs, evaluate fit, prepare documents, and apply with more confidence.",\n' +
      '"cta":"Sign up for early access","metadata":{"wordCount":45}}',
  },
  { brief: { ...brief, task: "newsletter" }, executionPlan },
);

assert("repairs loose provider JSON title", looseJsonOutput.title.startsWith("Get Ready"));
assert("repairs loose provider JSON content", !looseJsonOutput.content.startsWith("{"));
assert("repairs loose provider JSON cta", looseJsonOutput.cta === "Sign up for early access");

const event = toContentMemoryEvent(normalized, { brief, executionPlan });
const quality = runQualityChecks(event, executionPlan, brief);

assert("maps to blog_draft", event.eventType === "blog_draft");
assert("quality risk is medium", quality.riskLevel === "medium");

const newsletterEvent = toContentMemoryEvent(looseJsonOutput, {
  brief: { ...brief, task: "newsletter", platforms: ["email"] },
  executionPlan: { ...executionPlan, task: "newsletter" },
});
const newsletterQuality = runQualityChecks(
  newsletterEvent,
  { ...executionPlan, task: "newsletter" },
  { ...brief, task: "newsletter", platforms: ["email"] },
);

assert("newsletter subject length warning does not fail quality", newsletterQuality.passed === true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
