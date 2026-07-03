"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Globe,
  Users,
  TrendingUp,
  Lightbulb,
  AlertCircle,
  Search,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Copy,
  Download,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import { getAiErrorMessage } from "@/app/lib/utils/aiErrorMessage";
import { exportPdf } from "@/app/lib/export/exportPdf";
import { useTextStream } from "@/app/lib/context/TextStreamContext";
import MemoryApprovalButton from "@/components/memory/MemoryApprovalButton";
import UpgradeModal from "@/components/campaing/UpgradeModal";
import { getActionGate, getFeatureGate } from "@/app/lib/plans/planPolicy";

const sections = [
  {
    id: "market",
    title: "Market Research",
    label: "Market",
    icon: Globe,
    desc: "Map market size, segments, growth trajectory, and structural forces shaping the opportunity.",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    iconColor: "text-sky-600 dark:text-sky-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryIcon: "globe",
    memoryColor: "sky-400",
  },
  {
    id: "audience",
    title: "Audience Analysis",
    label: "Audience",
    icon: Users,
    desc: "Identify customer segments, motivations, objections, buying triggers, and decision behavior.",
    color:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    iconColor: "text-violet-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryIcon: "users",
    memoryColor: "violet-400",
  },
  {
    id: "competitor",
    title: "Competitor Analysis",
    label: "Competitor",
    icon: Search,
    desc: "Identify direct and indirect competitors, positioning, pricing, differentiation, and gaps.",
    color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    iconColor: "text-rose-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryIcon: "search",
    memoryColor: "rose-400",
  },
  {
    id: "trends",
    title: "Trend Analysis",
    label: "Trends",
    icon: TrendingUp,
    desc: "Analyze emerging shifts, market signals, timing, risks, and opportunities.",
    color:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    iconColor: "text-emerald-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryIcon: "trending-up",
    memoryColor: "emerald-400",
  },
  {
    id: "painpoints",
    title: "Pain Points",
    label: "Pain Points",
    icon: AlertCircle,
    desc: "Identify the audience's main problems, frustrations, barriers, and unmet needs.",
    color:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    iconColor: "text-amber-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryIcon: "circle-alert",
    memoryColor: "amber-400",
  },
  {
    id: "opportunities",
    title: "Opportunities",
    label: "Opportunities",
    icon: Lightbulb,
    desc: "Identify market gaps, growth angles, messaging opportunities, and campaign openings.",
    color:
      "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    iconColor: "text-yellow-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryIcon: "lightbulb",
    memoryColor: "yellow-400",
  },
];

function getSectionIdFromTask(task) {
  const normalized = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const map = {
    market: "market",
    market_research: "market",
    audience: "audience",
    audience_research: "audience",
    audience_analysis: "audience",
    competitor: "competitor",
    competitors: "competitor",
    competitor_research: "competitor",
    competitor_analysis: "competitor",
    trend: "trends",
    trends: "trends",
    trend_research: "trends",
    trends_research: "trends",
    painpoint: "painpoints",
    painpoints: "painpoints",
    pain_points: "painpoints",
    pain_points_research: "painpoints",
    opportunities: "opportunities",
    opportunity: "opportunities",
    opportunities_research: "opportunities",
  };

  return map[normalized] || normalized;
}

function getOutputSectionId(output) {
  return getSectionIdFromTask(
    output?.task ||
      output?.type ||
      output?.researchOutput?.type ||
      output?.metadata?.memoryEvent?.task ||
      output?.metadata?.memoryEvent?.payload?.type,
  );
}

function isApprovedMemoryOutput(output) {
  const status = String(
    output?.approval_status || output?.approvalStatus || "auto_saved",
  ).toLowerCase();

  return status === "approved" || status === "auto_saved";
}

function findLatestOutputForSection(outputs, sectionId, options = {}) {
  const includePending = options.includePending || false;

  return (outputs || []).find((output) => {
    if (getOutputSectionId(output) !== sectionId) return false;
    if (includePending) return true;
    return isApprovedMemoryOutput(output);
  });
}

