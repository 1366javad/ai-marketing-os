import {
  BarChart3,
  Brain,
  FileText,
  FileType2,
  Globe,
  Lightbulb,
  LineChart,
  Megaphone,
  Palette,
  Play,
  Search,
  Target,
  TrendingUp,
  Users2,
  Video,
  Zap,
} from "lucide-react";
import AnimatedBrain from "./AnimatedBrain";

function Hero() {
  const inputs = [
    { label: "Website", Icon: Globe },
    { label: "Brand Docs", Icon: FileText },
    { label: "PDFs & Reports", Icon: FileType2 },
    { label: "Campaigns", Icon: Megaphone },
    { label: "Analytics", Icon: BarChart3 },
    { label: "Market Research", Icon: Search },
    { label: "Competitors", Icon: Users2 },
  ];
  const outputs = [
    { label: "Research", Icon: Lightbulb },
    { label: "SEO", Icon: TrendingUp },
    { label: "Content", Icon: FileText },
    { label: "Creative", Icon: Palette },
    { label: "Video", Icon: Video },
    { label: "Ads", Icon: Target },
    { label: "Analytics", Icon: LineChart },
  ];
  const inputColors = [
    "#5570ff",
    "#4e8cff",
    "#46cbed",
    "#c14bc2",
    "#8157e8",
    "#7d879e",
    "#3ca9dc",
  ];
  const outputColors = [
    "#b93bea",
    "#9051e8",
    "#36bcd7",
    "#8eaa3a",
    "#e4c51e",
    "#e68128",
    "#e26c35",
  ];
  return (
    <section className="hero-radial relative overflow-hidden mt-10">
      <div className="mx-auto max-w-7xl px-2 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="animate-fade-up">
            <h1 className="text-6xl md:text-7xl font-semibold tracking-tight leading-tight">
              Your Company&apos;s
              <br />
              Marketing <span className="text-gradient-brand">Brain</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground ">
              Turn everything your company knows into one Marketing Brain that
              learns, remembers, and improves every campaign.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button className="btn-brand btn-brand-hover h-14 rounded-xl px-7 text-sm font-semibold">
                Build Your Marketing Brain
              </button>
              <button className="flex h-14 items-center gap-2.5 rounded-xl border border-border px-7 text-sm font-medium text-foreground/90 transition hover:bg-white/5">
                <Play className="h-4 w-4" /> See How It Thinks
              </button>
            </div>
            <div className="mt-14 grid grid-cols-3 gap-7">
              {[
                {
                  t: "Never starts from zero",
                  d: "Every campaign builds permanent knowledge.",
                  Icon: Zap,
                },
                {
                  t: "Knows your business",
                  d: "Understands your brand, audience, market, and goals.",
                  Icon: Brain,
                },
                {
                  t: "Improves over time",
                  d: "The more you use it, the smarter it gets.",
                  Icon: TrendingUp,
                },
              ].map((f) => (
                <div key={f.t} className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-400">
                    <f.Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold leading-tight text-foreground">
                      {f.t}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {f.d}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right  Brain visual */}
          <div className="relative mx-auto h-96 w-full max-w-2xl origin-center scale-125">
            <svg
              className="pointer-events-none absolute inset-x-0 top-0 z-0 h-96 w-full overflow-visible"
              viewBox="0 0 620 350"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <filter
                  id="brain-connection-glow"
                  x="-15%"
                  y="-20%"
                  width="130%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="2" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {outputColors.map((color, i) => (
                  <marker
                    key={color}
                    id={`brain-output-arrow-${i}`}
                    viewBox="0 0 8 8"
                    refX="7"
                    refY="4"
                    markerWidth="4.5"
                    markerHeight="4.5"
                    orient="auto"
                  >
                    <path d="M0 0L8 4L0 8Z" fill={color} />
                  </marker>
                ))}
              </defs>

              {inputColors.map((color, i) => {
                const cardY = 47 + i * 44;
                const brainY = 108 + i * 21;
                return (
                  <path
                    key={color}
                    d={`M152 ${cardY} C198 ${cardY}, 190 ${brainY}, 238 ${brainY}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    opacity="0.95"
                    filter="url(#brain-connection-glow)"
                  />
                );
              })}
              {outputColors.map((color, i) => {
                const cardY = 47 + i * 44;
                const brainY = 108 + i * 21;
                return (
                  <path
                    key={color}
                    d={`M382 ${brainY} C430 ${brainY}, 422 ${cardY}, 468 ${cardY}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    opacity="0.95"
                    filter="url(#brain-connection-glow)"
                    markerEnd={`url(#brain-output-arrow-${i})`}
                  />
                );
              })}
            </svg>

            <div className="absolute left-0 top-0 z-10 w-36">
              <div className="mb-2 text-xs font-semibold text-foreground/90">
                Knowledge In
              </div>
              {inputs.map((n, i) => (
                <div
                  key={n.label}
                  className="mb-2.5 flex h-10 items-center gap-2.5 rounded-lg border border-white/10 bg-slate-900/95 px-3 shadow-lg"
                >
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-md"
                    style={{ backgroundColor: inputColors[i] }}
                  >
                    <n.Icon className="size-3 text-white" strokeWidth={2} />
                  </span>
                  <span className="whitespace-nowrap text-xs font-medium text-white/85">
                    {n.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
              <AnimatedBrain size={320} />
            </div>

            <div className="absolute right-0 top-0 z-10 w-36">
              <div className="mb-2 text-right text-xs font-semibold text-foreground/90">
                Intelligent Output
              </div>
              {outputs.map((n, i) => (
                <div
                  key={n.label}
                  className="mb-2.5 flex h-10 items-center gap-2.5 rounded-lg border border-white/10 bg-slate-900/95 px-3 shadow-lg"
                >
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-md"
                    style={{ backgroundColor: outputColors[i] }}
                  >
                    <n.Icon className="size-3 text-white" strokeWidth={2} />
                  </span>
                  <span className="whitespace-nowrap text-xs font-medium text-white/85">
                    {n.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-950/90 px-4 py-2 text-xs text-white/80 shadow-lg">
              <span className="size-2 rounded-full bg-emerald-400 shadow-md" />
              One Brain. All Knowledge. Endless Impact.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export default Hero;
