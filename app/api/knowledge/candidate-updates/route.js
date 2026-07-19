import { createKnowledgeService } from "@/app/lib/ai/knowledge";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const candidateUpdate = await createKnowledgeService({ supabase }).createCandidateUpdate({
      ...body,
      createdBy: user.id,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    });
    return Response.json({ candidateUpdate }, { status: 201 });
  } catch (error) {
    const status = error instanceof TypeError ? 400 : 500;
    console.error("Knowledge Candidate Update creation failed:", error?.message);
    return Response.json({ error: error?.message || "Candidate Update creation failed" }, { status });
  }
}
