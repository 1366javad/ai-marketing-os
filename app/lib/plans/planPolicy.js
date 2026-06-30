export const PLAN_IDS = {
  FREE: "free",
  PRO: "pro",
  PRO_PLUS: "pro_plus",
};

export const PLAN_DEFINITIONS = {
  [PLAN_IDS.FREE]: {
    id: PLAN_IDS.FREE,
    name: "Free",
    dailyCredits: 100,
    monthlyCredits: 100,
    maxCampaigns: 1,
    priorityAi: false,
    teamWorkspace: false,
    sharedCampaigns: false,
    collaboration: false,
    exportEnabled: false,
    regenerateEnabled: false,
    regenerateDailyLimit: 0,
    videoEnabled: false,
    features: {
      research: ["market", "audience", "competitor"],
      seo: ["keywords", "strategy"],
      content: ["blog", "blog_post"],
      creative: ["image_post"],
      ads: ["meta_ads", "instagram_ad"],
      video: [],
      analytics: [],
      assets: [],
    },
  },
  [PLAN_IDS.PRO]: {
    id: PLAN_IDS.PRO,
    name: "Pro",
    dailyCredits: 5000,
    monthlyCredits: 3000,
    maxCampaigns: null,
    priorityAi: true,
    teamWorkspace: false,
    sharedCampaigns: false,
    collaboration: false,
    exportEnabled: true,
    regenerateEnabled: true,
    regenerateDailyLimit: null,
    videoEnabled: true,
    features: {
      research: ["*"],
      seo: ["*"],
      content: ["*"],
      creative: ["*"],
      ads: ["*"],
      video: ["*"],
      analytics: ["*"],
      assets: ["*"],
    },
  },
  [PLAN_IDS.PRO_PLUS]: {
    id: PLAN_IDS.PRO_PLUS,
    name: "Pro+",
    dailyCredits: 15000,
    monthlyCredits: 10000,
    maxCampaigns: null,
    priorityAi: true,
    teamWorkspace: false,
    sharedCampaigns: false,
    collaboration: false,
    exportEnabled: true,
    regenerateEnabled: true,
    regenerateDailyLimit: null,
    videoEnabled: true,
    features: {
      research: ["*"],
      seo: ["*"],
      content: ["*"],
      creative: ["*"],
      ads: ["*"],
      video: ["*"],
      analytics: ["*"],
      assets: ["*"],
    },
  },
};

const FEATURE_LABELS = {
  trends: "Trend Analysis",
  painpoints: "Pain Points",
  pain_points: "Pain Points",
  opportunities: "Opportunities",
  clusters: "Keyword Clusters",
  topics: "Topic Clusters",
  meta: "Meta Descriptions",
  faq: "FAQs",
  email: "Email",
  newsletter: "Newsletter",
  landing: "Landing Page",
  landing_page: "Landing Page",
  case_study: "Case Study",
  linkedin: "LinkedIn Post",
  linkedin_post: "LinkedIn Post",
  instagram: "Instagram Caption",
  instagram_caption: "Instagram Caption",
  carousel: "Carousel",
  banner: "Banner",
  product_mockup: "Product Mockup",
  campaign_package: "Campaign Package",
  video_script: "Video Script",
  storyboard: "Storyboard",
  google_ads: "Google Ads",
  linkedin_ads: "LinkedIn Ads",
  tiktok_ads: "TikTok Ads",
  export: "Export",
  regenerate: "Regenerate",
  campaigns: "Multiple Campaigns",
};

const MODULE_COPY = {
  research: "Unlock full research coverage, including trends, pain points, and opportunity analysis.",
  seo: "Unlock the full SEO workflow, including clusters, meta descriptions, and FAQs.",
  content: "Unlock every content format for campaigns across email, landing pages, social, and case studies.",
  creative: "Unlock advanced creative formats like carousels, banners, mockups, and campaign packages.",
  ads: "Unlock all ad channels and campaign packages.",
  video: "Unlock video scripts, storyboards, and video planning workflows.",
  export: "Unlock PDF, DOCX, and campaign asset exports.",
  regenerate: "Unlock regenerate so you can iterate on approved campaign assets.",
  campaigns: "Unlock unlimited campaigns for separate products, audiences, and launches.",
};

export function normalizePlan(plan = PLAN_IDS.FREE) {
  const normalized = String(plan || PLAN_IDS.FREE).trim().toLowerCase();
  if (normalized === "pro+" || normalized === "pro-plus") {
    return PLAN_IDS.PRO_PLUS;
  }
  if (normalized === "team") return PLAN_IDS.PRO_PLUS;
  return PLAN_DEFINITIONS[normalized] ? normalized : PLAN_IDS.FREE;
}

