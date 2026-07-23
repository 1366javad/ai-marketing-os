import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  FileType2,
  Globe,
  Lightbulb,
  LineChart,
  Megaphone,
  Palette,
  Search,
  Target,
  TrendingUp,
  Users2,
  Video,
} from "lucide-react";
import AnimatedBrain from "./AnimatedBrain";

const sources = [
  { label: "Website", Icon: Globe },
  { label: "Brand Docs", Icon: FileText },
  { label: "PDFs & Reports", Icon: FileType2 },
  { label: "Campaigns", Icon: Megaphone },
  { label: "Analytics", Icon: BarChart3 },
  { label: "Market Research", Icon: Search },
  { label: "Competitors", Icon: Users2 },
];

const agents = [
  { label: "Research", Icon: Lightbulb },
  { label: "SEO", Icon: TrendingUp },
  { label: "Content", Icon: FileText },
  { label: "Creative", Icon: Palette },
  { label: "Video", Icon: Video },
  { label: "Ads", Icon: Target },
  { label: "Analytics", Icon: LineChart },
];

const outcomes = [
  "Better Strategy",
  "High-Quality Content",
  "More Reach",
  "More Engagement",
  "More Conversions",
  "Better ROI",
];

function ItemColumn({ title, items }) {
  return (
    <div className="card-panel relative z-10 rounded-xl border border-white/10 p-4 shadow-xl">
      <h3 className="mb-3 text-sm font-bold text-foreground/90">{title}</h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex h-8 items-center gap-2.5 rounded-lg bg-slate-900/80 px-3"
          >
            <item.Icon
              className="size-4 shrink-0 text-violet-400"
              strokeWidth={2}
            />
            <span className="truncate text-sm font-semibold text-foreground/80">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutcomeColumn() {
  return (
    <div className="card-panel relative z-10 rounded-xl border border-white/10 p-4 shadow-xl">
      <h3 className="mb-3 text-sm font-bold text-foreground/90">Outcomes</h3>
      <div className="space-y-1.5">
        {outcomes.map((outcome) => (
          <div
            key={outcome}
            className="flex h-9 items-center gap-2.5 border-b border-white/5 px-3 last:border-0"
          >
            <Check
              className="size-4 shrink-0 text-cyan-400"
              strokeWidth={2.5}
            />
            <span className="text-sm font-bold text-foreground/80">
              {outcome}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoopWorkflow() {
  return (
    <section
      id="how-it-works"
      className="border-b border-white/10 bg-slate-950/20"
    >
      <div className="mx-auto max-w-screen-2xl px-6 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mt-4 text-5xl font-bold leading-tight tracking-tight">
            One Brain Every Campaign
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-relaxed text-muted-foreground">
            All your knowledge flows into the Brain. The Brain powers every
            agent. Every result feeds back and makes the Brain smarter.
          </p>
        </div>

        <div className="relative mx-auto mt-10 flex min-h-96 w-full max-w-screen-xl items-start gap-8">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 960 384"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="workflow-arrow"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0 0L8 4L0 8Z" fill="#22d3ee" />
              </marker>
            </defs>
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <g key={`source-${index}`}>
                <circle cx="144" cy={61 + index * 38} r="2" fill="#22d3ee" />
                <path
                  d={`M144 ${61 + index * 38} C215 ${61 + index * 38}, 258 ${105 + index * 19}, 350 ${105 + index * 19}`}
                  fill="none"
                  stroke="#22aee8"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </g>
            ))}
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <path
                key={`agent-${index}`}
                d={`M420 ${105 + index * 19} C535 ${105 + index * 19}, 575 ${61 + index * 38}, 636 ${61 + index * 38}`}
                fill="none"
                stroke="#22c5e8"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.8"
                markerEnd="url(#workflow-arrow)"
              />
            ))}
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <path
                key={`outcome-${index}`}
                d={`M760 ${63 + index * 42} L804 ${63 + index * 42}`}
                fill="none"
                stroke="#22c5e8"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.8"
                markerEnd="url(#workflow-arrow)"
              />
            ))}
            <path
              d="M780 318 L780 360 Q780 364 776 364 L76 364 Q72 364 72 360 L72 318"
              fill="none"
              stroke="#22c5e8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="1"
              markerEnd="url(#workflow-arrow)"
            />
          </svg>

          <div className="w-48 shrink-0">
            <ItemColumn title="Knowledge Sources" items={sources} />
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center">
            <AnimatedBrain size={300} />
          </div>

          <div className="w-48 shrink-0">
            <ItemColumn title="AI Marketing Agents" items={agents} />
          </div>
          <div className="w-52 shrink-0">
            <OutcomeColumn />
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoopWorkflow;
