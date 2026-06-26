export function normalizeUsageEvents(rows = [], campaigns = []) {
  const campaignNames = new Map(
    campaigns.map((campaign) => [campaign.id, campaign.name]),
  );

  return rows.map((row) => {
    const actionParts = String(row.action || "").split(":");
    const moduleName = clean(row.module || actionParts[0] || "unknown");
    const artifact = clean(row.artifact || actionParts[1] || row.action);
    const inputTokens = number(row.input_tokens);
    const outputTokens = number(row.output_tokens);
    const tokens = number(
      row.total_tokens ?? row.tokens_used ?? inputTokens + outputTokens,
    );

    return {
      id: row.id,
      userId: row.user_id,
      campaignId: row.campaign_id || null,
      campaignName:
        clean(row.campaign_name) ||
        clean(row.metadata?.campaignName) ||
        campaignNames.get(row.campaign_id) ||
        "No campaign",
      module: moduleName || "unknown",
      artifact: artifact || "generation",
      provider: clean(row.provider || row.model) || "unknown",
      model: clean(row.model) || "unknown",
      status: normalizeStatus(row.status),
      inputTokens,
      outputTokens,
      tokens,
      credits: number(row.credits_used),
      latencyMs: number(row.latency_ms),
      providerReportedTokens: Boolean(row.provider_reported_tokens),
      source: clean(row.source || "legacy"),
      createdAt: row.created_at,
    };
  });
}

export function summarizeUsage(events = []) {
  return events.reduce(
    (summary, event) => {
      summary.requests += 1;
      summary.tokens += number(event.tokens);
      summary.credits += number(event.credits);
      summary.providers.add(event.provider || "unknown");
      return summary;
    },
    {
      requests: 0,
      tokens: 0,
      credits: 0,
      providers: new Set(),
    },
  );
}

function normalizeStatus(value) {
  const status = clean(value).toLowerCase();
  return ["completed", "failed", "fallback", "running"].includes(status)
    ? status
    : "completed";
}

function clean(value) {
  return String(value || "").trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
