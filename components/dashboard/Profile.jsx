"use client";

import UserMenu from "@/components/ui/user-menu";
import { useUserProfileState } from "@/app/lib/context/UserProfileContext";
import { useUser } from "@/hooks/useUser";
import { useEffect } from "react";

function Profile({ initialUser = null, initialProfile = null }) {
  const profileState = useUserProfileState();
  const seededUser = initialUser || profileState?.user || null;
  const seededProfile = initialProfile || profileState?.profile || null;
  const { user, profile, loading, setProfile } = useUser({
    initialUser: seededUser,
    initialProfile: seededProfile,
  });

  useEffect(() => {
    if (!profileState) return;
    if (user || profile || !loading) {
      profileState.updateProfileState(user, profile);
    }
  }, [loading, profile, profileState, user]);

  const displayUser = user || profileState?.user || null;
  const displayProfile = profile || profileState?.profile || null;
  const showSkeleton = loading && !displayUser && !displayProfile;

  if (showSkeleton) {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
    );
  }
  if (!displayUser) return null;

  const fullName = displayProfile?.full_name;

  const initials = fullName ? fullName.charAt(0).toUpperCase() : "U";
  const handleProfileUpdated = (nextProfile) => {
    setProfile(nextProfile);
    profileState?.setProfile(nextProfile);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden sm:block">
        {fullName}
      </span>
      <div className="relative">
        <UserMenu
          user={displayUser}
          profile={displayProfile}
          initials={initials}
          onProfileUpdated={handleProfileUpdated}
        />
      </div>
    </div>
  );
}

export default Profile;
