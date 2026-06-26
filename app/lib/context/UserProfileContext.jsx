"use client";

import { createContext, useContext, useMemo, useState } from "react";

const UserProfileContext = createContext(null);

export function UserProfileProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hasResolved, setHasResolved] = useState(false);

  const value = useMemo(
    () => ({
      user,
      profile,
      hasResolved,
      setUser,
      setProfile,
      setHasResolved,
      updateProfileState(nextUser, nextProfile) {
        setUser(nextUser || null);
        setProfile(nextProfile || null);
        setHasResolved(true);
      },
    }),
    [hasResolved, profile, user],
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfileState() {
  return useContext(UserProfileContext);
}
