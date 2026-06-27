import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback exchange error:", error);
      return NextResponse.redirect(
        new URL("/signin?error=oauth_callback_failed", request.url),
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const metadata = session.user.user_metadata || {};
      const fullName = metadata.full_name || metadata.name || "";
      const avatarUrl = metadata.avatar_url || metadata.picture || "";

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", session.user.id)
        .maybeSingle();

      await supabase
        .from("profiles")
        .upsert(
          {
            id: session.user.id,
            email: session.user.email,
            full_name: existingProfile?.full_name || fullName,
            avatar_url: existingProfile?.avatar_url || avatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.redirect(new URL("/signin", request.url));
}
