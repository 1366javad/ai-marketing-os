"use client";

import React, { useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  Copy,
  Download,
  Eye,
  FileOutput,
  FileText,
  FolderOpen,
  Megaphone,
  MoreVertical,
  Search,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";

import { cn } from "@/app/lib/utils/utils";
import { exportPdf } from "@/app/lib/export/exportPdf";
import EmptyState from "@/components/ui/EmptyState";

const MODULE_FILTERS = [
  { id: "all", label: "All" },
  { id: "research", label: "Research" },
  { id: "seo", label: "SEO" },
  { id: "content", label: "Content" },
  { id: "creative", label: "Creative" },
  { id: "ads", label: "Ads" },
  { id: "video", label: "Video" },
  { id: "exports", label: "Exports" },
];

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "draft", label: "Draft" },
];

const MODULE_UI = {
  research: {
    icon: BookOpen,
    label: "Research",
    color: "text-sky-500",
    background: "bg-sky-500/10",
  },
  seo: {
    icon: Search,
    label: "SEO",
    color: "text-emerald-500",
    background: "bg-emerald-500/10",
  },
  content: {
    icon: FileText,
    label: "Content",
    color: "text-violet-500",
    background: "bg-violet-500/10",
  },
  creative: {
    icon: Sparkles,
    label: "Creative",
    color: "text-fuchsia-500",
    background: "bg-fuchsia-500/10",
  },
  ads: {
    icon: Megaphone,
    label: "Ads",
    color: "text-rose-500",
    background: "bg-rose-500/10",
  },
  video: {
    icon: Video,
    label: "Video",
    color: "text-cyan-500",
    background: "bg-cyan-500/10",
  },
  exports: {
    icon: FileOutput,
    label: "Exports",
    color: "text-amber-500",
    background: "bg-amber-500/10",
  },
};

const STATUS_UI = {
  approved: {
    label: "Approved",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  pending: {
    label: "Pending Review",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
  },
  draft: {
    label: "Draft",
    className:
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/50",
  },
  rejected: {
    label: "Rejected",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
  },
};

export default function AssetsTab({ campaign, assets = [] }) {
  const router = useRouter();
  const [localAssets, setLocalAssets] = useState(assets);
  const [activeModule, setActiveModule] = useState("all");
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [copiedId, setCopiedId] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  useEffect(() => {
    setLocalAssets(assets);
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return localAssets.filter((asset) => {
      const moduleMatches =
        activeModule === "all" || asset.module === activeModule;
      const statusMatches =
        activeStatus === "all" || asset.status === activeStatus;
      return moduleMatches && statusMatches;
    });
  }, [activeModule, activeStatus, localAssets]);

  const copyAsset = async (asset) => {
    const value = asset.content || asset.url;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedId(asset.id);
    window.setTimeout(() => setCopiedId(""), 1600);
  };

  const downloadAsset = async (asset) => {
    if (!isFileAsset(asset)) {
      exportPdf(asset.title, buildPdfContent(asset, campaign));
      return;
    }

    try {
      const blob = asset.url.startsWith("data:")
        ? dataUrlToBlob(asset.url)
        : await fetch(asset.url).then((response) => {
            if (!response.ok) throw new Error("File download failed.");
            return response.blob();
          });
      const url = URL.createObjectURL(blob);
      triggerDownload(
        url,
        asset.fileName || buildFileName(asset, extensionFromAsset(asset)),
      );
      URL.revokeObjectURL(url);
    } catch {
      window.open(asset.url, "_blank", "noopener,noreferrer");
    }
  };

  const deleteAsset = async () => {
    const asset = deleteCandidate;
    if (!asset) return;
    setDeletingId(asset.id);
    setDeleteError("");

    try {
      const response = await fetch("/api/assets/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          source: asset.source,
          sourceId: asset.sourceId,
          entityKey: asset.entityKey,
          records: asset.records,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Asset could not be deleted.");
      }

      setLocalAssets((current) =>
        current.filter((item) => item.id !== asset.id),
      );
      if (selectedAsset?.id === asset.id) setSelectedAsset(null);
      setOpenMenuId("");
      setDeleteCandidate(null);
      router.refresh();
    } catch (error) {
      setDeleteError(error.message || "Asset could not be deleted.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Campaign Asset Library
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
            All approved and generated outputs for this campaign.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/45">
          {localAssets.length} assets
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <FilterSelect
          label="Module"
          value={activeModule}
          onChange={setActiveModule}
          options={MODULE_FILTERS}
        />
        <FilterSelect
          label="Status"
          value={activeStatus}
          onChange={setActiveStatus}
          options={STATUS_FILTERS}
        />
      </section>

      {deleteError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
          {deleteError}
        </div>
      )}

      {filteredAssets.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No campaign assets found"
          description="Generated outputs and real exports will appear here with their review status."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              copied={copiedId === asset.id}
              menuOpen={openMenuId === asset.id}
              deleting={deletingId === asset.id}
              onToggleMenu={() =>
                setOpenMenuId((current) =>
                  current === asset.id ? "" : asset.id,
                )
              }
              onView={() => {
                setSelectedAsset(asset);
                setOpenMenuId("");
              }}
              onCopy={() => {
                copyAsset(asset);
                setOpenMenuId("");
              }}
              onDownload={() => {
                downloadAsset(asset);
                setOpenMenuId("");
              }}
              onDelete={() => {
                setDeleteCandidate(asset);
                setOpenMenuId("");
              }}
            />
          ))}
        </div>
      )}

      <section className="border-t border-slate-200 pt-5 dark:border-white/[0.08]">
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
          Data Sources
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-white/45">
          {[
            "campaign_memory_events",
            "campaign_outputs",
            "campaign_assets",
          ].map((source) => (
            <span
              key={source}
              className="break-all rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/[0.03]"
            >
              {source}
            </span>
          ))}
        </div>
      </section>

      {selectedAsset && (
        <AssetViewer
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onCopy={() => copyAsset(selectedAsset)}
          onDownload={() => downloadAsset(selectedAsset)}
          onDelete={() => setDeleteCandidate(selectedAsset)}
          copied={copiedId === selectedAsset.id}
          deleting={deletingId === selectedAsset.id}
        />
      )}

      {deleteCandidate && (
        <DeleteAssetModal
          asset={deleteCandidate}
          deleting={deletingId === deleteCandidate.id}
          onCancel={() => {
            if (!deletingId) setDeleteCandidate(null);
          }}
          onConfirm={deleteAsset}
        />
      )}
    </div>
  );
}

