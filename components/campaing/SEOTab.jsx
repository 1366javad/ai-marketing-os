"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Download,
  FileText,
  Hash,
  HelpCircle,
  Layers,
  Loader2,
  Lock,
  Map,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { getAiErrorMessage } from "@/app/lib/utils/aiErrorMessage";
import { exportPdf } from "@/app/lib/export/exportPdf";
import { useTextStream } from "@/app/lib/context/TextStreamContext";
import UpgradeModal from "@/components/campaing/UpgradeModal";
import { getActionGate, getFeatureGate } from "@/app/lib/plans/planPolicy";

const sections = [
  {
    id: "keywords",
    title: "Keyword Research",
    label: "Keyword Research",
    icon: Hash,
    desc: "Identify primary and secondary keyword opportunities with intent, estimated volume, and difficulty.",
    iconColor: "text-sky-600 dark:text-sky-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryColor: "sky-400",
  },
  {
    id: "clusters",
    title: "Keyword Clusters",
    label: "Keyword Clusters",
    icon: Layers,
    desc: "Group keywords into intent-led clusters with priority and campaign relevance.",
    iconColor: "text-violet-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryColor: "violet-400",
  },
  {
    id: "topics",
    title: "Topic Clusters",
    label: "Topic Clusters",
    icon: Map,
    desc: "Plan pillar pages, supporting articles, and internal linking paths.",
    iconColor: "text-emerald-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryColor: "emerald-400",
  },
  {
    id: "strategy",
    title: "SEO Strategy",
    label: "SEO Strategy",
    icon: TrendingUp,
    desc: "Prioritize quick wins, medium-term actions, long-term moves, and organic growth priorities.",
    iconColor: "text-orange-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryColor: "orange-400",
  },
  {
    id: "meta",
    title: "Meta Descriptions",
    label: "Meta Descriptions",
    icon: FileText,
    desc: "Generate page-level titles and meta descriptions optimized for relevance and clicks.",
    iconColor: "text-pink-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryColor: "pink-400",
  },
  {
    id: "faq",
    title: "FAQs",
    label: "FAQs",
    icon: HelpCircle,
    desc: "Create SEO-focused questions, answers, and schema opportunities.",
    iconColor: "text-amber-400",
    dotColor: "bg-slate-300 dark:bg-white/15",
    memoryColor: "amber-400",
  },
];

const typeAliases = {
  keyword: "keywords",
  keywords: "keywords",
  keyword_research: "keywords",
  clusters: "clusters",
  keyword_clusters: "clusters",
  keyword_cluster: "clusters",
  topics: "topics",
  topic_clusters: "topics",
  topic_cluster: "topics",
  strategy: "strategy",
  seo_strategy: "strategy",
  meta: "meta",
  meta_descriptions: "meta",
  meta_description: "meta",
  faq: "faq",
  faqs: "faq",
  faq_generation: "faq",
};

function getSectionIdFromTask(task) {
  const normalized = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return typeAliases[normalized] || normalized;
}

