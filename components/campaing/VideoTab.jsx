"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clapperboard,
  Copy,
  Download,
  FileText,
  Film,
  Loader2,
  Lock,
  PackageCheck,
  Sparkles,
  Video,
  Youtube,
} from "lucide-react";

import { getAiErrorMessage } from "@/app/lib/utils/aiErrorMessage";
import { exportPdf } from "@/app/lib/export/exportPdf";
import { useTextStream } from "@/app/lib/context/TextStreamContext";
import UpgradeModal from "@/components/campaing/UpgradeModal";
import { getActionGate, getFeatureGate } from "@/app/lib/plans/planPolicy";

const VIDEO_TASKS = [
  {
    id: "video_script",
    label: "Video Script",
    title: "Video Script",
    icon: FileText,
    enabled: true,
    iconColor: "text-emerald-500 dark:text-emerald-400",
    description:
      "Create a campaign-aware narrative script with hook, scenes, voiceover, on-screen text, and CTA.",
  },
  {
    id: "storyboard",
    label: "Storyboard",
    title: "Storyboard",
    icon: Clapperboard,
    enabled: true,
    iconColor: "text-sky-500 dark:text-sky-400",
    description:
      "Create visual scene planning with composition, action, timing, transitions, and production notes.",
  },
  {
    id: "reel_package",
    label: "Reel Package",
    title: "Reel Package",
    icon: Film,
    enabled: false,
    iconColor: "text-pink-500 dark:text-pink-400",
  },
  {
    id: "tiktok_video",
    label: "TikTok Video",
    title: "TikTok Video",
    icon: Video,
    enabled: false,
    iconColor: "text-violet-500 dark:text-violet-400",
  },
  {
    id: "youtube_short",
    label: "YouTube Short",
    title: "YouTube Short",
    icon: Youtube,
    enabled: false,
    iconColor: "text-rose-500 dark:text-rose-400",
  },
  {
    id: "campaign_package",
    label: "Campaign Package",
    title: "Campaign Video Package",
    icon: PackageCheck,
    enabled: false,
    iconColor: "text-amber-500 dark:text-amber-400",
  },
];

