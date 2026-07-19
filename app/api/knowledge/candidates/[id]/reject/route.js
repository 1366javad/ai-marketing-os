import { createKnowledgeService } from "@/app/lib/ai/knowledge";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { id } = await params;
    const candidate = await createKnowledgeService({ supabase }).rejectKnowledgeCandidate({
      businessId: body.businessId,
      candidateId: id,
      actorId: user.id,
      reason: body.reason,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    });
    return Response.json({ candidate });
  } catch (error) {
    const status = error instanceof TypeError ? 400 : 500;
    console.error("Knowledge candidate rejection failed:", error?.message);
    return Response.json({ error: error?.message || "Candidate rejection failed" }, { status });
  }
}
