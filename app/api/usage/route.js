import { createClient } from "@/app/lib/supabase/server";
import {
  normalizeUsageEvents,
  summarizeUsage,
} from "@/app/lib/usage/aggregateUsage";
import { PLAN_LIMITS } from "@/app/lib/ai/usage/usagePolicy";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("ai_usage")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const activity = normalizeUsageEvents(data || []);
    const summary = summarizeUsage(activity);
    const today = startOfToday();
    const todayCredits = activity.reduce((sum, event) => {
      const createdAt = new Date(event.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt < today) return sum;
      if (event.status === "failed") return sum;
      return sum + Number(event.credits || 0);
    }, 0);
    const dailyCredits = PLAN_LIMITS.free.dailyCredits;

    return Response.json({
      success: true,
      plan: {
        name: "Free Plan",
        dailyCredits,
        todayCredits,
        remainingCredits: Math.max(0, dailyCredits - todayCredits),
      },
      stats: {
        totalRequests: summary.requests,
        totalTokens: summary.tokens,
        totalCredits: summary.credits,
        totalProviders: summary.providers.size,
      },
      activity,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
