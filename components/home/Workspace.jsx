import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  Database,
  FileText,
  Lightbulb,
  Megaphone,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";

const activityItems = [
  "Analyzing market trends",
  "Scanning campaign performance",
  "Identifying growth opportunities",
  "Planning next best actions",
];

const navigation = [
  ["Brain", Brain],
  ["Strategy", Target],
  ["Content", FileText],
  ["Campaigns", Megaphone],
  ["Analytics", BarChart3],
  ["Knowledge", Database],
  ["Settings", Settings],
];

function UnderstandingGraphic() {
  return (
    <svg viewBox="0 0 120 100" className="mt-4 h-28 w-full" aria-hidden="true">
      <defs><radialGradient id="understanding-glow"><stop stopColor="#a78bfa" stopOpacity="0.5" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></radialGradient></defs>
      <circle cx="60" cy="52" r="38" fill="url(#understanding-glow)" opacity="0.18" />
      {[
        [10,22],[25,15],[41,24],[57,12],[74,21],[92,14],[108,26],[17,43],[34,39],[51,47],[67,36],[84,45],[102,40],[12,65],[29,59],[45,70],[61,62],[77,73],[94,61],[109,70],[22,84],[39,80],[57,88],[75,83],[96,86],
      ].map(([x, y], index) => <circle key={index} cx={x} cy={y} r={index % 5 === 0 ? "2.4" : "1.5"} fill={index % 4 === 0 ? "#c084fc" : "#8b5cf6"} />)}
      <path d="M10 22 25 15 41 24 57 12 74 21 92 14 108 26 M17 43 34 39 51 47 67 36 84 45 102 40 M12 65 29 59 45 70 61 62 77 73 94 61 109 70 M22 84 39 80 57 88 75 83 96 86 M25 15 34 39 29 59 22 84 M41 24 51 47 45 70 39 80 M57 12 67 36 61 62 57 88 M74 21 84 45 77 73 75 83 M92 14 102 40 94 61 96 86" fill="none" stroke="#7c3aed" strokeWidth="0.55" opacity="0.5" />
    </svg>
  );
}

function DecidingGraphic() {
  return (
    <svg viewBox="0 0 120 100" className="mt-4 h-28 w-full" aria-hidden="true">
      <path d="M8 50 H25 L36 31 H58 L69 19 H91 M25 50 L38 68 H59 L70 82 H93 M36 31 L50 50 38 68 M58 31 L70 50 59 68 M70 19 L82 36 70 50 82 65 70 82 M82 36 H105 M82 65 H105" fill="none" stroke="#6366f1" strokeWidth="1.4" opacity="0.85" />
      {[[8,50],[36,31],[50,50],[38,68],[70,19],[70,50],[70,82],[91,19],[105,36],[82,65],[105,65]].map(([x,y], index) => <g key={index}><circle cx={x} cy={y} r={index % 4 === 0 ? "7" : "6"} fill="#171a35" stroke="#6366f1" strokeWidth="1.5" /><circle cx={x} cy={y} r="2" fill="#c4b5fd" /></g>)}
    </svg>
  );
}

function PlanningGraphic() {
  return (
    <svg viewBox="0 0 120 100" className="mt-4 h-28 w-full" aria-hidden="true">
      <path d="M8 56 H26 L38 37 H63 L76 21 H98 M26 56 L40 75 H64 L78 57 H109 M38 37 L53 56 40 75 M63 37 L78 57 M76 21 L91 39 78 57" fill="none" stroke="#334155" strokeWidth="1.2" />
      {[[8,56],[38,37],[53,56],[40,75],[76,21],[78,57],[98,21],[91,39],[109,57]].map(([x,y], index) => <g key={index}><circle cx={x} cy={y} r={index % 4 === 0 ? "7" : "6"} fill="#111827" stroke={index % 3 === 0 ? "#3b82f6" : "#475569"} strokeWidth="1.3" /><text x={x} y={y+2} textAnchor="middle" fontSize="5" fill="#c4b5fd">{index + 1}</text></g>)}
    </svg>
  );
}

function LearningGraphic() {
  return (
    <svg viewBox="0 0 120 100" className="mt-4 h-28 w-full" aria-hidden="true">
      <defs><linearGradient id="learning-line" x1="0" x2="1"><stop stopColor="#6366f1" /><stop offset="1" stopColor="#a78bfa" /></linearGradient></defs>
      <path d="M8 88 C22 76 31 62 45 65 S59 78 70 58 S88 30 112 16" fill="none" stroke="url(#learning-line)" strokeWidth="2.2" />
      <path d="M8 88 C22 76 31 62 45 65 S59 78 70 58 S88 30 112 16 L112 100 L8 100Z" fill="#6d28d9" opacity="0.14" />
      <circle cx="70" cy="58" r="2.5" fill="#c4b5fd" />
      <circle cx="112" cy="16" r="3" fill="#d8b4fe" />
    </svg>
  );
}

