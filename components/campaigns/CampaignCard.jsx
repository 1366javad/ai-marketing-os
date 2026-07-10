import React from "react";

import { cn } from "@/app/lib/utils/utils";
import { ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLES = {
  active: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    dot: "bg-emerald-500",
  },
  draft: { bg: "bg-slate-500/10", text: "text-slate-500", dot: "bg-slate-400" },
  paused: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    dot: "bg-amber-500",
  },
  completed: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    dot: "bg-blue-500",
  },
};

export default function CampaignCard({ campaign, compact = false }) {
  const s = STATUS_STYLES[campaign.status] || STATUS_STYLES.draft;

  const timeAgo = campaign.updated_date
    ? formatDistanceToNow(new Date(campaign.updated_date), { addSuffix: true })
    : "Recently";

  if (compact) {
    return (
      <Link
        href={`/dashboard/campaings/${campaign.id}`}
        className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-[1px] group
          dark:bg-white/[0.03] dark:border-white/[0.06] dark:hover:bg-white/[0.06]
            bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0
            dark:bg-white/[0.06] bg-slate-50"
        >
          🚀
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold truncate
              dark:text-white text-slate-900"
          >
            {campaign.name}
          </p>
          <p
            className="text-xs truncate mt-0.5
              dark:text-slate-500 text-slate-400"
          >
            {campaign.industry || "No industry"} · {campaign.goal || "No goal"}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize",
              s.bg,
              s.text,
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
            {campaign.status || "draft"}
          </span>
          <ArrowRight
            className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity
              dark:text-slate-400 text-slate-400"
          />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/dashboard/campaings/${campaign.id}`}
      className="block p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-[2px] group
       dark:bg-white/[0.03] dark:border-white/[0.06] dark:hover:bg-white/[0.06] dark:hover:border-white/[0.1]
         bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl
            dark:bg-white/[0.06]
              bg-gradient-to-br from-campaign-primary/10 to-campaign-accent/10"
        >
          🚀
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize",
            s.bg,
            s.text,
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
          {campaign.status || "draft"}
        </span>
      </div>

      <h3
        className="font-semibold text-sm leading-tight mb-1 group-hover:text-campaign-primary transition-colors
          dark:text-white text-slate-900"
      >
        {campaign.name}
      </h3>

      {campaign.product_name && (
        <p
          className="text-xs mb-2
            dark:text-slate-400 text-slate-500"
        >
          {campaign.product_name}
        </p>
      )}

      <div className="space-y-1 mt-3">
        {campaign.industry && (
          <p
            className="text-[11px]
              dark:text-slate-500 text-slate-400"
          >
            🏭 {campaign.industry}
          </p>
        )}
        {campaign.goal && (
          <p
            className="text-[11px] truncate
              dark:text-slate-500 text-slate-400"
          >
            🎯 {campaign.goal}
          </p>
        )}
      </div>

      <div
        className="flex items-center gap-1 mt-4 pt-3 border-t text-[10px]
          dark:border-white/[0.06] dark:text-slate-600
           border-slate-100 text-slate-400"
      >
        <Calendar className="w-3 h-3" />
        {timeAgo}
      </div>
    </Link>
  );
}
