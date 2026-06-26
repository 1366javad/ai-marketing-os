export function buildUserProfile(user, profile = null) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const fullName =
    clean(profile?.full_name) ||
    clean(metadata.full_name) ||
    clean(metadata.name) ||
    clean(user.email?.split("@")[0]) ||
    "User";
  const avatarUrl =
    clean(profile?.avatar_url) ||
    clean(metadata.avatar_url) ||
    clean(metadata.picture);

  return {
    ...(profile || {}),
    id: user.id,
    email: profile?.email || user.email || "",
    full_name: fullName,
    avatar_url: avatarUrl,
  };
}

function clean(value) {
  return String(value || "").trim();
}
