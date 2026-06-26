"use client";

import { ArrowRight, Check, Layers3 } from "lucide-react";

const INCLUDED_MODULES = [
  "Research Plan",
  "SEO Plan",
  "Content Plan",
  "Creative Plan",
  "Ads Plan",
];

export default function TemplateCard({ template, onUse }) {
  const Icon = template.icon;

  return (
    <article className="flex min-h-[390px] flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-white/[0.08] dark:bg-white/[0.025] dark:shadow-none dark:hover:border-white/15">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${template.iconStyle}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:border-white/10 dark:text-white/45">
          Playbook
        </span>
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
        {template.name}
      </h2>
      <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-300">
        Best for: {template.bestFor}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">
        {template.description}
      </p>

      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-white/35">
          Channels
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {template.channels.map((channel) => (
            <span
              key={channel}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55"
            >
              {channel}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/[0.08]">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-white/35">
          <Layers3 className="h-3.5 w-3.5" />
          Includes
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {INCLUDED_MODULES.map((item) => (
            <div
              key={item}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-white/55"
            >
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onUse(template)}
        className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
      >
        Use Template
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}
