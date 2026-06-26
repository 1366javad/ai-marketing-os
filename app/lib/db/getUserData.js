import { createClient } from "@/app/lib/supabase/server";
import { buildUserProfile } from "@/app/lib/auth/profile";

export async function getUserAndProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return { user, profile: buildUserProfile(user, profile) };
}
