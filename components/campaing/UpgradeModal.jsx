"use client";

import Link from "next/link";
import { Lock, Sparkles, X } from "lucide-react";

export default function UpgradeModal({ gate, onClose }) {
  if (!gate) return null;

  const featureLabel = gate.featureLabel || "This feature";
  const benefit =
    gate.benefit || "Unlock all standard AI agents, export, regenerate, and higher limits.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-dark-bg"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary-500/20 bg-primary-500/10 text-primary-600 dark:text-primary-300">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="upgrade-modal-title"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                Upgrade to Pro
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
                Unlock {featureLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
            aria-label="Close upgrade modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-slate-600 dark:text-white/60">
          {gate.message ||
            `${featureLabel} is available on Pro and Pro+ plans.`}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-white/60">
          {benefit}
        </p>

        <Link
          href="/pricing"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade
        </Link>
      </div>
    </div>
  );
}