function getResearchReport(output) {
  const report =
    output?.researchOutput || output?.metadata?.memoryEvent?.payload;

  if (!report) return null;

  return {
    ...report,
    content: report.content || output?.content || "",
  };
}

function isValidReport(report) {
  return Boolean(
    hasContent(report?.summary) ||
    hasListItems(report?.insights) ||
    hasListItems(report?.recommendations) ||
    hasListItems(report?.risks) ||
    hasListItems(report?.nextActions) ||
    hasContent(report?.content),
  );
}

function hasContent(value) {
  return String(value || "").trim().length > 0;
}

function hasListItems(value) {
  return Array.isArray(value) && value.filter(Boolean).length > 0;
}

function normalizeGeneratedOutput(data, sectionId) {
  const createdAt = new Date().toISOString();
  const event = data?.memory?.event;
  const output = data?.output || {};
  const researchOutput = data?.researchOutput || {
    title: output.title || "Research Report",
    summary: "",
    insights: [],
    recommendations: [],
    risks: [],
    nextActions: [],
    metadata: output.metadata || {},
  };

  return {
    id: event?.id || output.id || `${sectionId}-${Date.now()}`,
    source: data?.memory?.storage || "local",
    module: "research",
    type: data?.executionPlan?.task || sectionId,
    title: researchOutput.title || output.title || "Research Report",
    content: output.content || "",
    researchOutput,
    approval_status:
      event?.approval_status ||
      output.approval_status ||
      output.metadata?.memoryEvent?.approval_status ||
      (data?.quality?.approvalRequired ? "pending" : "auto_saved"),
    confidence:
      event?.confidence ||
      data?.quality?.score ||
      researchOutput.metadata?.confidence ||
      0,
    risk_level:
      event?.risk_level ||
      output.metadata?.memoryEvent?.risk_level ||
      data?.quality?.riskLevel ||
      "low",
    created_at: event?.created_at || output.created_at || createdAt,
    metadata: output.metadata || researchOutput.metadata || {},
  };
}

function formatCreditLimitMessage(data) {
  if (data?.error !== "credit_limit_reached") return "";

  const requiredCredits = Number(data.requiredCredits || 0);
  const remainingCredits = Number(data.remainingCredits || 0);

  if (requiredCredits > 0) {
    return `You need ${requiredCredits} credits, but you have ${remainingCredits} left today. Come back tomorrow or upgrade to Pro.`;
  }

  return (
    data.message ||
    "You've used today's free credits. Come back tomorrow or upgrade to Pro."
  );
}

function getOutputStatus(output) {
  const status = String(output?.approval_status || "auto_saved").toLowerCase();
  const date = formatRelativeDate(output?.created_at);

  if (status === "approved") return date ? `Approved · ${date}` : "Approved";
  return date ? `Pending Review · ${date}` : "Pending Review";
}

function formatRelativeDate(value) {
  if (!value) return "";

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 2 * day) return "yesterday";
  return `${Math.floor(diffMs / day)}d ago`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatReportText(report) {
  const sectionsText = [
    `# ${report.title || "Research Report"}`,
    "",
    report.summary || "",
    "",
    "## Insights",
    ...formatList(report.insights),
    "",
    "## Recommendations",
    ...formatList(report.recommendations),
    "",
    "## Risks",
    ...formatList(report.risks),
    "",
    "## Next Actions",
    ...formatList(report.nextActions),
  ];

  return sectionsText.join("\n").trim();
}

function formatList(items) {
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((item) => `- ${stringifyReportItem(item)}`);
}

