function emitKnowledgeLifecycleEvent(logger, event) {
  const safeEvent = Object.freeze({
    correlationId: event.correlationId || null,
    businessId: event.businessId,
    sourceId: event.sourceId || null,
    candidateId: event.candidateId || null,
    stage: event.stage,
    processorVersion: event.processorVersion || null,
    inputCount: Number(event.inputCount || 0),
    outputCount: Number(event.outputCount || 0),
    warningCount: Number(event.warningCount || 0),
    errorCategory: event.errorCategory || null,
    retryable: event.retryable ?? null,
    durationMs: Number(event.durationMs || 0),
  });
  (logger || console).info("KNOWLEDGE_LIFECYCLE", safeEvent);
  return safeEvent;
}

module.exports = { emitKnowledgeLifecycleEvent };
