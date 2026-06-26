"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { signOutAction } from "@/app/actions/auth";
import { useNavigationProgress } from "@/app/lib/context/NavigationContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Camera,
  CreditCard,
  Loader2,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";

export default function UserMenu({
  user,
  profile,
  initials,
  onProfileUpdated,
}) {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function navigate(href) {
    startNavigation();
    router.push(href);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    startNavigation();
    await signOutAction();
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid image",
        description: "Choose a PNG, JPG, WEBP, or GIF image.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Image is too large",
        description: "Profile images must be smaller than 5 MB.",
      });
      return;
    }

    setIsUploading(true);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-avatars").getPublicUrl(path);
      const avatarUrl = `${publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || user.user_metadata?.full_name || "",
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          avatar_url: avatarUrl,
          picture: avatarUrl,
        },
      });

      onProfileUpdated?.({ ...profile, avatar_url: avatarUrl });
      router.refresh();
      toast({
        variant: "success",
        title: "Profile photo updated",
        description: "Your new photo is now used across the app.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description:
          error.message || "The profile photo could not be uploaded.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleAvatarChange}
        className="hidden"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open profile menu"
            className="h-9 w-9 rounded-full p-0 ring-offset-2 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#3B3CFF] dark:hover:bg-white/10"
          >
            <Avatar className="h-9 w-9 border border-slate-200 dark:border-white/10">
              <AvatarImage
                src={profile?.avatar_url || ""}
                alt={profile?.full_name || "Profile"}
                className="object-cover"
              />
              <AvatarFallback className="bg-[#3B3CFF] text-sm font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="w-64 border-slate-200 bg-white p-2 text-slate-900 shadow-xl dark:border-white/10 dark:bg-gray-900 dark:text-white"
        >
          <DropdownMenuLabel className="px-2 py-2 font-normal">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-slate-200 dark:border-white/10">
                <AvatarImage
                  src={profile?.avatar_url || ""}
                  alt={profile?.full_name || "Profile"}
                  className="object-cover"
                />
                <AvatarFallback className="bg-[#3B3CFF] font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {profile?.full_name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {profile?.email || user?.email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />

          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              inputRef.current?.click();
            }}
            disabled={isUploading}
            className="cursor-pointer rounded-md px-2 py-2 focus:bg-slate-100 dark:focus:bg-white/10"
          >
            {isUploading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Camera />
            )}
            Change photo
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/dashboard/settings#profile")}
            className="cursor-pointer rounded-md px-2 py-2 focus:bg-slate-100 dark:focus:bg-white/10"
          >
            <UserRound />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/dashboard/usage")}
            className="cursor-pointer rounded-md px-2 py-2 focus:bg-slate-100 dark:focus:bg-white/10"
          >
            <CreditCard />
            Billing & Usage
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/dashboard/settings")}
            className="cursor-pointer rounded-md px-2 py-2 focus:bg-slate-100 dark:focus:bg-white/10"
          >
            <Settings />
            Account
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />

          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="cursor-pointer rounded-md px-2 py-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:text-rose-400 dark:focus:bg-rose-950/40 dark:focus:text-rose-300"
          >
            {isLoggingOut ? (
              <Loader2 className="animate-spin" />
            ) : (
              <LogOut />
            )}
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
