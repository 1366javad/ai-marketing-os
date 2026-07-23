import { Brain, GraduationCap, Megaphone, TrendingUp } from "lucide-react";

function IntelligenceCompounding() {
  const layers = [
    {
      t: "Business Knowledge",
      d: "Your products, services, positioning, goals",
      Icon: Brain,
      color: "295",
      tone: "border-violet-500/40 bg-violet-500/15 text-violet-300",
    },
    {
      t: "Campaign Knowledge",
      d: "Past campaigns, results, learnings",
      Icon: Megaphone,
      color: "280",
      tone: "border-blue-500/40 bg-blue-500/15 text-blue-300",
    },
    {
      t: "Market Knowledge",
      d: "Industry, trends, competitors, audience",
      Icon: TrendingUp,
      color: "250",
      tone: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    },
    {
      t: "Learning Knowledge",
      d: "What works, what doesn't, what to improve",
      Icon: GraduationCap,
      color: "230",
      tone: "border-orange-500/40 bg-orange-500/15 text-orange-300",
    },
  ];
  const points = [
    { x: 8, y: 88, label: "Campaign 1", sub: "Learns" },
    { x: 34, y: 74, label: "Campaign 2", sub: "Improves" },
    { x: 60, y: 50, label: "Campaign 10", sub: "Optimizes" },
    { x: 86, y: 20, label: "Campaign 100", sub: "Leads the Market" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-2 gap-6">
      {/* Intelligence card */}
      <div>
        <div className="mb-3 text-sm font-bold uppercase tracking-widest text-violet-400">
          Intelligence Inside the Brain
        </div>
        <div className="card-panel relative min-h-80 overflow-hidden rounded-xl border border-white/10 shadow-xl">
          <div className="relative z-10 w-3/5">
            {layers.map((l) => (
              <div
                key={l.t}
                className="flex h-20 items-center gap-4 border-b border-white/10 px-5 last:border-0"
              >
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg border ${l.tone}`}
                >
                  <l.Icon className="size-5" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-base font-bold text-foreground/95">
                    {l.t}
                  </div>
                  <div className="mt-1 text-sm font-medium leading-tight text-muted-foreground">
                    {l.d}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute inset-y-0 right-4 flex w-2/5 items-center justify-center">
            <svg
              viewBox="0 0 260 300"
              className="h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <filter
                  id="layer-glow"
                  x="-30%"
                  y="-40%"
                  width="160%"
                  height="180%"
                >
                  <feGaussianBlur stdDeviation="1.4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="node-glow"
                  x="-400%"
                  y="-400%"
                  width="900%"
                  height="900%"
                >
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="layer-purple" x1="0" x2="1" y1="0" y2="1">
                  <stop stopColor="#5b21b6" stopOpacity="0.3" />
                  <stop offset="0.55" stopColor="#7c3aed" stopOpacity="0.5" />
                  <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.62" />
                </linearGradient>
                <linearGradient id="layer-blue" x1="0" x2="1" y1="0" y2="1">
                  <stop stopColor="#3730a3" stopOpacity="0.28" />
                  <stop offset="0.55" stopColor="#2563eb" stopOpacity="0.48" />
                  <stop offset="1" stopColor="#3b82f6" stopOpacity="0.6" />
                </linearGradient>
                <linearGradient id="layer-cyan" x1="0" x2="1" y1="0" y2="1">
                  <stop stopColor="#0e7490" stopOpacity="0.26" />
                  <stop offset="0.55" stopColor="#0891b2" stopOpacity="0.46" />
                  <stop offset="1" stopColor="#22d3ee" stopOpacity="0.58" />
                </linearGradient>
                <linearGradient id="layer-orange" x1="0" x2="1" y1="0" y2="1">
                  <stop stopColor="#9a3412" stopOpacity="0.25" />
                  <stop offset="0.55" stopColor="#c2410c" stopOpacity="0.44" />
                  <stop offset="1" stopColor="#fb923c" stopOpacity="0.56" />
                </linearGradient>
              </defs>
              {[
                {
                  offset: -18,
                  fill: "url(#layer-purple)",
                  stroke: "#a78bfa",
                  side: "#5b21b6",
                },
                {
                  offset: 61,
                  fill: "url(#layer-blue)",
                  stroke: "#60a5fa",
                  side: "#1d4ed8",
                },
                {
                  offset: 141,
                  fill: "url(#layer-cyan)",
                  stroke: "#67e8f9",
                  side: "#0e7490",
                },
                {
                  offset: 220,
                  fill: "url(#layer-orange)",
                  stroke: "#fb923c",
                  side: "#9a3412",
                },
              ].map((layer) => (
                <g
                  key={layer.stroke}
                  transform={`translate(0 ${layer.offset})`}
                  filter="url(#layer-glow)"
                >
                  <path
                    d="M20 45 L99 84 Q103 86 109 85 L239 56 L239 62 Q239 65 234 66 L108 94 Q102 96 97 93 L23 53 Q20 51 20 48 Z"
                    fill={layer.side}
                    fillOpacity="0.3"
                    stroke={layer.stroke}
                    strokeWidth="0.55"
                  />
                  <path
                    d="M24 39 L158 12 Q163 11 168 14 L239 50 Q244 53 238 56 L107 85 Q102 87 97 84 L22 47 Q17 43 24 39 Z"
                    fill={layer.fill}
                    stroke={layer.stroke}
                    strokeWidth="1"
                  />
                  <path
                    d="M48 43 L111 30 L158 40 L204 32 M68 59 L108 49 L145 58 L216 43 M96 76 L125 64 L169 70 L222 55 M111 30 L108 49 L125 64 M158 40 L145 58 L169 70"
                    fill="none"
                    stroke={layer.stroke}
                    strokeWidth="0.65"
                    opacity="0.5"
                  />
                  <path
                    d="M79 49 Q105 38 132 47 T188 43 M92 69 Q121 55 151 64 T207 57"
                    fill="none"
                    stroke={layer.stroke}
                    strokeWidth="0.55"
                    opacity="0.42"
                  />
                  <circle
                    cx="145"
                    cy="61"
                    r="3"
                    fill={layer.stroke}
                    filter="url(#node-glow)"
                  />
                  <circle cx="112" cy="32" r="1.7" fill={layer.stroke} />
                  <circle cx="197" cy="36" r="1.7" fill={layer.stroke} />
                  <circle cx="73" cy="60" r="1.7" fill={layer.stroke} />
                  <circle cx="213" cy="61" r="1.7" fill={layer.stroke} />
                </g>
              ))}
              <path
                d="M145 78 L145 246"
                stroke="#e0f2fe"
                strokeWidth="0.8"
                opacity="0.5"
                filter="url(#node-glow)"
              />
              {[86, 130, 174, 218].map((y, index) => (
                <circle
                  key={y}
                  cx="145"
                  cy={y}
                  r={index === 3 ? 3.5 : 2.4}
                  fill={["#c4b5fd", "#93c5fd", "#67e8f9", "#fb923c"][index]}
                  filter="url(#node-glow)"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Compounding card */}
      <div className="card-panel rounded-2xl p-6">
        <div className="text-xs uppercase tracking-widest text-brand mb-2">
          Compounding Intelligence
        </div>
        <p className="text-sm text-muted-foreground">
          Every campaign makes the Brain smarter.
          <br />
          Knowledge compounds forever.
        </p>
        <div className="relative mt-4 h-[280px]">
          <div className="absolute top-0 right-0 text-right">
            <div className="text-xs font-medium">The Brain</div>
            <div className="text-xs font-medium">Becomes</div>
            <div className="text-xs font-medium text-brand">Unstoppable</div>
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="curve" x1="0" x2="1" y1="1" y2="0">
                <stop offset="0%" stopColor="oklch(0.7 0.2 240)" />
                <stop offset="100%" stopColor="oklch(0.8 0.22 295)" />
              </linearGradient>
              <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.6 0.25 295 / 0.35)" />
                <stop offset="100%" stopColor="oklch(0.6 0.25 295 / 0)" />
              </linearGradient>
            </defs>
            <path
              d="M 8 88 Q 30 86 40 74 T 65 46 T 90 15 L 90 100 L 8 100 Z"
              fill="url(#curveFill)"
            />
            <path
              d="M 8 88 Q 30 86 40 74 T 65 46 T 90 15"
              fill="none"
              stroke="url(#curve)"
              strokeWidth="0.7"
            />
            {points.map((p) => (
              <circle
                key={p.label}
                cx={p.x}
                cy={p.y}
                r="1.1"
                fill="oklch(0.95 0.15 295)"
                className="animate-breathe"
              />
            ))}
          </svg>
          {points.map((p) => (
            <div
              key={p.label}
              className="absolute"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: "translate(-50%, 8px)",
              }}
            >
              <div className="text-[10px] font-medium whitespace-nowrap">
                {p.label}
              </div>
              <div className="text-[9px] text-muted-foreground whitespace-nowrap">
                {p.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default IntelligenceCompounding;
