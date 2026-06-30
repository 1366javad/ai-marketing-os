import { createClient } from "@/app/lib/supabase/server";

export async function GET(_request, { params }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;

  if (!runId) {
    return Response.json({ error: "Missing runId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("campaign_memory_events")
    .select("*")
    .eq("module", "creative")
    .eq("artifact", "image_asset")
    .contains("payload", { operationId: runId })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Creative image status lookup failed:", {
      runId,
      message: error.message,
      code: error.code,
    });
    return Response.json(
      { error: "Unable to load creative image status." },
      { status: 500 },
    );
  }

  if (!data) {
    return Response.json({
      runId,
      status: "generating",
      imageStatus: "generating",
      estimatedImageSeconds: [15, 30],
    });
  }

  const payload = data.payload || {};
  const imageStatus = payload.imageStatus || statusFromApproval(data);

  return Response.json({
    runId,
    status: imageStatus,
    imageStatus,
    asset: payload.asset || null,
    imagePrompt: payload.imagePrompt || payload.providerPrompt?.text || "",
    review: payload.review || null,
    metadata: {
      ...(payload.metadata || {}),
      imageStatus,
      imageProvider:
        payload.asset?.provider || payload.imageProvider || payload.provider || "",
      imageFallbackUsed: Boolean(
        payload.imageFallbackUsed || payload.metadata?.imageFallbackUsed,
      ),
      imageFallbackProvider:
        payload.imageFallbackProvider ||
        payload.metadata?.imageFallbackProvider ||
        "",
      generatedAt: payload.generatedAt || data.created_at || "",
    },
    event: data,
  });
}

function statusFromApproval(row) {
  const status = String(row?.approval_status || "").toLowerCase();
  if (status === "rejected") return "failed";
  if (status === "pending" || status === "auto_saved" || status === "approved") {
    return "ready";
  }
  return "generating";
}
