import { createKnowledgeService } from "@/app/lib/ai/knowledge";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = new URL(request.url).searchParams.get("businessId");
    const items = await createKnowledgeService({ supabase }).listBusinessKnowledge(businessId);
    return Response.json({ items });
  } catch (error) {
    const status = error instanceof TypeError ? 400 : 500;
    console.error("Business knowledge listing failed:", error?.message);
    return Response.json({ error: error?.message || "Knowledge listing failed" }, { status });
  }
}
