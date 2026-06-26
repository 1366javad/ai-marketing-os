import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const stats = [
  {
    value: "6",
    label: "AI Workspaces",
    detail: "Research, SEO, Content, Creative, Ads, Intelligence",
  },
  {
    value: "1",
    label: "Campaign Memory",
    detail: "Every output tied to your campaign",
  },
  {
    value: "50+",
    label: "Campaign Assets",
    detail: "Content, creative, ads, exports",
  },
  {
    value: "0",
    label: "Tool Switching",
    detail: "One campaign-centric workflow",
  },
];

function HeroSection({
  primaryCta = { href: "/signup", label: "Start for Free" },
}) {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-32">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-[#3B3CFF]/20 blur-3xl" />
        <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-[#FF6B6B]/20 blur-3xl delay-1000" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#3B3CFF]/20 bg-gradient-to-r from-[#3B3CFF]/10 to-[#FF6B6B]/10 px-4 py-2">
            <Sparkles className="h-4 w-4 text-[#3B3CFF]" />
            <span className="text-sm font-medium">
              Campaign-first AI agents for modern teams
            </span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-7xl">
            The AI Campaign{" "}
            <span className="bg-gradient-to-r from-[#3B3CFF] to-[#FF6B6B] bg-clip-text text-transparent">
              Workspace
            </span>{" "}
            for Modern Marketing Teams
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-xl text-slate-600 md:text-2xl dark:text-slate-300">
            Plan, create, and launch complete campaigns from one brief — with
            AI agents for research, SEO, content, creative, ads, and campaign
            intelligence.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={primaryCta.href}
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#5B5CFF] px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/30"
            >
              {primaryCta.label}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="#simulation"
              className="rounded-xl border border-base px-8 py-4 text-lg font-semibold transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30"
            >
              See It in Action
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mb-1 text-3xl font-bold md:text-4xl">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {stat.label}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-400">
                  {stat.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
