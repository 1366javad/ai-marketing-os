import { getCampaigns } from "@/app/lib/db/campaigns";
import { createClient } from "@/app/lib/supabase/server";
import Creative from "@/components/campaing/Creative";

export default async function CreativePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const campaigns = user ? await getCampaigns(user.id) : [];

  return <Creative campaigns={campaigns} />;
}