const processCards = [
  ["Understanding", "Analyzing 12 data sources", UnderstandingGraphic],
  ["Deciding", "Evaluating 8 strategies", DecidingGraphic],
  ["Planning", "Building campaign roadmap", PlanningGraphic],
  ["Learning", "Updating with new insights", LearningGraphic],
];

function Workspace() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="card-panel overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="flex flex-col lg:col-span-3">
            <div className="text-xs font-bold uppercase tracking-widest text-violet-300">
              <span className="mr-1 text-violet-500">✦</span> Your Brain in Action
            </div>
            <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
              Your Brain Is
              <br />
              Thinking. <span className="text-gradient-brand">Right Now.</span>
            </h2>
            <p className="mt-5 max-w-xs text-sm font-medium leading-relaxed text-muted-foreground">
              This is not just a dashboard. This is your Marketing Brain analyzing, deciding, and planning what to do next.
            </p>

            <div className="mt-6 space-y-2">
              {activityItems.map((item) => (
                <div key={item} className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/70 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                    <Activity className="size-4 text-violet-400" /> {item}
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-400">• LIVE</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/70 px-3 py-3 text-xs font-semibold">
              <span>Confidence</span>
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-violet-200">92%</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950/80 lg:col-span-9">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-3 text-sm font-bold">
                <span className="grid size-8 place-items-center rounded-full bg-violet-500/15 text-violet-300"><Brain className="size-5" /></span>
                Marketing Brain
              </div>
              <button className="btn-brand btn-brand-hover rounded-lg px-4 py-2 text-xs font-bold">
                <Sparkles className="mr-2 inline size-3.5" /> Ask Your Brain
              </button>
            </div>

            <div className="grid min-h-80 lg:grid-cols-12">
              <aside className="border-r border-white/10 p-3 lg:col-span-2">
                <div className="space-y-1.5">
                  {navigation.map(([label, Icon], index) => (
                    <div key={label} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${index === 0 ? "bg-violet-500/15 text-violet-200" : "text-muted-foreground"}`}>
                      <Icon className="size-4" /> {label}
                    </div>
                  ))}
                </div>
              </aside>

              <main className="p-5 lg:col-span-10">
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/50 px-4 py-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Current Focus</div>
                    <div className="mt-1 flex items-center gap-3 text-lg font-bold">
                      Q4 Growth Campaign
                      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-400">● Live</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>Brain Status</div>
                    <div className="mt-1 font-bold text-emerald-400">● Active</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {processCards.map(([title, subtitle, Graphic]) => (
                    <div key={title} className="min-h-56 rounded-xl border border-white/5 bg-slate-900/70 p-4 shadow-lg">
                      <div className="flex items-center justify-between text-sm font-bold">
                        {title}<span className="grid size-7 place-items-center rounded-md bg-slate-800/80"><ArrowRight className="size-4 text-muted-foreground" /></span>
                      </div>
                      <div className="mt-2 text-xs font-medium text-muted-foreground">{subtitle}</div>
                      <Graphic />
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4 md:col-span-2">
                    <div className="mb-3 text-sm font-bold">Recommended Next Actions</div>
                    {[
                      ["Increase budget on high-performing audiences", "High Impact", "99%"],
                      ["Create content around emerging trend: AI & marketing", "High Impact", "97%"],
                      ["Test new ad angles for product category", "Medium Impact", "87%"],
                    ].map(([action, impact, score]) => (
                      <div key={action} className="flex items-center gap-3 border-t border-white/5 py-2 text-xs">
                        <Check className="size-3.5 shrink-0 text-emerald-400" />
                        <span className="flex-1 font-medium text-foreground/75">{action}</span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-400">{impact}</span>
                        <span className="font-bold">{score}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
                    <div className="text-sm font-bold">Key Insight</div>
                    <Lightbulb className="mt-4 size-6 text-violet-400" />
                    <p className="mt-3 text-sm font-semibold leading-relaxed">
                      AI-driven content performs 3.2x better with your audience
                    </p>
                    <div className="mt-4 text-xs text-muted-foreground">Based on last 47 campaigns</div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Workspace;
