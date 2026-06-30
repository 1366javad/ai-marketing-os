import { createClient } from "@/app/lib/supabase/server";
import {
  normalizeUsageEvents,
} from "@/app/lib/usage/aggregateUsage";
import { getCurrentPlanPayload } from "@/app/lib/plans/planResolver";
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
  const plan = await getCurrentPlanPayload({ supabase, userId: user.id });
  const today = startOfToday();
  const todayCredits = events.reduce((sum, event) => {
    const createdAt = new Date(event.createdAt);
    if (Number.isNaN(createdAt.getTime()) || createdAt < today) return sum;
    if (event.status === "failed") return sum;
    return sum + Number(event.credits || 0);
  }, 0);
  const dailyCredits = plan.dailyCredits;

  return (
    <UsageView
      usage={events}
      plan={{
        name: `${plan.name} Plan`,
        dailyCredits,
        todayCredits,
        remainingCredits: Math.max(0, dailyCredits - todayCredits),
      }}
    />
  );
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
