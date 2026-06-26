import {
  createCanonicalBrief,
  mergeCanonicalBrief,
  validateCanonicalBrief,
} from "./canonicalBrief";

const PLATFORM_DEFAULTS = {
  instagram: {
    tone: "visual, concise, engaging",
    campaignType: "social media creative",
    cta: "Learn more",
  },
  facebook: {
    tone: "friendly, clear, conversion-focused",
    campaignType: "social media campaign",
    cta: "Learn more",
  },
  linkedin: {
    tone: "professional, credible, insight-led",
    campaignType: "professional marketing asset",
    cta: "Explore the solution",
  },
  tiktok: {
    tone: "fast-paced, hook-driven, casual",
    campaignType: "short-form social content",
    cta: "Watch now",
  },
  google: {
    tone: "direct, benefit-led, high-intent",
    campaignType: "search advertising",
    cta: "Get started",
  },
};

const GOAL_PATTERNS = [
  {
    pattern: /\b(lead|leads|signup|sign up|book|demo|consultation)\b/i,
    goal: "lead generation",
  },
  {
    pattern: /\b(sale|sales|discount|black friday|summer sale|offer)\b/i,
    goal: "sales",
  },
  {
    pattern: /\b(awareness|brand|launch|announce|introduce)\b/i,
    goal: "brand awareness",
  },
  {
    pattern: /\b(traffic|visits|clicks|website)\b/i,
    goal: "traffic",
  },
];

const INDUSTRY_PATTERNS = [
  { pattern: /\b(ielts|course|education|school|university|student)\b/i, industry: "education" },
  { pattern: /\b(saas|software|app|dashboard|ai tool|platform)\b/i, industry: "software" },
  { pattern: /\b(fashion|clothing|apparel|boutique)\b/i, industry: "fashion" },
  { pattern: /\b(coffee|restaurant|food|cafe|ghormeh|قرمه|رستوران)\b/i, industry: "food and beverage" },
  { pattern: /\b(skin|skincare|beauty|cosmetic)\b/i, industry: "beauty" },
  { pattern: /\b(real estate|property|home|apartment)\b/i, industry: "real estate" },
  { pattern: /\b(fitness|gym|workout|health)\b/i, industry: "health and fitness" },
];

export function buildMarketingBrief({
  prompt,
  platform = "",
  module = "creative",
  campaign = null,
  overrides = {},
}) {
  const normalizedPrompt = String(prompt || "").trim();
  const normalizedPlatform = String(platform || campaign?.platform || "").trim();
  const platformDefaults = PLATFORM_DEFAULTS[normalizedPlatform.toLowerCase()] || {};

  const inferredBrief = createCanonicalBrief({
    industry: inferIndustry(normalizedPrompt) || campaign?.industry || "",
    offer: inferOffer(normalizedPrompt, campaign),
    goal: inferGoal(normalizedPrompt) || campaign?.goal || "",
    audience: inferAudience(normalizedPrompt) || campaign?.target_audience || "",
    platform: normalizedPlatform,
    tone: platformDefaults.tone || "clear, useful, conversion-focused",
    campaignType: platformDefaults.campaignType || module,
    painPoints: inferPainPoints(normalizedPrompt),
    valueProposition: inferValueProposition(normalizedPrompt, campaign),
    cta: inferCta(normalizedPrompt) || platformDefaults.cta || "",
    creativeDirection: inferCreativeDirection(normalizedPrompt, module),
  });

  const brief = mergeCanonicalBrief(inferredBrief, overrides);
  const validation = validateCanonicalBrief(brief);

  return {
    brief,
    validation,
    source: {
      prompt: normalizedPrompt,
      platform: normalizedPlatform,
      module,
      campaignId: campaign?.id || null,
    },
  };
}

function inferGoal(prompt) {
  return GOAL_PATTERNS.find(({ pattern }) => pattern.test(prompt))?.goal || "";
}

function inferIndustry(prompt) {
  return (
    INDUSTRY_PATTERNS.find(({ pattern }) => pattern.test(prompt))?.industry || ""
  );
}

function inferOffer(prompt, campaign) {
  if (campaign?.product_name) return campaign.product_name;
  if (campaign?.name) return campaign.name;

  const cleaned = prompt
    .replace(/\b(create|generate|write|make|promote|campaign|ad|post|for)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 120);
}

function inferAudience(prompt) {
  const audienceMatch = prompt.match(/\bfor\s+([^,.]+)/i);

  if (audienceMatch?.[1]) {
    return audienceMatch[1].trim();
  }

  if (/\bielts|student|education|course\b/i.test(prompt)) {
    return "students and learners";
  }

  if (/\bsaas|software|ai tool|dashboard\b/i.test(prompt)) {
    return "marketers, founders, and business teams";
  }

  return "target customers";
}

function inferPainPoints(prompt) {
  const painPoints = [];

  if (/\btime|fast|faster|automate|automation\b/i.test(prompt)) {
    painPoints.push("saving time");
  }

  if (/\bexpensive|cost|budget|affordable\b/i.test(prompt)) {
    painPoints.push("reducing cost");
  }

  if (/\bconfusing|hard|difficult|complex\b/i.test(prompt)) {
    painPoints.push("reducing complexity");
  }

  return painPoints;
}

function inferValueProposition(prompt, campaign) {
  if (campaign?.brand_description) return campaign.brand_description;

  if (/\bai|automation|automate\b/i.test(prompt)) {
    return "Use AI to create better marketing assets faster.";
  }

  if (/\bsale|discount|offer\b/i.test(prompt)) {
    return "Get a timely offer before it ends.";
  }

  return "";
}

function inferCta(prompt) {
  if (/\bbook|demo|consultation\b/i.test(prompt)) return "Book a demo";
  if (/\bsignup|sign up|trial\b/i.test(prompt)) return "Start free";
  if (/\bsale|discount|shop|buy\b/i.test(prompt)) return "Shop now";
  if (/\blearn|education|course\b/i.test(prompt)) return "Enroll now";

  return "";
}

function inferCreativeDirection(prompt, module) {
  const parts = [
    "modern marketing visual",
    "clear focal point",
    "strong conversion-oriented composition",
  ];

  if (module === "creative") {
    parts.push("platform-ready social format");
  }

  if (/\bpremium|luxury|high-end\b/i.test(prompt)) {
    parts.push("premium lighting and refined color palette");
  }

  if (/\bsummer|black friday|seasonal|sale\b/i.test(prompt)) {
    parts.push("campaign-specific seasonal styling");
  }

  return parts.join(", ");
}
