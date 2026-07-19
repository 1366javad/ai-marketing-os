import { createKnowledgeService } from "@/app/lib/ai/knowledge";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const slice = await createKnowledgeService({ supabase }).getKnowledgeSlice(body);
    return Response.json({ slice });
  } catch (error) {
    const status = error instanceof TypeError ? 400 : 500;
    console.error("Knowledge Slice preview failed:", error?.message);
    return Response.json({ error: error?.message || "Knowledge Slice preview failed" }, { status });
  }
}
