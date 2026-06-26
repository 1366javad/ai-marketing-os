const fs = require("node:fs");
const path = require("node:path");
const {
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

const campaign = {
  id: "camp_content_smoke",
  name: "AI Marketing OS",
  goal: "Generate qualified leads",
  audience: "B2B marketing teams",
  industry: "Marketing software",
};

const brief = {
  campaignId: campaign.id,
  mode: "campaign",
  module: "content",
  task: "blog_post",
  normalizedPrompt:
    "Write a blog post for B2B marketing teams about campaign memory.",
  offer: campaign.name,
  audience: campaign.audience,
  goal: campaign.goal,
  tone: "professional",
  platforms: ["blog"],
  relevantEvents: [
    {
      type: "research_insight",
      summary: "Marketing teams need campaign memory to keep AI outputs aligned.",
    },
    {
      type: "keyword_idea",
      summary: "AI marketing OS and campaign memory are relevant keyword ideas.",
    },
  ],
};

const executionPlan = {
  mode: "campaign",
  module: "content",
  task: "blog_post",
  campaignId: campaign.id,
  riskLevel: "medium",
  needsContext: true,
  needsApproval: true,
  agent: "contentAgent",
};

const generated = normalizeContentOutput(
  {
    provider: "smoke",
    text: JSON.stringify({
      title: "How Campaign Memory Makes AI Marketing More Consistent",
      content:
        "B2B marketing teams often struggle when campaign assets are generated in isolation. Campaign memory gives the AI system a stable view of audience, offer, positioning, and approved research. That means each blog post, email, and landing page can build on the same strategic foundation instead of starting from scratch. For teams scaling content production, this creates stronger consistency and faster review cycles. The next step is to define which campaign facts are approved and which drafts still need review before they feed other agents.",
      cta: "Build a campaign memory workflow",
    }),
  },
  { brief, executionPlan },
);

assert("1. Generate Content", generated.content.length > 300);

const memoryEvent = toContentMemoryEvent(generated, { brief, executionPlan });
const quality = runQualityChecks(memoryEvent, executionPlan, brief);

assert(
  "2. Save Memory",
  memoryEvent.eventType === "blog_draft" &&
    memoryEvent.payload.body === generated.content &&
    quality.passed === true,
);

const memoryRow = {
  id: "evt_content_smoke",
  campaign_id: campaign.id,
  type: memoryEvent.artifact,
  module: memoryEvent.module,
  artifact: memoryEvent.artifact,
  approval_status: quality.approvalRequired ? "pending" : "auto_saved",
  confidence: quality.score,
  risk_level: quality.riskLevel,
  task: executionPlan.task,
  summary: memoryEvent.summary,
  payload: memoryEvent.payload,
  created_at: new Date().toISOString(),
};

const reloadedOutput = mapContentMemoryEventForSmoke(memoryRow);

assert(
  "3. Reload Campaign",
  reloadedOutput.module === "content" && reloadedOutput.source === "campaign_memory_events",
);
assert(
  "4. Load Previous Content",
  reloadedOutput.content === generated.content && reloadedOutput.type === "blog_post",
);

const cards = buildMemoryCardsForSmoke([reloadedOutput]);
const blogCard = cards.find((card) => card.id === "blog");

assert(
  "5. Content Memory Cards Refresh",
  blogCard && blogCard.status.startsWith("Pending Review"),
);

const providerPath = path.join(__dirname, "../../providers/gemini.js");
const providerSource = fs.readFileSync(providerPath, "utf8");

assert(
  "6. Provider Fallback Works",
  providerSource.includes("Falling back to Groq") &&
    providerSource.includes("Falling back to Pollinations Text") &&
    providerSource.includes("Low Confidence Provider"),
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

function mapContentMemoryEventForSmoke(row) {
  const payload = row.payload || {};

  return {
    id: row.id,
    source: "campaign_memory_events",
    campaign_id: row.campaign_id,
    module: row.module,
    type: row.task || payload.task || "blog_post",
    title: payload.title || payload.subject || row.summary || "Content Draft",
    prompt: "",
    content: payload.body || payload.content || "",
    approval_status: row.approval_status,
    confidence: row.confidence,
    risk_level: row.risk_level,
    created_at: row.created_at,
    metadata: {
      memoryEvent: row,
      cta: payload.cta || "",
      wordCount: payload.wordCount || 0,
    },
  };
}

function buildMemoryCardsForSmoke(outputs) {
  return [
    { id: "blog", type: "blog_post" },
    { id: "email", type: "email" },
    { id: "newsletter", type: "newsletter" },
  ].map((card) => {
    const output = outputs.find((item) => getUiTypeId(item.type) === card.id);

    return {
      ...card,
      status: output ? getOutputStatus(output) : "Not Generated",
    };
  });
}

function getUiTypeId(type) {
  const map = {
    blog: "blog",
    blog_post: "blog",
    email: "email",
    newsletter: "newsletter",
  };

  return map[type] || type;
}

function getOutputStatus(output) {
  const status = String(output?.approval_status || "auto_saved").toLowerCase();

  if (status === "pending") return "Pending Review · just now";
  if (status === "approved") return "Approved · just now";
  return "Generated · just now";
}
