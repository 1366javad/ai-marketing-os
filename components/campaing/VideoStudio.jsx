"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigationProgress } from "@/app/lib/context/NavigationContext";
import {
  Clapperboard,
  FileText,
  Film,
  PackageCheck,
  Search,
  Video,
  X,
  Youtube,
} from "lucide-react";

import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/app/lib/utils/utils";

const VIDEO_TYPES = [
  {
    id: "video_script",
    label: "Video Script",
    desc: "Generate campaign-aware narrative scripts with scenes, voiceover, and CTA.",
    icon: FileText,
    enabled: true,
    iconColor: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    id: "storyboard",
    label: "Storyboard",
    desc: "Plan visual scenes, timing, transitions, voiceover, and on-screen text.",
    icon: Clapperboard,
    enabled: true,
    iconColor: "text-sky-500 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
  },
  {
    id: "reel_package",
    label: "Reel Package",
    desc: "Create a complete short-form Reel production package.",
    icon: Film,
    enabled: false,
    iconColor: "text-pink-500 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-500/10",
  },
  {
    id: "tiktok_video",
    label: "TikTok Video",
    desc: "Generate native TikTok concepts and final video assets.",
    icon: Video,
    enabled: false,
    iconColor: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
  },
  {
    id: "youtube_short",
    label: "YouTube Short",
    desc: "Create complete vertical YouTube Short assets.",
    icon: Youtube,
    enabled: false,
    iconColor: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
  },
  {
    id: "campaign_package",
    label: "Campaign Video Package",
    desc: "Generate a coordinated multi-platform video campaign.",
    icon: PackageCheck,
    enabled: false,
    iconColor: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
];

export default function VideoStudio({ campaigns = [] }) {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();
  const [selectedType, setSelectedType] = useState(null);
  const [query, setQuery] = useState("");
  const filteredCampaigns = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return campaigns;
    return campaigns.filter((campaign) =>
      [campaign.name, campaign.product_name, campaign.industry]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [campaigns, query]);

  const openWorkspace = (campaignId) => {
    startNavigation();
    router.push(
      `/dashboard/campaings/${campaignId}?tab=video&videoTask=${
        selectedType?.id || "video_script"
      }`,
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Video
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose a video planning task, then open it inside a campaign workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {VIDEO_TYPES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!item.enabled}
              onClick={() => item.enabled && setSelectedType(item)}
              className="group text-left disabled:cursor-not-allowed"
            >
              <GlassCard
                className={cn(
                  "relative h-full p-5 transition",
                  item.enabled
                    ? "group-hover:-translate-y-0.5 group-hover:border-[#3B3CFF]/30"
                    : "opacity-60",
                )}
              >
                {!item.enabled && (
                  <div className="absolute right-4 top-4 flex items-center gap-1.5">
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                      Phase 2
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-white/35">
                      Coming Soon
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    item.bg,
                  )}
                >
                  <Icon className={cn("h-5 w-5", item.iconColor)} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                  {item.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {item.desc}
                </p>
              </GlassCard>
            </button>
          );
        })}
      </div>

      {selectedType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-dark-surface">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
                  Select Campaign
                </div>
                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  Open {selectedType.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedType(null);
                  setQuery("");
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:border-white/10 dark:text-white/50"
                title="Close campaign selector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search campaigns..."
                className="w-full bg-transparent text-sm outline-none dark:text-white"
              />
            </div>
            <div className="custom-scrollbar mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {filteredCampaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => openWorkspace(campaign.id)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-primary-500/40 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.06]"
                >
                  <div className="font-medium text-slate-900 dark:text-white">
                    {campaign.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-white/40">
                    {[campaign.product_name, campaign.industry]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </button>
              ))}
              {filteredCampaigns.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-white/10">
                  No campaigns found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
