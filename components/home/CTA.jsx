import {
  BarChart3,
  CheckSquare,
  CreditCard,
  FileText,
  Target,
  Timer,
  Users2,
} from "lucide-react";
import marketingbraing from "@/app/assets/marketing-Braing.png";
import Image from "next/image";

const orbitItems = [
  { Icon: Users2, x: 112, y: 52 },
  { Icon: FileText, x: 426, y: 75 },
  { Icon: Target, x: 36, y: 130 },
  { Icon: BarChart3, x: 476, y: 161 },
  { Icon: Users2, x: 110, y: 188 },
];

const orbitPaths = [
  "M36 130 C45 82 72 55 112 52 C205 18 350 22 426 75 C470 85 493 118 476 161 C456 207 370 226 280 225 C198 226 137 207 110 188 C66 178 38 157 36 130Z",
  "M36 130 C118 118 185 88 260 92 C350 96 410 126 476 161 C405 188 347 194 278 181 C197 166 124 142 36 130Z",
  "M58 92 C135 127 204 150 280 151 C355 152 414 128 468 101 M58 174 C128 150 203 139 280 145 C359 151 418 183 458 196",
];

function CTA() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-blue-950/20 to-slate-950" />
      <div className="relative mx-auto grid min-h-80 max-w-7xl items-center gap-8 px-8 py-10 lg:grid-cols-2">
        <div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Build Your Company&apos;s
            <br />
            <span className="text-gradient-brand">Marketing Brain.</span>
          </h2>
          <p className="mt-4 text-base font-medium text-muted-foreground">
            Stop starting from zero. Start building your advantage.
          </p>

          <div className="mt-7 flex flex-wrap gap-4">
            <button className="btn-brand btn-brand-hover rounded-lg px-7 py-3 text-sm font-bold">
              Start Building Your Brain
            </button>
            <button className="rounded-lg border border-white/15 bg-slate-950/60 px-7 py-3 text-sm font-bold text-foreground/90 transition hover:bg-white/5">
              Book a Demo
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-8 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-2">
              <CreditCard className="size-4" /> No credit card
            </span>
            <span className="flex items-center gap-2">
              <Timer className="size-4" /> Setup in 2 minutes
            </span>
            <span className="flex items-center gap-2">
              <CheckSquare className="size-4" /> Cancel anytime
            </span>
          </div>
        </div>

        <div className="relative flex h-72 items-center justify-center">
          <div className="absolute size-72 rounded-full bg-violet-600/15 blur-2xl" />

          <svg
            className="pointer-events-none absolute inset-0 size-full"
            viewBox="0 0 560 288"
            aria-hidden="true"
          >
            <defs>
              <filter id="cta-orbit-glow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="cta-orbit-line" x1="0" x2="1">
                <stop stopColor="#3b82f6" stopOpacity="0.35" />
                <stop offset="0.5" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="1" stopColor="#3b82f6" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            {orbitPaths.map((path, index) => (
              <g key={path}>
                <path d={path} fill="none" stroke={index === 0 ? "url(#cta-orbit-line)" : "#6366f1"} strokeWidth={index === 0 ? "1.1" : "0.8"} opacity={index === 0 ? "0.75" : "0.48"} />
                <path d={path} fill="none" stroke={index === 0 ? "#c4b5fd" : "#818cf8"} strokeWidth="3" strokeDasharray={index === 0 ? "1 23" : "1 28"} strokeLinecap="round" opacity={index === 0 ? "0.8" : "0.55"} filter="url(#cta-orbit-glow)" />
              </g>
            ))}
            {[
              [36, 130], [112, 52], [426, 75], [476, 161], [110, 188],
              [280, 225], [260, 92], [278, 181], [58, 92], [468, 101],
            ].map(([x, y], index) => (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={index % 3 === 0 ? "3" : "2"}
                fill={index % 2 === 0 ? "#a78bfa" : "#60a5fa"}
                filter="url(#cta-orbit-glow)"
              />
            ))}
          </svg>

          <div className="relative z-10">
            <Image
              src={marketingbraing}
              alt="Marketing Brain"
              width={270}
              className="object-contain drop-shadow-2xl"
            />
          </div>

          {orbitItems.map(({ Icon, x, y }, index) => (
            <div
              key={index}
              className="absolute z-20 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-violet-400/35 bg-slate-950/95 text-blue-200 shadow-lg shadow-violet-500/30"
              style={{ left: `${(x / 560) * 100}%`, top: `${(y / 288) * 100}%` }}
            >
              <Icon className="size-5" strokeWidth={1.8} />
            </div>
          ))}

          <div className="absolute bottom-1 h-3 w-48 rounded-full bg-violet-500/50 blur-lg" />
        </div>
      </div>
    </section>
  );
}

export default CTA;
