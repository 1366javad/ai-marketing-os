"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Image as ImageIcon,
  Layers,
  Loader2,
  Megaphone,
  Monitor,
  PenLine,
  Package,
  Palette,
  Quote,
  Send,
  Sparkle,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";

import { getAiErrorMessage } from "@/app/lib/utils/aiErrorMessage";
import { exportPdf } from "@/app/lib/export/exportPdf";
import { useTextStream } from "@/app/lib/context/TextStreamContext";

const creativeTasks = [
  {
    id: "image_post",
    title: "Image Post",
    label: "Image Post",
    icon: ImageIcon,
    desc: "Create one campaign-ready Creative Specification, caption, CTA, and reviewed image asset.",
    iconColor: "text-sky-600 dark:text-sky-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
  },
  {
    id: "carousel",
    title: "Carousel",
    label: "Carousel",
    icon: Layers,
    desc: "Plan a multi-slide creative concept with clear visual hierarchy.",
    iconColor: "text-violet-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
  },
  {
    id: "ad_creative",
    title: "Ad Creative",
    label: "Ad Creative",
    icon: Megaphone,
    desc: "Create a conversion-focused visual concept with offer framing and CTA.",
    iconColor: "text-rose-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
  },
  {
    id: "banner",
    title: "Banner",
    label: "Banner",
    icon: Monitor,
    desc: "Generate a banner concept with headline hierarchy and campaign message.",
    iconColor: "text-emerald-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
  },
  {
    id: "product_mockup",
    title: "Product Mockup",
    label: "Product Mockup",
    icon: Package,
    desc: "Create a polished product presentation or use-case mockup.",
    iconColor: "text-amber-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
  },
  {
    id: "campaign_package",
    title: "Campaign Package",
    label: "Campaign Package",
    icon: Sparkles,
    desc: "Generate a unified creative direction for multiple campaign assets.",
    iconColor: "text-fuchsia-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
  },
];

const taskAliases = {
  image: "image_post",
  post: "image_post",
  image_post: "image_post",
  carousel: "carousel",
  ad: "ad_creative",
  ad_creative: "ad_creative",
  banner: "banner",
  product: "product_mockup",
  product_mockup: "product_mockup",
  package: "campaign_package",
  campaign_package: "campaign_package",
};

const platforms = ["Instagram", "LinkedIn", "Facebook", "Website", "Display"];
const tones = ["Professional", "Bold", "Warm", "Premium", "Playful"];

function getTaskId(task) {
  const normalized = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return taskAliases[normalized] || normalized;
}

function getOutputTaskId(output) {
  return getTaskId(
    output?.task ||
      output?.type ||
      output?.creativeOutput?.type ||
      output?.metadata?.memoryEvent?.task ||
      output?.metadata?.memoryEvent?.payload?.type,
  );
}

function isApprovedMemoryOutput(output) {
  const status = String(
    output?.approval_status || output?.approvalStatus || "pending",
  ).toLowerCase();

  return (
    status === "approved" || status === "auto_saved" || status === "pending"
  );
}

function findLatestOutputForTask(outputs, taskId, options = {}) {
  const includePending = options.includePending ?? true;

  return (outputs || []).find((output) => {
    if (getOutputTaskId(output) !== taskId) return false;
    if (includePending) return true;
    return isApprovedMemoryOutput(output);
  });
}

function getCreativeReport(output) {
  const report =
    output?.creativeOutput || output?.metadata?.memoryEvent?.payload;

  if (!report) return null;
  const specification = report.specification || {};
  const visualDirection = report.visualDirection || specification || {};
  const scene = visualDirection.scene || {};

  return {
    ...report,
    specification: visualDirection,
    visualDirection,
    visualGoal:
      report.visualGoal ||
      report.strategy?.visualGoal ||
      report.strategy?.marketingAngle ||
      "",
    subject: report.subject || scene.primarySubject || "",
    environment: report.environment || scene.setting || "",
    hero: report.hero || visualDirection.hero || "",
    props: report.props || visualDirection.props || [],
    state: report.state || visualDirection.state || {},
    complexity: report.complexity || visualDirection.complexity || "",
    brand: report.brand || visualDirection.brand || {},
    emotion: report.emotion || visualDirection.mood || "",
    composition:
      report.composition ||
      [
        visualDirection.camera?.angle,
        visualDirection.camera?.shot,
        visualDirection.camera?.focus,
      ]
        .filter(Boolean)
        .join(" / "),
    lighting:
      report.lighting ||
      [visualDirection.lighting?.type, visualDirection.lighting?.accent]
        .filter(Boolean)
        .join(" / "),
    style:
      report.style ||
      `Complexity: ${visualDirection.complexity || "not specified"}; Hero: ${
        visualDirection.hero || "not specified"
      }`,
    content: report.content || output?.content || "",
  };
}