export default function VideoTab({ campaign, videos = [], plan = "free" }) {
  const searchParams = useSearchParams();
  const { streamObject } = useTextStream();
  const requestedTask = normalizeTask(searchParams.get("videoTask"));
  const [selectedTask, setSelectedTask] = useState(requestedTask);
  const [localOutputs, setLocalOutputs] = useState(videos || []);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [goal, setGoal] = useState(campaign?.goal || "");
  const [audience, setAudience] = useState(
    campaign?.audience || campaign?.target_audience || "",
  );
  const [platform, setPlatform] = useState("Instagram");
  const [cta, setCta] = useState("");
  const [duration, setDuration] = useState("30 seconds");
  const [visualStyle, setVisualStyle] = useState("");
  const [direction, setDirection] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [upgradeGate, setUpgradeGate] = useState(null);

  useEffect(() => setLocalOutputs(videos || []), [videos]);
  useEffect(() => setSelectedTask(requestedTask), [requestedTask]);
  useEffect(() => {
    setExpanded(false);
    setCopied(false);
  }, [selectedTask]);

  const activeTask =
    VIDEO_TASKS.find((task) => task.id === selectedTask) || VIDEO_TASKS[0];
  const ActiveIcon = activeTask.icon;
  const latestByTask = useMemo(() => {
    const map = {};
    for (const output of localOutputs) {
      const task = normalizeTask(output.type || output.videoOutput?.type);
      if (!map[task]) map[task] = output;
    }
    return map;
  }, [localOutputs]);
  const storedOutput = latestByTask[selectedTask];
  const activeReport =
    results[selectedTask] || extractVideoReport(storedOutput);
  const activeError = errors[selectedTask] || "";
  const isLoading = !!loading[selectedTask];
  const hasContext =
    !!campaign?.id && hasText(goal) && hasText(audience) && activeTask.enabled;
  const activeText = activeReport ? formatVideoText(activeReport) : "";

  const generate = async () => {
    if (!hasContext || isLoading) return;
    const featureGate = getFeatureGate({
      plan,
      module: "video",
      feature: selectedTask,
    });

    if (!featureGate.allowed) {
      setUpgradeGate(featureGate);
      return;
    }

    if (storedOutput) {
      const regenerateGate = getActionGate({ plan, action: "regenerate" });
      if (!regenerateGate.allowed) {
        setUpgradeGate(regenerateGate);
        return;
      }
    }

    setLoading((current) => ({ ...current, [selectedTask]: true }));
    setErrors((current) => ({ ...current, [selectedTask]: "" }));

    try {
      const response = await fetch("/api/video/planning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          task: selectedTask,
          goal,
          audience,
          platform,
          cta,
          duration,
          visualStyle,
          direction,
          regenerate: Boolean(storedOutput),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed.");

      const output = {
        ...(data.output || {}),
        id:
          data.memory?.event?.id ||
          data.output?.id ||
          `video-${selectedTask}-${Date.now()}`,
        module: "video",
        type: selectedTask,
        videoOutput: data.videoOutput,
        approval_status: "pending",
        risk_level: "medium",
        created_at:
          data.videoOutput?.metadata?.generatedAt || new Date().toISOString(),
      };
      setLoading((current) => ({
        ...current,
        [selectedTask]: false,
      }));
      await streamObject(
        `video:${campaign.id}:${selectedTask}`,
        data.videoOutput,
        (streamedOutput) => {
          setResults((current) => ({
            ...current,
            [selectedTask]: streamedOutput,
          }));
        },
      );
      setLocalOutputs((current) => [
        output,
        ...current.filter(
          (item) =>
            normalizeTask(item.type || item.videoOutput?.type) !== selectedTask,
        ),
      ]);
      setDirection("");
      setExpanded(false);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [selectedTask]: getAiErrorMessage(error),
      }));
    } finally {
      setLoading((current) => ({ ...current, [selectedTask]: false }));
    }
  };

  const copyOutput = async () => {
    if (!activeText) return;
    await navigator.clipboard.writeText(activeText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadPdf = () => {
    if (!activeText) return;
    const gate = getActionGate({ plan, action: "export" });
    if (!gate.allowed) {
      setUpgradeGate(gate);
      return;
    }
    exportPdf(activeReport.title || activeTask.title, activeText);
  };

  return (
    <div className="space-y-6 bg-slate-50 text-slate-900 dark:bg-dark-bg dark:text-white/90">
      <section className="mt-5">
        <div className="mb-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            Video Task
          </span>
          <span className="text-slate-500 dark:text-white/40">
            Pick one to brief
          </span>
        </div>
        <div className="grid  gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none grid-cols-2 lg:grid-cols-3">
          {VIDEO_TASKS.map((task) => {
            const Icon = task.icon;
            const selected = task.id === selectedTask;
            const generated = !!latestByTask[task.id];
            const gate = getFeatureGate({
              plan,
              module: "video",
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
                  selected
                    ? "inline-flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-left text-sm font-medium dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
                    : "inline-flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/[0.06]"
                }
              >
                <Icon className={`h-4 w-4 ${task.iconColor}`} />
                <span className="min-w-0 flex-1 truncate">{task.label}</span>
                {!gate.allowed ? (
                  <Lock className="h-3 w-3 text-slate-400 dark:text-white/35" />
                ) : !task.enabled ? (
                  <span className="rounded border border-amber-300/40 px-1.5 py-0.5 text-[9px] text-amber-600 dark:text-amber-300">
                    Phase 2
                  </span>
                ) : (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      generated
                        ? "bg-amber-500"
                        : "bg-slate-300 dark:bg-white/15"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            <FileText className="h-3.5 w-3.5" />
            Video Brief
          </div>
          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
              <ActiveIcon className={`h-5 w-5 ${activeTask.iconColor}`} />
            </div>
            <div>
              <div className="font-semibold dark:text-white">
                {activeTask.title}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-white/45">
                {!activeTask.enabled
                  ? "Phase 2 · Coming Soon"
                  : storedOutput
                    ? getStatus(storedOutput)
                    : activeReport
                      ? "Pending Review"
                      : "Not Generated"}
              </div>
            </div>
          </div>
          {!activeTask.enabled ? (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              Final video generation is reserved for Phase 2. The task contract
              is visible now, but no generation call is made.
            </div>
          ) : (
            <>
              <div className="mt-5 space-y-3">
                <Field label="Goal" value={goal} onChange={setGoal} />
                <Field
                  label="Audience"
                  value={audience}
                  onChange={setAudience}
                />
                <SelectField
                  label="Platform"
                  value={platform}
                  onChange={setPlatform}
                  options={["Instagram", "TikTok", "YouTube", "LinkedIn"]}
                />
                {selectedTask === "storyboard" && (
                  <Field
                    label="Visual Style"
                    value={visualStyle}
                    onChange={setVisualStyle}
                    placeholder="Editorial, cinematic, product-led..."
                  />
                )}
                <Field label="CTA" value={cta} onChange={setCta} />
                <SelectField
                  label="Duration"
                  value={duration}
                  onChange={setDuration}
                  options={[
                    "15 seconds",
                    "30 seconds",
                    "45 seconds",
                    "60 seconds",
                  ]}
                />
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-500 dark:text-white/50">
                    Direction (optional)
                  </span>
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={direction}
                    onChange={(event) => setDirection(event.target.value)}
                    className="custom-scrollbar w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-dark-bg dark:text-white"
                    placeholder="Angle, opening hook, scene constraints..."
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={generate}
                disabled={!hasContext || isLoading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isLoading ? "Generating..." : `Generate ${activeTask.label}`}
              </button>
            </>
          )}
        </aside>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          {isLoading ? (
            <State
              icon={Loader2}
              iconClass="animate-spin text-primary-600"
              title={`Generating ${activeTask.label}`}
              description="Building a campaign-aware video plan from approved context."
            />
          ) : activeError ? (
            <State
              icon={AlertCircle}
              iconClass="text-rose-500"
              title="Video planning failed"
              description={activeError}
            />
          ) : activeReport ? (
            <div className="flex max-h-[640px] flex-col p-6">
              <div className="border-b border-slate-200 pb-4 dark:border-white/10">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
                  <ActiveIcon
                    className={`h-3.5 w-3.5 ${activeTask.iconColor}`}
                  />
                  Video Output
                </div>
                {hasText(activeReport.title) && (
                  <h3 className="mt-2 text-xl font-semibold dark:text-white">
                    {activeReport.title}
                  </h3>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                    Pending Review
                  </span>
                  <button
                    type="button"
                    onClick={copyOutput}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10"
                    title="Copy output"
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
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                className={`mt-5 space-y-4 pr-1 ${
                  expanded
                    ? "custom-scrollbar max-h-[440px] overflow-y-auto"
                    : "max-h-[300px] overflow-hidden"
                }`}
              >
                <OutputBlock title="Summary">
                  {activeReport.summary}
                </OutputBlock>
                {activeReport.hook && (
                  <OutputBlock title="Hook">{activeReport.hook}</OutputBlock>
                )}
                {activeReport.visualStyle && (
                  <OutputBlock title="Visual Style">
                    {activeReport.visualStyle}
                  </OutputBlock>
                )}
                {getRenderableScenes(activeReport.scenes).map(
                  (scene, index) => (
                    <SceneCard key={scene.scene || index} scene={scene} />
                  ),
                )}
                {activeReport.cta && (
                  <OutputBlock title="CTA">{activeReport.cta}</OutputBlock>
                )}
              </div>
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {expanded ? "Show less" : "Show more"}
                </button>
              </div>
            </div>
          ) : (
            <State
              icon={ActiveIcon}
              iconClass={activeTask.iconColor}
              title={
                activeTask.enabled
                  ? `No ${activeTask.label.toLowerCase()} yet`
                  : `${activeTask.label} is coming in Phase 2`
              }
              description={
                activeTask.enabled
                  ? "Complete the brief and generate a structured video planning output."
                  : "The contract is reserved, but final video generation remains disabled."
              }
            />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40 flex gap-2">
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
          <span>Video Memory</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEO_TASKS.map((task) => {
            const Icon = task.icon;
            const output = latestByTask[task.id];
            const gate = getFeatureGate({
              plan,
              module: "video",
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
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left dark:border-white/5 dark:bg-white/[0.02]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className={`h-4 w-4 ${task.iconColor}`} />
                  <div>
                    <div className="text-sm dark:text-white">{task.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-white/45">
                      {!task.enabled
                        ? "Phase 2 · Coming Soon"
                        : output
                          ? getStatus(output)
                          : "Not Generated"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            );
          })}
        </div>
      </section>
      <UpgradeModal gate={upgradeGate} onClose={() => setUpgradeGate(null)} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-slate-500 dark:text-white/50">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-dark-bg dark:text-white"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-slate-500 dark:text-white/50">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-dark-bg dark:text-white"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function State({ icon: Icon, iconClass, title, description }) {
  return (
    <div className="flex h-[520px] flex-col items-center justify-center px-8 text-center">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <Icon className={`h-7 w-7 ${iconClass}`} />
      </div>
      <h3 className="mt-4 font-semibold dark:text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-white/50">
        {description}
      </p>
    </div>
  );
}

function OutputBlock({ title, children }) {
  if (!hasRenderableContent(children)) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h4 className="text-sm font-semibold dark:text-white">{title}</h4>
      <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/60">
        {children}
      </div>
    </section>
  );
}

function SceneCard({ scene }) {
  if (!hasRenderableScene(scene)) return null;

  return (
    <OutputBlock title={`Scene ${scene.scene}`}>
      <div className="space-y-2">
        {scene.duration && (
          <p>
            <strong>Duration:</strong> {scene.duration}
          </p>
        )}
        {scene.visual && (
          <p>
            <strong>Visual:</strong> {scene.visual}
          </p>
        )}
        {scene.voiceover && (
          <p>
            <strong>Voiceover:</strong> {scene.voiceover}
          </p>
        )}
        {scene.onScreenText && (
          <p>
            <strong>On-screen text:</strong> {scene.onScreenText}
          </p>
        )}
      </div>
    </OutputBlock>
  );
}

function hasRenderableContent(value) {
  if (typeof value === "string") return hasText(value);
  if (Array.isArray(value)) return value.some(hasRenderableContent);
  if (!value || typeof value !== "object") return Boolean(value);
  return true;
}

function hasRenderableScene(scene) {
  if (!scene || typeof scene !== "object") return false;
  return [
    scene.heading,
    scene.visual,
    scene.voiceover,
    scene.onScreenText,
    scene.duration,
    scene.transition,
    scene.productionNote,
  ].some(hasText);
}

function getRenderableScenes(scenes) {
  return Array.isArray(scenes) ? scenes.filter(hasRenderableScene) : [];
}

function extractVideoReport(output) {
  if (!output) return null;
  const report = output.videoOutput || output.metadata?.memoryEvent?.payload;
  if (!report) return null;
  return {
    ...report,
    type: normalizeTask(report.type || output.type),
    title: report.title || output.title || "Video Plan",
    summary: report.summary || "",
    hook: report.hook || "",
    visualStyle: report.visualStyle || report.visual_style || "",
    scenes: Array.isArray(report.scenes) ? report.scenes : [],
    cta: report.cta || "",
    metadata: report.metadata || {},
  };
}

function normalizeTask(value) {
  const task = String(value || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const aliases = {
    script: "video_script",
    video_scripts: "video_script",
    storyboards: "storyboard",
    reel: "reel_package",
    reels: "reel_package",
    tiktok: "tiktok_video",
    youtube_shorts: "youtube_short",
  };
  const normalized = aliases[task] || task;
  return VIDEO_TASKS.some((item) => item.id === normalized)
    ? normalized
    : "video_script";
}

function getStatus(output) {
  const status = String(output.approval_status || "pending").toLowerCase();
  return status === "approved" ? "Approved" : "Pending Review";
}

function formatVideoText(report) {
  return [
    `# ${report.title}`,
    "",
    "## Summary",
    report.summary,
    report.hook ? `\n## Hook\n${report.hook}` : "",
    report.visualStyle ? `\n## Visual Style\n${report.visualStyle}` : "",
    "",
    "## Scenes",
    ...report.scenes.flatMap((scene) => [
      `### Scene ${scene.scene}`,
      scene.duration ? `Duration: ${scene.duration}` : "",
      scene.visual ? `Visual: ${scene.visual}` : "",
      scene.voiceover ? `Voiceover: ${scene.voiceover}` : "",
      scene.onScreenText ? `On-screen text: ${scene.onScreenText}` : "",
      "",
    ]),
    report.cta ? `## CTA\n${report.cta}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}
