"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  FileText,
  Image,
  Megaphone,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";

const moduleIcons = {
  research: Search,
  seo: BarChart3,
  content: FileText,
  creative: Image,
  ads: Megaphone,
  analytics: Sparkles,
};

const scenarios = [
  {
    name: "QuestApply Launch",
    audience: "International graduate applicants",
    goal: "Acquire first 1,000 users",
    offer: "AI admissions planning workspace",
    channels: "SEO, Content, Meta, Google Ads",
    modules: [
      {
        id: "research",
        label: "Research",
        accent: "text-sky-400",
        steps: [
          "Reading campaign context",
          "Finding competitor positioning",
          "Identifying student anxiety triggers",
          "Saving approved research memory",
        ],
        outputTitle: "Audience Insight",
        output:
          "International students respond to clarity, deadline control, and confidence signals more than generic admissions advice.",
      },
      {
        id: "seo",
        label: "SEO",
        accent: "text-emerald-400",
        steps: [
          "Reading approved research",
          "Generating keyword clusters",
          "Building topic clusters",
          "SEO strategy ready",
        ],
        outputTitle: "Keyword Cluster",
        output:
          "Graduate admissions checklist, SOP timeline, international application deadlines, US vs Canada admissions.",
      },
      {
        id: "content",
        label: "Content",
        accent: "text-indigo-400",
        steps: [
          "Using SEO strategy",
          "Drafting blog structure",
          "Writing conversion CTA",
          "Saving content draft",
        ],
        outputTitle: "Blog Draft",
        output:
          "A practical guide that turns application chaos into a step-by-step plan for international graduate applicants.",
      },
      {
        id: "creative",
        label: "Creative",
        accent: "text-fuchsia-400",
        steps: [
          "Reading content brief",
          "Creating visual direction",
          "Building image prompt",
          "Creative asset ready",
        ],
        outputTitle: "Visual Direction",
        output:
          "A focused student at a clean desk with passport, checklist, calendar, and organized admissions documents.",
      },
      {
        id: "ads",
        label: "Ads",
        accent: "text-amber-400",
        steps: [
          "Generating Google ad copy",
          "Creating Meta angles",
          "Checking CTA consistency",
          "Campaign ads ready",
        ],
        outputTitle: "Ad Angle",
        output:
          "Stop guessing your grad school application path. Build a clear plan before deadlines get close.",
      },
      {
        id: "analytics",
        label: "Analytics",
        accent: "text-teal-400",
        steps: [
          "Measuring workflow completion",
          "Checking approval status",
          "Resolving next action",
          "Campaign ready for launch",
        ],
        outputTitle: "Campaign Health",
        output: "94% ready. Next action: approve creative and launch the first ad package.",
      },
    ],
  },
  {
    name: "SaaS Launch",
    audience: "B2B marketing teams",
    goal: "Generate qualified demo requests",
    offer: "Campaign automation platform",
    channels: "LinkedIn, Google Ads, SEO",
    modules: [
      {
        id: "research",
        label: "Research",
        accent: "text-sky-400",
        steps: [
          "Mapping buyer pain points",
          "Finding category alternatives",
          "Detecting urgency signals",
          "Saving market research memory",
        ],
        outputTitle: "Market Signal",
        output:
          "Teams want fewer disconnected tools and clearer campaign readiness before spending budget.",
      },
      {
        id: "seo",
        label: "SEO",
        accent: "text-emerald-400",
        steps: [
          "Reading research memory",
          "Generating intent keywords",
          "Prioritizing topic clusters",
          "SEO plan approved",
        ],
        outputTitle: "SEO Priority",
        output:
          "Campaign management software, AI marketing workflow, marketing campaign automation.",
      },
      {
        id: "content",
        label: "Content",
        accent: "text-indigo-400",
        steps: [
          "Building landing page angle",
          "Writing proof points",
          "Creating email follow-up",
          "Content saved",
        ],
        outputTitle: "Landing Page Angle",
        output:
          "Plan, generate, review, and launch every campaign asset from one AI-powered workspace.",
      },
      {
        id: "creative",
        label: "Creative",
        accent: "text-fuchsia-400",
        steps: [
          "Creating visual hierarchy",
          "Directing product scene",
          "Preparing asset brief",
          "Creative package ready",
        ],
        outputTitle: "Creative Brief",
        output:
          "A calm mission-control desk scene with campaign cards, approved assets, and launch status.",
      },
      {
        id: "ads",
        label: "Ads",
        accent: "text-amber-400",
        steps: [
          "Generating LinkedIn copy",
          "Creating Google headlines",
          "Reviewing claims",
          "Ads pending review",
        ],
        outputTitle: "LinkedIn Hook",
        output:
          "Your campaign should not live across twelve tools. Build it from one operating system.",
      },
      {
        id: "analytics",
        label: "Analytics",
        accent: "text-teal-400",
        steps: [
          "Checking module readiness",
          "Finding missing approvals",
          "Calculating launch health",
          "Next action resolved",
        ],
        outputTitle: "Campaign Health",
        output: "91% ready. Next action: approve ads and export the launch package.",
      },
    ],
  },
  {
    name: "Ecommerce Promo",
    audience: "Returning shoppers",
    goal: "Increase seasonal sales",
    offer: "Limited-time bundle discount",
    channels: "Meta, Email, Creative, Ads",
    modules: [
      {
        id: "research",
        label: "Research",
        accent: "text-sky-400",
        steps: [
          "Reading campaign offer",
          "Finding purchase triggers",
          "Mapping objections",
          "Saving opportunity memory",
        ],
        outputTitle: "Purchase Trigger",
        output:
          "Returning shoppers respond to urgency, bundle value, and clear reminder messaging.",
      },
      {
        id: "seo",
        label: "SEO",
        accent: "text-emerald-400",
        steps: [
          "Checking seasonal search intent",
          "Finding offer keywords",
          "Creating FAQ opportunities",
          "SEO asset saved",
        ],
        outputTitle: "Search Angle",
        output:
          "Bundle deals, seasonal gift ideas, limited-time discount, and shipping deadline FAQs.",
      },
      {
        id: "content",
        label: "Content",
        accent: "text-indigo-400",
        steps: [
          "Writing email sequence",
          "Creating offer page copy",
          "Adding urgency CTA",
          "Draft saved",
        ],
        outputTitle: "Email Angle",
        output:
          "A short reminder sequence that makes the bundle feel useful, timely, and easy to buy.",
      },
      {
        id: "creative",
        label: "Creative",
        accent: "text-fuchsia-400",
        steps: [
          "Creating product scene",
          "Directing hero image",
          "Preparing carousel frames",
          "Creative ready",
        ],
        outputTitle: "Visual Direction",
        output:
          "A clean product bundle on a warm seasonal table with gift-ready packaging and clear negative space.",
      },
      {
        id: "ads",
        label: "Ads",
        accent: "text-amber-400",
        steps: [
          "Generating Meta hooks",
          "Creating retargeting copy",
          "Checking offer consistency",
          "Ads ready",
        ],
        outputTitle: "Meta Hook",
        output:
          "Your favorite bundle is back for a limited time. Save before the seasonal window closes.",
      },
      {
        id: "analytics",
        label: "Analytics",
        accent: "text-teal-400",
        steps: [
          "Reviewing asset readiness",
          "Checking campaign gaps",
          "Calculating launch health",
          "Ready for launch",
        ],
        outputTitle: "Campaign Health",
        output: "96% ready. Next action: approve email and launch retargeting ads.",
      },
    ],
  },
];

