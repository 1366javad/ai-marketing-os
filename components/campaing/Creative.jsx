"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigationProgress } from "@/app/lib/context/NavigationContext";
import {
  Image as ImageIcon,
  Layers,
  Megaphone,
  Monitor,
  Package,
  PackageCheck,
  Search,
  X,
} from "lucide-react";

import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/app/lib/utils/utils";

const CREATIVE_TYPES = [
  {
    id: "image_post",
    label: "Image Post",
    desc: "Create a single social media image with caption and CTA.",
    icon: ImageIcon,
    iconColor: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
  },
  {
    id: "carousel",
    label: "Carousel",
    desc: "Create a multi-slide carousel concept and visual direction.",
    icon: Layers,
    iconColor: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
  },
  {
    id: "ad_creative",
    label: "Ad Creative",
    desc: "Create a conversion-focused ad visual with offer framing.",
    icon: Megaphone,
    iconColor: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
  },
  {
    id: "banner",
    label: "Banner",
    desc: "Create a campaign banner with message hierarchy and CTA.",
    icon: Monitor,
    iconColor: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    id: "product_mockup",
    label: "Product Mockup",
    desc: "Create a polished product presentation or use-case mockup.",
    icon: Package,
    iconColor: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  {
    id: "campaign_package",
    label: "Campaign Package",
    desc: "Create a complete creative package for the selected campaign.",
    icon: PackageCheck,
    iconColor: "text-fuchsia-500 dark:text-fuchsia-400",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
  },
];

export default function Creative({ campaigns = [] }) {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();
  const [selectedType, setSelectedType] = useState(null);
  const [query, setQuery] = useState("");

  const filteredCampaigns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return campaigns;

    return campaigns.filter((campaign) =>
      [campaign.name, campaign.product_name, campaign.industry]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [campaigns, query]);

  const openWorkspace = (campaignId) => {
    const task =
      selectedType?.workspaceTask || selectedType?.id || "image_post";

    startNavigation();
    router.push(
      `/dashboard/campaings/${campaignId}?tab=creative&creativeTask=${task}`,
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Creative Studio
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Choose a creative type, then open it inside a campaign workspace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CREATIVE_TYPES.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedType(item)}
              className="group text-left"
            >
              <GlassCard className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:border-[#3B3CFF]/30">
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
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-dark-surface">
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search campaigns..."
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
            </div>

            <div className="custom-scrollbar mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => openWorkspace(campaign.id)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-[#3B3CFF]/40 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.06]"
                  >
                    <div className="font-medium text-slate-900 dark:text-white">
                      {campaign.name}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-white/45">
                      {campaign.product_name && (
                        <span>{campaign.product_name}</span>
                      )}
                      {campaign.industry && <span>{campaign.industry}</span>}
                      {campaign.status && (
                        <span className="capitalize">{campaign.status}</span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/45">
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
