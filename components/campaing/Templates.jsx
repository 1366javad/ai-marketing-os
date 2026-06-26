"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, Search } from "lucide-react";

import { CAMPAIGN_STARTERS } from "@/app/lib/templates/campaignStarters";
import TemplateCard from "@/components/templates/TemplateCard";
import UseTemplateModal from "@/components/templates/UseTemplateModal";

export default function Templates() {
  const [query, setQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const filteredTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return CAMPAIGN_STARTERS;

    return CAMPAIGN_STARTERS.filter((template) =>
      [
        template.name,
        template.bestFor,
        template.description,
        template.industry,
        ...template.channels,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-primary-600 dark:text-primary-300">
            <BookOpenCheck className="h-4 w-4" />
            Proven Campaign Playbooks
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            Campaign Starter Library
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-white/45">
            Start with a proven strategy, edit the plan, and create a campaign
            with its goal, audience, channels, and recommended workflow ready.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search campaign starters..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/30"
          />
        </div>
      </header>

      {filteredTemplates.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={setSelectedTemplate}
            />
          ))}
        </section>
      ) : (
        <section className="flex min-h-64 flex-col items-center justify-center border-y border-slate-200 text-center dark:border-white/[0.08]">
          <Search className="h-6 w-6 text-slate-300 dark:text-white/20" />
          <h2 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
            No campaign starters found
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/40">
            Try another industry, channel, or campaign goal.
          </p>
        </section>
      )}

      {selectedTemplate && (
        <UseTemplateModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}

