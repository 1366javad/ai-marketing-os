const {
  DEFAULT_WORKFLOW,
  HEALTH_WEIGHTS,
  TASK_ALIASES,
} = require("./contracts");

const SHARED_ARTIFACTS = new Set([
  "blog_draft",
  "email_draft",
  "creative_concept",
  "image_asset",
  "ad_copy",
]);

function buildCampaignIntelligence(snapshot) {
  const workflow = resolveWorkflow(snapshot.campaign?.campaign_plan);
  const events = resolveActiveEvents(snapshot.memoryEvents || []);
  const outputs = snapshot.outputs || [];
  const assets = snapshot.assets || [];
  const workflowProgress = workflow.map((step, index) =>
    evaluateWorkflowStep(step, index, events, outputs, assets),
  );
  const nextAction = resolveNextAction(workflowProgress);
  const metrics = calculateMetrics({
    campaign: snapshot.campaign || {},
    workflowProgress,
    events,
    outputs,
    assets,
  });
  const explainability = buildExplainability({
    metrics,
    workflowProgress,
    events,
  });

  return {
    campaign: summarizeCampaign(snapshot.campaign || {}),
    metrics,
    nextAction,
    workflowProgress,
    approvalQueue: events
      .filter((event) => event.approval_status === "pending")
      .map(mapApprovalItem),
    risksAndGaps: buildRisksAndGaps({
      workflowProgress,
      events,
      campaign: snapshot.campaign || {},
    }),
    modules: buildModuleReadiness(workflowProgress),
    technical: buildTechnicalDetails({ events, outputs, assets }),
    explainability,
    generatedAt: new Date().toISOString(),
  };
}

function resolveWorkflow(planValue) {
  const plan =
    planValue && typeof planValue === "object" ? planValue : {};
  const workflow = Array.isArray(plan.recommendedWorkflow)
    ? plan.recommendedWorkflow.filter(
        (step) => step?.module && step?.task && step?.label,
      )
    : [];
  return workflow.length > 0 ? workflow : [...DEFAULT_WORKFLOW];
}

function resolveActiveEvents(rows) {
  const superseded = new Set(rows.map((row) => row.supersedes).filter(Boolean));
  return rows.filter(
    (row) =>
      !superseded.has(row.id) &&
      row.payload?.deleted !== true &&
      row.approval_status !== "rejected",
  );
}

function evaluateWorkflowStep(step, index, events, outputs, assets) {
  const artifact = normalizeTask(step.task);
  const matchingEvents = events.filter(
    (event) =>
      event.module === step.module &&
      matchesWorkflowIdentity(step, artifact, {
        artifact: event.artifact || event.type,
        task: event.task || event.payload?.task,
      }),
  );
  const matchingOutputs = outputs.filter(
    (output) =>
      output.module === step.module &&
      matchesWorkflowIdentity(step, artifact, {
        artifact: output.metadata?.memoryEvent?.artifact || output.type,
        task:
          output.metadata?.memoryEvent?.task ||
          output.metadata?.memoryEvent?.payload?.task ||
          output.type,
      }),
  );
  const matchingAssets = assets.filter(
    (asset) =>
      normalizeModule(asset.module) === step.module &&
      matchesWorkflowIdentity(step, artifact, {
        artifact: asset.artifact || asset.outputType || asset.type,
        task: asset.task || asset.outputType || asset.type,
      }),
  );
  const readyEvent = matchingEvents.find((event) =>
    ["approved", "auto_saved"].includes(event.approval_status),
  );
  const pendingEvent = matchingEvents.find(
    (event) => event.approval_status === "pending",
  );
  const status = readyEvent
    ? "complete"
    : pendingEvent
      ? "pending"
      : matchingOutputs.length > 0 || matchingAssets.length > 0
        ? "draft"
        : "missing";

  return {
    index,
    module: step.module,
    task: step.task,
    artifact,
    label: step.label,
    status,
    generated: matchingEvents.length + matchingOutputs.length > 0,
    assetReady: Boolean(
      readyEvent || matchingOutputs.length > 0 || matchingAssets.length > 0,
    ),
    eventId: readyEvent?.id || pendingEvent?.id || null,
  };
}

