import { createClient } from "@/app/lib/supabase/server";

export async function getUsageStats(userId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_usage")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createUsageEvent(payload) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_usage")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
