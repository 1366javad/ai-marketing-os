import { createKnowledgeService } from "@/app/lib/ai/knowledge";
import { createClient } from "@/app/lib/supabase/server";

export async function authenticatedMarketService() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { service: user ? createKnowledgeService({ supabase }) : null, user };
}

export function marketError(error, fallback) {
  const status = error instanceof TypeError || error instanceof RangeError ? 400 : 500;
  console.error(`${fallback}:`, error?.message);
  return Response.json({ error: error?.message || fallback }, { status });
}