function matchesWorkflowIdentity(step, expectedArtifact, candidate) {
  const candidateArtifact = normalizeTask(candidate.artifact);
  if (candidateArtifact !== expectedArtifact) return false;
  if (!SHARED_ARTIFACTS.has(expectedArtifact)) return true;

  const expectedTask = normalizeKey(step.task);
  const candidateTask = normalizeKey(candidate.task);
  return !candidateTask || candidateTask === expectedTask;
}

function resolveNextAction(workflowProgress) {
  const next =
    workflowProgress.find((step) => step.status === "pending") ||
    workflowProgress.find((step) => step.status === "missing") ||
    workflowProgress.find((step) => step.status === "draft");

  if (!next) {
    return {
      type: "ready",
      title: "Campaign workflow is ready",
      description:
        "Every planned workflow step has an approved or auto-saved artifact.",
      module: null,
      task: null,
    };
  }

  if (next.status === "pending") {
    return {
      type: "approve",
      title: `Review ${next.label}`,
      description:
        "This artifact exists but must be approved before the workflow can advance.",
      module: next.module,
      task: next.task,
      eventId: next.eventId,
    };
  }

  return {
    type: "generate",
    title: `Generate ${next.label}`,
    description:
      "This is the earliest incomplete step in the campaign workflow.",
    module: next.module,
    task: next.task,
  };
}

function calculateMetrics({ campaign, workflowProgress, events, outputs, assets }) {
  const workflowCompletion = percentage(
    workflowProgress.filter((step) => step.status === "complete").length,
    workflowProgress.length,
  );
  const approvalReadiness = percentage(
    events.filter((event) =>
      ["approved", "auto_saved"].includes(event.approval_status),
    ).length,
    events.length,
  );
  const assetReadiness = percentage(
    workflowProgress.filter((step) => step.assetReady).length,
    workflowProgress.length,
  );
  const contextFields = [
    campaign.goal,
    campaign.audience || campaign.target_audience,
    campaign.industry || campaign.category,
    campaign.product_name || campaign.offer || campaign.name,
  ];
  const contextCompleteness = percentage(
    contextFields.filter((value) => String(value || "").trim()).length,
    contextFields.length,
  );
  const moduleGroups = new Map();
  for (const step of workflowProgress) {
    const group = moduleGroups.get(step.module) || [];
    group.push(step);
    moduleGroups.set(step.module, group);
  }
  const moduleReadiness = percentage(
    [...moduleGroups.values()].filter((steps) =>
      steps.every((step) => step.status === "complete"),
    ).length,
    moduleGroups.size,
  );
  const campaignHealth = Math.round(
    workflowCompletion * HEALTH_WEIGHTS.workflowCompletion +
      approvalReadiness * HEALTH_WEIGHTS.approvalReadiness +
      assetReadiness * HEALTH_WEIGHTS.assetReadiness +
      contextCompleteness * HEALTH_WEIGHTS.contextCompleteness,
  );

  return {
    campaignHealth,
    workflowCompletion,
    moduleReadiness,
    approvalReadiness,
    assetReadiness,
    contextCompleteness,
    generatedOutputs: events.length + outputs.length,
    totalAssets: assets.length,
    exportedAssets: assets.filter(
      (asset) => normalizeModule(asset.module) === "exports",
    ).length,
    memoryCoverage: percentage(
      new Set(events.map((event) => event.module).filter(Boolean)).size,
      5,
    ),
  };
}

function buildExplainability({ metrics, workflowProgress, events }) {
  return {
    title: `Why is Campaign Health ${metrics.campaignHealth}%?`,
    formula: [
      {
        label: "Workflow Completion",
        value: metrics.workflowCompletion,
        weight: 45,
      },
      {
        label: "Approval Readiness",
        value: metrics.approvalReadiness,
        weight: 25,
      },
      {
        label: "Asset Readiness",
        value: metrics.assetReadiness,
        weight: 20,
      },
      {
        label: "Context Completeness",
        value: metrics.contextCompleteness,
        weight: 10,
      },
    ],
    evidence: workflowProgress.map((step) => ({
      label: step.label,
      module: step.module,
      status: step.status,
      reason: explainStep(step),
    })),
    approvalEvidence: {
      approved: events.filter((event) => event.approval_status === "approved")
        .length,
      autoSaved: events.filter(
        (event) => event.approval_status === "auto_saved",
      ).length,
      pending: events.filter((event) => event.approval_status === "pending")
        .length,
    },
  };
}

