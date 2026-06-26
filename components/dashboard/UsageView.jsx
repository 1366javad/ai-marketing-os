"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Cpu,
  Download,
  Layers3,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import UsageChart from "./UsageChart";

const timeRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];

const moduleColors = {
  research: "bg-sky-500",
  seo: "bg-emerald-500",
  content: "bg-violet-500",
  creative: "bg-rose-500",
  ads: "bg-amber-500",
  video: "bg-cyan-500",
  unknown: "bg-slate-400",
};

function UsageView({
  usage = [],
  plan = {
    name: "Free Plan",
    dailyCredits: 100,
    todayCredits: 0,
    remainingCredits: 100,
  },
}) {
  const [timeRange, setTimeRange] = useState("Last 7 days");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);

  const filteredUsage = useMemo(() => {
    const startDate = getStartDate(timeRange);
    if (!startDate) return usage;

    return usage.filter((event) => {
      const createdAt = new Date(event.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= startDate;
    });
  }, [timeRange, usage]);

  const filteredStats = useMemo(
    () => summarizeEvents(filteredUsage),
    [filteredUsage],
  );
  const periodStats = useMemo(
    () => [
      { label: "Today", ...summarizeEvents(filterSince(usage, startOfToday())) },
      {
        label: "This Week",
        ...summarizeEvents(filterSince(usage, startOfWeek())),
      },
      {
        label: "This Month",
        ...summarizeEvents(filterSince(usage, startOfMonth())),
      },
    ],
    [usage],
  );
  const moduleUsage = useMemo(
    () => groupUsage(filteredUsage, "module"),
    [filteredUsage],
  );
  const providerUsage = useMemo(
    () => groupUsage(filteredUsage, "provider"),
    [filteredUsage],
  );
  const recentActivity = filteredUsage.slice(0, 8);

  const statsCards = [
    {
      icon: CircleDollarSign,
      color: "from-[#3B3CFF] to-[#7B5CFF]",
      value: filteredStats.credits.toLocaleString(),
      label: "Credits Used",
      desc: timeRange,
    },
    {
      icon: Cpu,
      color: "from-purple-500 to-pink-500",
      value: filteredStats.tokens.toLocaleString(),
      label: "Tokens Used",
      desc: "Provider-reported tokens",
    },
    {
      icon: Activity,
      color: "from-[#FF6B6B] to-[#FF8E53]",
      value: filteredStats.requests.toLocaleString(),
      label: "Requests",
      desc: "Recorded AI events",
    },
    {
      icon: Server,
      color: "from-emerald-500 to-teal-500",
      value: filteredStats.providers,
      label: "Providers",
      desc: "Active in this period",
    },
  ];

  function handleExportCsv() {
    const headers = [
      "Time",
      "Campaign",
      "Module",
      "Artifact",
      "Provider",
      "Model",
      "Credits",
      "Tokens",
      "Status",
    ];
    const rows = filteredUsage.map((event) => [
      formatDateTime(event.createdAt),
      event.campaignName,
      event.module,
      event.artifact,
      event.provider,
      event.model,
      event.credits,
      event.tokens,
      event.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `usage-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="flex-1 p-6">
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 transition-colors duration-300 dark:bg-gray-800/70 dark:text-slate-100">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Usage
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Account consumption across AI modules and providers.
              </p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTimeRangeOpen((current) => !current)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700"
              >
                {timeRange}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isTimeRangeOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isTimeRangeOpen && (
                <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {timeRanges.map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => {
                        setTimeRange(range);
                        setIsTimeRangeOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        timeRange === range
                          ? "bg-indigo-50 font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <section className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B3CFF] to-[#7B5CFF] shadow-lg shadow-indigo-500/25">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {plan.name}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-gray-800 dark:text-slate-400">
                    DAILY CREDITS
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Today: {Number(plan.todayCredits || 0).toLocaleString()} /{" "}
                  {Number(plan.dailyCredits || 0).toLocaleString()} credits used.
                </p>
              </div>
            </div>

            <div className="min-w-[220px]">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Remaining Today
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {Number(plan.remainingCredits || 0).toLocaleString()} credits
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Resets tomorrow
              </p>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {periodStats.map((period) => (
              <div
                key={period.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {period.label}
                </h2>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <Metric label="Credits" value={period.credits} />
                  <Metric label="Tokens" value={period.tokens} />
                  <Metric label="Requests" value={period.requests} />
                </div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
              >
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg ${stat.color}`}
                >
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <p className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {stat.label}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {stat.desc}
                </p>
              </div>
            ))}
          </section>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 dark:border-gray-800 dark:bg-gray-900">
            <UsageChart usage={filteredUsage} />
          </div>

          <section className="grid gap-6 lg:grid-cols-2">
            <UsageBreakdown
              icon={Layers3}
              title="Module Usage"
              description="Requests by AI workspace"
              rows={moduleUsage}
              colorFor={(name) => moduleColors[name] || moduleColors.unknown}
            />
            <UsageBreakdown
              icon={Server}
              title="Provider Usage"
              description="Final provider that completed each request"
              rows={providerUsage}
              colorFor={() => "bg-[#3B3CFF]"}
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-gray-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Recent Activity
                </h2>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  Latest account-level AI consumption events
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-800/50">
                    {[
                      "Time",
                      "Campaign",
                      "Module",
                      "Provider",
                      "Credits",
                      "Tokens",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Clock className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No usage recorded
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          New Agent V2 generations will appear here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    recentActivity.map((event, index) => (
                      <tr
                        key={event.id || `${event.createdAt}-${index}`}
                        className="border-t border-slate-100 transition hover:bg-indigo-50/40 dark:border-gray-800 dark:hover:bg-indigo-950/30"
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(event.createdAt)}
                        </td>
                        <td className="max-w-[180px] truncate px-5 py-3.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {event.campaignName}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-2 text-xs font-medium capitalize text-slate-700 dark:text-slate-300">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                moduleColors[event.module] ||
                                moduleColors.unknown
                              }`}
                            />
                            {formatLabel(event.module)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600 dark:bg-gray-800 dark:text-slate-400">
                            {event.provider}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                          {event.credits.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">
                          {event.tokens.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={event.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="flex flex-col items-center justify-between gap-3 pb-4 pt-2 sm:flex-row">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Usage events are recorded after each completed generation.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </footer>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
        {Number(value || 0).toLocaleString()}
      </p>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  );
}

function UsageBreakdown({ icon: Icon, title, description, rows, colorFor }) {
  const maximum = Math.max(...rows.map((row) => row.requests), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-800">
          <Icon className="h-4 w-4 text-[#3B3CFF]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            No usage available for this period.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="text-sm font-medium capitalize text-slate-700 dark:text-slate-300">
                  {formatLabel(row.name)}
                </span>
                <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
                  {row.requests} requests · {row.credits} credits
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full ${colorFor(row.name)}`}
                  style={{ width: `${(row.requests / maximum) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    completed:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    fallback:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    failed: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    running:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] || styles.completed
      }`}
    >
      <CheckCircle2 className="h-3 w-3" />
      {formatLabel(status)}
    </span>
  );
}

