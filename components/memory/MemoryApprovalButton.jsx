"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

export default function MemoryApprovalButton({
  campaignId,
  eventId,
  onApproved,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const approve = async (event) => {
    event.stopPropagation();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/memory/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, eventId }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Memory event could not be approved.");
      }

      onApproved?.(data.event);
    } catch (approvalError) {
      setError(
        approvalError.message || "Memory event could not be approved.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-none flex-col items-end gap-1">
      <button
        type="button"
        onClick={approve}
        disabled={loading}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/15"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        {loading ? "Approving..." : "Approve"}
      </button>
      {error && (
        <span
          className="max-w-40 text-right text-[10px] leading-4 text-rose-600 dark:text-rose-300"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}

