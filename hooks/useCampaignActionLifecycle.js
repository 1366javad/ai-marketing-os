import { useCallback, useState } from "react";

import { getActionGate } from "@/app/lib/plans/planPolicy";

export function useCampaignActionLifecycle({ copyResetMs = 1600 } = {}) {
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);
  const [upgradeGate, setUpgradeGate] = useState(null);

  const setTaskLoading = useCallback((key, value) => {
    setLoading((current) => ({ ...current, [key]: value }));
  }, []);

  const clearTaskError = useCallback((key) => {
    setErrors((current) => ({ ...current, [key]: "" }));
  }, []);

  const setTaskError = useCallback((key, message) => {
    setErrors((current) => ({ ...current, [key]: message }));
  }, []);

  const copyToClipboard = useCallback(
    async (text) => {
      if (!text) return false;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), copyResetMs);
      return true;
    },
    [copyResetMs],
  );

  const ensureActionAllowed = useCallback(
    ({ plan, action }) => {
      const gate = getActionGate({ plan, action });

      if (!gate.allowed) {
        setUpgradeGate(gate);
        return false;
      }

      return true;
    },
    [],
  );

  return {
    loading,
    setLoading,
    setTaskLoading,
    errors,
    setErrors,
    clearTaskError,
    setTaskError,
    copied,
    setCopied,
    copyToClipboard,
    upgradeGate,
    setUpgradeGate,
    ensureActionAllowed,
  };
}
