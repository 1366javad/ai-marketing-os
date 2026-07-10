import React from "react";
import { Check } from "lucide-react";

import { hasRenderableContent, stringifyItem } from "@/app/lib/utils/adsReportUtils";
import {
  ReportList as SharedReportList,
  ReportSection as SharedReportSection,
  ReportState,
} from "@/components/campaing/shared/ReportComponents";

export function BriefField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-slate-500 dark:text-white/50">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#3B3CFF]/50 focus:outline-none focus:ring-2 focus:ring-[#3B3CFF]/20 dark:border-white/10 dark:bg-dark-bg dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/30 dark:focus:ring-0"
      />
    </label>
  );
}

export function ContextSource({ label }) {
  return (
    <div className="flex items-center gap-1.5">
      <Check className="h-3 w-3 text-emerald-500" />
      {label}
    </div>
  );
}

export function ReportSection({ title, children }) {
  return (
    <SharedReportSection title={title} hasContent={hasRenderableContent}>
      {children}
    </SharedReportSection>
  );
}

export function ReportList({ title, items }) {
  return (
    <SharedReportList
      title={title}
      items={items}
      stringifyItem={stringifyItem}
      sectionClassName="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]"
      listClassName="mt-2 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-white/60"
      bulletClassName="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary-500"
    />
  );
}

export { ReportState };