export function getPlanDefinition(plan = PLAN_IDS.FREE) {
  return PLAN_DEFINITIONS[normalizePlan(plan)];
}

export function canUseFeature({ plan = PLAN_IDS.FREE, module, feature }) {
  return getFeatureGate({ plan, module, feature }).allowed;
}

export function getFeatureGate({ plan = PLAN_IDS.FREE, module, feature }) {
  const planDefinition = getPlanDefinition(plan);
  const normalizedModule = normalizeKey(module);
  const normalizedFeature = normalizeFeature(normalizedModule, feature);
  const allowedFeatures = planDefinition.features[normalizedModule] || [];
  const allowed =
    allowedFeatures.includes("*") || allowedFeatures.includes(normalizedFeature);

  return {
    allowed,
    plan: planDefinition.id,
    planName: planDefinition.name,
    module: normalizedModule,
    feature: normalizedFeature,
    featureLabel: getFeatureLabel(normalizedFeature),
    requiredPlan: allowed ? planDefinition.name : "Pro",
    title: allowed ? "" : `Upgrade to Pro`,
    message: allowed
      ? ""
      : `${getFeatureLabel(normalizedFeature)} is available on Pro and Pro+.`,
    benefit: MODULE_COPY[normalizedModule] || "Unlock all standard AI modules and higher limits.",
  };
}

export function getLimitGate({ plan = PLAN_IDS.FREE, limit, currentCount = 0 }) {
  const planDefinition = getPlanDefinition(plan);

  if (limit === "campaigns") {
    const maxCampaigns = planDefinition.maxCampaigns;
    const allowed = maxCampaigns == null || currentCount < maxCampaigns;

    return {
      allowed,
      plan: planDefinition.id,
      planName: planDefinition.name,
      limit,
      featureLabel: "Multiple Campaigns",
      requiredPlan: allowed ? planDefinition.name : "Pro",
      title: allowed ? "" : "Upgrade to Pro",
      message: allowed
        ? ""
        : `Free includes ${maxCampaigns} campaign. Upgrade to Pro for unlimited campaigns.`,
      benefit: MODULE_COPY.campaigns,
    };
  }

  return {
    allowed: true,
    plan: planDefinition.id,
    planName: planDefinition.name,
    limit,
  };
}

export function getActionGate({ plan = PLAN_IDS.FREE, action }) {
  const planDefinition = getPlanDefinition(plan);
  const normalizedAction = normalizeKey(action);
  const actionMap = {
    export: planDefinition.exportEnabled,
    regenerate: planDefinition.regenerateEnabled,
    video: planDefinition.videoEnabled,
  };
  const allowed = Boolean(actionMap[normalizedAction]);

  return {
    allowed,
    plan: planDefinition.id,
    planName: planDefinition.name,
    action: normalizedAction,
    featureLabel: getFeatureLabel(normalizedAction),
    requiredPlan: allowed ? planDefinition.name : "Pro",
    title: allowed ? "" : "Upgrade to Pro",
    message: allowed
      ? ""
      : `${getFeatureLabel(normalizedAction)} is available on Pro and Pro+.`,
    benefit: MODULE_COPY[normalizedAction] || "Unlock all standard AI modules and higher limits.",
  };
}

function normalizeFeature(module, feature) {
  const normalized = normalizeKey(feature);
  const aliases = {
    research: {
      trend: "trends",
      painpoint: "painpoints",
      pain_points: "painpoints",
    },
    seo: {
      keyword: "keywords",
      keyword_research: "keywords",
      keyword_clusters: "clusters",
      topic_clusters: "topics",
      meta_descriptions: "meta",
      faqs: "faq",
    },
    content: {
      blog: "blog",
      blog_post: "blog",
      landing_page: "landing",
      linkedin_post: "linkedin",
      instagram_caption: "instagram",
    },
    creative: {
      image: "image_post",
      post: "image_post",
      product: "product_mockup",
      package: "campaign_package",
    },
    ads: {
      instagram: "meta_ads",
      instagram_ad: "meta_ads",
      facebook: "meta_ads",
      meta: "meta_ads",
      google: "google_ads",
      linkedin: "linkedin_ads",
      tiktok: "tiktok_ads",
      package: "campaign_package",
    },
  };

  return aliases[module]?.[normalized] || normalized;
}

function getFeatureLabel(feature) {
  return FEATURE_LABELS[feature] || titleCase(feature);
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