function summarizeEvents(events) {
  const providers = new Set();
  const summary = events.reduce(
    (result, event) => {
      result.requests += 1;
      result.tokens += Number(event.tokens || 0);
      result.credits += Number(event.credits || 0);
      if (event.provider) providers.add(event.provider);
      return result;
    },
    { requests: 0, tokens: 0, credits: 0 },
  );

  return { ...summary, providers: providers.size };
}

function groupUsage(events, key) {
  const groups = new Map();

  events.forEach((event) => {
    const name = event[key] || "unknown";
    const current = groups.get(name) || {
      name,
      requests: 0,
      tokens: 0,
      credits: 0,
    };
    current.requests += 1;
    current.tokens += Number(event.tokens || 0);
    current.credits += Number(event.credits || 0);
    groups.set(name, current);
  });

  return [...groups.values()].sort((a, b) => b.requests - a.requests);
}

function getStartDate(range) {
  if (range === "All time") return null;
  const date = new Date();
  const days = range === "Last 7 days" ? 7 : range === "Last 30 days" ? 30 : 90;
  date.setDate(date.getDate() - days);
  return date;
}

function filterSince(events, startDate) {
  return events.filter((event) => {
    const date = new Date(event.createdAt);
    return !Number.isNaN(date.getTime()) && date >= startDate;
  });
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek() {
  const date = startOfToday();
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return date;
}

function startOfMonth() {
  const date = startOfToday();
  date.setDate(1);
  return date;
}

function formatLabel(value) {
  return String(value || "unknown")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default UsageView;
