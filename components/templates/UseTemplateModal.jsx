"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Loader2,
  Target,
  X,
} from "lucide-react";
import UpgradeModal from "@/components/campaing/UpgradeModal";

export default function UseTemplateModal({ template, onClose }) {
  const router = useRouter();
  const [form, setForm] = useState(() => ({
    name: `${template.name} Campaign`,
    goal: template.goal,
    audience: template.audience,
    offer: template.offer,
    industry: template.industry,
    channels: template.channels,
    successMetrics: template.successMetrics.join("\n"),
    recommendedWorkflow: template.recommendedWorkflow,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [upgradeGate, setUpgradeGate] = useState(null);

  const channelOptions = useMemo(
    () => [
      ...new Set([
        ...template.channels,
        "Google Ads",
        "Meta Ads",
        "LinkedIn",
        "TikTok Ads",
        "SEO",
        "Email",
      ]),
    ],
    [template.channels],
  );

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleChannel = (channel) => {
    update(
      "channels",
      form.channels.includes(channel)
        ? form.channels.filter((item) => item !== channel)
        : [...form.channels, channel],
    );
  };

  const toggleWorkflow = (step) => {
    const exists = form.recommendedWorkflow.some(
      (item) => item.module === step.module && item.task === step.task,
    );
    update(
      "recommendedWorkflow",
      exists
        ? form.recommendedWorkflow.filter(
            (item) => item.module !== step.module || item.task !== step.task,
          )
        : [...form.recommendedWorkflow, step],
    );
  };

  const createCampaign = async () => {
    if (!form.name.trim()) {
      setError("Campaign name is required.");
      return;
    }

    if (!form.goal.trim() || !form.audience.trim() || !form.industry.trim()) {
      setError("Goal, audience, and industry are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          product_name: form.offer.trim(),
          industry: form.industry.trim(),
          target_audience: form.audience.trim(),
          goal: form.goal.trim(),
          brand_description: `${template.name} campaign playbook for ${template.bestFor}.`,
          status: "draft",
          campaign_plan: {
            starter: {
              id: template.id,
              name: template.name,
              bestFor: template.bestFor,
            },
            channels: form.channels,
            successMetrics: splitLines(form.successMetrics),
            recommendedWorkflow: form.recommendedWorkflow,
          },
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.error === "feature_locked") {
          setUpgradeGate(data);
          return;
        }

        throw new Error(data.error || "Campaign could not be created.");
      }

      router.push(`/dashboard/campaings/${data.id}`);
      router.refresh();
      onClose();
    } catch (createError) {
      setError(createError.message || "Campaign could not be created.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="starter-preview-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-dark-bg"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-white/[0.08]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-primary-600 dark:text-primary-300">
              Template Preview
            </div>
            <h2
              id="starter-preview-title"
              className="mt-1 text-xl font-semibold text-slate-900 dark:text-white"
            >
              {template.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-white/45">
              Review and edit this playbook before creating the campaign.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/45 dark:hover:bg-white/[0.06] dark:hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <Field
                label="Campaign Name"
                value={form.name}
                onChange={(value) => update("name", value)}
              />
              <Field
                label="Goal"
                value={form.goal}
                onChange={(value) => update("goal", value)}
                multiline
              />
              <Field
                label="Audience"
                value={form.audience}
                onChange={(value) => update("audience", value)}
                multiline
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Offer"
                  value={form.offer}
                  onChange={(value) => update("offer", value)}
                />
                <Field
                  label="Industry"
                  value={form.industry}
                  onChange={(value) => update("industry", value)}
                />
              </div>

              <section className="border-t border-slate-200 pt-4 dark:border-white/[0.08]">
                <div className="text-xs font-medium text-slate-700 dark:text-white/70">
                  Channels
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {channelOptions.map((channel) => {
                    const selected = form.channels.includes(channel);
                    return (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => toggleChannel(channel)}
                        className={
                          selected
                            ? "inline-flex items-center gap-1.5 rounded-md border border-primary-300 bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-700 dark:border-primary-400/30 dark:bg-primary-400/10 dark:text-primary-300"
                            : "inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 dark:border-white/10 dark:text-white/45"
                        }
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                        {channel}
                      </button>
                    );
                  })}
                </div>
              </section>

              <Field
                label="Success Metrics"
                value={form.successMetrics}
                onChange={(value) => update("successMetrics", value)}
                multiline
                rows={4}
                hint="One metric per line"
              />
            </div>

            <aside className="border-l-0 border-slate-200 lg:border-l lg:pl-6 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Recommended Workflow
                </h3>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/40">
                Select the steps you want included in the campaign plan.
              </p>

              <div className="mt-4 space-y-1">
                {template.recommendedWorkflow.map((step, index) => {
                  const selected = form.recommendedWorkflow.some(
                    (item) =>
                      item.module === step.module && item.task === step.task,
                  );

                  return (
                    <button
                      key={`${step.module}-${step.task}`}
                      type="button"
                      onClick={() => toggleWorkflow(step)}
                      className="flex w-full items-center gap-3 border-b border-slate-200 py-3 text-left last:border-b-0 dark:border-white/[0.08]"
                    >
                      <span
                        className={
                          selected
                            ? "flex h-6 w-6 flex-none items-center justify-center rounded-md bg-primary-600 text-[11px] font-semibold text-white"
                            : "flex h-6 w-6 flex-none items-center justify-center rounded-md border border-slate-200 text-[11px] text-slate-400 dark:border-white/10 dark:text-white/35"
                        }
                      >
                        {selected ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-700 dark:text-white/70">
                          {step.label}
                        </span>
                        <span className="block text-[11px] capitalize text-slate-400 dark:text-white/35">
                          {step.module}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-white/20" />
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-white/55 dark:hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={createCampaign}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Creating Campaign..." : "Create Campaign"}
          </button>
        </footer>
      </div>
    </div>
    <UpgradeModal
      gate={upgradeGate}
      onClose={() => setUpgradeGate(null)}
    />
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  hint = "",
}) {
  const className =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/25";

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-white/65">
        {label}
        {hint && (
          <span className="font-normal text-slate-400 dark:text-white/30">
            {hint}
          </span>
        )}
      </span>
      {multiline ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} resize-none`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
    </label>
  );
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
