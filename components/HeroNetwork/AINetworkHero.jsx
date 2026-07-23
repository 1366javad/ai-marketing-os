"use client";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

const PALETTE = {
  bg: "transparent",
  node: "rgba(120, 200, 255, 0.55)",
  nodeStrong: "rgba(150, 220, 255, 0.95)",
  line: "rgba(90, 170, 230, 0.14)",
  lineActive: "rgba(140, 220, 255, 0.55)",
  packet: "rgba(180, 235, 255, 1)",
  hubGlow: "rgba(90, 200, 255, 1)",
  vertical: "rgba(150, 220, 255, 0.25)",
};

export default function AINetworkHero({
  primaryCta = { href: "/signup", label: "Start for Free" },
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const visibleRef = useRef(true);
  const mouseRef = useRef({
    x: -9999,
    y: -9999,
    active: false,
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const palette = PALETTE;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Adaptive density
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const NODE_COUNT = isMobile ? 55 : 120;
    const HUB_COUNT = 6;
    const CONNECT_RADIUS_BASE = isMobile ? 110 : 140;

    let nodes = [];
    let packets = [];
    let verticals = [];
    let hubIndices = [];
    const timeoutIds = new Set();
    let running = true;
    let pulseScheduled = false;

    // Frame throttle ~30fps
    const FRAME_MS = 1000 / 30;
    const CYCLE_MS = 14500;
    const RAMP_MS = 8800;
    const BURST_MS = 3300;
    let lastFrame = 0;
    let cycleStart = 0;
    let nextCyclePulse = 0;
    let burstStarted = false;
    let burstStrength = 0;

    function resize() {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
      clearScheduledTimeouts();

      nodes = [];
      packets = [];
      verticals = [];
      hubIndices = [];

      // Place hubs on a loose grid so they feel like natural centers of activity
      const cols = 3;
      const rows = 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const jitterX = (Math.random() - 0.5) * (width / (cols * 2));
          const jitterY = (Math.random() - 0.5) * (height / (rows * 2));
          const x = ((c + 0.5) / cols) * width + jitterX;
          const y = ((r + 0.5) / rows) * height + jitterY;
          hubIndices.push(nodes.length);
          nodes.push(makeNode(x, y, true, hubIndices.length - 1));
        }
      }

      // Fill remaining with regular nodes
      for (let i = nodes.length; i < NODE_COUNT; i++) {
        nodes.push(
          makeNode(Math.random() * width, Math.random() * height, false, -1),
        );
      }

      // Build neighbors (k-nearest style, capped)
      const CR = CONNECT_RADIUS_BASE;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pairs = [];
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const dx = nodes[j].x - n.x;
          const dy = nodes[j].y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < CR) pairs.push({ j, d });
        }
        pairs.sort((a, b) => a.d - b.d);
        n.neighbors = pairs.slice(0, n.hubIndex >= 0 ? 6 : 4).map((p) => p.j);
      }

      // Vertical signals
      const vCount = isMobile ? 4 : 8;
      for (let i = 0; i < vCount; i++) {
        verticals.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: 0.15 + Math.random() * 0.35,
          length: 40 + Math.random() * 90,
          alpha: 0.25 + Math.random() * 0.5,
        });
      }

      // Kick off with one hub activating
      resetCycle(performance.now());
      activateHub(0);
      scheduleNetworkPulse();
    }

    function makeNode(x, y, isHub, hubIndex) {
      const depth = Math.random();
      return {
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: isHub ? 3.2 + Math.random() * 1.2 : 0.8 + Math.random() * 1.8,
        depth,
        hubIndex,
        glow: isHub ? 0.15 : 0,
        neighbors: [],
      };
    }

    function activateHub(hubIdx) {
      if (!running || !visibleRef.current) return;

      const nodeIdx = hubIndices[hubIdx];
      if (nodeIdx == null) return;
      const hub = nodes[nodeIdx];
      hub.glow = 1;

      // Choose a target hub (different from current)
      const others = hubIndices.filter((_, i) => i !== hubIdx);
      const targetHubIdx = Math.floor(Math.random() * others.length);
      const targetNodeIdx = others[targetHubIdx];

      // Emit a few packets
      const packetCount = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < packetCount; i++) {
        emitPacketFrom(nodeIdx, targetNodeIdx);
      }

      // Schedule chain — organic timing
      const delay = 1400 + Math.random() * 2800;
      const nextHub = hubIndices.indexOf(targetNodeIdx);
      scheduleTimeout(() => activateHub(nextHub), delay);

      // Occasional overlap — sometimes another hub also fires
      if (Math.random() < 0.35) {
        const extra = Math.floor(Math.random() * HUB_COUNT);
        scheduleTimeout(() => activateHub(extra), 400 + Math.random() * 900);
      }
    }

    function scheduleTimeout(callback, delay) {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        if (running && visibleRef.current) callback();
      }, delay);

      timeoutIds.add(timeoutId);
      return timeoutId;
    }

    function scheduleNetworkPulse() {
      if (!running || !visibleRef.current || pulseScheduled) return;

      pulseScheduled = true;
      scheduleTimeout(() => {
        pulseScheduled = false;
        triggerNetworkPulse();
        scheduleNetworkPulse();
      }, 2600 + Math.random() * 1800);
    }

    function triggerNetworkPulse(intensity = 1) {
      if (!running || !visibleRef.current || hubIndices.length < 2) return;

      const pulseCount = Math.min(
        HUB_COUNT,
        Math.round((isMobile ? 2 : 3) * intensity),
      );
      const usedHubs = new Set();

      for (let i = 0; i < pulseCount; i++) {
        let hubIdx = Math.floor(Math.random() * HUB_COUNT);
        let guard = 0;

        while (usedHubs.has(hubIdx) && guard < HUB_COUNT) {
          hubIdx = Math.floor(Math.random() * HUB_COUNT);
          guard += 1;
        }

        usedHubs.add(hubIdx);

        const nodeIdx = hubIndices[hubIdx];
        const targetOptions = hubIndices.filter((_, index) => index !== hubIdx);
        const targetNodeIdx =
          targetOptions[Math.floor(Math.random() * targetOptions.length)];

        if (nodeIdx == null || targetNodeIdx == null) continue;

        nodes[nodeIdx].glow = 1;

        const packetCount = Math.round((isMobile ? 3 : 5) * intensity);
        for (let packetIndex = 0; packetIndex < packetCount; packetIndex++) {
          emitPacketFrom(nodeIdx, targetNodeIdx);
        }
      }
    }

    function resetCycle(ts, restart = false) {
      clearScheduledTimeouts();

      cycleStart = ts;
      nextCyclePulse = ts + 900;
      burstStarted = false;
      burstStrength = 0;
      packets = [];

      for (const n of nodes) {
        n.glow = n.hubIndex >= 0 ? 0.15 : 0;
      }

      if (restart) {
        activateHub(Math.floor(Math.random() * HUB_COUNT));
        triggerNetworkPulse(0.8);
        scheduleNetworkPulse();
      }
    }

    function updateCycle(ts) {
      const elapsed = ts - cycleStart;

      if (elapsed >= CYCLE_MS) {
        resetCycle(ts, true);
        return;
      }

      if (elapsed < RAMP_MS) {
        const ramp = elapsed / RAMP_MS;
        const interval = 1350 - ramp * 1050;

        if (ts >= nextCyclePulse) {
          triggerNetworkPulse(0.7 + ramp * 1.35);
          nextCyclePulse = ts + interval;
        }

        return;
      }

      const burstElapsed = elapsed - RAMP_MS;
      const burstProgress = Math.min(burstElapsed / BURST_MS, 1);

      if (!burstStarted) {
        burstStarted = true;
        triggerGalaxyBurst();
      }

      const wave = Math.sin(burstProgress * Math.PI);
      burstStrength = Math.max(0, wave);

      if (ts >= nextCyclePulse) {
        triggerNetworkPulse(1.65 + wave * 1.15);
        nextCyclePulse = ts + 220;
      }
    }

    function triggerGalaxyBurst() {
      if (!running || !visibleRef.current) return;

      for (let i = 0; i < hubIndices.length; i++) {
        const nodeIdx = hubIndices[i];
        nodes[nodeIdx].glow = 1;

        for (let j = 0; j < hubIndices.length; j++) {
          if (i === j) continue;

          const packetCount = isMobile ? 2 : 4;
          for (let k = 0; k < packetCount; k++) {
            emitPacketFrom(nodeIdx, hubIndices[j]);
          }
        }
      }
    }

    function clearScheduledTimeouts() {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds.clear();
      pulseScheduled = false;
    }

    function emitPacketFrom(fromNode, hubTarget) {
      const n = nodes[fromNode];
      if (!n.neighbors.length) return;
      // Prefer a neighbor that reduces distance to the hub target
      const th = nodes[hubTarget];
      let best = n.neighbors[Math.floor(Math.random() * n.neighbors.length)];
      if (Math.random() < 0.75) {
        let bestD = Infinity;
        for (const j of n.neighbors) {
          const d = Math.hypot(nodes[j].x - th.x, nodes[j].y - th.y);
          if (d < bestD) {
            bestD = d;
            best = j;
          }
        }
      }
      packets.push({
        from: fromNode,
        to: best,
        t: 0,
        speed: 0.006 + Math.random() * 0.008,
        life: 1,
        hubTarget,
      });
    }

    function step(dt, ts) {
      updateCycle(ts);

      // Update nodes (gentle drift + return to base + mouse influence on near nodes)
      const m = mouseRef.current;
      const cx = width / 2;
      const cy = height / 2;

      for (const n of nodes) {
        // parallax drift by depth
        const driftK = 0.3 + n.depth * 0.7;
        n.x += n.vx * driftK * (dt / 16);
        n.y += n.vy * driftK * (dt / 16);

        if (burstStrength > 0) {
          const dx = n.x - cx;
          const dy = n.y - cy;
          const dist = Math.hypot(dx, dy) + 0.01;
          const force = burstStrength * (0.35 + n.depth * 0.9) * (dt / 16);
          const swirl = burstStrength * 0.38 * (dt / 16);

          n.x += (dx / dist) * force + (-dy / dist) * swirl;
          n.y += (dy / dist) * force + (dx / dist) * swirl;
        }

        // restoring force
        const restore = burstStrength > 0 ? 0.003 : 0.008;
        n.x += (n.baseX - n.x) * restore;
        n.y += (n.baseY - n.y) * restore;

        if (m.active) {
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const f = (1 - Math.sqrt(d2) / 120) * 0.6;
            n.x += (dx / (Math.sqrt(d2) + 0.01)) * f;
            n.y += (dy / (Math.sqrt(d2) + 0.01)) * f;
          }
        }

        // decay glow
        if (n.hubIndex >= 0) {
          n.glow += (0.15 - n.glow) * 0.02;
        } else {
          n.glow *= 0.94;
        }
      }

      // Update packets
      const arrived = [];
      for (const p of packets) {
        p.t += p.speed * (dt / 16) * (1 + p.t * 0.6); // slight acceleration
        // briefly light nearby connection & destination node
        const dest = nodes[p.to];
        dest.glow = Math.min(1, dest.glow + 0.02);
        if (p.t >= 1) arrived.push(p);
      }

      // Handle arrivals: either continue hop toward hubTarget, or trigger hub activation
      for (const p of arrived) {
        const arrivedNode = p.to;
        if (arrivedNode === p.hubTarget && p.hubTarget != null) {
          // Reached target hub — its activation will be handled by scheduled chain,
          // but give it an extra glow bump.
          nodes[arrivedNode].glow = 1;
        } else if (p.hubTarget != null && Math.random() < 0.9) {
          // hop onward
          emitPacketFrom(arrivedNode, p.hubTarget);
        }
      }
      packets = packets.filter((p) => p.t < 1);
      // safety cap
      const packetCap = burstStrength > 0.2 ? 130 : 80;
      if (packets.length > packetCap) packets.splice(0, packets.length - packetCap);

      // Verticals
      for (const v of verticals) {
        v.y -= v.speed * (dt / 16);
        if (v.y + v.length < 0) {
          v.y = height + Math.random() * 40;
          v.x = Math.random() * width;
          v.alpha = 0.25 + Math.random() * 0.5;
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.save();

      if (burstStrength > 0) {
        const zoom = 1 + burstStrength * 0.045;
        ctx.translate(width / 2, height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-width / 2, -height / 2);
      }

      // Vertical signals (very subtle)
      for (const v of verticals) {
        const grad = ctx.createLinearGradient(v.x, v.y, v.x, v.y + v.length);
        grad.addColorStop(0, palette.vertical);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = grad;
        ctx.globalAlpha = v.alpha;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x, v.y + v.length);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Build set of "active" edges (edges currently carrying a packet)
      const activeEdges = new Set();
      for (const p of packets) {
        const a = Math.min(p.from, p.to);
        const b = Math.max(p.from, p.to);
        activeEdges.add(a + "-" + b);
      }

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (const j of a.neighbors) {
          if (j <= i) continue;
          const b = nodes[j];
          const key = i + "-" + j;
          const active = activeEdges.has(key);
          const avgDepth = (a.depth + b.depth) / 2;
          const baseAlpha = 0.35 + avgDepth * 0.65;
          ctx.strokeStyle = active ? palette.lineActive : palette.line;
          ctx.globalAlpha = Math.min(
            1,
            active ? 0.9 : baseAlpha + burstStrength * 0.35,
          );
          ctx.lineWidth = active
            ? 1.1 + burstStrength * 0.9
            : 0.6 + burstStrength * 0.45;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Nodes
      for (const n of nodes) {
        const isHub = n.hubIndex >= 0;
        const sharpness = 0.4 + n.depth * 0.6;
        if (isHub) {
          // Halo when glowing
          const glowR = n.r * (3 + n.glow * 6);
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
          grad.addColorStop(0, withAlpha(palette.hubGlow, 0.35 + n.glow * 0.5));
          grad.addColorStop(1, withAlpha(palette.hubGlow, 0));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = palette.nodeStrong;
          ctx.globalAlpha = 0.75 + n.glow * 0.25;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = n.glow > 0.15 ? palette.nodeStrong : palette.node;
          ctx.globalAlpha = sharpness;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + n.glow * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Packets
      for (const p of packets) {
        const a = nodes[p.from];
        const b = nodes[p.to];
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        const fade =
          p.t < 0.15 ? p.t / 0.15 : p.t > 0.85 ? (1 - p.t) / 0.15 : 1;

        // trail
        const tx = a.x + (b.x - a.x) * Math.max(0, p.t - 0.05);
        const ty = a.y + (b.y - a.y) * Math.max(0, p.t - 0.05);
        const grad = ctx.createLinearGradient(tx, ty, x, y);
        grad.addColorStop(0, withAlpha(palette.packet, 0));
        grad.addColorStop(1, withAlpha(palette.packet, 0.9 * fade));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();

        // head
        ctx.fillStyle = withAlpha(palette.packet, fade);
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        // glow head
        const hg = ctx.createRadialGradient(x, y, 0, x, y, 8);
        hg.addColorStop(0, withAlpha(palette.packet, 0.5 * fade));
        hg.addColorStop(1, withAlpha(palette.packet, 0));
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function withAlpha(rgba, a) {
      // rgba(...,X) → replace last channel
      return rgba.replace(/rgba?\(([^)]+)\)/, (_, inner) => {
        const parts = inner.split(",").map((s) => s.trim());
        const [r, g, b] = parts;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      });
    }

    function loop(ts) {
      if (!running || !visibleRef.current) {
        rafRef.current = null;
        return;
      }

      const dt = ts - lastFrame;
      if (dt >= FRAME_MS) {
        lastFrame = ts;
        step(dt, ts);
        draw();
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    function startLoop() {
      if (!running || !visibleRef.current || rafRef.current) return;
      lastFrame = performance.now();
      rafRef.current = requestAnimationFrame(loop);
    }

    function stopLoop() {
      if (!rafRef.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Observers
    const ro = new ResizeObserver(() => {
      resize();
      init();
    });
    ro.observe(container);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const wasVisible = visibleRef.current;
          visibleRef.current = e.isIntersecting;

          if (e.isIntersecting) {
            startLoop();
            if (!wasVisible) {
              activateHub(Math.floor(Math.random() * HUB_COUNT));
              triggerNetworkPulse();
              scheduleNetworkPulse();
            }
          } else {
            stopLoop();
            clearScheduledTimeouts();
          }
        }
      },
      { threshold: 0.01 },
    );
    io.observe(container);

    function onMove(ev) {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
        active: true,
      };
    }
    function onLeave() {
      mouseRef.current.active = false;
    }
    function onVisibilityChange() {
      if (document.hidden) {
        visibleRef.current = false;
        stopLoop();
        clearScheduledTimeouts();
        return;
      }

      visibleRef.current = container.getBoundingClientRect().bottom > 0;
      if (visibleRef.current) {
        startLoop();
        activateHub(Math.floor(Math.random() * HUB_COUNT));
        scheduleNetworkPulse();
      }
    }

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    resize();
    init();
    startLoop();

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearScheduledTimeouts();
      ro.disconnect();
      io.disconnect();
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100vh] min-h-[600px] overflow-hidden bg-radial-gradient(ellipse at 50% 40%, #f4f8ff 0%, #e6eef9 70%, #dbe6f5 100%) dark:bg-radial-gradient(ellipse at 50% 40%, #0b1220 0%, #05070d 70%, #03040a 100%)"
    >
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />

      {/* Foreground copy */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div
          className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] backdrop-blur-sm 
           
             dark:border-white/15 dark:bg-white/[0.04] dark:text-white/70
           border-slate-900/15 bg-white/60 text-slate-700"
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse dark:bg-primary-300 bg-primary-600 " />
          Live · AI Marketing OS
        </div>
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl dark:text-slate-100 text-slate-900">
          The AI Campaign{" "}
          <span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
            Workspace
          </span>{" "}
          for Modern Marketing Teams
        </h1>
        <p className="mt-5 max-w-2xl text-base sm:text-lg dark:text-white/60 text-slate-600">
          Continuous, coordinated intelligence — planning, producing and
          optimizing campaigns in the background, so your team ships more and
          thinks bigger.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primaryCta.href}
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#5B5CFF] px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/30"
          >
            {primaryCta.label}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="#simulation"
            className="rounded-xl border border-base px-8 py-4 text-lg font-semibold transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30"
          >
            See It in Action
          </Link>
        </div>
      </div>
    </div>
  );
}
