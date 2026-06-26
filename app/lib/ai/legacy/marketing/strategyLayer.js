const GOAL_STRATEGIES = {
  "lead generation": {
    framework: "PAS",
    funnelStage: "consideration",
    primaryAngle: "reduce friction and invite a low-risk next step",
    persuasionTrigger: "clarity, credibility, and easy conversion",
    ctaIntent: "capture qualified interest",
  },
  sales: {
    framework: "AIDA",
    funnelStage: "conversion",
    primaryAngle: "make the offer feel timely, valuable, and easy to act on",
    persuasionTrigger: "urgency, value, and confidence",
    ctaIntent: "drive purchase action",
  },
  "brand awareness": {
    framework: "Why-What-How",
    funnelStage: "awareness",
    primaryAngle: "make the brand memorable and relevant quickly",
    persuasionTrigger: "distinct positioning and emotional recall",
    ctaIntent: "encourage discovery",
  },
  traffic: {
    framework: "Hook-Benefit-Click",
    funnelStage: "interest",
    primaryAngle: "turn curiosity into a click-worthy reason to continue",
    persuasionTrigger: "specific benefit and curiosity gap",
    ctaIntent: "drive website visits",
  },
};

const PLATFORM_STRATEGIES = {
  instagram: {
    contentStyle: "visual-first, concise, and emotionally clear",
    hookStyle: "short punchy opening line",
    visualFormat: "bold focal point with social-friendly composition",
    copyLength: "short",
  },
  facebook: {
    contentStyle: "clear, relatable, and benefit-led",
    hookStyle: "problem or offer-led opener",
    visualFormat: "clean ad creative with readable message hierarchy",
    copyLength: "medium",
  },
  linkedin: {
    contentStyle: "credible, insight-led, and professional",
    hookStyle: "business problem or outcome-led opener",
    visualFormat: "polished professional creative with restrained styling",
    copyLength: "medium",
  },
  tiktok: {
    contentStyle: "fast-paced, direct, and hook-heavy",
    hookStyle: "pattern interrupt in the first second",
    visualFormat: "vertical creator-style frame with high contrast",
    copyLength: "short",
  },
  google: {
    contentStyle: "direct, high-intent, and keyword-aware",
    hookStyle: "benefit and intent match",
    visualFormat: "simple conversion-focused landing/ad visual",
    copyLength: "short",
  },
};

const MODULE_STRATEGIES = {
  creative: {
    outputFocus: "platform-ready creative assets",
    successCriteria: [
      "clear offer",
      "strong first-glance comprehension",
      "specific image direction",
      "actionable CTA",
    ],
  },
  content: {
    outputFocus: "useful educational or persuasive content",
    successCriteria: [
      "clear structure",
      "audience relevance",
      "practical value",
      "natural CTA",
    ],
  },
  seo: {
    outputFocus: "search-intent aligned content",
    successCriteria: [
      "clear search intent",
      "topic coverage",
      "readable structure",
      "conversion path",
    ],
  },
  ads: {
    outputFocus: "conversion-ready ad assets",
    successCriteria: [
      "tight headline",
      "benefit clarity",
      "audience pain point",
      "CTA match",
    ],
  },
  research: {
    outputFocus: "actionable marketing insight",
    successCriteria: [
      "market relevance",
      "audience insight",
      "clear opportunities",
      "next actions",
    ],
  },
};

export function buildMarketingStrategy({
  brief,
  module = "creative",
  mode = "",
} = {}) {
  const normalizedBrief = normalizeBrief(brief);
  const goalStrategy =
    GOAL_STRATEGIES[normalizedBrief.goal] || GOAL_STRATEGIES["brand awareness"];
  const platformStrategy =
    PLATFORM_STRATEGIES[normalizedBrief.platform] ||
    PLATFORM_STRATEGIES.instagram;
  const moduleStrategy = MODULE_STRATEGIES[module] || MODULE_STRATEGIES.creative;

  const positioning = buildPositioning(normalizedBrief, goalStrategy);
  const messaging = buildMessaging(normalizedBrief, goalStrategy);
  const creative = buildCreativeStrategy(
    normalizedBrief,
    platformStrategy,
    mode,
  );

  return {
    framework: goalStrategy.framework,
    funnelStage: goalStrategy.funnelStage,
    primaryAngle: goalStrategy.primaryAngle,
    persuasionTrigger: goalStrategy.persuasionTrigger,
    ctaIntent: goalStrategy.ctaIntent,
    contentStyle: platformStrategy.contentStyle,
    hookStyle: platformStrategy.hookStyle,
    copyLength: platformStrategy.copyLength,
    outputFocus: moduleStrategy.outputFocus,
    successCriteria: moduleStrategy.successCriteria,
    positioning,
    messaging,
    creative,
  };
}

function normalizeBrief(brief = {}) {
  return {
    industry: String(brief.industry || "").trim(),
    offer: String(brief.offer || "").trim(),
    goal: String(brief.goal || "").trim().toLowerCase(),
    audience: String(brief.audience || "").trim(),
    platform: String(brief.platform || "").trim().toLowerCase(),
    tone: String(brief.tone || "").trim(),
    campaignType: String(brief.campaignType || "").trim(),
    painPoints: Array.isArray(brief.painPoints) ? brief.painPoints : [],
    valueProposition: String(brief.valueProposition || "").trim(),
    cta: String(brief.cta || "").trim(),
    creativeDirection: String(brief.creativeDirection || "").trim(),
  };
}

function buildPositioning(brief, goalStrategy) {
  const offer = brief.offer || "the offer";
  const audience = brief.audience || "the target audience";
  const value =
    brief.valueProposition ||
    `help ${audience} get a clearer, faster, or easier outcome`;

  return {
    statement: `${offer} helps ${audience} ${value}.`,
    differentiation: brief.industry
      ? `Position it as a practical ${brief.industry} solution with a clear next step.`
      : "Position it with a clear benefit, proof point, and next step.",
    strategicRole: goalStrategy.primaryAngle,
  };
}

function buildMessaging(brief, goalStrategy) {
  const painPoint = brief.painPoints[0] || "unclear options";
  const offer = brief.offer || "this offer";
  const cta = brief.cta || "";

  return {
    hook: `${brief.audience || "Your audience"} should quickly understand why ${offer} matters now.`,
    promise:
      brief.valueProposition ||
      `A clearer way to solve ${painPoint} with less friction.`,
    proofDirection:
      "Use specific benefits, simple claims, and avoid generic hype.",
    cta,
    ctaReason: goalStrategy.ctaIntent,
  };
}

function buildCreativeStrategy(brief, platformStrategy, mode) {
  const visualGuidelines = [
    platformStrategy.visualFormat,
    brief.creativeDirection,
    brief.offer ? `make ${brief.offer} visually central` : "",
    brief.cta ? `leave room for CTA: ${brief.cta}` : "",
  ].filter(Boolean);

  return {
    mode: mode || "general",
    visualGuidelines,
    imagePromptRules: [
      "describe a concrete scene, subject, layout, lighting, and style",
      "avoid vague abstract prompts",
      "keep text inside images minimal unless the design needs a clear CTA",
      "match the platform aspect and scroll behavior",
    ],
  };
}
