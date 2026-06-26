"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { buildUserProfile } from "@/app/lib/auth/profile";

export function useUser({ initialUser = null, initialProfile = null } = {}) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(
    buildUserProfile(initialUser, initialProfile),
  );
  const [loading, setLoading] = useState(!initialUser);

  useEffect(() => {
    async function loadProfile(nextUser) {
      if (!nextUser) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(nextUser);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", nextUser.id)
        .maybeSingle();
      setProfile(buildUserProfile(nextUser, data));
    }

    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await loadProfile(user);
      setLoading(false);
    }

    if (!initialUser) fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user || null).finally(() => setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, [initialUser, supabase]);

  return { user, profile, loading, setProfile };
}