function AssetCard({
  asset,
  copied,
  menuOpen,
  deleting,
  onToggleMenu,
  onView,
  onCopy,
  onDownload,
  onDelete,
}) {
  const moduleUi = MODULE_UI[asset.module] || MODULE_UI.exports;
  const statusUi = STATUS_UI[asset.status] || STATUS_UI.draft;
  const Icon = moduleUi.icon;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.025] dark:shadow-none sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 flex-none items-center justify-center rounded-lg",
            moduleUi.background,
          )}
        >
          <Icon className={cn("h-4 w-4", moduleUi.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="break-words text-sm font-semibold text-slate-900 dark:text-white sm:truncate">
                {asset.title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-white/40">
                <span>{moduleUi.label}</span>
                <span aria-hidden="true">/</span>
                <span>{formatOutputType(asset.outputType)}</span>
              </div>
            </div>
            <div className="flex flex-none items-start justify-between gap-2 sm:justify-start">
              <span
                className={cn(
                  "rounded-md border px-2 py-1 text-[10px] font-medium",
                  statusUi.className,
                )}
              >
                {statusUi.label}
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={onToggleMenu}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  title="Asset actions"
                  aria-label="Asset actions"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-10 z-20 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-dark-surface">
                    <MenuAction icon={Eye} label="View" onClick={onView} />
                    <MenuAction
                      icon={copied ? Check : Copy}
                      label={copied ? "Copied" : "Copy"}
                      onClick={onCopy}
                      disabled={!asset.content && !asset.url}
                      active={copied}
                    />
                    <MenuAction
                      icon={Download}
                      label={
                        isFileAsset(asset)
                          ? "Download original file"
                          : "Download PDF"
                      }
                      onClick={onDownload}
                      disabled={!asset.content && !asset.url}
                    />
                    <MenuAction
                      icon={Trash2}
                      label="Delete"
                      onClick={onDelete}
                      disabled={deleting}
                      danger
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 text-[11px] dark:border-white/[0.08] sm:grid-cols-2">
            <MetaItem
              label="Generated At"
              value={formatDate(asset.generatedAt)}
            />
            <MetaItem label="Source" value={formatAssetSource(asset.provider)} />
          </div>
        </div>
      </div>
    </article>
  );
}

function AssetViewer({
  asset,
  onClose,
  onCopy,
  onDownload,
  onDelete,
  copied,
  deleting,
}) {
  const moduleUi = MODULE_UI[asset.module] || MODULE_UI.exports;
  const statusUi = STATUS_UI[asset.status] || STATUS_UI.draft;
  const isImage =
    String(asset.mimeType || "").startsWith("image") ||
    String(asset.url || "").startsWith("data:image/");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-dark-surface">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-xs font-medium", moduleUi.color)}>
                {moduleUi.label}
              </span>
              <span
                className={cn(
                  "rounded-md border px-2 py-1 text-[10px] font-medium",
                  statusUi.className,
                )}
              >
                {statusUi.label}
              </span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
              {asset.title}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
              {formatOutputType(asset.outputType)} ·{" "}
              {formatDate(asset.generatedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
            title="Close asset viewer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
          {isImage && asset.url ? (
            <NextImage
              src={asset.url}
              alt={asset.title}
              width={1200}
              height={900}
              unoptimized
              className="mx-auto max-h-[62vh] w-auto rounded-lg border border-slate-200 object-contain dark:border-white/10"
            />
          ) : asset.content ? (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-700 dark:text-white/70">
              {asset.content}
            </pre>
          ) : asset.url ? (
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              Open exported asset
            </a>
          ) : (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-white/40">
              No preview is available for this asset.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-slate-200 p-4 dark:border-white/10 sm:grid-cols-3">
          <ActionButton
            icon={copied ? Check : Copy}
            label={copied ? "Copied" : "Copy"}
            onClick={onCopy}
            disabled={!asset.content && !asset.url}
            active={copied}
          />
          <ActionButton
            icon={Download}
            label={isFileAsset(asset) ? "Download Original" : "Download PDF"}
            onClick={onDownload}
            disabled={!asset.content && !asset.url}
          />
          <ActionButton
            icon={Trash2}
            label={deleting ? "Deleting..." : "Delete"}
            onClick={onDelete}
            disabled={deleting}
            danger
          />
        </div>
      </div>
    </div>
  );
}

function DeleteAssetModal({ asset, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-asset-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-dark-surface"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400">
          <Trash2 className="h-5 w-5" />
        </div>
        <h3
          id="delete-asset-title"
          className="mt-4 text-lg font-semibold text-slate-900 dark:text-white"
        >
          Delete asset?
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/55">
          <span className="font-medium text-slate-900 dark:text-white">
            {asset.title}
          </span>{" "}
          will be removed from the Campaign Asset Library. Memory history
          remains auditable.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70"
      >
        {options.map((option) => (
          <option
            key={option.id}
            value={option.id}
            className="dark:bg-dark-surface"
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white",
        active && "text-emerald-600 dark:text-emerald-400",
        danger &&
          "text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-400/10 dark:hover:text-rose-300",
      )}
      title={label}
    >
      <Icon className="h-3.5 w-3.5 flex-none" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function MenuAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/50 dark:hover:bg-white/[0.08] dark:hover:text-white",
        active && "text-emerald-600 dark:text-emerald-400",
        danger &&
          "text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-400/10 dark:hover:text-rose-300",
      )}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-slate-400 dark:text-white/30">{label}</div>
      <div className="mt-0.5 truncate text-slate-600 dark:text-white/60">
        {value}
      </div>
    </div>
  );
}

function formatOutputType(value) {
  return String(value || "Output")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAssetSource(value) {
  const source = String(value || "").trim();
  if (!source || source === "unknown") return "Not recorded";
  if (source === "memory") return "Campaign Memory";
  return "AI Generated";
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString();
}

function buildFileName(asset, extension) {
  const safeName = String(asset.title || "campaign-asset")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safeName || "campaign-asset"}.${extension}`;
}

function isFileAsset(asset) {
  const mimeType = String(asset.mimeType || "").toLowerCase();
  return Boolean(
    asset.url &&
    (asset.source === "campaign_assets" ||
      mimeType.startsWith("image") ||
      mimeType.startsWith("video") ||
      /\.(png|jpe?g|webp|gif|svg|mp4|webm|mov|pdf)(\?|$)/i.test(asset.url)),
  );
}

function buildPdfContent(asset, campaign) {
  return [
    campaign?.name ? `Campaign: ${campaign.name}` : "",
    `Module: ${formatOutputType(asset.module)}`,
    `Output Type: ${formatOutputType(asset.outputType)}`,
    `Status: ${STATUS_UI[asset.status]?.label || formatOutputType(asset.status)}`,
    `Generated At: ${formatDate(asset.generatedAt)}`,
    `Source: ${formatAssetSource(asset.provider)}`,
    "",
    asset.content || asset.url || "No content available.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function extensionFromAsset(asset) {
  const fileName = String(asset.fileName || "");
  const fileExtension = fileName.match(/\.([a-z0-9]+)$/i)?.[1];
  if (fileExtension) return fileExtension;

  const mimeType = String(asset.mimeType || "").toLowerCase();
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("svg")) return "svg";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("pdf")) return "pdf";

  return asset.url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || "bin";
}

function triggerDownload(url, fileName) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
}

function dataUrlToBlob(dataUrl) {
  const [header, body] = dataUrl.split(",");
  const mimeType =
    header.match(/data:(.*?);/)?.[1] || "application/octet-stream";
  const binary = window.atob(body);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}
