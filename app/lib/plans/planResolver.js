import { getPlanDefinition, normalizePlan } from "@/app/lib/plans/planPolicy";

export async function resolvePlanForUser({ supabase, userId } = {}) {
  if (!supabase || !userId) return getPlanDefinition("free");

  const subscription = await readActiveSubscription({ supabase, userId });
  if (!subscription) return getPlanDefinition("free");

  return getPlanDefinition(subscription.plan);
}

export async function getCurrentPlanPayload({ supabase, userId } = {}) {
  const subscription = supabase && userId
    ? await readActiveSubscription({ supabase, userId })
    : null;
  const plan = subscription
    ? getPlanDefinition(subscription.plan)
    : getPlanDefinition("free");

  return {
    plan: plan.id,
    name: plan.name,
    dailyCredits: plan.dailyCredits,
    monthlyCredits: subscription?.monthlyCredits || plan.monthlyCredits,
    maxCampaigns: plan.maxCampaigns,
    exportEnabled: plan.exportEnabled,
    regenerateEnabled: plan.regenerateEnabled,
    regenerateDailyLimit: plan.regenerateDailyLimit,
    videoEnabled: plan.videoEnabled,
    priorityAi: plan.priorityAi,
    features: plan.features,
    limits: {
      maxCampaigns: plan.maxCampaigns,
      dailyCredits: plan.dailyCredits,
      monthlyCredits: subscription?.monthlyCredits || plan.monthlyCredits,
      regenerateDailyLimit: plan.regenerateDailyLimit,
    },
    subscription,
  };
}

async function readActiveSubscription({ supabase, userId }) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, started_at, expires_at, monthly_credits")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!isMissingTableOrColumnError(error)) {
      console.error("Plan subscription lookup failed:", { userId, error });
    }
    return null;
  }

  if (!data) return null;

  return {
    plan: normalizePlan(data.plan),
    status: String(data.status || "").toLowerCase(),
    startedAt: data.started_at || null,
    expiresAt: data.expires_at || null,
    monthlyCredits: Number(data.monthly_credits || 0),
  };
}

function isMissingTableOrColumnError(error) {
  const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    ["PGRST204", "PGRST205", "42P01", "42703"].includes(error?.code) ||
    message.includes("does not exist") ||
    message.includes("could not find")
  );
}
