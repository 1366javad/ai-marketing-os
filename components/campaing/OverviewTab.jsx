import {
  BarChart3,
  Building2,
  Check,
  Circle,
  Compass,
  Layers3,
  Package,
  Target,
  Users,
} from "lucide-react";

const PROFILE_ITEMS = [
  {
    key: "goal",
    title: "Campaign Goal",
    icon: Target,
    color:
      "bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300",
  },
  {
    key: "audience",
    title: "Target Audience",
    icon: Users,
    color:
      "bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300",
  },
  {
    key: "offer",
    title: "Offer",
    icon: Package,
    color:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  {
    key: "industry",
    title: "Industry",
    icon: Building2,
    color:
      "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
  },
];

export default function OverviewTab({ campaign, outputs = {} }) {
  const plan = normalizePlan(campaign.campaign_plan);
  const workflow = plan.recommendedWorkflow;
  const completedSteps = new Set(
    workflow
      .filter((step) => hasGeneratedOutput(outputs[step.module], step.task))
      .map((step) => workflowKey(step)),
  );
  const completedCount = completedSteps.size;
  const progress =
    workflow.length > 0
      ? Math.round((completedCount / workflow.length) * 100)
      : 0;

  const profile = {
    goal: campaign.goal,
    audience: campaign.audience || campaign.target_audience,
    offer: campaign.offer || campaign.product_name,
    industry: campaign.industry,
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5 dark:border-white/[0.08]">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-primary-600 dark:text-primary-300">
          <Compass className="h-4 w-4" />
          Campaign Summary
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {campaign.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-white/45">
              {plan.starter?.name
                ? `Started from the ${plan.starter.name} playbook.`
                : "Campaign profile and execution progress."}
            </p>
          </div>
          {workflow.length > 0 && (
            <div className="min-w-48">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-white/45">
                  Overall Progress
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {progress}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <section>
        <SectionTitle icon={Layers3} title="Campaign Profile" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROFILE_ITEMS.map(({ key, ...item }) => (
            <ProfileItem key={key} {...item} value={profile[key]} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="border-t border-slate-200 pt-5 dark:border-white/[0.08]">
          <SectionTitle icon={Compass} title="Channels" />
          {plan.channels.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.channels.map((channel) => (
                <span
                  key={channel}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/60"
                >
                  {channel}
                </span>
              ))}
            </div>
          ) : (
            <EmptyText>No campaign channels have been selected.</EmptyText>
          )}
        </div>

        <div className="border-t border-slate-200 pt-5 dark:border-white/[0.08]">
          <SectionTitle icon={BarChart3} title="Success Metrics" />
          {plan.successMetrics.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {plan.successMetrics.map((metric) => (
                <li
                  key={metric}
                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-white/60"
                >
                  <Target className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
                  {metric}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyText>No success metrics have been defined.</EmptyText>
          )}
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5 dark:border-white/[0.08]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle icon={Check} title="Recommended Workflow" />
          {workflow.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-white/40">
              {completedCount} of {workflow.length} completed
            </span>
          )}
        </div>

        {workflow.length > 0 ? (
          <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200 dark:divide-white/[0.08] dark:border-white/[0.08]">
            {workflow.map((step, index) => {
              const completed = completedSteps.has(workflowKey(step));

              return (
                <div
                  key={workflowKey(step)}
                  className="flex items-center gap-3 py-3"
                >
                  <span
                    className={
                      completed
                        ? "flex h-7 w-7 flex-none items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"
                        : "flex h-7 w-7 flex-none items-center justify-center rounded-full border border-slate-200 text-slate-400 dark:border-white/10 dark:text-white/30"
                    }
                  >
                    {completed ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-[11px] font-medium">{index + 1}</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-white/75">
                      {step.label}
                    </div>
                    <div className="mt-0.5 text-[11px] capitalize text-slate-400 dark:text-white/30">
                      {step.module}
                    </div>
                  </div>
                  <span
                    className={
                      completed
                        ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                        : "inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-white/30"
                    }
                  >
                    {!completed && <Circle className="h-3 w-3" />}
                    {completed ? "Generated" : "Not Generated"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyText>
            This campaign has no recommended workflow yet. Campaigns created
            from a Starter include one automatically.
          </EmptyText>
        )}
      </section>
    </div>
  );
}

function ProfileItem({ icon: Icon, title, value, color }) {
  return (
    <div className="border-t border-slate-200 pt-4 dark:border-white/[0.08]">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-xs font-medium text-slate-500 dark:text-white/45">
          {title}
        </h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-white/65">
        {value || "Not configured"}
      </p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/40">
      <Icon className="h-4 w-4" />
      {title}
    </div>
  );
}

function EmptyText({ children }) {
  return (
    <p className="mt-3 text-sm text-slate-400 dark:text-white/30">
      {children}
    </p>
  );
}

function normalizePlan(value) {
  const plan = value && typeof value === "object" ? value : {};

  return {
    starter:
      plan.starter && typeof plan.starter === "object" ? plan.starter : null,
    channels: Array.isArray(plan.channels) ? plan.channels : [],
    successMetrics: Array.isArray(plan.successMetrics)
      ? plan.successMetrics
      : [],
    recommendedWorkflow: Array.isArray(plan.recommendedWorkflow)
      ? plan.recommendedWorkflow.filter(
          (step) => step?.module && step?.task && step?.label,
        )
      : [],
  };
}

function hasGeneratedOutput(moduleOutputs, task) {
  if (!Array.isArray(moduleOutputs)) return false;
  const normalizedTask = normalizeTask(task);

  return moduleOutputs.some((output) => {
    const memoryPayload =
      output?.metadata?.memoryEvent?.payload ||
      output?.researchOutput ||
      output?.seoOutput ||
      output?.creativeOutput ||
      output?.adsOutput ||
      output?.videoOutput ||
      {};
    const approvalStatus = String(output?.approval_status || "").toLowerCase();

    if (
      approvalStatus === "rejected" ||
      memoryPayload?.deleted === true ||
      memoryPayload?.payload?.deleted === true
    ) {
      return false;
    }

    const outputTask = normalizeTask(
      output?.type ||
        output?.task ||
        output?.researchOutput?.type ||
        output?.seoOutput?.type ||
        output?.creativeOutput?.type ||
        output?.adsOutput?.type ||
        output?.videoOutput?.type,
    );

    return outputTask === normalizedTask;
  });
}

function workflowKey(step) {
  return `${step.module}:${step.task}`;
}

function normalizeTask(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}