function isValidReport(report) {
  return Boolean(
    hasText(report?.concept) ||
    hasText(report?.imagePrompt) ||
    hasText(report?.caption) ||
    hasText(report?.designDirection) ||
    (Array.isArray(report?.visualNotes) && report.visualNotes.length > 0) ||
    hasText(report?.asset?.imageUrl) ||
    hasText(report?.content),
  );
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

function getOutputStatus(output) {
  const status = String(output?.approval_status || "pending").toLowerCase();
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

function normalizeGeneratedOutput(data, taskId) {
  const createdAt = new Date().toISOString();
  const event = data?.memory?.event;
  const output = data?.output || {};
  const creativeOutput = data?.creativeOutput || output || {};

  return {
    id: event?.id || output.id || `${taskId}-${Date.now()}`,
    source: data?.memory?.storage || "local",
    module: "creative",
    type: data?.executionPlan?.task || taskId,
    title: creativeOutput.title || output.title || "Creative Concept",
    prompt: output.prompt || "",
    content:
      creativeOutput.asset?.imageUrl ||
      output.content ||
      creativeOutput.content ||
      "",
    creativeOutput,
    approval_status:
      event?.approval_status || output.approval_status || "pending",
    confidence:
      event?.confidence ||
      data?.quality?.score ||
      creativeOutput.metadata?.confidence ||
      0,
    risk_level: event?.risk_level || data?.quality?.riskLevel || "medium",
    created_at: event?.created_at || output.created_at || createdAt,
    metadata: output.metadata || creativeOutput.metadata || {},
  };
}

function stringifyItem(item) {
  if (typeof item === "string") return item.trim();
  if (item == null) return "";
  if (typeof item !== "object") return String(item).trim();

  return Object.values(item)
    .flatMap((value) => {
      if (Array.isArray(value))
        return value.map((entry) => stringifyItem(entry));
      if (value && typeof value === "object") return stringifyItem(value);
      return String(value || "").trim();
    })
    .filter(Boolean)
    .join(" - ");
}

function formatCreativeText(report) {
  return [
    `# ${report.title || "Creative Concept"}`,
    "",
    "## Concept",
    report.concept || "",
    "",
    "## Visual Goal",
    report.visualGoal || "",
    "",
    "## Subject",
    report.subject || "",
    "",
    "## Environment",
    report.environment || "",
    "",
    "## Hero",
    report.hero || "",
    "",
    "## Props",
    ...(Array.isArray(report.props)
      ? report.props.map((item) => `- ${stringifyItem(item)}`)
      : []),
    "",
    "## Visible State",
    ...Object.entries(report.state || {}).map(
      ([key, value]) => `- ${titleCase(key)}: ${value}`,
    ),
    "",
    "## Complexity",
    report.complexity || "",
    "",
    "## Emotion",
    report.emotion || "",
    "",
    "## Composition",
    report.composition || "",
    "",
    "## Lighting",
    report.lighting || "",
    "",
    "## Style",
    report.style || "",
    "",
    "## Image Prompt",
    report.imagePrompt || "",
    "",
    "## Image Review",
    report.review?.score ? `Score: ${report.review.score}` : "",
    report.review?.mode ? `Mode: ${report.review.mode}` : "",
    "",
    "## Caption",
    report.caption || "",
    "",
    "## Design Direction",
    report.designDirection || "",
    "",
    "## Visual Notes",
    ...(Array.isArray(report.visualNotes)
      ? report.visualNotes.map((item) => `- ${stringifyItem(item)}`)
      : []),
    "",
    "## CTA",
    report.cta || "",
  ]
    .join("\n")
    .trim();
}

function ReportBlock({
  title,
  icon: Icon = Sparkle,
  iconColor = "text-violet-400",
  children,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-white/70">
          {title}
        </h4>
      </div>
      <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
        {children || (
          <span className="text-slate-500 dark:text-white/40">
            No {title.toLowerCase()} available.
          </span>
        )}
      </div>
    </section>
  );
}

export default function CreativeTab({ campaign, creatives = [] }) {
  const router = useRouter();
  const { streamObject } = useTextStream();
  const searchParams = useSearchParams();
  const viewerRef = useRef(null);
  const initialTask =
    getTaskId(searchParams.get("creativeTask")) || "image_post";
  const [localOutputs, setLocalOutputs] = useState(creatives || []);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [selectedTask, setSelectedTask] = useState(
    creativeTasks.some((task) => task.id === initialTask)
      ? initialTask
      : "image_post",
  );
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Professional");
  const [visualDirection, setVisualDirection] = useState("");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);

  useEffect(() => {
    setLocalOutputs(creatives || []);
  }, [creatives]);

  useEffect(() => {
    viewerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setIsOutputExpanded(false);
  }, [selectedTask]);

  const activeTask = creativeTasks.find((task) => task.id === selectedTask);
  const ActiveIcon = activeTask?.icon || ImageIcon;
  const activeOutput = findLatestOutputForTask(localOutputs, selectedTask);
  const activeReportCandidate =
    results[selectedTask] || getCreativeReport(activeOutput);
  const activeReport = isValidReport(activeReportCandidate)
    ? activeReportCandidate
    : null;
  const activeError = errors[selectedTask] || "";
  const isActiveLoading = Boolean(loading[selectedTask]);
  const hasCampaignContext =
    !!campaign &&
    !!activeTask &&
    (hasText(campaign.product_name) || hasText(campaign.name)) &&
    (hasText(campaign.audience) || hasText(campaign.target_audience));
  const validationMessage =
    "Complete campaign audience and offer/name before generating creative.";
  const memoryCards = creativeTasks.map((task) => {
    const output = findLatestOutputForTask(localOutputs, task.id);

    return {
      ...task,
      status: output ? getOutputStatus(output) : "Not Generated",
      statusColor:
        String(output?.approval_status || "").toLowerCase() === "approved"
          ? "text-emerald-600 dark:text-emerald-300"
          : output
            ? "text-amber-600 dark:text-amber-300"
            : "text-slate-500 dark:text-white/50",
    };
  });
  const activeProvider = String(activeReport?.metadata?.provider || "").trim();
  const activeConfidence = Number(activeReport?.metadata?.confidence || 0);
  const activeAssetUrl =
    activeReport?.asset?.imageUrl || activeReport?.content || "";
  const activeText = activeReport ? formatCreativeText(activeReport) : "";

  const generateCreative = async (taskId) => {
    if (!campaign || !activeTask || !hasCampaignContext) return;

    setLoading((prev) => ({
      ...prev,
      [taskId]: true,
    }));
    setErrors((prev) => ({
      ...prev,
      [taskId]: "",
    }));

    try {
      const response = await fetch("/api/creative/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          section: taskId,
          platform,
          tone,
          visualDirection,
          prompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error);
      }

      setLoading((prev) => ({
        ...prev,
        [taskId]: false,
      }));
      await streamObject(
        `creative:${campaign.id}:${taskId}`,
        data.creativeOutput,
        (streamedOutput) => {
          setResults((prev) => ({
            ...prev,
            [taskId]: streamedOutput,
          }));
        },
      );
      setIsOutputExpanded(false);
      setLocalOutputs((prev) => [
        normalizeGeneratedOutput(data, taskId),
        ...prev,
      ]);
      router.refresh();
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [taskId]: getAiErrorMessage(error),
      }));
    } finally {
      setLoading((prev) => ({
        ...prev,
        [taskId]: false,
      }));
    }
  };

  const copyOutput = () => {
    if (!activeText) return;
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPdf = () => {
    if (!activeText) return;
    exportPdf(`${campaign.name}-${activeTask?.title}`, activeText);
  };

  return (
    <div className="space-y-6 bg-slate-50 text-slate-900 dark:bg-dark-bg dark:text-white/90">
      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            Creative Task
          </span>
          <span className="text-slate-500 dark:text-white/40">
            Pick one to brief
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          {creativeTasks.map((task) => {
            const Icon = task.icon;
            const isActive = selectedTask === task.id;

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedTask(task.id)}
                className={
                  isActive
                    ? "group relative inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
                    : "group relative inline-flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:border-white/10 dark:hover:bg-white/[0.06] dark:hover:text-white"
                }
              >
                <Icon className={`h-4 w-4 ${task.iconColor}`} />
                <span>{task.label}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? "bg-emerald-500/80" : task.dotColor
                  }`}
                  aria-hidden="true"
                ></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            <ImageIcon className="h-3.5 w-3.5" />
            Creative Brief
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
              <ActiveIcon className={`h-5 w-5 ${activeTask?.iconColor}`} />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-white">
                {activeTask?.title}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeReport
                      ? String(
                            activeOutput?.approval_status || "",
                          ).toLowerCase() === "approved"
                        ? "bg-emerald-500/80"
                        : "bg-amber-500/80"
                      : "bg-slate-300 dark:bg-white/15"
                  }`}
                ></span>
                <span className="text-slate-500 dark:text-white/50">
                  {activeOutput
                    ? getOutputStatus(activeOutput)
                    : activeReport
                      ? "Pending Review"
                      : "Not Generated"}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-white/60">
            {activeTask?.desc}
          </p>

          <div className="mt-5 space-y-3">
            <label className="block text-xs text-slate-500 dark:text-white/50">
              Platform
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#3B3CFF]/50 focus:outline-none focus:ring-2 focus:ring-[#3B3CFF]/20 dark:border-white/10 dark:bg-dark-bg dark:text-white"
              >
                {platforms.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-slate-500 dark:text-white/50">
              Tone
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#3B3CFF]/50 focus:outline-none focus:ring-2 focus:ring-[#3B3CFF]/20 dark:border-white/10 dark:bg-dark-bg dark:text-white"
              >
                {tones.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-slate-500 dark:text-white/50">
              Visual Direction
              <input
                value={visualDirection}
                onChange={(event) => setVisualDirection(event.target.value)}
                placeholder="Clean SaaS, bold editorial, premium product..."
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#3B3CFF]/50 focus:outline-none focus:ring-2 focus:ring-[#3B3CFF]/20 dark:border-white/10 dark:bg-dark-bg dark:text-white dark:placeholder:text-white/30"
              />
            </label>

            <label className="block text-xs text-slate-500 dark:text-white/50">
              Optional Prompt
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Add angle, layout, audience insight, product detail..."
                rows={4}
                maxLength={500}
                className="custom-scrollbar mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#3B3CFF]/50 focus:outline-none focus:ring-2 focus:ring-[#3B3CFF]/20 dark:border-white/10 dark:bg-dark-bg dark:text-white dark:placeholder:text-white/30"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={!hasCampaignContext || isActiveLoading}
            onClick={() => generateCreative(selectedTask)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-primary-500 disabled:text-slate-200 dark:disabled:text-white/40"
          >
            {isActiveLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isActiveLoading ? "Generating..." : "Generate Creative"}
          </button>

          {!hasCampaignContext && (
            <p className="mt-3 text-[11px] leading-relaxed text-amber-600 dark:text-amber-300">
              {validationMessage}
            </p>
          )}
        </aside>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          {isActiveLoading ? (
            <div
              ref={viewerRef}
              className="flex h-[640px] flex-col items-center justify-center px-8 py-16 text-center"
            >
              <Loader2 className="h-7 w-7 animate-spin text-primary-600 dark:text-white" />
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                Generating {activeTask?.label.toLowerCase()}
              </h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-white/50">
                The agent is creating creative direction and a campaign-ready
                visual asset.
              </p>
            </div>
          ) : activeError ? (
            <div
              ref={viewerRef}
              className="flex h-[640px] flex-col items-center justify-center px-8 py-16 text-center"
            >
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-400/20 dark:bg-rose-400/10">
                <AlertCircle className="h-7 w-7 text-rose-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                Creative generation failed
              </h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-white/50">
                {activeError}
              </p>
            </div>
          ) : activeReport ? (
            <div ref={viewerRef} className="flex max-h-[640px] flex-col p-6">
              <div className="border-b border-slate-200 pb-4 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
                    <ActiveIcon
                      className={`h-3.5 w-3.5 ${activeTask?.iconColor}`}
                    />
                    Creative Output
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {activeReport.title || activeTask?.title}
                  </h3>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-white/40">
                    {activeProvider && activeProvider !== "memory" && (
                      <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 dark:border-white/10">
                        {activeProvider}
                      </span>
                    )}
                    {activeConfidence > 0 && (
                      <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 dark:border-white/10">
                        Confidence {Math.round(activeConfidence * 100)}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={copyOutput}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      title="Copy creative"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
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
              </div>

              <div
                className={`mt-5 min-h-0 pr-1 transition-all ${
                  isOutputExpanded
                    ? "custom-scrollbar max-h-[440px] overflow-y-auto"
                    : "max-h-[300px] overflow-hidden"
                }`}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(210px,0.52fr)_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <ReportBlock
                      title="Creative Concept"
                      icon={Sparkle}
                      iconColor="text-violet-400"
                    >
                      {activeReport.concept}
                    </ReportBlock>
                    <ReportBlock
                      title="Visual Goal"
                      icon={Sparkles}
                      iconColor="text-emerald-400"
                    >
                      {activeReport.visualGoal}
                    </ReportBlock>
                    <ReportBlock
                      title="Subject"
                      icon={UserRound}
                      iconColor="text-cyan-400"
                    >
                      {activeReport.subject}
                    </ReportBlock>
                    <ReportBlock
                      title="Environment"
                      icon={Monitor}
                      iconColor="text-blue-400"
                    >
                      {activeReport.environment}
                    </ReportBlock>
                    <ReportBlock
                      title="Hero"
                      icon={Sparkles}
                      iconColor="text-amber-400"
                    >
                      {activeReport.hero}
                    </ReportBlock>
                    <ReportBlock
                      title="Visible Props"
                      icon={Package}
                      iconColor="text-emerald-400"
                    >
                      {Array.isArray(activeReport.props) &&
                      activeReport.props.length > 0 ? (
                        <ul className="space-y-2">
                          {activeReport.props.map((item, index) => (
                            <li key={index} className="flex gap-2">
                              <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
                              <span>{stringifyItem(item)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </ReportBlock>
                    <ReportBlock
                      title="Visible State"
                      icon={Check}
                      iconColor="text-cyan-400"
                    >
                      {Object.keys(activeReport.state || {}).length > 0 ? (
                        <ul className="space-y-2">
                          {Object.entries(activeReport.state).map(
                            ([key, value]) => (
                              <li key={key}>
                                <span className="font-medium text-slate-800 dark:text-white/80">
                                  {titleCase(key)}:
                                </span>{" "}
                                {String(value)}
                              </li>
                            ),
                          )}
                        </ul>
                      ) : null}
                    </ReportBlock>
                    <ReportBlock
                      title="Emotion"
                      icon={Sparkle}
                      iconColor="text-pink-400"
                    >
                      {activeReport.emotion}
                    </ReportBlock>
                    <ReportBlock
                      title="Visual Direction"
                      icon={Palette}
                      iconColor="text-fuchsia-400"
                    >
                      {activeReport.designDirection}
                    </ReportBlock>
                    <ReportBlock
                      title="Headline"
                      icon={PenLine}
                      iconColor="text-sky-400"
                    >
                      {activeReport.title || activeTask?.title}
                    </ReportBlock>
                    <ReportBlock
                      title="Caption"
                      icon={Quote}
                      iconColor="text-purple-400"
                    >
                      {activeReport.caption}
                    </ReportBlock>
                    <ReportBlock
                      title="CTA"
                      icon={Send}
                      iconColor="text-cyan-400"
                    >
                      {activeReport.cta}
                    </ReportBlock>
                  </div>

                  <div className="space-y-3">
                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="mb-2 flex items-center gap-2">
                        <ImageIcon className="h-3.5 w-3.5 text-sky-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-white/70">
                          Generated Asset
                        </h4>
                        {activeReport.platform ? (
                          <span className="text-xs text-slate-500 dark:text-white/40">
                            ({activeReport.platform})
                          </span>
                        ) : null}
                      </div>
                      {activeAssetUrl ? (
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-dark-bg/70">
                          <Image
                            src={activeAssetUrl}
                            alt={activeReport.title || "Generated creative"}
                            width={1024}
                            height={1024}
                            className="w-full object-contain"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/40">
                          No generated asset available.
                        </div>
                      )}
                    </section>

                    <ReportBlock
                      title="Provider Prompt"
                      icon={ImageIcon}
                      iconColor="text-sky-400"
                    >
                      {activeReport.imagePrompt}
                    </ReportBlock>
                    <ReportBlock
                      title="Image Review"
                      icon={Check}
                      iconColor="text-emerald-400"
                    >
                      {activeReport.review ? (
                        <div className="space-y-1">
                          <div>
                            {activeReport.review.mode === "heuristic"
                              ? "Heuristic Review"
                              : "Review unavailable"}
                          </div>
                          <div className="capitalize">
                            Mode: {activeReport.review.mode || "unknown"}
                          </div>
                          {activeReport.review.limitations?.[0] ? (
                            <div className="text-xs text-amber-600 dark:text-amber-300">
                              {activeReport.review.limitations[0]}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </ReportBlock>
                    <ReportBlock
                      title="Composition"
                      icon={Layers}
                      iconColor="text-indigo-400"
                    >
                      {activeReport.composition}
                    </ReportBlock>
                    <ReportBlock
                      title="Lighting"
                      icon={Sun}
                      iconColor="text-amber-400"
                    >
                      {activeReport.lighting}
                    </ReportBlock>
                    <ReportBlock
                      title="Style"
                      icon={Palette}
                      iconColor="text-fuchsia-400"
                    >
                      {activeReport.style}
                    </ReportBlock>
                    <ReportBlock
                      title="Visual Notes"
                      icon={Palette}
                      iconColor="text-violet-400"
                    >
                      {Array.isArray(activeReport.visualNotes) &&
                      activeReport.visualNotes.length > 0 ? (
                        <ul className="space-y-2">
                          {activeReport.visualNotes.map((item, index) => (
                            <li key={index} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-slate-300 dark:bg-white/20"></span>
                              <span>{stringifyItem(item)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </ReportBlock>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsOutputExpanded((value) => !value)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
                >
                  {isOutputExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {isOutputExpanded ? "Show less" : "Show more"}
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={viewerRef}
              className="flex h-[640px] flex-col items-center justify-center px-8 py-16 text-center"
            >
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <ActiveIcon className={`h-7 w-7 ${activeTask?.iconColor}`} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                No {activeTask?.label.toLowerCase()} yet
              </h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-white/50">
                Brief the agent on the left, then run{" "}
                <span className="text-slate-900 dark:text-white/80">
                  Generate Creative
                </span>{" "}
                to produce creative direction and a campaign-ready asset.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
        <div className="mb-4">
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
            Creative Memory
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-white/50">
            Per-type status across this campaign. Creative concepts can feed ads
            and campaign asset planning.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {memoryCards.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTask(item.id)}
                className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/15 dark:hover:bg-white/[0.04]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                    <Icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className={`text-[11px] ${item.statusColor}`}>
                      {item.status}
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 -rotate-90 flex-none text-slate-400 transition group-hover:text-slate-600 dark:text-white/30 dark:group-hover:text-white/60" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
