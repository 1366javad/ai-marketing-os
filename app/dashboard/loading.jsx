export default function DashboardLoading() {
  return (
    <div className="w-full animate-pulse space-y-5 pt-2">
      <div className="h-7 w-44 rounded-lg bg-slate-200/70 dark:bg-white/10" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-white/[0.06]" />
        <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-white/[0.06]" />
        <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-white/[0.06]" />
      </div>
      <div className="h-80 rounded-2xl bg-slate-200/50 dark:bg-white/[0.04]" />
    </div>
  );
}
