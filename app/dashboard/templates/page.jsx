import Templates from "@/components/campaing/Templates";
import { createClient } from "@/app/lib/supabase/server";

export default async function TemplatesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return <Templates />;
}
