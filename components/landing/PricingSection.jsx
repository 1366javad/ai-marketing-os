import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { PLAN_DEFINITIONS, PLAN_IDS } from "@/app/lib/plans/planPolicy";

const previewPlans = [
  {
    id: PLAN_IDS.FREE,
    price: "$0",
    summary: "Core campaign agents for one launch.",
  },
  {
    id: PLAN_IDS.PRO,
    price: "$19",
    summary: "Full AI workflow, exports, regenerate, and video.",
    highlighted: true,
  },
  {
    id: PLAN_IDS.PRO_PLUS,
    price: "$49",
    summary: "Higher limits for heavier campaign production.",
    badge: "Mock",
  },
];

function PricingSection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#3B3CFF]/20 bg-[#3B3CFF]/10 px-4 py-2 text-sm font-medium text-[#3B3CFF] dark:text-primary-200">
            <Sparkles className="h-4 w-4" />
            Plans
          </div>
          <h2 className="text-4xl font-bold md:text-5xl">
            Start free. Upgrade when the campaign needs more.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            The quality stays the same. Paid plans unlock more agents, exports,
            regenerate, video, and higher monthly credits.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {previewPlans.map((item) => {
            const plan = PLAN_DEFINITIONS[item.id];

            return (
              <article
                key={plan.id}
                className={`rounded-xl border p-6 shadow-sm transition hover:-translate-y-1 ${
                  item.highlighted
                    ? "border-[#3B3CFF]/40 bg-white shadow-indigo-500/10 dark:bg-white/[0.05]"
                    : "border-base bg-white dark:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.summary}
                    </p>
                  </div>
                  {item.badge && (
                    <span className="rounded-full border border-amber-300/40 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-200">
                      {item.badge}
                    </span>
                  )}
                </div>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-bold">{item.price}</span>
                  <span className="pb-1 text-sm text-slate-500 dark:text-slate-400">
                    /month
                  </span>
                </div>

                <ul className="mt-6 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <PlanLine>
                    {plan.maxCampaigns == null
                      ? "Unlimited campaigns"
                      : `${plan.maxCampaigns} campaign`}
                  </PlanLine>
                  <PlanLine>
                    {Number(plan.monthlyCredits).toLocaleString()} monthly credits
                  </PlanLine>
                  <PlanLine>
                    {plan.exportEnabled ? "Export included" : "No export"}
                  </PlanLine>
                </ul>
              </article>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#5B5CFF] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25"
          >
            Compare Plans
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PlanLine({ children }) {
  return (
    <li className="flex gap-2">
      <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
      <span>{children}</span>
    </li>
  );
}

export default PricingSection;