function ReportList({ title, items }) {
  const safeItems = Array.isArray(items)
    ? items.map((item) => stringifyReportItem(item)).filter(Boolean)
    : [];

  if (safeItems.length === 0) return null;

  return (
    <section>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </h4>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
        {safeItems.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-slate-300 dark:bg-white/20"></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function stringifyReportItem(item) {
  if (typeof item === "string") return item.trim();
  if (item == null) return "";
  if (typeof item !== "object") return String(item).trim();

  return Object.values(item)
    .flatMap((value) => {
      if (Array.isArray(value))
        return value.map((entry) => stringifyReportItem(entry));
      if (typeof value === "object" && value !== null) {
        return stringifyReportItem(value);
      }
      return String(value || "").trim();
    })
    .filter(Boolean)
    .join(" — ");
}

export default function ResearchTab({
  campaign,
  researchOutputs = [],
  plan = "free",
}) {
  const router = useRouter();
  const { streamObject } = useTextStream();
  const viewerRef = useRef(null);
  const [results, setResults] = useState({});
  const [localOutputs, setLocalOutputs] = useState(researchOutputs || []);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [selectedSection, setSelectedSection] = useState("market");
  const [direction, setDirection] = useState("");
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [upgradeGate, setUpgradeGate] = useState(null);

  useEffect(() => {
    setLocalOutputs(researchOutputs || []);
  }, [researchOutputs]);

  useEffect(() => {
    if (!selectedSection) return;

    viewerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedSection]);

  const hasText = (value) => String(value || "").trim().length > 0;
  const activeSection = sections.find((s) => s.id === selectedSection);
  const memoryCards = sections.map((section) => {
    const output = findLatestOutputForSection(localOutputs, section.id, {
      includePending: true,
    });

    return {
      icon: section.memoryIcon,
      title: section.title,
      status: output ? getOutputStatus(output) : "Not Generated",
      color:
        String(output?.approval_status || "").toLowerCase() === "approved"
          ? "text-emerald-600 dark:text-emerald-300"
          : output
            ? "text-amber-600 dark:text-amber-300"
            : "text-slate-500 dark:text-white/50",
      svg: section.memoryColor,
      sectionId: section.id,
      output,
    };
  });
  const activeMemoryOutput = findLatestOutputForSection(
    localOutputs,
    selectedSection,
    { includePending: true },
  );
  const activeReportCandidate =
    results[selectedSection] || getResearchReport(activeMemoryOutput);
  const activeReport = isValidReport(activeReportCandidate)
    ? activeReportCandidate
    : null;
  const activeError = errors[selectedSection];
  const isActiveLoading = Boolean(loading[selectedSection]);
  const hasCampaignContext =
    !!campaign &&
    !!activeSection &&
    hasText(campaign.goal) &&
    (hasText(campaign.industry) || hasText(campaign.category)) &&
    (hasText(campaign.audience) || hasText(campaign.target_audience));
  const approvedResearchMemoryCount = (localOutputs || []).filter(
    isApprovedMemoryOutput,
  ).length;
  const validationMessage =
    "Complete campaign goal, audience, and industry/category before generating research.";

  const approveMemoryOutput = (event) => {
    if (!event?.id) return;

    setLocalOutputs((current) =>
      current.map((output) =>
        output.id === event.id && output.source === "campaign_memory_events"
          ? {
              ...output,
              approval_status: "approved",
              metadata: {
                ...output.metadata,
                memoryEvent: {
                  ...(output.metadata?.memoryEvent || {}),
                  ...event,
                },
              },
            }
          : output,
      ),
    );
    router.refresh();
  };

  const generateSection = async (sectionId) => {
    const section = sections.find((item) => item.id === sectionId);
    const featureGate = getFeatureGate({
      plan,
      module: "research",
      feature: sectionId,
    });

    if (!campaign || !section || !hasCampaignContext) return;
    if (!featureGate.allowed) {
      setUpgradeGate(featureGate);
      return;
    }

    const existingOutput = findLatestOutputForSection(localOutputs, sectionId, {
      includePending: true,
    });
    if (existingOutput) {
      const regenerateGate = getActionGate({ plan, action: "regenerate" });
      if (!regenerateGate.allowed) {
        setUpgradeGate(regenerateGate);
        return;
      }
    }

    setLoading((prev) => ({
      ...prev,
      [sectionId]: true,
    }));
    setErrors((prev) => ({
      ...prev,
      [sectionId]: "",
    }));

    try {
      const prompt =
        direction.trim() ||
        `Generate ${section.title} for ${
          campaign.product_name || campaign.name
        } targeting ${
          campaign.audience || campaign.target_audience || "the target audience"
        }.`;

      const response = await fetch("/api/research/generate", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          campaignId: campaign.id,
          section: sectionId,
          prompt,
          regenerate: Boolean(existingOutput),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.message || data.error);
        error.responseData = data;
        throw error;
      }

      setLoading((prev) => ({
        ...prev,
        [sectionId]: false,
      }));
      await streamObject(
        `research:${campaign.id}:${sectionId}`,
        data.researchOutput,
        (streamedReport) => {
          setResults((prev) => ({
            ...prev,
            [sectionId]: streamedReport,
          }));
        },
      );
      setIsReportExpanded(false);
      setLocalOutputs((prev) => [
        normalizeGeneratedOutput(data, sectionId),
        ...prev,
      ]);
      router.refresh();
    } catch (error) {
      const creditLimitMessage = formatCreditLimitMessage(error.responseData);

      setErrors((prev) => ({
        ...prev,
        [sectionId]: creditLimitMessage || getAiErrorMessage(error),
      }));
    } finally {
      setLoading((prev) => ({
        ...prev,
        [sectionId]: false,
      }));
    }
  };

  const activeTitle = activeSection?.title || "";
  const ActiveIcon = activeSection?.icon || Globe;
  const activeReportText = activeReport
    ? formatReportText(activeReport)
    : activeMemoryOutput?.content || "";
  const activeProvider = String(activeReport?.metadata?.provider || "").trim();
  const activeConfidence = Number(activeReport?.metadata?.confidence || 0);
  const activeGeneratedAt = activeReport?.metadata?.generatedAt || "";
  const shouldShowProviderBadge =
    activeProvider && activeProvider.toLowerCase() !== "memory";
  const activeAgentLabel = "Research Agent";
  const shouldShowConfidenceBadge = activeConfidence > 0;
  const shouldShowGeneratedAtBadge =
    shouldShowProviderBadge && Number.isFinite(Date.parse(activeGeneratedAt));

  const copyContent = () => {
    if (!activeReportText) return;
    navigator.clipboard.writeText(activeReportText);
  };

  const downloadPdf = async () => {
    if (!activeReportText) return;
    const gate = getActionGate({ plan, action: "export" });
    if (!gate.allowed) {
      setUpgradeGate(gate);
      return;
    }
    await exportPdf({
      title: activeTitle,
      content: activeReportText,
    });
  };

  function MemoryIcon({ name, color }) {
    const Icon =
      {
        globe: Globe,
        users: Users,
        search: Search,
        "trending-up": TrendingUp,
        "circle-alert": AlertCircle,
        lightbulb: Lightbulb,
      }[name] || Search;

    const colorClass =
      {
        "sky-400": "text-sky-400",
        "violet-400": "text-violet-400",
        "rose-400": "text-rose-400",
        "emerald-400": "text-emerald-400",
        "amber-400": "text-amber-400",
        "yellow-400": "text-yellow-400",
      }[color] || "text-slate-500";

    return <Icon className={`h-4 w-4 ${colorClass}`} />;
  }

  return (
    <div className="space-y-6 bg-slate-50 text-slate-900 dark:bg-dark-bg dark:text-white/90">
      {/* Research Task Selector */}
      <section className="mt-5">
        <div className="mb-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            Research Task
          </span>
          <span className="text-slate-500 dark:text-white/40">
            Pick one to brief
          </span>
        </div>

        <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = selectedSection === section.id;
            const gate = getFeatureGate({
              plan,
              module: "research",
              feature: section.id,
            });

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  if (!gate.allowed) {
                    setUpgradeGate(gate);
                    return;
                  }
                  setSelectedSection(section.id);
                  setIsReportExpanded(false);
                }}
                className={
                  isActive
                    ? "group relative inline-flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
                    : "group relative inline-flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left text-sm text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:border-white/10 dark:hover:bg-white/[0.06] dark:hover:text-white"
                }
              >
                <Icon className={`h-4 w-4 ${section.iconColor}`} />
                <span className="min-w-0 flex-1 truncate">{section.label}</span>
                {!gate.allowed ? (
                  <Lock className="h-3 w-3 text-slate-400 dark:text-white/35" />
                ) : (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-emerald-500/80" : section.dotColor
                    }`}
                    aria-hidden="true"
                  ></span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Grid */}
      <section className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Research Brief Sidebar */}
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-file-text h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
              <path d="M14 2v5a1 1 0 0 0 1 1h5" />
              <path d="M10 9H8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
            </svg>
            Research Brief
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
              <ActiveIcon className={`h-5 w-5 ${activeSection?.iconColor}`} />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-white">
                {activeTitle}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeReport
                      ? String(
                          activeMemoryOutput?.approval_status || "",
                        ).toLowerCase() === "approved"
                        ? "bg-emerald-500/80"
                        : "bg-amber-500/80"
                      : "bg-slate-300 dark:bg-white/15"
                  }`}
                ></span>
                <span className="text-slate-500 dark:text-white/50">
                  {activeMemoryOutput
                    ? getOutputStatus(activeMemoryOutput)
                    : activeReport
                      ? "Pending Review"
                      : "Not Generated"}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-white/60">
            {activeSection?.desc}
          </p>

          <div className="mt-5">
            <label className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
              <span>Direction (optional)</span>
              <span className="text-slate-400 dark:text-white/30">
                {direction.length}/500
              </span>
            </label>
            <textarea
              placeholder="Steer the agent: angle, hypothesis, specific question to test…"
              rows={4}
              maxLength={500}
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#3B3CFF]/50 focus:outline-none focus:ring-2 focus:ring-[#3B3CFF]/20 dark:border-white/10 dark:bg-dark-bg dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/30 dark:focus:ring-0 custom-scrollbar"
            />
          </div>

          <button
            type="button"
            disabled={!hasCampaignContext || loading[selectedSection]}
            onClick={() => generateSection(selectedSection)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600  px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-primary-500 disabled:text-slate-200    dark:disabled:text-white/40"
          >
            {loading[selectedSection] ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading[selectedSection] ? "Generating..." : "Generate Research"}
          </button>

          {!hasCampaignContext && (
            <p className="mt-3 text-[11px] leading-relaxed text-amber-600 dark:text-amber-300">
              {validationMessage}
            </p>
          )}

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-white/40">
            <span className="mt-[3px] h-1 w-1 flex-none rounded-full bg-slate-400 dark:bg-white/30"></span>
            Uses Campaign Context + Approved Memory. Prompt is optional.
          </p>

          <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-slate-500 dark:text-white/45">
            <div>Uses:</div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" />
              Campaign Goal
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" />
              Campaign Audience
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" />
              Campaign Industry/Category
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" />
              Approved Research Memory, if available
            </div>
            <div>Approved Research Memory: {approvedResearchMemoryCount}</div>
          </div>
        </aside>

        {/* Research Report */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          {isActiveLoading ? (
            <div
              ref={viewerRef}
              className="flex h-[520px] flex-col items-center justify-center px-8 py-16 text-center"
            >
              <Loader2 className="h-7 w-7 animate-spin text-primary-600 dark:text-white" />
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                Generating {activeSection?.label.toLowerCase()} research
              </h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-white/50">
                The agent is using campaign context and approved memory to
                produce a structured report.
              </p>
            </div>
          ) : activeError ? (
            <div
              ref={viewerRef}
              className="flex h-[520px] flex-col items-center justify-center px-8 py-16 text-center "
            >
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-400/20 dark:bg-rose-400/10">
                <AlertCircle className="h-7 w-7 text-rose-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                Research generation failed
              </h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-white/50">
                {activeError}
              </p>
            </div>
          ) : activeReport ? (
            <div ref={viewerRef} className="flex max-h-[640px] flex-col p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
                    <ActiveIcon
                      className={`h-3.5 w-3.5 ${activeSection?.iconColor}`}
                    />
                    Research Report
                  </div>
                  {hasContent(activeReport.title) && (
                    <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {activeReport.title}
                    </h3>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-white/40">
                    {shouldShowProviderBadge && (
                      <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                        {activeAgentLabel}
                      </span>
                    )}
                    {shouldShowConfidenceBadge && (
                      <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                        Confidence {Math.round(activeConfidence * 100)}%
                      </span>
                    )}
                    {shouldShowGeneratedAtBadge && (
                      <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                        {new Date(activeGeneratedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyContent}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    title="Copy report"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={downloadPdf}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    title="Download PDF"
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
                {hasContent(activeReport.summary) && (
                  <section>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Summary
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                      {activeReport.summary}
                    </p>
                  </section>
                )}

                <ReportList title="Insights" items={activeReport.insights} />
                <ReportList
                  title="Recommendations"
                  items={activeReport.recommendations}
                />
                <ReportList title="Risks" items={activeReport.risks} />
                <ReportList
                  title="Next Actions"
                  items={activeReport.nextActions}
                />

                {!activeReport.summary && activeReport.content && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{activeReport.content}</ReactMarkdown>
                  </div>
                )}
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
            <div
              ref={viewerRef}
              className="flex h-[520px] flex-col items-center justify-center px-8 py-16 text-center"
            >
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <ActiveIcon className={`h-7 w-7 ${activeSection?.iconColor}`} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                No {activeSection?.label.toLowerCase()} research yet
              </h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-white/50">
                Brief the agent on the left, then run{" "}
                <span className="text-slate-900 dark:text-white/80">
                  Generate Research
                </span>{" "}
                to produce a structured report grounded in this campaign&apos;s
                context.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-white/40">
                <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                  Summary
                </span>
                <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                  Insights
                </span>
                <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                  Recommendations
                </span>
                <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                  Risks
                </span>
                <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                  Next Actions
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Research Memory */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-brain h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="M12 18V5" />
                <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
                <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
                <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
                <path d="M18 18a4 4 0 0 0 2-7.464" />
                <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
                <path d="M6 18a4 4 0 0 1-2-7.464" />
                <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
              </svg>
              Research Memory
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-white/50">
              Per-type status across this campaign. Approved research feeds
              downstream tabs.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {memoryCards.map((item) => {
            const canApprove =
              item.output?.source === "campaign_memory_events" &&
              String(item.output?.approval_status || "").toLowerCase() ===
                "pending";

            return (
              <div
                key={item.sectionId}
                className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/15 dark:hover:bg-white/[0.04]"
              >
                <button
                  type="button"
                  onClick={() => {
                    const gate = getFeatureGate({
                      plan,
                      module: "research",
                      feature: item.sectionId,
                    });

                    if (!gate.allowed) {
                      setUpgradeGate(gate);
                      return;
                    }

                    setSelectedSection(item.sectionId);
                    setIsReportExpanded(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                    <MemoryIcon name={item.icon} color={item.svg} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className={`text-[11px] ${item.color}`}>
                      {item.status}
                    </div>
                  </div>
                </button>
                {canApprove ? (
                  <MemoryApprovalButton
                    campaignId={campaign.id}
                    eventId={item.output.id}
                    onApproved={approveMemoryOutput}
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-chevron-right h-4 w-4 flex-none text-slate-400 transition group-hover:text-slate-600 dark:text-white/30 dark:group-hover:text-white/60"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <UpgradeModal gate={upgradeGate} onClose={() => setUpgradeGate(null)} />
    </div>
  );
}
