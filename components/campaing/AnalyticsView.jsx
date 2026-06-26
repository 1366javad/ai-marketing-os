"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  FileCheck2,
  Gauge,
  Layers3,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";

export default function AnalyticsView({
  campaigns = [],
  selectedCampaignId = "",
  intelligence,
}) {
  const router = useRouter();
  const [showExplainability, setShowExplainability] = useState(false);

  const selectCampaign = (campaignId) => {
    if (!campaignId) {
      router.push("/dashboard/analytics");
      return;
    }
    router.push(`/dashboard/analytics?campaignId=${campaignId}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-primary-600 dark:text-primary-300">
            <BarChart3 className="h-4 w-4" />
            AI Campaign Intelligence
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            Campaign Mission Control
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-white/45">
            Explainable readiness, workflow gaps, approvals, and the next
            deterministic action for your campaign.
          </p>
        </div>
        <label className="min-w-64 text-xs font-medium text-slate-500 dark:text-white/45">
          Campaign
          <select
            value={selectedCampaignId}
            onChange={(event) => selectCampaign(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-white/10 dark:bg-dark-surface dark:text-white"
          >
            <option value="">Select a campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {!intelligence ? (
        <EmptyState hasCampaigns={campaigns.length > 0} />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
            <HealthPanel intelligence={intelligence} />
            <NextActionPanel
              action={intelligence.nextAction}
              campaignId={intelligence.campaign.id}
              router={router}
            />
          </section>

          <MetricGrid metrics={intelligence.metrics} />
          <WorkflowProgress steps={intelligence.workflowProgress} />

          <section className="grid gap-5 lg:grid-cols-2">
            <ApprovalQueue items={intelligence.approvalQueue} />
            <RisksAndGaps items={intelligence.risksAndGaps} />
          </section>

          <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <ModuleReadiness modules={intelligence.modules} />
            <TechnicalDetails technical={intelligence.technical} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.025]">
            <button
              type="button"
              onClick={() => setShowExplainability((value) => !value)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Explainability
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-white/40">
                  {intelligence.explainability.title}
                </div>
              </div>
              {showExplainability ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {showExplainability && (
              <Explainability data={intelligence.explainability} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function EmptyState({ hasCampaigns }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 px-8 text-center dark:border-white/10">
      <Gauge className="h-8 w-8 text-primary-500" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
        Select a campaign to evaluate
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-white/45">
        {hasCampaigns
          ? "Campaign Intelligence uses real campaign state, memory, approvals, outputs, and assets. No sample score is shown."
          : "Create a campaign first. Analytics never displays synthetic readiness data."}
      </p>
    </div>
  );
}

function HealthPanel({ intelligence }) {
  const health = intelligence.metrics.campaignHealth;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.025]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-white/40">
            Campaign Health
          </div>
          <div className="mt-2 text-4xl font-semibold text-slate-900 dark:text-white">
            {health}%
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-400/10 dark:text-primary-300">
          <Gauge className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
        <div
          className="h-full bg-primary-600"
          style={{ width: `${health}%` }}
        />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-white/45">
        Weighted from workflow completion, approvals, asset readiness, and
        campaign context completeness.
      </p>
    </article>
  );
}

function NextActionPanel({ action, campaignId, router }) {
  const openAction = () => {
    if (!action.module) return;
    const taskParams = {
      content: `&type=${action.task || ""}`,
      creative: `&creativeTask=${action.task || ""}`,
      ads: `&adsTask=${action.task || ""}`,
      video: `&videoTask=${action.task || ""}`,
    };
    router.push(
      `/dashboard/campaings/${campaignId}?tab=${action.module}${
        taskParams[action.module] || ""
      }`,
    );
  };

  return (
    <article className="rounded-lg border border-primary-200 bg-primary-50/60 p-5 dark:border-primary-400/20 dark:bg-primary-400/[0.06]">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-primary-700 dark:text-primary-300">
        <Sparkles className="h-4 w-4" />
        Recommended Next Action
      </div>
      <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
        {action.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/50">
        {action.description}
      </p>
      {action.module && (
        <button
          type="button"
          onClick={openAction}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Open {titleCase(action.module)}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </article>
  );
}

function MetricGrid({ metrics }) {
  const items = [
    ["Workflow Completion", metrics.workflowCompletion, Target],
    ["Module Readiness", metrics.moduleReadiness, Layers3],
    ["Asset Readiness", metrics.assetReadiness, FileCheck2],
    ["Approval Status", metrics.approvalReadiness, ShieldAlert],
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value, Icon]) => (
        <article
          key={label}
          className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.025]"
        >
          <Icon className="h-4 w-4 text-primary-500" />
          <div className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
            {value}%
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-white/40">
            {label}
          </div>
        </article>
      ))}
    </section>
  );
}

function WorkflowProgress({ steps }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.025]">
      <SectionHeader title="Workflow Progress" subtitle="Plan compared with real campaign artifacts." />
      <div className="mt-4 divide-y divide-slate-200 dark:divide-white/[0.08]">
        {steps.map((step) => (
          <div key={`${step.module}-${step.task}`} className="flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <StatusIcon status={step.status} />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {step.label}
                </div>
                <div className="text-xs capitalize text-slate-500 dark:text-white/40">
                  {step.module}
                </div>
              </div>
            </div>
            <StatusLabel status={step.status} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ApprovalQueue({ items }) {
  return (
    <Panel title="Approval Queue" subtitle="Pending artifacts are blocked from downstream agents.">
      {items.length ? (
        items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 border-t border-slate-200 py-3 first:border-t-0 dark:border-white/[0.08]">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</div>
              <div className="mt-1 text-xs capitalize text-slate-500 dark:text-white/40">{item.module} / {titleCase(item.artifact)}</div>
            </div>
            <span className="text-xs capitalize text-amber-600 dark:text-amber-300">{item.riskLevel} risk</span>
          </div>
        ))
      ) : (
        <EmptyLine text="No artifacts are waiting for approval." />
      )}
    </Panel>
  );
}

function RisksAndGaps({ items }) {
  return (
    <Panel title="Risks & Gaps" subtitle="Deterministic blockers found in campaign state.">
      {items.length ? (
        items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="flex gap-3 border-t border-slate-200 py-3 first:border-t-0 dark:border-white/[0.08]">
            <AlertTriangle className={`mt-0.5 h-4 w-4 flex-none ${item.severity === "high" ? "text-rose-500" : "text-amber-500"}`} />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</div>
              <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/40">{item.description}</div>
            </div>
          </div>
        ))
      ) : (
        <EmptyLine text="No workflow gaps detected." />
      )}
    </Panel>
  );
}

function ModuleReadiness({ modules }) {
  return (
    <Panel title="Module Readiness" subtitle="Completed planned steps by module.">
      <div className="space-y-4">
        {modules.map((module) => (
          <div key={module.module}>
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize text-slate-700 dark:text-white/65">{module.module}</span>
              <span className="text-slate-500 dark:text-white/40">{module.ready}/{module.total}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
              <div className="h-full bg-primary-600" style={{ width: `${module.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TechnicalDetails({ technical }) {
  const providerSummary = Object.entries(technical.providers || {})
    .map(([provider, count]) => `${provider}: ${count}`)
    .join(", ");
  const riskSummary = Object.entries(technical.risks || {})
    .map(([risk, count]) => `${risk}: ${count}`)
    .join(", ");

  return (
    <Panel title="Technical Details" subtitle="Operational evidence, not readiness predictions.">
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <Detail label="Memory Events" value={technical.sourceCounts.memoryEvents} />
        <Detail label="Fallback Outputs" value={technical.sourceCounts.outputs} />
        <Detail label="Stored Assets" value={technical.sourceCounts.assets} />
        <Detail label="Avg. Confidence" value={technical.averageConfidence == null ? "Not recorded" : `${technical.averageConfidence}%`} />
        <Detail label="Token Usage" value={technical.tokenUsage ?? "Not recorded"} />
        <Detail label="Generation Time" value={technical.generationTimeMs == null ? "Not recorded" : `${technical.generationTimeMs} ms`} />
        <Detail label="Providers" value={providerSummary || "Not recorded"} />
        <Detail label="Risk Distribution" value={riskSummary || "Not recorded"} />
      </dl>
    </Panel>
  );
}

function Explainability({ data }) {
  return (
    <div className="border-t border-slate-200 px-5 py-5 dark:border-white/[0.08]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.formula.map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
            <div className="text-xs text-slate-500 dark:text-white/40">{item.label}</div>
            <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{item.value}%</div>
            <div className="text-[11px] text-slate-400 dark:text-white/30">Weight {item.weight}%</div>
          </div>
        ))}
      </div>
      <div className="mt-5 divide-y divide-slate-200 dark:divide-white/[0.08]">
        {data.evidence.map((item) => (
          <div key={`${item.module}-${item.label}`} className="flex items-start gap-3 py-3">
            <StatusIcon status={item.status} />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-white/40">{item.reason}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.025]">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-white/40">{subtitle}</p>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === "complete") return <Check className="h-4 w-4 text-emerald-500" />;
  if (status === "pending") return <Clock3 className="h-4 w-4 text-amber-500" />;
  return <Circle className="h-4 w-4 text-slate-400" />;
}

function StatusLabel({ status }) {
  const styles = {
    complete: "text-emerald-600 dark:text-emerald-300",
    pending: "text-amber-600 dark:text-amber-300",
    draft: "text-sky-600 dark:text-sky-300",
    missing: "text-slate-500 dark:text-white/40",
  };
  return <span className={`text-xs capitalize ${styles[status]}`}>{status}</span>;
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-white/40">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function EmptyLine({ text }) {
  return <div className="py-5 text-sm text-slate-500 dark:text-white/40">{text}</div>;
}

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
