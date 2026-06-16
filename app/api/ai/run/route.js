import { runWorkflowStream } from "@/app/lib/_legacy_ai/orchestrator/runWorkflow";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const stream = await runWorkflowStream({
      workflowId: body.workflowId || "content_package",
      input: body.input || {},
      projectId: body.projectId || null,
      documentId: body.documentId || null,
      userId: user?.id || null,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to start AI workflow." },
      { status: 500 },
    );
  }
}
