"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/app/lib/utils/utils";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { exportDocx } from "@/app/lib/export/exportDocx";
import { useTextStream } from "@/app/lib/context/TextStreamContext";

import {
  FileText,
  Mail,
  Newspaper,
  Globe,
  BookOpen,
  Linkedin,
  Instagram,
  Sparkles,
  Download,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import UpgradeModal from "@/components/campaing/UpgradeModal";
import {
  getActionGate,
  getFeatureGate,
} from "@/app/lib/plans/planPolicy";

const CONTENT_TYPES = [
  {
    id: "blog",
    label: "Blog Post",
    icon: FileText,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    color:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    icon: Newspaper,
    color:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  },
  {
    id: "landing",
    label: "Landing Page",
    icon: Globe,
    color:
      "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  },
  {
    id: "case_study",
    label: "Case Study",
    icon: BookOpen,
    color: "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
  },
  {
    id: "linkedin",
    label: "LinkedIn Post",
    icon: Linkedin,
    color: "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400",
  },
  {
    id: "instagram",
    label: "Instagram Caption",
    icon: Instagram,
    color: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
  },
];

const CONTENT_TYPE_ALIASES = {
  blog: "blog",
  blog_post: "blog",
  email: "email",
  newsletter: "newsletter",
  landing: "landing",
  landing_page: "landing",
  case_study: "case_study",
  linkedin: "linkedin",
  linkedin_post: "linkedin",
  instagram: "instagram",
  instagram_caption: "instagram",
};

function getUiTypeId(type) {
  const normalized = String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return CONTENT_TYPE_ALIASES[normalized] || normalized;
}

function findLatestOutputForType(outputs, typeId) {
  return (outputs || []).find((output) => getUiTypeId(output?.type) === typeId);
}

function getOutputStatus(output) {
  const status = String(output?.approval_status || "auto_saved").toLowerCase();
  const date = formatRelativeDate(output?.created_at);

  if (status === "approved") return date ? `Approved · ${date}` : "Approved";
  if (status === "pending")
    return date ? `Pending Review · ${date}` : "Pending Review";
  if (status === "auto_saved")
    return date ? `Generated · ${date}` : "Generated";

  return date ? `${titleCase(status)} · ${date}` : titleCase(status);
}

function isApprovedOutput(output) {
  const status = String(
    output?.approval_status || output?.approvalStatus || "",
  ).toLowerCase();

  return status === "approved" || status === "auto_saved";
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

function normalizeGeneratedOutput(data, typeId, prompt) {
  const createdAt = new Date().toISOString();
  const event = data?.memory?.event;
  const output = data?.output || {};
  const contentOutput = data?.contentOutput || output || {};

  return {
    id: event?.id || output.id || `${typeId}-${Date.now()}`,
    source: data?.memory?.storage || "local",
    module: "content",
    type: typeId,
    title: contentOutput.title || output.title || "Content Draft",
    prompt: output.prompt || prompt,
    content: contentOutput.content || output.content || "",
    approval_status:
      event?.approval_status || output.approval_status || "pending",
    confidence:
      event?.confidence ||
      data?.quality?.score ||
      contentOutput.metadata?.confidence ||
      0,
    risk_level: event?.risk_level || data?.quality?.riskLevel || "medium",
    created_at: event?.created_at || output.created_at || createdAt,
    metadata: output.metadata || contentOutput.metadata || {},
  };
}

export default function ContentTab({
  campaign,
  outputs = [],
  memorySources = {},
  plan = "free",
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { streamText } = useTextStream();
  const { toast } = useToast();

  const initialType = searchParams.get("type") || "blog";

  const latestOutput = outputs?.[0];
  const latestOutputType = getUiTypeId(latestOutput?.type);

  const [selectedType, setSelectedType] = useState(
    latestOutputType || getUiTypeId(initialType),
  );
  const [localOutputs, setLocalOutputs] = useState(outputs || []);
  const [prompts, setPrompts] = useState(() =>
    latestOutput?.type
      ? {
          [latestOutputType]: latestOutput.prompt || "",
        }
      : {},
  );
  const [contents, setContents] = useState(() =>
    latestOutput?.type
      ? {
          [latestOutputType]: latestOutput.content || "",
        }
      : {},
  );
  const [generating, setGenerating] = useState({});
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState({});
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);
  const [upgradeGate, setUpgradeGate] = useState(null);

  useEffect(() => {
    setLocalOutputs(outputs || []);
  }, [outputs]);

  const currentType = CONTENT_TYPES.find((t) => t.id === selectedType);
  const prompt = prompts[selectedType] || "";
  const content = contents[selectedType] || "";
  const isGenerating = !!generating[selectedType];
  const error = errors[selectedType] || "";
  const approvedMemoryCount = Object.values(memorySources)
    .flatMap((items) => (Array.isArray(items) ? items : []))
    .filter(isApprovedOutput).length;
  const canGenerate = Boolean(campaign?.id && approvedMemoryCount > 0);
  const validationMessage = !campaign?.id
    ? "Select or create a campaign before generating content."
    : "Generate or approve Research, SEO, Content, or Creative memory before generating content.";
  const memoryCards = CONTENT_TYPES.map((type) => {
    const output = findLatestOutputForType(localOutputs, type.id);

    return {
      ...type,
      status: output ? getOutputStatus(output) : "Not Generated",
      statusColor: output
        ? "text-emerald-600 dark:text-emerald-300"
        : "text-slate-500 dark:text-white/50",
      output,
    };
  });

  const selectContentType = (typeId) => {
    const normalizedType = getUiTypeId(typeId);
    const gate = getFeatureGate({
      plan,
      module: "content",
      feature: normalizedType,
    });

    if (!gate.allowed) {
      setUpgradeGate(gate);
      return;
    }

    const output = findLatestOutputForType(localOutputs, normalizedType);

    setSelectedType(normalizedType);
    setIsOutputExpanded(false);

    if (output) {
      setPrompts((prev) => ({
        ...prev,
        [normalizedType]: prev[normalizedType] || output.prompt || "",
      }));
      setContents((prev) => ({
        ...prev,
        [normalizedType]: prev[normalizedType] || output.content || "",
      }));
    }
  };

  const generate = async () => {
    try {
      if (!canGenerate) return;
      const featureGate = getFeatureGate({
        plan,
        module: "content",
        feature: selectedType,
      });

      if (!featureGate.allowed) {
        setUpgradeGate(featureGate);
        return;
      }

      const existingOutput = findLatestOutputForType(localOutputs, selectedType);

      if (existingOutput) {
        const regenerateGate = getActionGate({ plan, action: "regenerate" });
        if (!regenerateGate.allowed) {
          setUpgradeGate(regenerateGate);
          return;
        }
      }

      setGenerating((prev) => ({
        ...prev,
        [selectedType]: true,
      }));
      setContents((prev) => ({
        ...prev,
        [selectedType]: "",
      }));
      setErrors((prev) => ({
        ...prev,
        [selectedType]: "",
      }));
      setIsOutputExpanded(false);

      const response = await fetch("/api/content/generate", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          campaignId: campaign.id,

          type: selectedType,

          title: `${campaign.name} ${currentType?.label}`,

          prompt: prompt.trim(),
          regenerate: Boolean(existingOutput),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Generation failed");
      }

      setLocalOutputs((prev) => [
        normalizeGeneratedOutput(data, selectedType, prompt),
        ...prev,
      ]);
      setGenerating((prev) => ({
        ...prev,
        [selectedType]: false,
      }));
      await streamText(
        `content:${campaign.id}:${selectedType}`,
        data.output.content,
        (streamedContent) => {
          setContents((prev) => ({
            ...prev,
            [selectedType]: streamedContent,
          }));
        },
      );
      router.refresh();
    } catch (error) {
      const message = error?.message || getAiErrorMessage(error);

      setErrors((prev) => ({
        ...prev,
        [selectedType]: message,
      }));

      toast({
        variant: "destructive",
        title: "Invalid input",
        description: message,
      });
    } finally {
      setGenerating((prev) => ({
        ...prev,
        [selectedType]: false,
      }));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadDocx = async () => {
    if (!content) return;
    const gate = getActionGate({ plan, action: "export" });
    if (!gate.allowed) {
      setUpgradeGate(gate);
      return;
    }
    await exportDocx(`${campaign.name}-${currentType.label}`, content);
  };

  const inputCls =
    "w-full px-3 py-2.5 text-sm rounded-xl border bg-white dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B3CFF]/20 focus:border-[#3B3CFF]/50 transition-all resize-none";

  return (
    <div className="space-y-5">
      {/* Content type selector */}
      <div
        className="p-4 rounded-2xl border
      dark:bg-white/[0.03] dark:border-white/[0.06]
            bg-white border-gray-100"
      >
        <p className="text-xs font-medium text-gray-500 mb-3">
          Select Content Type
        </p>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((type) => {
            const Icon = type.icon;
            const active = selectedType === type.id;
            const gate = getFeatureGate({
              plan,
              module: "content",
              feature: type.id,
            });
            return (
              <button
                key={type.id}
                onClick={() => selectContentType(type.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                  active
                    ? "border-[#3B3CFF]/30 bg-[#3B3CFF]/10 text-[#3B3CFF] dark:bg-[#3B3CFF]/20 dark:text-indigo-400"
                    : cn(
                        "border-gray-200 dark:border-white/[0.06]",
                        type.color,
                      ),
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {type.label}
                {!gate.allowed && (
                  <Lock className="h-3 w-3 text-slate-400 dark:text-white/35" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input Panel */}
        <div className="p-5 rounded-2xl border space-y-4 bg-white border-gray-100 dark:bg-white/[0.03] dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            {currentType &&
              React.createElement(currentType.icon, {
                className: cn("w-4 h-4", currentType.color.split(" ")[1]),
              })}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {currentType?.label} Brief
            </h3>
          </div>
          <textarea
            rows={6}
            value={prompt}
            onChange={(e) =>
              setPrompts((prev) => ({
                ...prev,
                [selectedType]: e.target.value,
              }))
            }
            placeholder={`Optional direction for this ${currentType?.label}.\nLeave empty to generate from Campaign Context and Approved Memory.`}
            className={`custom-scrollbar ${inputCls}`}
          />
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}
          <button
            onClick={generate}
            disabled={!canGenerate || isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#7B5CFF] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate {currentType?.label}
              </>
            )}
          </button>
          {!canGenerate && (
            <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-300">
              {validationMessage}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-gray-500 dark:text-white/40">
            Uses Campaign Context + Approved Memory. Direction is optional.
            Approved Memory: {approvedMemoryCount}
          </p>
        </div>

        {/* Output Panel */}
        <div className="flex h-[520px] flex-col rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/[0.06] dark:bg-white/[0.03]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              AI Output
            </h3>
            {content && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#3B3CFF] transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={downloadDocx}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#3B3CFF] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download DOCX
                </button>
              </div>
            )}
          </div>
          {isGenerating ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-[#3B3CFF] animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Generating {currentType?.label}...
                </p>
              </div>
            </div>
          ) : content ? (
            <>
              <div
                className={cn(
                  "min-h-0 flex-1 pr-1 transition-all",
                  isOutputExpanded
                    ? "custom-scrollbar overflow-y-auto"
                    : "overflow-hidden",
                )}
              >
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsOutputExpanded((value) => !value)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
                >
                  {isOutputExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {isOutputExpanded ? "Show less" : "Show more"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3B3CFF]/10 to-[#7B5CFF]/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-[#3B3CFF]" />
                </div>
                <p className="text-sm text-gray-500">
                  Your generated content will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-white/40">
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
            Content Memory
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
            Latest generated drafts for this campaign.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {memoryCards.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectContentType(item.id)}
                className="group flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-left transition hover:border-gray-200 hover:bg-gray-100 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/15 dark:hover:bg-white/[0.04]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-none items-center justify-center rounded-lg",
                      item.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-gray-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className={`text-[11px] ${item.statusColor}`}>
                      {item.status}
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 -rotate-90 flex-none text-gray-400 transition group-hover:text-gray-600 dark:text-white/30 dark:group-hover:text-white/60" />
              </button>
            );
          })}
        </div>
      </section>
      <UpgradeModal
        gate={upgradeGate}
        onClose={() => setUpgradeGate(null)}
      />
    </div>
  );
}
