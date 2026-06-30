import React, { useState } from "react";

import { cn } from "@/app/lib/utils/utils";
import UpgradeModal from "@/components/campaing/UpgradeModal";

import { X, Loader2 } from "lucide-react";

const FIELDS = [
  {
    key: "name",
    label: "Campaign Name *",
    placeholder: "e.g. Black Friday Sale 2024",
    type: "input",
  },
  {
    key: "product_name",
    label: "Product Name",
    placeholder: "e.g. SaaS Pro Plan",
    type: "input",
  },
  {
    key: "website",
    label: "Website",
    placeholder: "https://yourwebsite.com",
    type: "input",
  },
  {
    key: "industry",
    label: "Industry",
    placeholder: "e.g. SaaS, E-commerce, Health...",
    type: "input",
  },
  {
    key: "target_audience",
    label: "Target Audience",
    placeholder: "e.g. Startup founders aged 25–45",
    type: "textarea",
  },
  {
    key: "goal",
    label: "Campaign Goal",
    placeholder: "e.g. Drive 500 signups in 30 days",
    type: "textarea",
  },
  {
    key: "brand_description",
    label: "Brand Description",
    placeholder: "Describe your brand voice and positioning...",
    type: "textarea",
  },
  {
    key: "notes",
    label: "Optional Notes",
    placeholder: "Any additional context...",
    type: "textarea",
  },
];

export default function CreateCampaignModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    product_name: "",
    website: "",
    industry: "",
    target_audience: "",
    goal: "",
    brand_description: "",
    notes: "",
    status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [upgradeGate, setUpgradeGate] = useState(null);

  const handle = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (payload?.error === "feature_locked") {
          setUpgradeGate(payload);
          return;
        }

        throw new Error(payload?.error || "Failed to create campaign");
      }

      onCreated();
    } catch (error) {
      setError(error?.message || "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all dark:bg-white/[0.05] dark:border-white/[0.08] dark:text-white dark:placeholder-slate-500 dark:focus:border-[#3B3CFF]/60 dark:focus:bg-white/[0.08] bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#3B3CFF]/50 focus:ring-2 focus:ring-[#3B3CFF]/10 focus:bg-white";

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl dark:bg-dark-bg dark:border-white/[0.08]
            bg-white border-slate-200 custom-scrollbar"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b
            dark:border-white/[0.06] border-slate-100"
        >
          <div>
            <h2
              className="text-base font-bold
                dark:text-white text-slate-900"
            >
              Create Campaign
            </h2>
            <p
              className="text-xs mt-0.5
                dark:text-slate-500 text-slate-400"
            >
              Set up your AI marketing campaign
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors
              dark
                :hover:bg-white/[0.06] dark:text-slate-400
                hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div
                key={f.key}
                className={
                  f.type === "textarea" || f.key === "name"
                    ? "sm:col-span-2"
                    : ""
                }
              >
                <label
                  className="block text-xs font-medium mb-1.5
                    dark:text-slate-300 text-slate-700"
                >
                  {f.label}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    rows={2}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={handle(f.key)}
                    className={cn(inputClass, "resize-none")}
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={handle(f.key)}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-5 border-t
            dark:border-white/[0.06] border-slate-100"
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors
              dark
                :text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06]
                text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#5B5CFF] text-white text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
      <UpgradeModal
        gate={upgradeGate}
        onClose={() => setUpgradeGate(null)}
      />
    </>
  );
}
