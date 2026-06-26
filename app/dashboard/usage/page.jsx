import { createClient } from "@/app/lib/supabase/server";
import {
  normalizeUsageEvents,
  summarizeUsage,
} from "@/app/lib/usage/aggregateUsage";
import { PLAN_LIMITS } from "@/app/lib/ai/usage/usagePolicy";
import UsageView from "@/components/dashboard/UsageView";

export default async function UsagePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: usage } = await supabase
    .from("ai_usage")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const events = normalizeUsageEvents(usage || []);
  const summary = summarizeUsage(events);
  const today = startOfToday();
  const todayCredits = events.reduce((sum, event) => {
    const createdAt = new Date(event.createdAt);
    if (Number.isNaN(createdAt.getTime()) || createdAt < today) return sum;
    if (event.status === "failed") return sum;
    return sum + Number(event.credits || 0);
  }, 0);
  const dailyCredits = PLAN_LIMITS.free.dailyCredits;

  return (
    <UsageView
      usage={events}
      plan={{
        name: "Free Plan",
        dailyCredits,
        todayCredits,
        remainingCredits: Math.max(0, dailyCredits - todayCredits),
      }}
      stats={{
        totalRequests: summary.requests,
        totalTokens: summary.tokens,
        totalCredits: summary.credits,
        totalProviders: summary.providers.size,
      }}
    />
  );
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
