"use client";

import { useEffect, useState } from "react";
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
import UpgradeModal from "@/components/campaing/UpgradeModal";
import { getActionGate } from "@/app/lib/plans/planPolicy";

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
  userPlan,
}) {
  const searchParams = useSearchParams();

  const initialTab = tabMap[searchParams.get("tab")] || "Overview";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [upgradeGate, setUpgradeGate] = useState(null);
  const [activePlan, setActivePlan] = useState(
    userPlan?.plan || campaign?.plan || "free",
  );

  useEffect(() => {
    let mounted = true;

    async function loadPlan() {
      try {
        const response = await fetch("/api/me/plan", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (mounted && data?.plan) setActivePlan(data.plan);
      } catch (error) {
        console.error("Plan lookup failed:", error);
      }
    }

    loadPlan();

    return () => {
      mounted = false;
    };
  }, []);

  if (!campaign) {
    return <div>Campaign not found</div>;
  }
  const s = STATUS_STYLES[campaign.status] || STATUS_STYLES.draft;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-6">
      <Link
        href="/dashboard/campaings"
        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors
          dark:text-slate-500 dark:hover:text-white
            text-slate-400 hover:text-slate-900"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Campaigns
      </Link>

      <div
        className="rounded-2xl border p-4 sm:p-6
          dark:bg-white/[0.03] dark:border-white/[0.06]
            bg-white border-slate-100 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl sm:h-12 sm:w-12 sm:text-2xl
                dark:bg-white/[0.06]
                bg-gradient-to-br from-[#3B3CFF]/10 to-[#7B5CFF]/10"
            >
              🚀
            </div>

            <div className="min-w-0">
              <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                <h1
                  className="break-words text-lg font-bold sm:text-xl
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

              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
                {campaign.goal && (
                  <span
                    className="flex min-w-0 items-center gap-1.5 text-xs
                      dark:text-slate-400 text-slate-500"
                  >
                    <Target className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-words">{campaign.goal}</span>
                  </span>
                )}

                {campaign.industry && (
                  <span
                    className="flex min-w-0 items-center gap-1.5 text-xs
                      dark:text-slate-400 text-slate-500"
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-words">{campaign.industry}</span>
                  </span>
                )}

                {campaign.website && (
                  <a
                    href={campaign.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-1.5 text-xs text-[#3B3CFF] hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-all">{campaign.website}</span>
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
        className="-mx-3 flex items-center gap-1 overflow-x-auto border-b px-3 pb-px sm:mx-0 sm:px-0
          dark:border-white/[0.06] border-slate-200"
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              if (tab === "Video") {
                const gate = getActionGate({
                  plan: activePlan,
                  action: "video",
                });

                if (!gate.allowed) {
                  setUpgradeGate(gate);
                  return;
                }
              }

              setActiveTab(tab);
            }}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-all -mb-px sm:px-4",
              activeTab === tab
                ? "border-[#3B3CFF] text-[#3B3CFF]"
                : "border-transparent dark:text-slate-400 dark:hover:text-white text-slate-500 hover:text-slate-900",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="min-w-0">
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
            plan={activePlan}
          />
        )}
        {activeTab === "SEO" && (
          <SEOTab
            campaign={campaign}
            seo={seo}
            seoOutputs={seoOutputs}
            plan={activePlan}
          />
        )}
        {activeTab === "Content" && (
          <ContentTab
            campaign={campaign}
            outputs={contentOutputs}
            plan={activePlan}
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
            plan={activePlan}
          />
        )}
        {activeTab === "Video" && (
          <VideoTab campaign={campaign} videos={videos} plan={activePlan} />
        )}
        {activeTab === "Ads" && (
          <AdsTab campaign={campaign} ads={ads} plan={activePlan} />
        )}
        {activeTab === "Assets" && (
          <AssetsTab campaign={campaign} assets={assets} />
        )}
      </div>
      <UpgradeModal
        gate={upgradeGate}
        onClose={() => setUpgradeGate(null)}
      />
    </div>
  );
}
