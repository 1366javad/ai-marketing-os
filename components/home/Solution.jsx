import {
  ArrowRight,
  Database,
  FileText,
  Infinity as InfinityIcon,
  Layers3,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

function Node({ Icon, label, tone = "muted", compact = false }) {
  const active = tone !== "muted";
  const toneClass = {
    violet: "border-violet-500/55 bg-violet-500/15 text-violet-400",
    blue: "border-blue-500/55 bg-blue-500/15 text-blue-400",
    cyan: "border-cyan-500/55 bg-cyan-500/15 text-cyan-400",
    muted: "border-slate-500/35 bg-slate-500/10 text-slate-400",
  }[tone];

  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? "w-16" : "w-20"}`}
    >
      <span
        className={`grid size-12 place-items-center rounded-full border ${toneClass}`}
      >
        <Icon className="size-6" strokeWidth={active ? 2.2 : 2} />
      </span>
      <span className="mt-2.5 text-sm font-bold leading-tight text-foreground/75">
        {label}
      </span>
    </div>
  );
}

function Solution() {
  return (
    <section className="min-h-112 my-8 bg-slate-950/20">
      <div className="mx-auto grid min-h-112 max-w-7xl items-center gap-10 px-1 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h2 className="mt-5 text-5xl font-bold leading-tight tracking-tight">
            Marketing Brain
            <br />
            never starts from zero.
          </h2>
          <p className="mt-6 max-w-md text-lg font-bold leading-relaxed text-muted-foreground">
            It knows your business. It learns continuously. It accumulates
            knowledge and improves with every campaign.
          </p>
          <button className="btn-brand btn-brand-hover mt-8 h-12 rounded-lg px-7 text-sm font-extrabold">
            Build Your Marketing Brain
          </button>
        </div>

        <div className="relative grid h-64 overflow-hidden rounded-lg border border-violet-400/25 bg-slate-950/90 md:grid-cols-3 lg:col-span-3">
          <div className="border-r border-violet-400/25 bg-cyan-950/10 px-3 py-4 text-center">
            <h3 className="text-base font-extrabold text-foreground/70">
              Traditional AI
            </h3>

            <div className="mt-5 flex items-start justify-center gap-0">
              <Node Icon={FileText} label="One Prompt" compact />
              <ArrowRight
                className="mt-5 size-5 shrink-0 text-slate-400"
                strokeWidth={2}
              />
              <Node Icon={MessageSquare} label="One Answer" compact />
              <ArrowRight
                className="mt-5 size-5 shrink-0 text-slate-400"
                strokeWidth={2}
              />
              <Node Icon={RefreshCw} label="Memory Ends" compact />
            </div>

            <p className="absolute bottom-0 left-0 w-1/3 border-t border-white/10 py-4 text-sm font-bold text-muted-foreground/70">
              Starts from zero every time.
            </p>
          </div>

          <span className="absolute left-1/3 top-20 z-10 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-white/10 bg-slate-800 text-xs font-extrabold uppercase text-white/85">
            VS
          </span>

          <div className="bg-slate-950  px-4 py-4 text-center md:col-span-2">
            <h3 className="text-base font-extrabold text-violet-200/90">
              Marketing Brain
            </h3>

            <div className="mt-5 flex items-start justify-center gap-0">
              <Node
                Icon={Database}
                label={
                  <>
                    Knows Your
                    <br />
                    Business
                  </>
                }
                tone="violet"
              />
              <ArrowRight
                className="mt-5 size-5 shrink-0 text-slate-400"
                strokeWidth={2}
              />
              <Node
                Icon={Sparkles}
                label={
                  <>
                    Learns
                    <br />
                    Continuously
                  </>
                }
                tone="blue"
              />
              <ArrowRight
                className="mt-5 size-5 shrink-0 text-slate-400"
                strokeWidth={2}
              />
              <Node
                Icon={Layers3}
                label={
                  <>
                    Accumulates
                    <br />
                    Knowledge
                  </>
                }
                tone="violet"
              />
              <ArrowRight
                className="mt-5 size-5 shrink-0 text-slate-400"
                strokeWidth={2}
              />
              <Node
                Icon={TrendingUp}
                label={
                  <>
                    Improves Every
                    <br />
                    Campaign
                  </>
                }
                tone="cyan"
              />
              <ArrowRight
                className="mt-5 size-5 shrink-0 text-slate-400"
                strokeWidth={2}
              />
              <InfinityIcon
                className="mt-2 size-9 shrink-0 text-violet-400"
                strokeWidth={2.1}
              />
            </div>

            <p className="absolute bottom-0 right-0 w-2/3 border-t border-white/10 py-4 text-sm font-bold text-muted-foreground/70">
              Keeps growing. Keeps improving. Never resets.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Solution;
