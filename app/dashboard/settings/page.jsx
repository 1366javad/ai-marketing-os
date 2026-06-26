import SettingsView from "@/components/settings/SettingsView";

import { getUserSettings } from "@/app/lib/db/settings";

import { createClient } from "@/app/lib/supabase/server";
import { buildUserProfile } from "@/app/lib/auth/profile";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const settings = await getUserSettings(user.id);
  const profile = buildUserProfile(user, settings);

  return <SettingsView settings={profile} />;
}
