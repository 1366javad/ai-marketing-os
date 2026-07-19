import { createKnowledgeService } from "@/app/lib/ai/knowledge";
import { createClient } from "@/app/lib/supabase/server";

async function authenticatedService() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { service: user ? createKnowledgeService({ supabase }) : null, user };
}

export async function POST(request) {
  try {
    const { service, user } = await authenticatedService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const source = await service.registerKnowledgeSource({
      ...body,
      createdBy: user.id,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    });
    return Response.json({ source }, { status: source.duplicate ? 200 : 201 });
  } catch (error) {
    const status = error instanceof TypeError || error instanceof RangeError ? 400 : 500;
    console.error("Knowledge source registration failed:", error?.message);
    return Response.json({ error: error?.message || "Source registration failed" }, { status });
  }
}

export async function GET(request) {
  try {
    const { service, user } = await authenticatedService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = new URL(request.url).searchParams.get("businessId");
    const sources = await service.listKnowledgeSources(businessId);
    return Response.json({ sources });
  } catch (error) {
    const status = error instanceof TypeError ? 400 : 500;
    console.error("Knowledge source listing failed:", error?.message);
    return Response.json({ error: error?.message || "Source listing failed" }, { status });
  }
}
