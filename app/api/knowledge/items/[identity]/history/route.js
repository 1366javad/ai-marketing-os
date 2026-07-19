import { createKnowledgeService } from "@/app/lib/ai/knowledge";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = new URL(request.url).searchParams.get("businessId");
    const { identity } = await params;
    const versions = await createKnowledgeService({ supabase }).getKnowledgeHistory(
      businessId,
      decodeURIComponent(identity),
    );
    return Response.json({ versions });
  } catch (error) {
    const status = error instanceof TypeError ? 400 : 500;
    console.error("Knowledge history failed:", error?.message);
    return Response.json({ error: error?.message || "Knowledge history failed" }, { status });
  }
}
