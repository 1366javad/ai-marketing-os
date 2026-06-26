import { getCampaigns } from "@/app/lib/db/campaigns";
import { createClient } from "@/app/lib/supabase/server";
import AdsView from "@/components/campaing/AdsView";

export default async function AdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const campaigns = user ? await getCampaigns(user.id) : [];

  return <AdsView campaigns={campaigns} />;
}
