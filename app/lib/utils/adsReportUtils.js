import { ADS_TASKS } from "@/app/lib/utils/adsTasks";

export function hasRenderableContent(value) {
  if (typeof value === "string") return hasText(value);
  if (Array.isArray(value)) return value.some(hasRenderableContent);
  if (!value || typeof value !== "object") return Boolean(value);
  return true;
}

export function extractAdsReport(output) {
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

export function buildCampaignPackageOutput(outputs) {
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

export function buildCampaignPackageReport(reports) {
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

export function normalizeTask(value) {
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

export function normalizeList(value) {
  if (Array.isArray(value)) return value.map(stringifyItem).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export function stringifyItem(item) {
  if (typeof item === "string") return item.trim();
  if (item == null) return "";
  if (typeof item !== "object") return String(item);
  return Object.values(item)
    .flat()
    .map(stringifyItem)
    .filter(Boolean)
    .join(" - ");
}

export function isValidReport(report) {
  return Boolean(
    report?.summary ||
    report?.headlines?.length ||
    report?.primaryTexts?.length ||
    report?.descriptions?.length,
  );
}

export function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function formatMemoryStatus(output) {
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

export function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatAdsText(report) {
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