function getOutputSectionId(output) {
  return getSectionIdFromTask(
    output?.task ||
      output?.type ||
      output?.seoOutput?.type ||
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

function getSeoReport(output) {
  const report = output?.seoOutput || output?.metadata?.memoryEvent?.payload;

  if (!report) return null;

  return {
    ...report,
    content: report.content || output?.content || "",
  };
}

function isValidReport(report) {
  return Boolean(
    hasContent(report?.summary) ||
    hasItems(report?.primaryKeywords) ||
    hasItems(report?.secondaryKeywords) ||
    hasItems(report?.keywordClusters) ||
    hasItems(report?.topicClusters) ||
    hasStrategyItems(report?.strategy) ||
    hasItems(report?.metaDescriptions) ||
    hasItems(report?.faqs) ||
    hasContent(report?.content),
  );
}

function hasContent(value) {
  return String(value || "").trim().length > 0;
}

function hasItems(value) {
  return Array.isArray(value) && value.filter(Boolean).length > 0;
}

function hasStrategyItems(strategy) {
  if (!strategy || typeof strategy !== "object") return false;
  return Object.values(strategy).some(hasItems);
}

function normalizeGeneratedOutput(data, sectionId) {
  const createdAt = new Date().toISOString();
  const event = data?.memory?.event;
  const output = data?.output || {};
  const seoOutput = data?.seoOutput || {
    type: sectionId,
    title: output.title || "SEO Report",
    summary: "",
    metadata: output.metadata || {},
  };

  return {
    id: event?.id || output.id || `${sectionId}-${Date.now()}`,
    source: data?.memory?.storage || "local",
    module: "seo",
    type: data?.executionPlan?.task || sectionId,
    title: seoOutput.title || output.title || "SEO Report",
    content: output.content || "",
    seoOutput,
    approval_status:
      event?.approval_status ||
      output.approval_status ||
      output.metadata?.memoryEvent?.approval_status ||
      (data?.quality?.approvalRequired ? "pending" : "auto_saved"),
    confidence:
      event?.confidence ||
      data?.quality?.score ||
      seoOutput.metadata?.confidence ||
      0,
    risk_level:
      event?.risk_level ||
      output.metadata?.memoryEvent?.risk_level ||
      data?.quality?.riskLevel ||
      "low",
    created_at: event?.created_at || output.created_at || createdAt,
    metadata: output.metadata || seoOutput.metadata || {},
  };
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

function stringifyReportItem(item) {
  if (typeof item === "string") return item.trim();
  if (item == null) return "";
  if (typeof item !== "object") return String(item).trim();

  return Object.values(item)
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value.map((entry) => stringifyReportItem(entry));
      }
      if (value && typeof value === "object") return stringifyReportItem(value);
      return String(value || "").trim();
    })
    .filter(Boolean)
    .join(" - ");
}

function formatSeoReportText(report) {
  const lines = [
    `# ${report.title || "SEO Report"}`,
    "",
    report.summary || "",
    "",
    ...formatObjectList("Primary Keywords", report.primaryKeywords),
    ...formatObjectList("Secondary Keywords", report.secondaryKeywords),
    ...formatObjectList("Keyword Clusters", report.keywordClusters),
    ...formatObjectList("Topic Clusters", report.topicClusters),
    ...formatStrategy(report.strategy),
    ...formatObjectList("Meta Descriptions", report.metaDescriptions),
    ...formatObjectList("FAQs", report.faqs),
  ];

  return lines.join("\n").trim();
}

function formatObjectList(title, items) {
  if (!hasItems(items)) return [];
  return [
    `## ${title}`,
    ...items.map((item) => `- ${stringifyReportItem(item)}`),
    "",
  ];
}

function formatStrategy(strategy = {}) {
  const groups = [
    ["Quick Wins", strategy.quickWins],
    ["Medium Term", strategy.mediumTerm],
    ["Long Term", strategy.longTerm],
    ["Priorities", strategy.priorities],
  ];

  return groups.flatMap(([title, items]) =>
    hasItems(items)
      ? [`## ${title}`, ...items.map((item) => `- ${item}`), ""]
      : [],
  );
}

