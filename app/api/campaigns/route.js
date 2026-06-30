import { createClient } from "@/app/lib/supabase/server";

import { createCampaign } from "@/app/lib/db/campaigns";
import {
  checkCampaignLimit,
  createFeatureLockedResponse,
} from "@/app/lib/ai/usage/usageManager";

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
    const campaignLimit = await checkCampaignLimit({
      supabase,
      userId: user.id,
    });

    if (!campaignLimit.allowed) {
      return createFeatureLockedResponse(campaignLimit);
    }

    const campaign = await createCampaign({
      userId: user.id,
      campaign: body,
    });

    return Response.json(campaign);
  } catch (error) {
    console.error("Create campaign error:", error);
    return Response.json(
      { error: error?.message || "Campaign could not be created." },
      { status: 500 },
    );
  }
}
