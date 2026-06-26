function getProviderMetadata(providerResult = {}) {
  const usage = providerResult.usage || {};

  return {
    provider: providerResult.provider || "unknown",
    model: providerResult.model || "unknown",
    latencyMs: Number(providerResult.latencyMs || 0),
    usedFallback: Boolean(providerResult.usedFallback),
    usage: {
      inputTokens: Number(usage.inputTokens || 0),
      outputTokens: Number(usage.outputTokens || 0),
      totalTokens: Number(usage.totalTokens || 0),
    },
  };
}

module.exports = { getProviderMetadata };
