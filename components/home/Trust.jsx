function Trust() {
  const logos = [
    "Acme Corp",
    "TechFlow",
    "GrowthLab",
    "InnovateX",
    "DigitalFirst",
    "NextGen",
    "DataDrive",
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="text-center text-xs uppercase tracking-widest text-muted-foreground">
        Trusted by growing companies
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
        {logos.map((l) => (
          <div
            key={l}
            className="text-sm font-medium tracking-tight text-foreground/60"
          >
            ◇ {l}
          </div>
        ))}
      </div>
      <div className="mt-10 grid md:grid-cols-3 gap-4">
        {[
          {
            q: "Our team went from firefighting campaigns to compounding results. The Brain remembers what worked and doubles down.",
            a: "Head of Growth, TechFlow",
          },
          {
            q: "It replaced a scattered stack of 9 AI tools with one system that actually knows our brand.",
            a: "CMO, GrowthLab",
          },
          {
            q: "Every campaign is smarter than the last. Our CAC is down 34% in six months.",
            a: "Founder, InnovateX",
          },
        ].map((t) => (
          <div key={t.a} className="card-panel rounded-2xl p-5">
            <p className="text-sm text-foreground/90 leading-relaxed">
              &ldquo;{t.q}&rdquo;
            </p>
            <div className="mt-3 text-xs text-muted-foreground">— {t.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
export default Trust;
