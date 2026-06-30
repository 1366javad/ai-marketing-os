"use client";

import React from "react";

import { useQuery } from "@tanstack/react-query";
import {
  FolderKanban,
  FileText,
  Image,
  Video,
  Download,
  Plus,
  ArrowRight,
  Search,
  Zap,
  BarChart2,
} from "lucide-react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import StatsCard from "@/components/dashboard/StatsCard";
import CampaignCard from "@/components/campaigns/CampaignCard";

import { useRouter } from "next/navigation";
import { useNavigationProgress } from "@/app/lib/context/NavigationContext";

const recentActivity = [
  {
    icon: "📈",
    label: "SEO Report Generated",
    time: "2m ago",
    color: "text-emerald-500",
  },
  {
    icon: "🖼️",
    label: "5 Images Generated",
    time: "14m ago",
    color: "text-purple-500",
  },
  {
    icon: "📄",
    label: "Blog Post Exported",
    time: "1h ago",
    color: "text-blue-500",
  },
  {
    icon: "🚀",
    label: "Campaign Created",
    time: "3h ago",
    color: "text-orange-500",
  },
  {
    icon: "✍️",
    label: "Email Copy Generated",
    time: "5h ago",
    color: "text-indigo-500",
  },
];

const quickActions = [
  {
    label: "Create Campaign",
    emoji: "🚀",
    desc: "Start new campaign",
    href: "/dashboard/campaings",
    color: "from-[#3B3CFF]/10 to-[#3B3CFF]/5",
  },
  {
    label: "Start Research",
    emoji: "🔍",
    desc: "Market intelligence",
    href: "/dashboard/research",
    color: "from-emerald-500/10 to-emerald-500/5",
  },
  {
    label: "Generate Content",
    emoji: "✍️",
    desc: "AI content creation",
    href: "/dashboard/content",
    color: "from-purple-500/10 to-purple-500/5",
  },
  {
    label: "Create Ad Creative",
    emoji: "🎨",
    desc: "Ad visuals & copy",
    href: "/dashboard/ads",
    color: "from-orange-500/10 to-orange-500/5",
  },
];

function DashboardView({ dashboardData }) {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();

  const isLoading = false;
  const campaigns = dashboardData?.campaigns || [];
  const totalContent = campaigns.reduce(
    (s, c) => s + (c.generated_content_count || 0),
    0,
  );
  const totalImages = campaigns.reduce(
    (s, c) => s + (c.generated_images_count || 0),
    0,
  );
  const totalExports = campaigns.reduce(
    (s, c) => s + (c.exports_count || 0),
    0,
  );

  const campaing = [];

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      {/* Welcome Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back 👋
          </h2>
          <p className="text-sm mt-1 dark:text-slate-400 text-slate-500">
            Your AI Marketing Command Center. Let&apos;s build something great.
          </p>
        </div>
        <button
          onClick={() => {
            startNavigation();
            router.push("/dashboard/campaings");
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#5B5CFF] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-[1px] hover:shadow-lg hover:shadow-indigo-500/25 sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          icon={FolderKanban}
          label="Total Campaigns"
          value={campaigns.length}
          trend={12}
        />
        <StatsCard
          icon={FileText}
          label="Generated Content"
          value={totalContent}
          trend={8}
        />
        <StatsCard
          icon={Image}
          label="Generated Images"
          value={totalImages}
          trend={24}
        />
        <StatsCard icon={Video} label="Generated Videos" value={0} trend={1} />
        <StatsCard
          icon={Download}
          label="Total Exports"
          value={totalExports}
          trend={5}
        />
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-4 sm:p-6">
        <h3 className="font-semibold text-sm mb-4 dark:text-white text-slate-900">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`group flex min-w-0 items-center gap-3 rounded-xl border bg-gradient-to-br p-4 transition-all duration-200
                ${a.color}
                dark:border-white/[0.06] hover:border-white/[0.12]
                  border-gray-100 hover:border-gray-200
              `}
            >
              <span className="text-2xl">{a.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight dark:text-white text-slate-900">
                  {a.label}
                </p>
                <p className="text-[11px] mt-0.5 dark:text-slate-500 text-slate-400">
                  {a.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Campaigns */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 ">
            <h3 className="font-semibold text-sm dark:text-white text-slate-900">
              Recent Campaigns
            </h3>
            <Link
              href="/dashboard/campaings"
              className="text-xs  font-medium flex items-center gap-1 transition-colors dark:text-slate-500 dark:hover:text-white text-slate-400 hover:text-slate-900"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3 bg-red-600">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl animate-pulse dark:bg-dark-bg bg-slate-100"
                />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <GlassCard className="p-6 text-center sm:p-10">
              <FolderKanban
                className="w-10 h-10 mx-auto mb-3
                  dark:text-slate-600 text-slate-300"
              />
              <p
                className="text-sm font-medium mb-1
                  dark:text-white text-slate-700"
              >
                No campaigns yet
              </p>
              <p
                className="text-xs mb-4
                  dark:text-slate-500 text-slate-400"
              >
                Create your first marketing campaign
              </p>
              <Link
                href="/dashboard/campaings"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B3CFF] text-white text-sm font-medium hover:bg-[#3030E0] transition-colors"
              >
                <Plus className="w-4 h-4" /> Get Started
              </Link>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} compact />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h3
            className="font-semibold text-sm mb-4
              dark:text-white text-slate-900"
          >
            Recent Activity
          </h3>
          <GlassCard className="p-4">
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0
                      dark:bg-white/[0.06] bg-slate-100"
                  >
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate
                        dark:text-white text-slate-800"
                    >
                      {a.label}
                    </p>
                    <p
                      className="text-[10px]
                        dark:text-slate-600 text-slate-400"
                    >
                      {a.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
export default DashboardView;
