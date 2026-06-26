import { createClient } from "@/app/lib/supabase/server";

export async function getCampaigns(userId) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getCampaigns error:", error);
    return [];
  }

  return data || [];
}

export async function getCampaignById(campaignId) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (error) {
    console.error("getCampaignById error:", error);
    return null;
  }

  return data;
}

export async function createCampaign({ userId, campaign }) {
  const supabase = await createClient();

  const insertPayload = {
    user_id: userId,
    name: campaign.name,
    product_name: campaign.product_name,
    website: campaign.website,
    industry: campaign.industry,
    target_audience: campaign.target_audience,
    goal: campaign.goal,
    brand_description: campaign.brand_description,
    notes: campaign.notes,
    campaign_plan: campaign.campaign_plan || {},
    status: campaign.status || "draft",
  };

  let { data, error } = await supabase
    .from("campaigns")
    .insert(insertPayload)
    .select()
    .single();

  if (isMissingColumnError(error, "campaign_plan")) {
    console.warn(
      "campaign_plan column is missing from campaigns; creating campaign without campaign_plan fallback.",
    );
    const { campaign_plan, ...fallbackPayload } = insertPayload;
    const fallback = await supabase
      .from("campaigns")
      .insert(fallbackPayload)
      .select()
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  return data;
}

function isMissingColumnError(error, columnName) {
  if (!error) return false;
  const message = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`;
  return (
    ["PGRST204", "PGRST205", "42703"].includes(error.code) &&
    message.toLowerCase().includes(columnName.toLowerCase())
  );
}

export async function updateCampaign({ campaignId, updates }) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .select()
    .single();

  if (error) throw error;

  return data;
}
export async function deleteCampaign(campaignId) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId);

  if (error) throw error;

  return {
    success: true,
  };
}
