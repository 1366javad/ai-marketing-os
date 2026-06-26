import { getCampaigns } from "@/app/lib/db/campaigns";
import { createClient } from "@/app/lib/supabase/server";
import VideoStudio from "@/components/campaing/VideoStudio";

export default async function VideoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const campaigns = user ? await getCampaigns(user.id) : [];

  return <VideoStudio campaigns={campaigns} />;
}
