import { createClient } from "@/app/lib/supabase/server";
import { getCampaignById } from "@/app/lib/db/campaigns";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const campaignId = String(body.campaignId || "");
    const eventId = String(body.eventId || "");

    if (!campaignId || !eventId) {
      return Response.json(
        { error: "campaignId and eventId are required." },
        { status: 400 },
      );
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign || campaign.user_id !== user.id) {
      return Response.json({ error: "Campaign not found." }, { status: 404 });
    }

    const { data: event, error: readError } = await supabase
      .from("campaign_memory_events")
      .select("id, campaign_id, module, artifact, approval_status")
      .eq("id", eventId)
      .eq("campaign_id", campaignId)
      .not("module", "is", null)
      .not("artifact", "is", null)
      .single();

    if (readError || !event) {
      return Response.json(
        { error: "Memory event not found." },
        { status: 404 },
      );
    }

    if (
      event.approval_status === "approved" ||
      event.approval_status === "auto_saved"
    ) {
      return Response.json({
        success: true,
        changed: false,
        event,
      });
    }

    if (event.approval_status !== "pending") {
      return Response.json(
        {
          error: `Memory event cannot be approved from status "${event.approval_status}".`,
        },
        { status: 409 },
      );
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from("campaign_memory_events")
      .update({ approval_status: "approved" })
      .eq("id", eventId)
      .eq("campaign_id", campaignId)
      .eq("approval_status", "pending")
      .select("*");

    if (updateError) throw updateError;

    const updatedEvent = updatedRows?.[0];
    if (!updatedEvent) {
      return Response.json(
        {
          error:
            "Memory event was not updated. Check the campaign_memory_events UPDATE policy.",
        },
        { status: 409 },
      );
    }

    return Response.json({
      success: true,
      changed: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Memory approval error:", error);
    return Response.json(
      { error: error?.message || "Memory event could not be approved." },
      { status: 500 },
    );
  }
}
