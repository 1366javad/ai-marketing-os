import { getPlanDefinition, PLAN_DEFINITIONS } from "@/app/lib/plans/planPolicy";

export const PLAN_LIMITS = Object.fromEntries(
  Object.entries(PLAN_DEFINITIONS).map(([plan, definition]) => [
    plan,
    {
      dailyCredits: definition.dailyCredits,
      monthlyCredits: definition.monthlyCredits,
      maxCampaigns: definition.maxCampaigns,
      videoEnabled: definition.videoEnabled,
      exportEnabled: definition.exportEnabled,
      regenerateEnabled: definition.regenerateEnabled,
      regenerateDailyLimit: definition.regenerateDailyLimit,
    },
  ]),
);

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
  const definition = getPlanDefinition(plan);

  return PLAN_LIMITS[definition.id] || PLAN_LIMITS.free;
}

export function getModuleCreditCost(module) {
  const normalizedModule = String(module || "").trim().toLowerCase();
  return CREDIT_COSTS[normalizedModule] || 1;
}