const STEP_DELAY = 1450;
const RESTART_DELAY = 8000;
const STREAM_DELAY = 70;
const CHARS_PER_TICK = 2;

function ContentSection({
  primaryCta = { href: "/signup", label: "Start Free" },
}) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [revealedSteps, setRevealedSteps] = useState(1);
  const [paused, setPaused] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState(null);

  const scenario = scenarios[scenarioIndex];
  const totalSteps = useMemo(
    () => scenario.modules.reduce((sum, module) => sum + module.steps.length, 0),
    [scenario],
  );

  const simulationComplete = revealedSteps >= totalSteps;
  const activeModule = getActiveModule(scenario.modules, revealedSteps);
  const displayModule =
    scenario.modules.find((stage) => stage.id === selectedModuleId) ||
    activeModule;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setScenarioIndex(Math.floor(Math.random() * scenarios.length));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (paused) return;

    if (simulationComplete) {
      const timeout = window.setTimeout(() => {
        setScenarioIndex((current) => (current + 1) % scenarios.length);
        setRevealedSteps(1);
        setSelectedModuleId(null);
      }, RESTART_DELAY);

      return () => window.clearTimeout(timeout);
    }

    const interval = window.setInterval(() => {
      setRevealedSteps((current) => Math.min(current + 1, totalSteps));
    }, STEP_DELAY);

    return () => window.clearInterval(interval);
  }, [paused, simulationComplete, totalSteps]);

  const handleModuleClick = (moduleId) => {
    setSelectedModuleId(moduleId);
    setPaused(true);
  };

  const handleResume = () => {
    setSelectedModuleId(null);
    setPaused(false);
  };

  return (
    <section id="simulation" className="py-20 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#3B3CFF]/20 bg-[#3B3CFF]/10 px-4 py-2 text-sm font-semibold text-[#3B3CFF] dark:text-indigo-300">
            <Sparkles className="h-4 w-4" />
            Live Campaign Simulation
          </div>
          <h2 className="text-4xl font-bold md:text-5xl">
            Watch an AI campaign{" "}
            <span className="bg-gradient-to-r from-[#3B3CFF] to-[#FF6B6B] bg-clip-text text-transparent">
              come to life
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg font-medium text-slate-600 dark:text-slate-300">
            See how one campaign brief turns into research, SEO, content,
            creative, ads, and launch intelligence without calling any live API.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 dark:border-white/10 dark:bg-[#0F172A] dark:shadow-black/30">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="h-3 w-3 rounded-full bg-green-500" />
            </div>
            <div className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 sm:block">
              AI Marketing OS
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {paused ? "Continue" : "Pause"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRevealedSteps(1);
                  setSelectedModuleId(null);
                  setPaused(false);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
                aria-label="Restart simulation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid min-h-[560px] lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 p-5 dark:border-white/10 lg:border-b-0 lg:border-r">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
                Campaign Brief
              </div>
              <h3 className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                {scenario.name}
              </h3>

              <div className="mt-5 space-y-3 text-sm">
                <BriefRow label="Audience" value={scenario.audience} />
                <BriefRow label="Goal" value={scenario.goal} />
                <BriefRow label="Offer" value={scenario.offer} />
                <BriefRow label="Channels" value={scenario.channels} />
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
                  Campaign Health
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-bold text-slate-950 dark:text-white">
                    {simulationComplete ? "94%" : `${Math.max(18, Math.round((revealedSteps / totalSteps) * 94))}%`}
                  </span>
                  <span className="pb-1 text-sm text-slate-500 dark:text-white/50">
                    readiness
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#3B3CFF] to-[#FF6B6B] transition-all duration-500"
                    style={{
                      width: `${Math.max(14, Math.round((revealedSteps / totalSteps) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </aside>

            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4 dark:border-white/10">
                {scenario.modules.map((stage) => {
                  const Icon = moduleIcons[stage.id];
                  const status = getModuleStatus(
                    scenario.modules,
                    stage.id,
                    revealedSteps,
                  );
                  const isActive = activeModule.id === stage.id;
                  const isSelected = displayModule.id === stage.id;

                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => handleModuleClick(stage.id)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        isSelected
                          ? "border-[#3B3CFF]/40 bg-[#3B3CFF]/10 text-slate-950 dark:text-white"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${stage.accent}`} />
                      <span>{stage.label}</span>
                      {status === "complete" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/20"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid flex-1 gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <AgentActivity
                  module={displayModule}
                  visibleSteps={getVisibleSteps(
                    scenario.modules,
                    displayModule.id,
                    revealedSteps,
                  )}
                  paused={paused}
                />
                <OutputPreview
                  module={displayModule}
                  visibleSteps={getVisibleSteps(
                    scenario.modules,
                    displayModule.id,
                    revealedSteps,
                  )}
                  isComplete={
                    getModuleStatus(scenario.modules, displayModule.id, revealedSteps) ===
                    "complete"
                  }
                  paused={paused}
                  simulationComplete={simulationComplete}
                  onResume={handleResume}
                  primaryCta={primaryCta}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BriefRow({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-medium text-slate-800 dark:text-white/80">
        {value}
      </div>
    </div>
  );
}

function AgentActivity({ module, visibleSteps, paused }) {
  const Icon = moduleIcons[module.id];

  return (
    <div className="border-b border-slate-200 p-5 dark:border-white/10 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
        <Icon className={`h-4 w-4 ${module.accent}`} />
        {module.label} Agent
      </div>
      <div className="mt-5 space-y-2">
        {module.steps.map((step, index) => {
          const visible = index < visibleSteps;
          const isCurrent = index === visibleSteps - 1;
          const timestamp = `09:${String(41 + index).padStart(2, "0")}`;

          return (
            <div
              key={step}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                visible
                  ? "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]"
                  : "border-transparent text-slate-300 dark:text-white/20"
              }`}
            >
              <div className="w-10 flex-none pt-0.5 text-[11px] font-mono text-slate-400 dark:text-white/30">
                {visible ? timestamp : "--:--"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-white/80">
                  {visible && (
                    <span
                      className={`h-1.5 w-1.5 flex-none rounded-full ${
                        isCurrent && !paused ? "animate-pulse bg-[#3B3CFF]" : "bg-emerald-500"
                      }`}
                    />
                  )}
                  <span>{visible ? step : "Waiting for previous step"}</span>
                  {isCurrent && !paused && (
                    <span className="ml-1 inline-flex animate-pulse text-[#3B3CFF]">
                      ...
                    </span>
                  )}
                </div>
                {visible && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40">
                    {isCurrent && !paused ? (
                      <>
                        <span>{getStepProgressLabel(step)}</span>
                        <span className="inline-flex animate-pulse text-[#3B3CFF]">
                          ...
                        </span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Completed</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OutputPreview({
  module,
  visibleSteps,
  isComplete,
  paused,
  simulationComplete,
  onResume,
  primaryCta,
}) {
  const Icon = moduleIcons[module.id];
  const streamText = buildStreamOutput(module);
  const targetChars = isComplete
    ? streamText.length
    : Math.max(
        28,
        Math.ceil(streamText.length * (visibleSteps / module.steps.length)),
      );
  const showCreativeImage =
    module.id === "creative" && (isComplete || visibleSteps >= module.steps.length - 1);

  return (
    <div className="flex flex-col p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
        <Icon className={`h-4 w-4 ${module.accent}`} />
        Generated Output
      </div>

      <div className="mt-5 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              {module.outputTitle}
            </h3>
            <StreamingText
              key={module.id}
              paused={paused}
              targetChars={targetChars}
              text={streamText}
            />
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
              isComplete
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300"
            }`}
          >
            {isComplete ? "Approved" : "Streaming"}
          </span>
        </div>

        {module.id === "creative" && (
          <div
            className={`mt-5 aspect-[16/10] rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_20%_20%,rgba(59,60,255,0.18),transparent_30%),linear-gradient(135deg,#0f172a,#1e293b)] p-4 transition duration-700 dark:border-white/10 ${
              showCreativeImage ? "opacity-100" : "opacity-25 blur-[1px]"
            }`}
          >
            <div className="flex h-full flex-col justify-end rounded-lg border border-white/10 bg-black/20 p-4 text-white">
              <div className="max-w-sm text-2xl font-bold">
                From overwhelmed to on track
              </div>
              <div className="mt-2 text-sm text-white/70">
                Admissions clarity built from campaign memory.
              </div>
            </div>
          </div>
        )}

        {simulationComplete && (
          <div className="mt-6 rounded-xl border border-[#3B3CFF]/20 bg-[#3B3CFF]/10 p-4">
            <div className="text-sm font-bold text-slate-950 dark:text-white">
              Ready to build yours?
            </div>
            <div className="mt-1 text-sm text-slate-600 dark:text-white/60">
              Create your own campaign workspace and let the agents build from
              your context.
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={primaryCta.href}
                className="inline-flex items-center justify-center rounded-lg bg-[#3B3CFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3031d9]"
              >
                {primaryCta.label}
              </Link>
              <button
                type="button"
                onClick={onResume}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
              >
                Watch Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StreamingText({ text, targetChars, paused }) {
  const [cursor, setCursor] = useState(0);
  const safeTarget = Math.min(text.length, targetChars);
  const visibleText = text.slice(0, Math.min(cursor, safeTarget));
  const isTyping = cursor < safeTarget;

  useEffect(() => {
    if (paused || !isTyping) return;

    const interval = window.setInterval(() => {
      setCursor((current) => Math.min(safeTarget, current + CHARS_PER_TICK));
    }, STREAM_DELAY);

    return () => window.clearInterval(interval);
  }, [isTyping, paused, safeTarget]);

  return (
    <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-600 dark:text-white/60">
      {visibleText}
      {isTyping && !paused && (
        <span className="ml-0.5 inline-flex animate-pulse text-[#3B3CFF]">
          |
        </span>
      )}
    </pre>
  );
}

function getStepProgressLabel(step) {
  const normalizedStep = step.replace(/\s+/g, " ").trim();
  const lowerStep = normalizedStep.toLowerCase();

  if (lowerStep.includes("meta")) {
    return "Generating Meta Hooks";
  }

  if (lowerStep.includes("google ad") || lowerStep.includes("retargeting")) {
    return "Generating Ad Copy";
  }

  if (lowerStep.includes("ready") || lowerStep.includes("launch")) {
    return "Finalizing Campaign";
  }

  if (lowerStep.startsWith("reading") || lowerStep.startsWith("using")) {
    return normalizedStep;
  }

  if (
    lowerStep.startsWith("generating") ||
    lowerStep.startsWith("creating") ||
    lowerStep.startsWith("building") ||
    lowerStep.startsWith("drafting") ||
    lowerStep.startsWith("writing") ||
    lowerStep.startsWith("checking") ||
    lowerStep.startsWith("measuring") ||
    lowerStep.startsWith("reviewing") ||
    lowerStep.startsWith("calculating") ||
    lowerStep.startsWith("identifying") ||
    lowerStep.startsWith("finding") ||
    lowerStep.startsWith("saving") ||
    lowerStep.startsWith("resolving")
  ) {
    return normalizedStep;
  }

  return `Working on ${normalizedStep}`;
}

function buildStreamOutput(module) {
  if (module.id === "research") {
    return `${module.output}\n\nThe agent is comparing approved campaign context against market signals, audience urgency, and positioning gaps. The strongest insight is saved as campaign memory so the next agents do not start from a blank prompt.`;
  }

  if (module.id === "seo") {
    return `${module.outputTitle}\n\n- Campaign intelligence\n- AI marketing workspace\n- Campaign automation\n- Approval workflow\n- Multi-channel launch plan\n\nThe SEO agent is turning approved research into clusters, topic priorities, and search intent that content can reuse.`;
  }

  if (module.id === "content") {
    return `# ${module.outputTitle}\n\n${module.output}\n\nModern teams do not need another disconnected writing tool. They need a campaign-aware system that can read research, understand SEO priorities, and produce drafts that fit the launch strategy.\n\nCTA: Build your next campaign from approved context.`;
  }

  if (module.id === "creative") {
    return `${module.outputTitle}\n\n${module.output}\n\nVisual Director: choose one clear hero object, keep the scene photographic, avoid tiny UI, and leave clean negative space for campaign copy. The image asset fades in after the brief is ready.`;
  }

  if (module.id === "ads") {
    return `${module.outputTitle}\n\nGoogle Headlines\n- Launch campaigns from one AI workspace\n- Turn campaign context into ads\n- Build assets ready for review\n\nMeta Hook\n${module.output}\n\nCTA: Start free`;
  }

  if (module.id === "analytics") {
    return `${module.outputTitle}\n\n${module.output}\n\nWhy this score is explainable:\n- Research approved\n- SEO plan generated\n- Content draft saved\n- Creative ready for review\n- Ads package prepared\n\nRecommended next action: review and approve the final creative.`;
  }

  return module.output;
}

function getActiveModule(modules, revealedSteps) {
  let cursor = 0;

  for (const stage of modules) {
    cursor += stage.steps.length;
    if (revealedSteps <= cursor) {
      return stage;
    }
  }

  return modules[modules.length - 1];
}

function getVisibleSteps(modules, moduleId, revealedSteps) {
  let previousSteps = 0;

  for (const stage of modules) {
    if (stage.id === moduleId) {
      return Math.max(0, Math.min(stage.steps.length, revealedSteps - previousSteps));
    }

    previousSteps += stage.steps.length;
  }

  return 0;
}

function getModuleStatus(modules, moduleId, revealedSteps) {
  let previousSteps = 0;

  for (const stage of modules) {
    const moduleEnd = previousSteps + stage.steps.length;

    if (stage.id === moduleId) {
      if (revealedSteps >= moduleEnd) return "complete";
      if (revealedSteps > previousSteps) return "active";
      return "waiting";
    }

    previousSteps = moduleEnd;
  }

  return "waiting";
}

export default ContentSection;
