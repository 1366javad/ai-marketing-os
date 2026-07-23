import { CircleDotDashed, CircleHelp, Clock3, RefreshCw } from "lucide-react";

function Problem() {
  const items = [
    {
      t: "Scattered Knowledge",
      d: "Information lives in tools, docs, and people's heads.",
      Icon: CircleDotDashed,
      tone: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    },
    {
      t: "Forgets Everything",
      d: "Every session is a new conversation. No continuity.",
      Icon: RefreshCw,
      tone: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    },
    {
      t: "Lost Context",
      d: "AI doesn't know your brand, audience, or history.",
      Icon: CircleHelp,
      tone: "border-slate-400/25 bg-slate-400/10 text-slate-300",
    },
    {
      t: "Wasted Time & Budget",
      d: "Teams repeat work. Mistakes get repeated. Growth slows down.",
      Icon: Clock3,
      tone: "border-orange-400/25 bg-orange-400/10 text-orange-400",
    },
  ];
  return (
    <section className="my-8">
      <div className="mx-auto grid max-w-7xl items-center gap-9 px-2 py-12 lg:grid-cols-4">
        <div>
          <h2 className="mt-3 text-4xl font-bold leading-tight tracking-tight">
            Every AI
            <br />
            starts from zero.
          </h2>
          <p className="mt-4 max-w-sm text-base font-medium leading-relaxed text-muted-foreground">
            Marketing knowledge is scattered. AI forgets everything. Teams lose
            context. Every campaign repeats old mistakes.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
          {items.map((i) => (
            <div
              key={i.t}
              className="card-panel min-h-40 rounded-lg border border-white/10 p-5"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-full border ${i.tone}`}
                >
                  <i.Icon className="size-6" strokeWidth={2} />
                </span>
                <div className="text-base font-bold leading-tight">{i.t}</div>
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">
                {i.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Problem;