function buildRisksAndGaps({ workflowProgress, events, campaign }) {
  const gaps = workflowProgress
    .filter((step) => step.status !== "complete")
    .map((step) => ({
      severity: step.status === "pending" ? "medium" : "high",
      title:
        step.status === "pending"
          ? `${step.label} awaits approval`
          : `${step.label} is missing`,
      description:
        step.status === "pending"
          ? "Downstream agents cannot use this artifact until it is approved."
          : "The campaign workflow cannot count this step as complete.",
    }));

  if (!campaign.goal) {
    gaps.unshift({
      severity: "high",
      title: "Campaign goal is missing",
      description: "Generation and readiness decisions need a campaign goal.",
    });
  }
  if (events.some((event) => event.risk_level === "high")) {
    gaps.push({
      severity: "medium",
      title: "High-risk artifacts require review",
      description:
        "SEO strategy and ad copy should remain human-approved before use.",
    });
  }
  return gaps.slice(0, 8);
}

function buildModuleReadiness(workflowProgress) {
  const groups = new Map();
  for (const step of workflowProgress) {
    const current = groups.get(step.module) || [];
    current.push(step);
    groups.set(step.module, current);
  }
  return [...groups.entries()].map(([module, steps]) => ({
    module,
    ready: steps.filter((step) => step.status === "complete").length,
    total: steps.length,
    percentage: percentage(
      steps.filter((step) => step.status === "complete").length,
      steps.length,
    ),
  }));
}

function buildTechnicalDetails({ events, outputs, assets }) {
  const providers = {};
  const risks = { low: 0, medium: 0, high: 0 };
  let confidenceTotal = 0;
  let confidenceCount = 0;
  let tokenUsage = 0;
  let generationTimeMs = 0;

  for (const event of events) {
    const provider =
      event.payload?.provider || event.payload?.metadata?.provider || "unknown";
    providers[provider] = (providers[provider] || 0) + 1;
    if (risks[event.risk_level] !== undefined) risks[event.risk_level] += 1;
    if (Number.isFinite(Number(event.confidence))) {
      confidenceTotal += Number(event.confidence);
      confidenceCount += 1;
    }
    tokenUsage += Number(event.payload?.usage?.totalTokens || 0);
    generationTimeMs += Number(event.payload?.generationTimeMs || 0);
  }

  return {
    providers,
    risks,
    averageConfidence: confidenceCount
      ? Math.round((confidenceTotal / confidenceCount) * 100)
      : null,
    tokenUsage: tokenUsage || null,
    generationTimeMs: generationTimeMs || null,
    sourceCounts: {
      memoryEvents: events.length,
      outputs: outputs.length,
      assets: assets.length,
    },
  };
}

function mapApprovalItem(event) {
  return {
    id: event.id,
    module: event.module,
    artifact: event.artifact || event.task || event.type,
    title: event.payload?.title || event.summary || "Pending artifact",
    riskLevel: event.risk_level || "medium",
    createdAt: event.created_at || "",
  };
}

function summarizeCampaign(campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    goal: campaign.goal || "",
    audience: campaign.audience || campaign.target_audience || "",
    industry: campaign.industry || campaign.category || "",
    offer: campaign.product_name || campaign.offer || campaign.name || "",
    status: campaign.status || "draft",
    createdAt: campaign.created_at || "",
    updatedAt: campaign.updated_at || "",
  };
}

function explainStep(step) {
  if (step.status === "complete") {
    return "Approved or auto-saved artifact is available.";
  }
  if (step.status === "pending") {
    return "Artifact exists but is waiting for approval.";
  }
  if (step.status === "draft") {
    return "A draft or exported asset exists without approved memory.";
  }
  return "No matching artifact was found.";
}

function normalizeTask(value) {
  const key = normalizeKey(value);
  return TASK_ALIASES[key] || key;
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeModule(value) {
  return String(value || "").trim().toLowerCase();
}

function percentage(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

module.exports = {
  buildCampaignIntelligence,
  calculateMetrics,
  resolveNextAction,
  resolveWorkflow,
};
