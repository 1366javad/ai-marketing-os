"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Target,
  Building2,
  MoreHorizontal,
} from "lucide-react";

import { cn } from "@/app/lib/utils/utils";

import OverviewTab from "@/components/campaing/OverviewTab";
import ResearchTab from "@/components/campaing/ResearchTab";
import SEOTab from "@/components/campaing/SEOTab";
import ContentTab from "@/components/campaing/ContentTab";
import CreativeTab from "@/components/campaing/CreativeTab";
import VideoTab from "@/components/campaing/VideoTab";
import AdsTab from "@/components/campaing/AdsTab";
import AssetsTab from "@/components/campaing/AssetsTab";

const STATUS_STYLES = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  draft: { bg: "bg-slate-500/10", text: "text-slate-500" },
  paused: { bg: "bg-amber-500/10", text: "text-amber-500" },
  completed: { bg: "bg-blue-500/10", text: "text-blue-500" },
};

const TABS = [
  "Overview",
  "Research",
  "SEO",
  "Content",
  "Creative",
  "Video",
  "Ads",
  "Assets",
];
const tabMap = {
  overview: "Overview",
  research: "Research",
  seo: "SEO",
  content: "Content",
  creative: "Creative",
  video: "Video",
  ads: "Ads",
  assets: "Assets",
};

export default function CampaignWorkspace({
  campaign,
  research,
  researchOutputs,
  seo,
  seoOutputs,
  contentOutputs,
  creatives,
  videos,
  ads,
  assets,
  creativeTypes,
  contentTypes,
}) {
  const searchParams = useSearchParams();

  const initialTab = tabMap[searchParams.get("tab")] || "Overview";

  const [activeTab, setActiveTab] = useState(initialTab);

  if (!campaign) {
    return <div>Campaign not found</div>;
  }
  const s = STATUS_STYLES[campaign.status] || STATUS_STYLES.draft;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link
        href="/dashboard/campaings"
        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors
          dark:text-slate-500 dark:hover:text-white
            text-slate-400 hover:text-slate-900"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Campaigns
      </Link>

      <div
        className="p-6 rounded-2xl border
          dark:bg-white/[0.03] dark:border-white/[0.06]
            bg-white border-slate-100 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0
                dark:bg-white/[0.06]
                bg-gradient-to-br from-[#3B3CFF]/10 to-[#7B5CFF]/10"
            >
              🚀
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1
                  className="text-xl font-bold
                    dark:text-white text-slate-900"
                >
                  {campaign.name}
                </h1>

                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize",
                    s.bg,
                    s.text,
                  )}
                >
                  {campaign.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {campaign.goal && (
                  <span
                    className="flex items-center gap-1.5 text-xs
                      dark:text-slate-400 text-slate-500"
                  >
                    <Target className="w-3.5 h-3.5" /> {campaign.goal}
                  </span>
                )}

                {campaign.industry && (
                  <span
                    className="flex items-center gap-1.5 text-xs
                      dark:text-slate-400 text-slate-500"
                  >
                    <Building2 className="w-3.5 h-3.5" /> {campaign.industry}
                  </span>
                )}

                {campaign.website && (
                  <a
                    href={campaign.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#3B3CFF] hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" /> {campaign.website}
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            className="p-2 rounded-xl transition-colors shrink-0
              dark:hover:bg-white/[0.06] dark:text-slate-400
                hover:bg-slate-100 text-slate-500"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className="flex items-center gap-1 border-b 
          dark:border-white/[0.06] border-slate-200"
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap",
              activeTab === tab
                ? "border-[#3B3CFF] text-[#3B3CFF]"
                : "border-transparent dark:text-slate-400 dark:hover:text-white text-slate-500 hover:text-slate-900",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "Overview" && (
          <OverviewTab
            campaign={campaign}
            outputs={{
              research: researchOutputs,
              seo: seoOutputs,
              content: contentOutputs,
              creative: creatives,
              video: videos,
              ads,
            }}
          />
        )}
        {activeTab === "Research" && (
          <ResearchTab
            campaign={campaign}
            research={research}
            researchOutputs={researchOutputs}
          />
        )}
        {activeTab === "SEO" && (
          <SEOTab campaign={campaign} seo={seo} seoOutputs={seoOutputs} />
        )}
        {activeTab === "Content" && (
          <ContentTab
            campaign={campaign}
            outputs={contentOutputs}
            contentTypes={contentTypes}
            memorySources={{
              research: researchOutputs,
              seo: seoOutputs,
              content: contentOutputs,
              creative: creatives,
            }}
          />
        )}
        {activeTab === "Creative" && (
          <CreativeTab
            campaign={campaign}
            creativeTypes={creativeTypes}
            creatives={creatives}
          />
        )}
        {activeTab === "Video" && (
          <VideoTab campaign={campaign} videos={videos} />
        )}
        {activeTab === "Ads" && (
          <AdsTab campaign={campaign} ads={ads} />
        )}
        {activeTab === "Assets" && (
          <AssetsTab campaign={campaign} assets={assets} />
        )}
      </div>
    </div>
  );
}
