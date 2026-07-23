function Agents() {
  const stages = [
    { n: "1", t: "Understand", agents: ["Research", "Market", "Audience"] },
    { n: "2", t: "Plan", agents: ["Strategy", "SEO", "Positioning"] },
    { n: "3", t: "Create", agents: ["Content", "Creative", "Video"] },
    { n: "4", t: "Launch", agents: ["Ads", "Distribution", "Automation"] },
    { n: "5", t: "Measure", agents: ["Analytics", "Attribution", "Insight"] },
    { n: "6", t: "Learn", agents: ["Performance", "Pattern", "Feedback"] },
    { n: "7", t: "Improve", agents: ["Optimization", "Decision", "Growth"] },
  ];
  return (
    <section id="agents" className="mx-auto max-w-7xl px-6 py-20">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-brand">
          How Our Agents Work For You
        </div>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight">
          One Brain. Seven stages. Infinite improvement.
        </h2>
      </div>
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {stages.map((s) => (
          <div key={s.n} className="card-panel rounded-xl p-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-brand/20 text-brand text-xs font-semibold flex items-center justify-center">
                {s.n}
              </div>
              <div className="text-sm font-medium">{s.t}</div>
            </div>
            <div className="mt-3 space-y-1.5">
              {s.agents.map((a) => (
                <div key={a} className="text-xs text-muted-foreground">
                  {a} Agent
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
export default Agents;