function ReportList({ title, items }) {
  const safeItems = Array.isArray(items)
    ? items.map((item) => stringifyReportItem(item)).filter(Boolean)
    : [];

  if (safeItems.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
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

function getItemValue(item, keys) {
  if (!item || typeof item !== "object") return "";

  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return "";
}

function StructuredList({ items }) {
  const safeItems = Array.isArray(items)
    ? items.map(cleanUserFacingItem).filter(Boolean)
    : [];

  if (safeItems.length === 0) return null;

  return (
    <ul className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
      {safeItems.map((item, index) => (
        <li key={index} className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
          <span>{stringifyReportItem(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function cleanUserFacingItem(item) {
  if (typeof item !== "string") return item;

  return item
    .trim()
    .replace(
      /^link each supporting article\s+/i,
      "Supporting articles should link ",
    )
    .replace(/^ensure each article\s+/i, "Each article should ");
}

function normalizeRenderableList(value) {
  const items = Array.isArray(value) ? value : [value];
  return items.filter((item) => stringifyReportItem(item));
}

function KeywordReport({ title, items }) {
  const safeItems = Array.isArray(items)
    ? items.filter((item) => stringifyReportItem(item))
    : [];

  if (safeItems.length === 0) return null;

  return (
    <section>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {safeItems.map((item, index) => {
          const keyword =
            typeof item === "string"
              ? item
              : getItemValue(item, ["keyword", "term", "text"]);

          return (
            <div
              key={`${title}-${index}`}
              className="rounded-lg border border-slate-200 p-4 dark:border-white/10"
            >
              <div className="font-medium text-slate-900 dark:text-white">
                {keyword || stringifyReportItem(item)}
              </div>
              {typeof item === "object" && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-white/45">
                  {item.intent && (
                    <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                      Intent: {item.intent}
                    </span>
                  )}
                  {item.volume && (
                    <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                      Volume: {item.volume}
                    </span>
                  )}
                  {item.difficulty && (
                    <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-white/10">
                      Difficulty: {item.difficulty}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function KeywordClusterReport({ items }) {
  const safeItems = Array.isArray(items)
    ? items.filter((item) => stringifyReportItem(item))
    : [];
  if (safeItems.length === 0) return null;

  return (
    <section className="space-y-3">
      {safeItems.map((item, index) => (
        <div
          key={index}
          className="rounded-lg border border-slate-200 p-4 dark:border-white/10"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {getItemValue(item, ["cluster", "name", "title"]) ||
                `Keyword Cluster ${index + 1}`}
            </h4>
            <div className="flex gap-2 text-[11px] text-slate-500 dark:text-white/45">
              {item.intent && <span>{item.intent}</span>}
              {item.priority && (
                <span className="rounded-md border border-slate-200 px-2 py-0.5 dark:border-white/10">
                  {item.priority} priority
                </span>
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium uppercase text-slate-500 dark:text-white/40">
              Keywords
            </div>
            <StructuredList items={item.keywords || item.terms || []} />
          </div>
        </div>
      ))}
    </section>
  );
}

function formatInternalLink(item) {
  if (!item || typeof item !== "object") return stringifyReportItem(item);

  const from = getItemValue(item, ["from", "source"]);
  const to = getItemValue(item, ["to", "target"]);
  const anchor = getItemValue(item, ["anchorText", "anchor", "text"]);
  const route = [from, to].filter(Boolean).join(" -> ");

  return [route, anchor ? `Anchor: ${anchor}` : ""].filter(Boolean).join(" / ");
}

function TopicClusterReport({ items }) {
  const safeItems = Array.isArray(items)
    ? items.filter((item) => stringifyReportItem(item))
    : [];
  if (safeItems.length === 0) return null;

  return (
    <section className="space-y-4">
      {safeItems.map((item, index) => {
        const articles =
          getItemValue(item, ["supportingArticles", "articles"]) || [];
        const internalLinks =
          getItemValue(item, [
            "internalLinks",
            "internalLinking",
            "internalLinkingStrategy",
          ]) || [];
        const ctas = getItemValue(item, ["ctas", "cta", "ctaStrategy"]) || [];
        const safeArticles = normalizeRenderableList(articles);
        const safeInternalLinks =
          normalizeRenderableList(internalLinks).map(formatInternalLink);
        const safeCtas = normalizeRenderableList(ctas);

        return (
          <div
            key={index}
            className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-white/10"
          >
            <div>
              <div className="text-xs font-medium uppercase text-slate-500 dark:text-white/40">
                Pillar Page
              </div>
              <h4 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                {getItemValue(item, ["pillarPage", "pillar", "title"]) ||
                  `Topic Cluster ${index + 1}`}
              </h4>
            </div>
            {safeArticles.length > 0 && (
              <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                <div className="mb-2 text-xs font-medium uppercase text-slate-500 dark:text-white/40">
                  Supporting Articles
                </div>
                <StructuredList items={safeArticles} />
              </div>
            )}
            {safeInternalLinks.length > 0 && (
              <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                <div className="mb-2 text-xs font-medium uppercase text-slate-500 dark:text-white/40">
                  Internal Linking Strategy
                </div>
                <StructuredList items={safeInternalLinks} />
              </div>
            )}
            {safeCtas.length > 0 && (
              <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                <div className="mb-2 text-xs font-medium uppercase text-slate-500 dark:text-white/40">
                  CTA Strategy
                </div>
                <StructuredList items={safeCtas} />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function MetaDescriptionReport({ items }) {
  const safeItems = Array.isArray(items)
    ? items.filter((item) => stringifyReportItem(item))
    : [];
  if (safeItems.length === 0) return null;

  return (
    <section className="space-y-3">
      {safeItems.map((item, index) => (
        <div
          key={index}
          className="rounded-lg border border-slate-200 p-4 dark:border-white/10"
        >
          <div className="text-xs text-slate-500 dark:text-white/40">
            {getItemValue(item, ["page", "url"]) || `Page ${index + 1}`}
          </div>
          <h4 className="mt-1 font-semibold text-slate-900 dark:text-white">
            {getItemValue(item, ["title", "metaTitle"]) || "Meta Title"}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
            {getItemValue(item, ["metaDescription", "description", "text"])}
          </p>
        </div>
      ))}
    </section>
  );
}

function FaqReport({ items }) {
  const safeItems = Array.isArray(items)
    ? items.filter((item) => stringifyReportItem(item))
    : [];
  if (safeItems.length === 0) return null;

  return (
    <section className="space-y-3">
      {safeItems.map((item, index) => (
        <div
          key={index}
          className="rounded-lg border border-slate-200 p-4 dark:border-white/10"
        >
          <h4 className="font-semibold text-slate-900 dark:text-white">
            {getItemValue(item, ["question", "title"]) || `FAQ ${index + 1}`}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
            {getItemValue(item, ["answer", "response", "text"])}
          </p>
          {getItemValue(item, ["schemaOpportunity", "schema"]) && (
            <div className="mt-3 text-xs text-slate-500 dark:text-white/40">
              Schema opportunity:{" "}
              {getItemValue(item, ["schemaOpportunity", "schema"])}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function StrategyReport({ strategy }) {
  if (!strategy || typeof strategy !== "object") return null;

  return (
    <>
      <ReportList title="Quick Wins" items={strategy.quickWins} />
      <ReportList title="Medium Term" items={strategy.mediumTerm} />
      <ReportList title="Long Term" items={strategy.longTerm} />
      <ReportList title="Priorities" items={strategy.priorities} />
    </>
  );
}

function SeoReportSections({ report, sectionId }) {
  switch (sectionId) {
    case "keywords":
      return (
        <>
          <KeywordReport
            title="Primary Keywords"
            items={report.primaryKeywords}
          />
          <KeywordReport
            title="Secondary Keywords"
            items={report.secondaryKeywords}
          />
        </>
      );
    case "clusters":
      return <KeywordClusterReport items={report.keywordClusters} />;
    case "topics":
      return <TopicClusterReport items={report.topicClusters} />;
    case "strategy":
      return <StrategyReport strategy={report.strategy} />;
    case "meta":
      return <MetaDescriptionReport items={report.metaDescriptions} />;
    case "faq":
      return <FaqReport items={report.faqs} />;
    default:
      return (
        <>
          {hasItems(report.primaryKeywords) && (
            <ReportList
              title="Primary Keywords"
              items={report.primaryKeywords}
            />
          )}
          {hasItems(report.secondaryKeywords) && (
            <ReportList
              title="Secondary Keywords"
              items={report.secondaryKeywords}
            />
          )}
          {hasItems(report.keywordClusters) && (
            <ReportList
              title="Keyword Clusters"
              items={report.keywordClusters}
            />
          )}
          {hasItems(report.topicClusters) && (
            <ReportList title="Topic Clusters" items={report.topicClusters} />
          )}
          {hasStrategyItems(report.strategy) && (
            <StrategyReport strategy={report.strategy} />
          )}
          {hasItems(report.metaDescriptions) && (
            <ReportList
              title="Meta Descriptions"
              items={report.metaDescriptions}
            />
          )}
          {hasItems(report.faqs) && (
            <ReportList title="FAQs" items={report.faqs} />
          )}
        </>
      );
  }
}

export default function SEOTab({ campaign, seoOutputs = [], plan = "free" }) {
  const router = useRouter();
  const { streamObject } = useTextStream();
  const viewerRef = useRef(null);
  const [results, setResults] = useState({});
  const [localOutputs, setLocalOutputs] = useState(seoOutputs || []);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [selectedSection, setSelectedSection] = useState("keywords");
  const [direction, setDirection] = useState("");
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [upgradeGate, setUpgradeGate] = useState(null);

  useEffect(() => {
    setLocalOutputs(seoOutputs || []);
  }, [seoOutputs]);

  useEffect(() => {
    if (!selectedSection) return;

    viewerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedSection]);

  const hasText = (value) => String(value || "").trim().length > 0;
  const activeSection = sections.find(
    (section) => section.id === selectedSection,
  );
  const activeOutput = findLatestOutputForSection(
    localOutputs,
    selectedSection,
    { includePending: true },
  );
  const activeReportCandidate =
    results[selectedSection] || getSeoReport(activeOutput);
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
  const approvedSeoMemoryCount = (localOutputs || []).filter(
    isApprovedMemoryOutput,
  ).length;
  const validationMessage =
    "Complete campaign goal, audience, and industry/category before generating SEO.";
  const memoryCards = sections.map((section) => {
    const output = findLatestOutputForSection(localOutputs, section.id, {
      includePending: true,
    });
    const status = String(output?.approval_status || "").toLowerCase();
    const isReady = status === "approved" || status === "auto_saved";

    return {
      title: section.title,
      status: isReady
        ? `Generated${formatRelativeDate(output?.created_at) ? ` / ${formatRelativeDate(output.created_at)}` : ""}`
        : output
          ? getOutputStatus(output)
          : "Not Generated",
      color: isReady
        ? "text-emerald-600 dark:text-emerald-300"
        : status === "rejected"
          ? "text-rose-600 dark:text-rose-300"
          : output
            ? "text-amber-600 dark:text-amber-300"
            : "text-slate-500 dark:text-white/50",
      state: isReady
        ? "ready"
        : status === "rejected"
          ? "rejected"
          : output
            ? "pending"
            : "empty",
      sectionId: section.id,
      icon: section.icon,
      iconColor: section.iconColor,
    };
  });

  const generateSection = async (sectionId) => {
    const section = sections.find((item) => item.id === sectionId);
    const featureGate = getFeatureGate({
      plan,
      module: "seo",
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
        `Generate ${section.title} for ${campaign.product_name || campaign.name}.`;

      const response = await fetch("/api/seo/generate", {
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
        throw new Error(data.message || data.error);
      }

      setLoading((prev) => ({
        ...prev,
        [sectionId]: false,
      }));
      await streamObject(
        `seo:${campaign.id}:${sectionId}`,
        data.seoOutput,
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
      setErrors((prev) => ({
        ...prev,
        [sectionId]: getAiErrorMessage(error),
      }));
    } finally {
      setLoading((prev) => ({
        ...prev,
        [sectionId]: false,
      }));
    }
  };

  const activeTitle = activeSection?.title || "";
  const ActiveIcon = activeSection?.icon || Search;
  const activeReportText = activeReport
    ? formatSeoReportText(activeReport)
    : activeOutput?.content || "";
  const activeProvider = String(activeReport?.metadata?.provider || "").trim();
  const activeConfidence = Number(activeReport?.metadata?.confidence || 0);
  const activeGeneratedAt = activeReport?.metadata?.generatedAt || "";
  const shouldShowProviderBadge =
    activeProvider && activeProvider.toLowerCase() !== "memory";
  const activeAgentLabel = "SEO Agent";
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

  return (
    <div className="space-y-6 bg-slate-50 text-slate-900 dark:bg-dark-bg dark:text-white/90">
      <section className="mt-5">
        <div className="mb-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            SEO Task
          </span>
          <span className="text-slate-500 dark:text-white/40">
            Pick one to brief
          </span>
        </div>

        <div className="grid  gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = selectedSection === section.id;
            const gate = getFeatureGate({
              plan,
              module: "seo",
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

      <section className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
            <FileText className="h-3.5 w-3.5" />
            SEO Brief
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
              placeholder="Steer the agent: market, intent, pages, product angle..."
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
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-primary-500 disabled:text-slate-200 dark:disabled:text-white/40"
          >
            {loading[selectedSection] ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading[selectedSection] ? "Generating..." : "Generate SEO"}
          </button>

          {!hasCampaignContext && (
            <p className="mt-3 text-[11px] leading-relaxed text-amber-600 dark:text-amber-300">
              {validationMessage}
            </p>
          )}

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-white/40">
            <span className="mt-[3px] h-1 w-1 flex-none rounded-full bg-slate-400 dark:bg-white/30"></span>
            Uses Campaign Context + Approved Research Memory. Prompt is
            optional.
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
            <div>Approved SEO Memory: {approvedSeoMemoryCount}</div>
          </div>
        </aside>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none">
          {isActiveLoading ? (
            <div
              ref={viewerRef}
              className="flex h-[520px] flex-col items-center justify-center px-8 py-16 text-center"
            >
              <Loader2 className="h-7 w-7 animate-spin text-primary-600 dark:text-white" />
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                Generating {activeSection?.label.toLowerCase()}
              </h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-white/50">
                The agent is using campaign context and approved research memory
                to produce a structured SEO asset.
              </p>
            </div>
          ) : activeError ? (
            <div
              ref={viewerRef}
              className="flex h-[520px] flex-col items-center justify-center px-8 py-16 text-center"
            >
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-400/20 dark:bg-rose-400/10">
                <AlertCircle className="h-7 w-7 text-rose-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                SEO generation failed
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
                    SEO Report
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

                <SeoReportSections
                  report={activeReport}
                  sectionId={
                    getOutputSectionId(activeOutput) || selectedSection
                  }
                />

                {!activeReport.summary && activeReport.content && (
                  <section>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Legacy Output
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-white/60">
                      {activeReport.content}
                    </p>
                  </section>
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
                {activeSection?.title}
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-white/50">
                <Circle className="h-3.5 w-3.5" />
                <span>Not Generated</span>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-white/50">
                Generate the &quot;{activeSection?.title}&quot; task to create
                this SEO artifact using campaign context and approved research
                memory.
              </p>
              <button
                type="button"
                disabled={!hasCampaignContext || isActiveLoading}
                onClick={() => generateSection(selectedSection)}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-white/40"
              >
                {isActiveLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isActiveLoading
                  ? "Generating..."
                  : `Generate ${activeSection?.title}`}
              </button>
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
            SEO Memory
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-white/50">
            Per-type status across this campaign. Generated SEO assets feed
            downstream content and campaign planning.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {memoryCards.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.sectionId}
                type="button"
                onClick={() => {
                  const gate = getFeatureGate({
                    plan,
                    module: "seo",
                    feature: item.sectionId,
                  });

                  if (!gate.allowed) {
                    setUpgradeGate(gate);
                    return;
                  }

                  setSelectedSection(item.sectionId);
                  setIsReportExpanded(false);
                }}
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
                    <div className={`text-[11px] ${item.color}`}>
                      <span className="inline-flex items-center gap-1.5">
                        {item.state === "ready" ? (
                          <Check className="h-3 w-3" />
                        ) : item.state === "empty" ? (
                          <Circle className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 -rotate-90 flex-none text-slate-400 transition group-hover:text-slate-600 dark:text-white/30 dark:group-hover:text-white/60" />
              </button>
            );
          })}
        </div>
      </section>
      <UpgradeModal gate={upgradeGate} onClose={() => setUpgradeGate(null)} />
    </div>
  );
}
