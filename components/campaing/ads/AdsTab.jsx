"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Loader2,
  Lock,
  Megaphone,
  Sparkles,
} from "lucide-react";

import { getAiErrorMessage } from "@/app/lib/utils/aiErrorMessage";
import { useTextStream } from "@/app/lib/context/TextStreamContext";
import UpgradeModal from "@/components/campaing/UpgradeModal";
import { getActionGate, getFeatureGate } from "@/app/lib/plans/planPolicy";
import { useCampaignActionLifecycle } from "@/hooks/useCampaignActionLifecycle";
import {
  BriefField,
  ContextSource,
  ReportList,
  ReportSection,
  ReportState,
} from "@/components/campaing/ads/AdsReportComponents";
import {
  buildCampaignPackageOutput,
  buildCampaignPackageReport,
  extractAdsReport,
  formatAdsText,
  formatMemoryStatus,
  hasText,
  isValidDate,
  isValidReport,
  normalizeTask,
} from "@/app/lib/utils/adsReportUtils";
import { ADS_TASKS, PLATFORM_TASK_IDS } from "@/app/lib/utils/adsTasks";

export default function AdsTab({ campaign, ads = [], plan = "free" }) {
  const searchParams = useSearchParams();
  const { streamObject } = useTextStream();
  const viewerRef = useRef(null);
  const requestedTask = normalizeTask(searchParams.get("adsTask"));
  const [selectedTask, setSelectedTask] = useState(requestedTask);
  const [localOutputs, setLocalOutputs] = useState(ads || []);
  const [results, setResults] = useState({});
  const [goal, setGoal] = useState(campaign?.goal || "");
  const [audience, setAudience] = useState(
    campaign?.audience || campaign?.target_audience || "",
  );
  const [offer, setOffer] = useState(
    campaign?.product_name || campaign?.name || "",
  );
  const [budget, setBudget] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const {
    loading,
    setLoading,
    errors,
    setErrors,
    copied,
    setCopied,
    copyToClipboard,
    upgradeGate,
    setUpgradeGate,
    ensureActionAllowed,
  } = useCampaignActionLifecycle();

  useEffect(() => {
    setLocalOutputs(ads || []);
  }, [ads]);

  useEffect(() => {
    setSelectedTask(requestedTask);
  }, [requestedTask]);

  useEffect(() => {
    setIsReportExpanded(false);
    setCopied(false);
  }, [selectedTask, setCopied]);

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
    await copyToClipboard(formatAdsText(activeReport));
  };

  const exportReport = () => {
    if (!activeReport) return;
    if (!ensureActionAllowed({ plan, action: "export" })) return;
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

        <div className="grid  gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none grid-cols-2 lg:grid-cols-5">
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

