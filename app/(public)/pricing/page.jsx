import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  Minus,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

import { PLAN_DEFINITIONS, PLAN_IDS } from "@/app/lib/plans/planPolicy";
import { getCurrentPlanPayload } from "@/app/lib/plans/planResolver";
import { createClient } from "@/app/lib/supabase/server";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

const PRICE_COPY = {
  [PLAN_IDS.FREE]: {
    price: "$0",
    period: "forever",
    description: "Start one campaign with the core agents.",
    cta: "Continue with Free",
    href: "/signup",
  },
  [PLAN_IDS.PRO]: {
    price: "$19",
    period: "/month",
    description: "Unlock the complete AI campaign workflow.",
    cta: "Upgrade to Pro",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  [PLAN_IDS.PRO_PLUS]: {
    price: "$49",
    period: "/month",
    description: "Highest limits and early access for power users.",
    cta: "Join Waitlist",
    href: "/signup?plan=pro_plus",
    comingSoon: true,
  },
};

const FEATURE_ROWS = [
  {
    feature: "Campaigns",
    free: "1",
    pro: "Unlimited",
    proPlus: "Unlimited",
  },
  {
    feature: "Research",
    free: "Market, Audience, Competitor",
    pro: "Full",
    proPlus: "Full",
  },
  {
    feature: "SEO",
    free: "Keyword Research, SEO Strategy",
    pro: "Full",
    proPlus: "Full",
  },
  {
    feature: "Content",
    free: "Blog Post",
    pro: "Full",
    proPlus: "Full",
  },
  {
    feature: "Creative",
    free: "Image Post",
    pro: "Full",
    proPlus: "Full",
  },
  {
    feature: "Ads",
    free: "Instagram Ad",
    pro: "Full",
    proPlus: "Full",
  },
  {
    feature: "Video",
    free: false,
    pro: true,
    proPlus: true,
  },
  {
    feature: "Export PDF/DOCX/Markdown",
    free: false,
    pro: true,
    proPlus: true,
  },
  {
    feature: "Regenerate",
    free: false,
    pro: true,
    proPlus: true,
  },
  {
    feature: "Monthly Credits",
    free: "100",
    pro: "3,000",
    proPlus: "10,000",
  },
  {
    feature: "Priority Queue",
    free: false,
    pro: true,
    proPlus: true,
  },
];

const PLAN_ORDER = [PLAN_IDS.FREE, PLAN_IDS.PRO, PLAN_IDS.PRO_PLUS];
const upgradeReasons = [
  "Launch campaigns faster with every AI agent unlocked.",
  "Generate full campaign asset sets instead of single starter outputs.",
  "Export ready-to-share PDF, DOCX, and Markdown documents.",
  "Access video planning for scripts and storyboards.",
  "Use higher monthly AI credits with priority queue access.",
];

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentPlan = user
    ? await getCurrentPlanPayload({ supabase, userId: user.id })
    : null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 px-6 pb-20 pt-32 text-slate-900 dark:bg-dark-bg dark:text-white">
        <section className="mx-auto max-w-7xl">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-200">
                <Sparkles className="h-4 w-4" />
                Pricing Experience
              </div>
              <h1 className="text-5xl font-bold leading-tight text-slate-900 md:text-7xl dark:text-white">
                Choose the campaign{" "}
                <span className="bg-gradient-to-r from-[#3B3CFF] to-[#FF6B6B] bg-clip-text text-transparent">
                  workflow
                </span>{" "}
                that fits your launch.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-white/60">
                All plans use the same AI quality. Paid plans unlock more
                agents, exports, regenerate, video, and higher monthly credits.
              </p>
            </div>
            <CurrentPlanCard currentPlan={currentPlan} />
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PLAN_ORDER.map((planId) => (
              <PlanCard
                key={planId}
                plan={PLAN_DEFINITIONS[planId]}
                currentPlanId={currentPlan?.plan}
                isSignedIn={Boolean(user)}
              />
            ))}
          </div>

          <WhyUpgrade />
          <ComparePlans />
          <PricingNotes />
        </section>
      </main>
      <Footer />
    </>
  );
}

function PricingNotes() {
  return (
    <section className="mt-10 grid gap-5 md:grid-cols-3">
      <InfoPanel
        id="faq"
        title="FAQ"
        body="OpenAI quality is the same across plans. Paid tiers unlock more workflow surface, credits, export, regenerate, and video."
      />
      <InfoPanel
        id="roadmap"
        title="Roadmap"
        body="Stripe checkout, richer export controls, Creative V2, and Pro+ early-access agents are planned after Beta validation."
      />
      <InfoPanel
        id="docs"
        title="Documentation"
        body="Plan rules are powered by the central Plan Engine so Pricing, Upgrade Modal, UI gates, and API gates stay aligned."
      />
    </section>
  );
}

function InfoPanel({ id, title, body }) {
  return (
    <article
      id={id}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
    >
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/55">
        {body}
      </p>
    </article>
  );
}

function CurrentPlanCard({ currentPlan }) {
  const planName = currentPlan?.name || "Free";
  const credits = Number(currentPlan?.monthlyCredits || 100).toLocaleString();

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
        Current Plan
      </div>
      <div className="mt-2 text-2xl font-semibold">{planName}</div>
      <p className="mt-2 text-sm text-slate-600 dark:text-white/55">
        {credits} credits included this month.
      </p>
      <Link
        href={currentPlan ? "/dashboard/usage" : "/signup"}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 dark:bg-gradient-to-r dark:from-primary-500 dark:to-primary-950 dark:hover:from-primary-400 dark:hover:to-primary-900"
      >
        {currentPlan ? "View Usage" : "Start Free"}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </aside>
  );
}

