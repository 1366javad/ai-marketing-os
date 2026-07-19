import { createKnowledgeService } from "@/app/lib/ai/knowledge";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const { id } = await params;
    const service = createKnowledgeService({ supabase });
    const normalization = await service.normalizeKnowledgeSource({
      businessId: body.businessId,
      sourceId: id,
      actorId: user.id,
      language: body.language,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    });
    return Response.json({ normalization });
  } catch (error) {
    const status = error instanceof TypeError ? 400 : error?.message === "knowledge source not found" ? 404 : 500;
    console.error("Knowledge source processing failed:", error?.message);
    return Response.json({ error: error?.message || "Source processing failed" }, { status });
  }
}
