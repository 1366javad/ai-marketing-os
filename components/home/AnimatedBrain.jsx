import Image from "next/image";
import brainImg from "@/app/assets/marketing-brain.png";

function AnimatedBrain({ size = 420 }) {
  // soft twinkling light nodes overlaid on brain image
  const sparkles = Array.from({ length: 22 }, (_, i) => ({
    x: 20 + ((i * 37) % 60),
    y: 20 + ((i * 53) % 60),
    d: (i % 7) * 0.6,
    r: 0.6 + (i % 4) * 0.25,
  }));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* outer purple halo */}
      <div
        className="absolute inset-0 rounded-full blur-3xl animate-breathe"
        style={{
          background:
            "radial-gradient(circle, oklch(0.55 0.25 295 / 0.55), transparent 65%)",
        }}
      />
      {/* brain image with gentle breathing */}
      <Image
        src={brainImg}
        alt="Marketing Brain"
        className="relative w-full h-full object-contain animate-breathe-soft"
        style={{ filter: "drop-shadow(0 0 40px oklch(0.6 0.25 295 / 0.5))" }}
        priority
      />
      {/* twinkling nodes */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {sparkles.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="oklch(0.98 0.05 300)"
            className="animate-twinkle"
            style={{
              animationDelay: `${s.d}s`,
              filter: "drop-shadow(0 0 2px oklch(0.9 0.2 295))",
            }}
          />
        ))}
      </svg>
    </div>
  );
}
export default AnimatedBrain;
