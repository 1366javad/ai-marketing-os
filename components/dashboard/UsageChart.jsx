"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tabs = ["credits", "tokens", "requests"];

export default function UsageChart({ usage = [] }) {
  const [activeTab, setActiveTab] = useState("credits");
  const chartData = useMemo(() => buildDailyUsage(usage), [usage]);
  const hasUsage = usage.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Daily AI Consumption
          </h3>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            Daily breakdown
          </p>
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200 ${
                activeTab === tab
                  ? "bg-[#3B3CFF] text-white shadow"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[220px] min-w-0 w-full">
        {!hasUsage ? (
          <div className="flex h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center dark:border-gray-800">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No usage recorded yet.
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-400 dark:text-slate-500">
              Run your first AI generation to start tracking credits, requests,
              and providers.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220} minWidth={0}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B3CFF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B3CFF" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="rgba(0,0,0,0.05)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="name"
                dy={10}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(value) => `${value}`}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.95)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                itemStyle={{ color: "#3B3CFF" }}
                labelStyle={{ color: "#1e293b", fontWeight: "bold" }}
              />
              <Area
                activeDot={{ r: 6, stroke: "#3B3CFF", strokeWidth: 2 }}
                dataKey={activeTab}
                dot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                fill="url(#colorGrad)"
                fillOpacity={0.6}
                stroke="#3B3CFF"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function buildDailyUsage(usage) {
  const days = [];
  const eventsByDate = new Map();

  usage.forEach((event) => {
    const date = new Date(event.createdAt);
    if (Number.isNaN(date.getTime())) return;

    const key = toDateKey(date);
    const current = eventsByDate.get(key) || {
      credits: 0,
      tokens: 0,
      requests: 0,
    };
    current.credits += Number(event.credits || 0);
    current.tokens += Number(event.tokens || 0);
    current.requests += 1;
    eventsByDate.set(key, current);
  });

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const totals = eventsByDate.get(toDateKey(date)) || {
      credits: 0,
      tokens: 0,
      requests: 0,
    };

    days.push({
      name: date.toLocaleDateString([], { weekday: "short" }),
      ...totals,
    });
  }

  return days;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
