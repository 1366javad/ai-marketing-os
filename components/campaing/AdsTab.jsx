"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  Facebook,
  FileText,
  Linkedin,
  Loader2,
  Lock,
  Megaphone,
  PackageCheck,
  Search,
  Sparkles,
  Video,
} from "lucide-react";

import { getAiErrorMessage } from "@/app/lib/utils/aiErrorMessage";
import { useTextStream } from "@/app/lib/context/TextStreamContext";
import UpgradeModal from "@/components/campaing/UpgradeModal";
import { getActionGate, getFeatureGate } from "@/app/lib/plans/planPolicy";

const ADS_TASKS = [
  {
    id: "google_ads",
    label: "Google Ads",
    title: "Google Ads",
    description:
      "Create responsive search headlines, descriptions, CTAs, and extensions.",
    icon: Search,
    iconColor: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "meta_ads",
    label: "Instagram Ad",
    title: "Instagram Ad",
    description:
      "Create Instagram-ready primary text, headlines, conversion angles, and CTAs.",
    icon: Facebook,
    iconColor: "text-indigo-500 dark:text-indigo-400",
  },
  {
    id: "linkedin_ads",
    label: "LinkedIn Ads",
    title: "LinkedIn Ads",
    description:
      "Create professional sponsored content for decision-makers and lead generation.",
    icon: Linkedin,
    iconColor: "text-sky-500 dark:text-sky-400",
  },
  {
    id: "tiktok_ads",
    label: "TikTok Ads",
    title: "TikTok Ads",
    description:
      "Create native hooks, short-form scripts, ad text, and direct-response CTAs.",
    icon: Video,
    iconColor: "text-pink-500 dark:text-pink-400",
  },
  {
    id: "campaign_package",
    label: "Campaign Package",
    title: "Ads Campaign Package",
    description:
      "Create one coordinated advertising package adapted across all core platforms.",
    icon: PackageCheck,
    iconColor: "text-fuchsia-500 dark:text-fuchsia-400",
  },
];

const PLATFORM_TASK_IDS = [
  "google_ads",
  "meta_ads",
  "linkedin_ads",
  "tiktok_ads",
];

