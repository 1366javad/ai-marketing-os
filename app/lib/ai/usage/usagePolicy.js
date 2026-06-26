export const PLAN_LIMITS = {
  free: {
    dailyCredits: 100,
    maxCampaigns: 3,
    videoEnabled: false,
    exportEnabled: false,
  },
  pro: {
    dailyCredits: 5000,
    maxCampaigns: null,
    videoEnabled: true,
    exportEnabled: true,
  },
};

export const CREDIT_COSTS = {
  research: 15,
  seo: 15,
  content: 20,
  creative: 25,
  ads: 15,
  analytics: 5,
  video: 50,
};

export const CREDIT_LIMIT_MESSAGE =
  "You've used today's free credits. Come back tomorrow or upgrade to Pro.";

export function getPlanLimits(plan = "free") {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function getModuleCreditCost(module) {
  const normalizedModule = String(module || "").trim().toLowerCase();
  return CREDIT_COSTS[normalizedModule] || 1;
}
