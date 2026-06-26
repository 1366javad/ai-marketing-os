import AnalyticsView from "@/components/campaing/AnalyticsView";
import { getCampaignById, getCampaigns } from "@/app/lib/db/campaigns";
import { getCampaignIntelligence } from "@/app/lib/db/analytics";
import { createClient } from "@/app/lib/supabase/server";

export default async function Analytics({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const campaigns = user ? await getCampaigns(user.id) : [];
  const selectedId = String(params?.campaignId || "");
  const campaign = selectedId ? await getCampaignById(selectedId) : null;
  const ownedCampaign =
    campaign && campaign.user_id === user?.id ? campaign : null;
  const intelligence = ownedCampaign
    ? await getCampaignIntelligence(ownedCampaign)
    : null;

  return (
    <AnalyticsView
      campaigns={campaigns}
      selectedCampaignId={ownedCampaign?.id || ""}
      intelligence={intelligence}
    />
  );
}
