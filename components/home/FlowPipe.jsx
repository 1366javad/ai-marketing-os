function FlowPipe({ side = "left", label, Icon, delay = 0 }) {
  const isLeft = side === "left";
  return (
    <div
      className={`flex items-center gap-3 ${isLeft ? "" : "flex-row-reverse"}`}
    >
      <div className="card-panel flex items-center gap-2 rounded-lg px-3 py-2 min-w-[160px]">
        <Icon className="h-4 w-4 text-brand" />
        <span className="text-sm text-foreground/90">{label}</span>
      </div>
      <div className="relative flex-1 h-px">
        <svg
          className="absolute inset-0 w-full h-2 -translate-y-1"
          preserveAspectRatio="none"
          viewBox="0 0 100 2"
        >
          <line
            x1="0"
            y1="1"
            x2="100"
            y2="1"
            stroke="oklch(0.5 0.15 285 / 0.4)"
            strokeWidth="0.3"
            className="flow-line"
          />
        </svg>
        <span
          className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_oklch(0.7_0.25_295)]"
          style={{
            offsetPath: `path("M ${isLeft ? "0" : "100"} 1 L ${isLeft ? "100" : "0"} 1")`,
            animation: `dot-flow 3s linear infinite`,
            animationDelay: `${delay}s`,
          }}
        />
      </div>
    </div>
  );
}
export default FlowPipe;