export default function AdsTab({ campaign, ads = [], plan = "free" }) {
  const searchParams = useSearchParams();
  const { streamObject } = useTextStream();
  const viewerRef = useRef(null);
  const requestedTask = normalizeTask(searchParams.get("adsTask"));
  const [selectedTask, setSelectedTask] = useState(requestedTask);
  const [localOutputs, setLocalOutputs] = useState(ads || []);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [goal, setGoal] = useState(campaign?.goal || "");
  const [audience, setAudience] = useState(
    campaign?.audience || campaign?.target_audience || "",
  );
  const [offer, setOffer] = useState(
    campaign?.product_name || campaign?.name || "",
  );
  const [budget, setBudget] = useState("");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [upgradeGate, setUpgradeGate] = useState(null);

  useEffect(() => {
    setLocalOutputs(ads || []);
  }, [ads]);

  useEffect(() => {
    setSelectedTask(requestedTask);
  }, [requestedTask]);

  useEffect(() => {
    setIsReportExpanded(false);
    setCopied(false);
  }, [selectedTask]);

  const activeTask =
    ADS_TASKS.find((item) => item.id === selectedTask) || ADS_TASKS[0];
  const ActiveIcon = activeTask.icon;
  const latestByTask = useMemo(() => {
    const map = {};

    for (const item of localOutputs) {
      const type = normalizeTask(item.type || item.adsOutput?.type);
      if (!map[type]) map[type] = item;
    }

    const platformOutputs = PLATFORM_TASK_IDS.map(
      (taskId) => map[taskId],
    ).filter(Boolean);
    if (platformOutputs.length === PLATFORM_TASK_IDS.length) {
      map.campaign_package = buildCampaignPackageOutput(platformOutputs);
    }

    return map;
  }, [localOutputs]);
  const activeStoredOutput = latestByTask[selectedTask] || null;
  const activeReport =
    results[selectedTask] || extractAdsReport(activeStoredOutput);
  const activeError = errors[selectedTask] || "";
  const isActiveLoading = !!loading[selectedTask];
  const hasRequiredContext =
    !!campaign?.id &&
    hasText(goal) &&
    hasText(audience) &&
    hasText(offer) &&
    !!selectedTask;
  const validationMessage =
    "Complete campaign goal, audience, and offer before generating ads.";
  const activeProvider = activeReport?.metadata?.provider || "";
  const activeAgentLabel = "Ads Agent";
  const activeGeneratedAt =
    activeReport?.metadata?.generatedAt ||
    activeStoredOutput?.created_at ||
    activeStoredOutput?.metadata?.generatedAt ||
    "";

  const requestAdsTask = async (taskId) => {
    const response = await fetch("/api/ads/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        section: taskId,
        goal,
        audience,
        offer,
        budget,
        prompt,
        regenerate: Boolean(latestByTask[taskId]),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || data.error || `${taskId} generation failed.`,
      );
    }

    const report = data.adsOutput;
    return {
      report,
      output: {
        ...(data.output || {}),
        id:
          data.memory?.event?.id ||
          data.output?.id ||
          `local-${taskId}-${Date.now()}`,
        type: taskId,
        module: "ads",
        adsOutput: report,
        approval_status: "pending",
        risk_level: "high",
        created_at: report?.metadata?.generatedAt || new Date().toISOString(),
      },
    };
  };

  const generateAds = async () => {
    if (!hasRequiredContext || isActiveLoading) return;
    const featureGate = getFeatureGate({
      plan,
      module: "ads",
      feature: selectedTask,
    });

    if (!featureGate.allowed) {
      setUpgradeGate(featureGate);
      return;
    }

    if (activeStoredOutput) {
      const regenerateGate = getActionGate({ plan, action: "regenerate" });
      if (!regenerateGate.allowed) {
        setUpgradeGate(regenerateGate);
        return;
      }
    }

    const requestedTasks =
      selectedTask === "campaign_package" ? PLATFORM_TASK_IDS : [selectedTask];
    setLoading((current) => ({
      ...current,
      campaign_package: selectedTask === "campaign_package",
      ...Object.fromEntries(requestedTasks.map((taskId) => [taskId, true])),
    }));
    setErrors((current) => ({ ...current, [selectedTask]: "" }));

    try {
      const settled = await Promise.allSettled(
        requestedTasks.map((taskId) => requestAdsTask(taskId)),
      );
      const generated = settled
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      const failed = settled
        .map((result, index) => ({ result, taskId: requestedTasks[index] }))
        .filter(({ result }) => result.status === "rejected");

      if (generated.length === 0) {
        throw failed[0]?.result.reason || new Error("Ads generation failed.");
      }

      const generatedResults = Object.fromEntries(
        generated.map(({ report }) => [report.type, report]),
      );
      const packageReport =
        selectedTask === "campaign_package" &&
        generated.length === PLATFORM_TASK_IDS.length
          ? buildCampaignPackageReport(
              PLATFORM_TASK_IDS.map((taskId) => generatedResults[taskId]),
            )
          : null;

      setLoading((current) => ({
        ...current,
        campaign_package: false,
        ...Object.fromEntries(requestedTasks.map((taskId) => [taskId, false])),
      }));
      await Promise.all(
        Object.entries(generatedResults).map(([taskId, report]) =>
          streamObject(
            `ads:${campaign.id}:${taskId}`,
            report,
            (streamedReport) => {
              setResults((current) => ({
                ...current,
                [taskId]: streamedReport,
              }));
            },
          ),
        ),
      );
      if (packageReport) {
        await streamObject(
          `ads:${campaign.id}:campaign_package`,
          packageReport,
          (streamedReport) => {
            setResults((current) => ({
              ...current,
              campaign_package: streamedReport,
            }));
          },
        );
      }
      setLocalOutputs((current) => [
        ...generated.map(({ output }) => output),
        ...current.filter(
          (item) =>
            !requestedTasks.includes(
              normalizeTask(item.type || item.adsOutput?.type),
            ),
        ),
      ]);
      setPrompt("");
      setIsReportExpanded(false);

      if (failed.length > 0) {
        const failedLabels = failed
          .map(({ taskId }) => {
            return (
              ADS_TASKS.find((task) => task.id === taskId)?.label || taskId
            );
          })
          .join(", ");
        setErrors((current) => ({
          ...current,
          campaign_package: `Generated ${
            generated.length
          } of ${requestedTasks.length} platforms. Failed: ${failedLabels}.`,
        }));
      }
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [selectedTask]: getAiErrorMessage(error),
      }));
    } finally {
      setLoading((current) => ({
        ...current,
        campaign_package: false,
        ...Object.fromEntries(requestedTasks.map((taskId) => [taskId, false])),
      }));
    }
  };

  const copyReport = async () => {
    if (!activeReport) return;
    await navigator.clipboard.writeText(formatAdsText(activeReport));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const exportReport = () => {
    if (!activeReport) return;
    const gate = getActionGate({ plan, action: "export" });
    if (!gate.allowed) {
      setUpgradeGate(gate);
      return;
    }
    const blob = new Blob([formatAdsText(activeReport)], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${campaign.name}-${selectedTask}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 bg-slate-50 text-slate-900 dark:bg-dark-bg dark:text-white/90">
      <section className="mt-5">
        <div className="mb-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            Ads Task
          </span>
          <span className="text-slate-500 dark:text-white/40">
            Pick one to brief
          </span>
        </div>

        <div className="grid  gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none grid-cols-2 lg:grid-cols-3">
          {ADS_TASKS.map((task) => {
            const Icon = task.icon;
            const isActive = selectedTask === task.id;
            const hasOutput = !!latestByTask[task.id];
            const gate = getFeatureGate({
              plan,
              module: "ads",
              feature: task.id,
            });

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  if (!gate.allowed) {
                    setUpgradeGate(gate);
                    return;
                  }

                  setSelectedTask(task.id);
                }}
                className={
                  isActive
                    ? "group relative inline-flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
                    : "group relative inline-flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left text-sm text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:border-white/10 dark:hover:bg-white/[0.06] dark:hover:text-white"
                }
              >
                <Icon className={`h-4 w-4 ${task.iconColor}`} />
                <span className="min-w-0 flex-1 truncate">{task.label}</span>
                {!gate.allowed ? (
                  <Lock className="h-3 w-3 text-slate-400 dark:text-white/35" />
                ) : (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      hasOutput
                        ? "bg-emerald-500/80"
                        : "bg-slate-300 dark:bg-white/15"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            <FileText className="h-3.5 w-3.5" />
            Ads Brief
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
              <ActiveIcon className={`h-5 w-5 ${activeTask.iconColor}`} />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-white">
                {activeTask.title}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeStoredOutput
                      ? "bg-amber-500/80"
                      : "bg-slate-300 dark:bg-white/15"
                  }`}
                />
                <span className="text-slate-500 dark:text-white/50">
                  {activeStoredOutput
                    ? formatMemoryStatus(activeStoredOutput)
                    : "Not Generated"}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-white/60">
            {activeTask.description}
          </p>

          <div className="mt-5 space-y-3">
            <BriefField label="Goal" value={goal} onChange={setGoal} />
            <BriefField
              label="Audience"
              value={audience}
              onChange={setAudience}
            />
            <BriefField label="Offer" value={offer} onChange={setOffer} />
            <BriefField
              label="Budget"
              value={budget}
              onChange={setBudget}
              placeholder="Optional budget or spend range"
            />
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
                <span>Direction (optional)</span>
                <span className="text-slate-400 dark:text-white/30">
                  {prompt.length}/500
                </span>
              </label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Steer the agent: angle, constraints, campaign message..."
                className="custom-scrollbar w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#3B3CFF]/50 focus:outline-none focus:ring-2 focus:ring-[#3B3CFF]/20 dark:border-white/10 dark:bg-dark-bg dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/30 dark:focus:ring-0"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!hasRequiredContext || isActiveLoading}
            onClick={generateAds}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-primary-500 disabled:text-slate-400 dark:disabled:text-white/40"
          >
            {isActiveLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isActiveLoading
              ? selectedTask === "campaign_package"
                ? "Generating All Platforms..."
                : "Generating..."
              : selectedTask === "campaign_package"
                ? "Generate Everything"
                : "Generate Ads"}
          </button>

          {!hasRequiredContext && (
            <p className="mt-3 text-[11px] leading-relaxed text-amber-600 dark:text-amber-300">
              {validationMessage}
            </p>
          )}

          <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-slate-500 dark:text-white/45">
            <div>Context Sources:</div>
            <ContextSource label="Campaign Audience" />
            <ContextSource label="Campaign Offer & Positioning" />
            <ContextSource label="Approved SEO Memory" />
            <ContextSource label="Approved Creative Memory" />
            <div className="pt-1 text-amber-600 dark:text-amber-300">
              Ads are high-risk and require approval before publish or spend.
            </div>
          </div>
        </aside>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          {isActiveLoading ? (
            <ReportState
              ref={viewerRef}
              icon={Loader2}
              iconClassName="animate-spin text-primary-600 dark:text-white"
              title={`Generating ${activeTask.label}`}
              description="The agent is using campaign context and approved memory to create platform-ready ad copy."
            />
          ) : activeError ? (
            <ReportState
              ref={viewerRef}
              icon={AlertCircle}
              iconClassName="text-rose-500"
              title="Ads generation failed"
              description={activeError}
              danger
            />
          ) : isValidReport(activeReport) ? (
            <div ref={viewerRef} className="flex max-h-[640px] flex-col p-6">
              <div className="border-b border-slate-200 pb-4 dark:border-white/10">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
                  <ActiveIcon
                    className={`h-3.5 w-3.5 ${activeTask.iconColor}`}
                  />
                  Ads Report
                </div>
                {hasText(activeReport.title) && (
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {activeReport.title}
                  </h3>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-white/40">
                  {activeProvider && activeProvider !== "memory" && (
                    <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 dark:border-white/10">
                      {activeAgentLabel}
                    </span>
                  )}
                  {isValidDate(activeGeneratedAt) && (
                    <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 dark:border-white/10">
                      {new Date(activeGeneratedAt).toLocaleDateString()}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={copyReport}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    title="Copy ads report"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={exportReport}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    title="Download ads report"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div
                className={`mt-5 space-y-5 pr-1 transition-all ${
                  isReportExpanded
                    ? "custom-scrollbar max-h-[440px] overflow-y-auto"
                    : "max-h-[300px] overflow-hidden"
                }`}
              >
                {hasText(activeReport.summary) && (
                  <ReportSection title="Summary">
                    <p>{activeReport.summary}</p>
                  </ReportSection>
                )}
                <ReportList title="Headlines" items={activeReport.headlines} />
                <ReportList
                  title="Primary Text"
                  items={activeReport.primaryTexts}
                />
                <ReportList
                  title="Descriptions"
                  items={activeReport.descriptions}
                />
                <ReportList title="CTAs" items={activeReport.ctas} />
                <ReportList
                  title="Extensions"
                  items={activeReport.extensions}
                />
                <ReportList title="Hooks" items={activeReport.hooks} />
                <ReportList
                  title="Script Ideas"
                  items={activeReport.scriptIdeas}
                />
                <ReportList
                  title="Recommendations"
                  items={activeReport.recommendations}
                />
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsReportExpanded((value) => !value)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
                >
                  {isReportExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {isReportExpanded ? "Show less" : "Show more"}
                </button>
              </div>
            </div>
          ) : (
            <ReportState
              ref={viewerRef}
              icon={ActiveIcon}
              iconClassName={activeTask.iconColor}
              title={`No ${activeTask.label.toLowerCase()} yet`}
              description="Brief the agent on the left, then generate a structured ads report grounded in this campaign."
            />
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            <Megaphone className="h-3.5 w-3.5" />
            Ads Memory
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-white/50">
            Per-platform status across this campaign. Ad copy requires approval
            before publish or spend.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ADS_TASKS.map((task) => {
            const Icon = task.icon;
            const output = latestByTask[task.id];

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  const gate = getFeatureGate({
                    plan,
                    module: "ads",
                    feature: task.id,
                  });

                  if (!gate.allowed) {
                    setUpgradeGate(gate);
                    return;
                  }

                  setSelectedTask(task.id);
                  setIsReportExpanded(false);
                }}
                className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/15 dark:hover:bg-white/[0.04]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                    <Icon className={`h-4 w-4 ${task.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-900 dark:text-white">
                      {task.label}
                    </div>
                    <div
                      className={`text-[11px] ${
                        output
                          ? "text-amber-600 dark:text-amber-300"
                          : "text-slate-500 dark:text-white/50"
                      }`}
                    >
                      {output ? formatMemoryStatus(output) : "Not Generated"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-none text-slate-400 transition group-hover:text-slate-600 dark:text-white/30 dark:group-hover:text-white/60" />
              </button>
            );
          })}
        </div>
      </section>
      <UpgradeModal gate={upgradeGate} onClose={() => setUpgradeGate(null)} />
    </div>
  );
}

function BriefField({ label, value, onChange, placeholder = "" }) {
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

function ContextSource({ label }) {
  return (
    <div className="flex items-center gap-1.5">
      <Check className="h-3 w-3 text-emerald-500" />
      {label}
    </div>
  );
}

const ReportState = React.forwardRef(function ReportState(
  { icon: Icon, iconClassName = "", title, description, danger = false },
  ref,
) {
  return (
    <div
      ref={ref}
      className="flex h-[520px] flex-col items-center justify-center px-8 py-16 text-center"
    >
      <div
        className={`rounded-2xl border p-4 ${
          danger
            ? "border-rose-200 bg-rose-50 dark:border-rose-400/20 dark:bg-rose-400/10"
            : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]"
        }`}
      >
        <Icon className={`h-7 w-7 ${iconClassName}`} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-white/50">
        {description}
      </p>
    </div>
  );
});

function ReportSection({ title, children }) {
  if (!hasRenderableContent(children)) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </h4>
      <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
        {children}
      </div>
    </section>
  );
}

function ReportList({ title, items }) {
  const safeItems = Array.isArray(items)
    ? items.map((item) => stringifyItem(item)).filter(Boolean)
    : [];

  if (safeItems.length === 0) return null;

  return (
    <ReportSection title={title}>
      <ul className="space-y-2">
        {safeItems.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}

function hasRenderableContent(value) {
  if (typeof value === "string") return hasText(value);
  if (Array.isArray(value)) return value.some(hasRenderableContent);
  if (!value || typeof value !== "object") return Boolean(value);
  return true;
}

function extractAdsReport(output) {
  if (!output) return null;
  const report =
    output.adsOutput || output.metadata?.memoryEvent?.payload || {};

  return {
    ...report,
    type: normalizeTask(report.type || output.type),
    title: report.title || output.title || "Ads Report",
    summary: report.summary || "",
    headlines: normalizeList(report.headlines),
    primaryTexts: normalizeList(
      report.primaryTexts || report.primary_texts || report.body,
    ),
    descriptions: normalizeList(report.descriptions),
    ctas: normalizeList(report.ctas || report.cta),
    extensions: normalizeList(report.extensions),
    hooks: normalizeList(report.hooks),
    scriptIdeas: normalizeList(
      report.scriptIdeas || report.script_ideas || report.scripts,
    ),
    recommendations: normalizeList(report.recommendations),
    metadata: {
      provider:
        report.metadata?.provider ||
        report.provider ||
        output.metadata?.provider ||
        "memory",
      confidence:
        report.metadata?.confidence ||
        report.confidence ||
        output.confidence ||
        output.metadata?.confidence ||
        0,
      generatedAt:
        report.metadata?.generatedAt ||
        report.generatedAt ||
        output.created_at ||
        "",
    },
  };
}

function buildCampaignPackageOutput(outputs) {
  const reports = outputs.map(extractAdsReport).filter(Boolean);
  const report = buildCampaignPackageReport(reports);
  const generatedAt = getLatestGeneratedAt(reports);

  return {
    id: `campaign-package-${generatedAt || "generated"}`,
    source: "derived",
    module: "ads",
    type: "campaign_package",
    title: report.title,
    adsOutput: report,
    approval_status: "pending",
    risk_level: "high",
    created_at: generatedAt,
    metadata: {
      provider: report.metadata.provider,
      generatedAt,
    },
  };
}

function buildCampaignPackageReport(reports) {
  const validReports = reports.filter(Boolean);
  const generatedAt = getLatestGeneratedAt(validReports);
  const providers = [
    ...new Set(
      validReports
        .map((report) => report.metadata?.provider)
        .filter((provider) => provider && provider !== "memory"),
    ),
  ];

  return {
    type: "campaign_package",
    title: "Complete Ads Campaign Package",
    summary:
      "A coordinated advertising package containing Google Ads, Meta Ads, LinkedIn Ads, and TikTok Ads variants.",
    headlines: collectPackageItems(validReports, "headlines"),
    primaryTexts: collectPackageItems(validReports, "primaryTexts"),
    descriptions: collectPackageItems(validReports, "descriptions"),
    ctas: collectPackageItems(validReports, "ctas"),
    extensions: collectPackageItems(validReports, "extensions"),
    hooks: collectPackageItems(validReports, "hooks"),
    scriptIdeas: collectPackageItems(validReports, "scriptIdeas"),
    recommendations: collectPackageItems(validReports, "recommendations"),
    metadata: {
      provider: providers.length === 1 ? providers[0] : "multi-provider",
      confidence: 0,
      generatedAt,
    },
  };
}

function collectPackageItems(reports, field) {
  return reports.flatMap((report) => {
    const task = ADS_TASKS.find((item) => item.id === report.type);
    const label = task?.label || report.type;

    return normalizeList(report[field]).map((item) => `[${label}] ${item}`);
  });
}

function getLatestGeneratedAt(reports) {
  const timestamps = reports
    .map((report) => report?.metadata?.generatedAt)
    .filter(isValidDate)
    .map((value) => new Date(value).getTime());

  if (timestamps.length === 0) return "";
  return new Date(Math.max(...timestamps)).toISOString();
}

function normalizeTask(value) {
  const task = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const aliases = {
    google: "google_ads",
    meta: "meta_ads",
    facebook: "meta_ads",
    instagram: "meta_ads",
    instagram_ad: "meta_ads",
    linkedin: "linkedin_ads",
    tiktok: "tiktok_ads",
    package: "campaign_package",
  };
  const normalized = aliases[task] || task;

  return ADS_TASKS.some((item) => item.id === normalized)
    ? normalized
    : "meta_ads";
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(stringifyItem).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function stringifyItem(item) {
  if (typeof item === "string") return item.trim();
  if (item == null) return "";
  if (typeof item !== "object") return String(item);
  return Object.values(item)
    .flat()
    .map(stringifyItem)
    .filter(Boolean)
    .join(" - ");
}

function isValidReport(report) {
  return Boolean(
    report?.summary ||
    report?.headlines?.length ||
    report?.primaryTexts?.length ||
    report?.descriptions?.length,
  );
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function formatMemoryStatus(output) {
  const status =
    output?.approval_status ||
    output?.metadata?.memoryEvent?.approval_status ||
    "pending";
  const label =
    status === "approved"
      ? "Approved"
      : status === "auto_saved"
        ? "Generated"
        : "Pending Review";
  const date =
    output?.created_at ||
    output?.adsOutput?.metadata?.generatedAt ||
    output?.metadata?.generatedAt;

  return date ? `${label} · ${formatRelativeTime(date)}` : label;
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatAdsText(report) {
  const sections = [
    report.title,
    report.summary,
    formatTextList("Headlines", report.headlines),
    formatTextList("Primary Text", report.primaryTexts),
    formatTextList("Descriptions", report.descriptions),
    formatTextList("CTAs", report.ctas),
    formatTextList("Extensions", report.extensions),
    formatTextList("Hooks", report.hooks),
    formatTextList("Script Ideas", report.scriptIdeas),
    formatTextList("Recommendations", report.recommendations),
  ];
  return sections.filter(Boolean).join("\n\n");
}

function formatTextList(title, items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return `${title}\n${items.map((item) => `- ${stringifyItem(item)}`).join("\n")}`;
}
