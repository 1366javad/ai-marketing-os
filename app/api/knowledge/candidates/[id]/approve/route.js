import { createKnowledgeService } from "@/app/lib/ai/knowledge";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { id } = await params;
    const version = await createKnowledgeService({ supabase }).approveKnowledgeCandidate({
      businessId: body.businessId,
      candidateId: id,
      actorId: user.id,
      reason: body.reason,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    });
    return Response.json({ version }, { status: 201 });
  } catch (error) {
    const status = error instanceof TypeError || error?.code === "candidate_validation_failed" ? 400 : 500;
    console.error("Knowledge candidate approval failed:", error?.message);
    return Response.json({ error: error?.message || "Candidate approval failed" }, { status });
  }
}