function PlanCard({ plan, currentPlanId, isSignedIn }) {
  const copy = PRICE_COPY[plan.id];
  const isCurrent = currentPlanId === plan.id;
  const features = getPlanHighlights(plan);

  return (
    <article
      className={`relative rounded-xl border p-6 shadow-sm transition ${
        copy.highlighted
          ? "border-primary-500/40 bg-white shadow-primary-500/10 dark:bg-white/[0.05]"
          : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
      }`}
    >
      {copy.highlighted && (
        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-[11px] font-semibold text-white">
          <Zap className="h-3 w-3" />
          Best Fit
        </div>
      )}
      {copy.comingSoon && (
        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-200">
          <Clock className="h-3 w-3" />
          Mock
        </div>
      )}

      <h2 className="text-2xl font-bold">{plan.name}</h2>
      <p className="mt-2 min-h-[48px] text-sm leading-relaxed text-slate-600 dark:text-white/55">
        {copy.description}
      </p>
      <div className="mt-6 flex items-end gap-2">
        <span className="text-5xl font-bold">{copy.price}</span>
        <span className="pb-1 text-base text-slate-500 dark:text-white/45">
          {copy.period}
        </span>
      </div>
      <div className="mt-2 text-xs font-medium text-slate-500 dark:text-white/40">
        Cancel anytime
      </div>

      <Link
        href={
          isCurrent
            ? "/dashboard"
            : isSignedIn
              ? "/dashboard/settings#billing"
              : copy.href
        }
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
          copy.highlighted
            ? "bg-primary-600 text-white hover:bg-primary-700"
            : "border border-slate-200 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:text-white/75 dark:hover:bg-white/[0.06]"
        }`}
      >
        {isCurrent ? "Current Plan ✓" : copy.cta}
        {!isCurrent && <ArrowRight className="h-4 w-4" />}
      </Link>

      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex gap-2 text-sm text-slate-700 dark:text-white/65"
          >
            <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function WhyUpgrade() {
  return (
    <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
            Why Upgrade?
          </div>
          <h2 className="mt-2 text-2xl font-semibold">
            Pro is built for shipping, not just testing.
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {upgradeReasons.map((reason) => (
            <div
              key={reason}
              className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/5 dark:bg-white/[0.03] dark:text-white/65"
            >
              <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparePlans() {
  return (
    <section className="mt-12 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
            Compare Plans
          </div>
          <h2 className="mt-1 text-2xl font-semibold">Feature matrix</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-white/45">
          Stripe is intentionally mocked during Beta.
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-slate-500 dark:text-white/45">
              <th className="border-b border-slate-200 py-3 pr-4 font-medium dark:border-white/10">
                Feature
              </th>
              <th className="border-b border-slate-200 px-4 py-3 font-medium dark:border-white/10">
                Free
              </th>
              <th className="border-b border-slate-200 px-4 py-3 font-medium dark:border-white/10">
                Pro
              </th>
              <th className="border-b border-slate-200 px-4 py-3 font-medium dark:border-white/10">
                Pro+
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_ROWS.map((row) => (
              <tr key={row.feature}>
                <td className="border-b border-slate-100 py-3 pr-4 font-medium dark:border-white/5">
                  {row.feature}
                </td>
                <PlanValue value={row.free} />
                <PlanValue value={row.pro} />
                <PlanValue value={row.proPlus} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PlanValue({ value }) {
  if (value === true) {
    return (
      <td className="border-b border-slate-100 px-4 py-3 text-emerald-600 dark:border-white/5 dark:text-emerald-300">
        <Check className="h-4 w-4" />
      </td>
    );
  }

  if (value === false) {
    return (
      <td className="border-b border-slate-100 px-4 py-3 text-slate-400 dark:border-white/5">
        <X className="h-4 w-4" />
      </td>
    );
  }

  return (
    <td className="border-b border-slate-100 px-4 py-3 text-slate-700 dark:border-white/5 dark:text-white/65">
      {value || <Minus className="h-4 w-4 text-slate-400" />}
    </td>
  );
}

function getPlanHighlights(plan) {
  const campaigns =
    plan.maxCampaigns == null
      ? "Unlimited campaigns"
      : `${plan.maxCampaigns} campaign`;
  const credits = `${Number(plan.monthlyCredits || 0).toLocaleString()} monthly credits`;

  if (plan.id === PLAN_IDS.FREE) {
    return [
      campaigns,
      credits,
      "Market, Audience, and Competitor Research",
      "Keyword Research and SEO Strategy",
      "Blog Post, Image Post, and Instagram Ad",
      "Locked: Trends, FAQs, Video, Export, Regenerate",
    ];
  }

  if (plan.id === PLAN_IDS.PRO_PLUS) {
    return [
      campaigns,
      credits,
      "Fastest queue and highest monthly credits",
      "Premium AI model access as it rolls out",
      "Early access to new AI agents",
      "Future collaboration features",
    ];
  }

  return [
    campaigns,
    credits,
    "Full Research, SEO, Content, Creative, and Ads",
    "Video planning",
    "Export PDF, DOCX, and Markdown",
    "Regenerate and Priority Queue",
  ];
}
