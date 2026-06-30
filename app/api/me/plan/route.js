import { createClient } from "@/app/lib/supabase/server";
import { getCurrentPlanPayload } from "@/app/lib/plans/planResolver";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getCurrentPlanPayload({
    supabase,
    userId: user.id,
  });

  return Response.json(plan);
}
