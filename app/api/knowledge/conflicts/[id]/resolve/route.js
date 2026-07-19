import { createKnowledgeService } from "@/app/lib/ai/knowledge";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { id } = await params;
    const conflict = await createKnowledgeService({ supabase }).resolveKnowledgeConflict({
      businessId: body.businessId,
      conflictId: id,
      selectedCandidateId: body.selectedCandidateId,
      actorId: user.id,
      reason: body.reason,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    });
    return Response.json({ conflict });
  } catch (error) {
    const status = error instanceof TypeError ? 400 : 500;
    console.error("Knowledge conflict resolution failed:", error?.message);
    return Response.json({ error: error?.message || "Conflict resolution failed" }, { status });
  }
}
