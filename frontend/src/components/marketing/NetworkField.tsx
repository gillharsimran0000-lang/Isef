import { useEffect, useRef } from 'react';

/**
 * A drifting node-and-line "constellation": lightweight canvas-2D network
 * graph, no three.js. Replaces the old chem-ballpit hero visual (labelled
 * C/N/O/H spheres) per explicit request — same slow, understated motion
 * budget, just a different metaphor (a network of signals, not atoms).
 * Dark mode only — the app has no light theme, so the palette is fixed.
 *
 * Clicking/tapping gives every node on screen a repulsion impulse (a
 * "molecular collision") — closest nodes get the hardest kick, but the decay
 * is gentle enough that even far corners visibly join in. They scatter and
 * their speed relaxes back to the ambient drift over ~1-2s. Click-only, no
 * ambient/automatic bounce. Skipped entirely under prefers-reduced-motion.
 */

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
}

const PALETTE = ['#ff6a3d', '#7cb8ea', '#eec06a', '#f2f1ed', '#f0685c'];

const NODE_COUNT = 55;
const LINK_DISTANCE = 130;
const DRIFT_SPEED = 0.12;
const IMPULSE_RADIUS = 170;
const IMPULSE_STRENGTH = 2.6;
const SPEED_RECOVERY = 0.02;

function buildNodes(width: number, height: number, colors: string[]): Node[] {
  const nodes: Node[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * DRIFT_SPEED,
      vy: Math.sin(angle) * DRIFT_SPEED,
      r: Math.random() * 1.8 + 1.3,
      color: colors[i % colors.length]!,
    });
  }
  return nodes;
}

export function NetworkField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio, 2);
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let frameId = 0;

    function resize() {
      const parent = canvas!.parentElement;
      width = parent ? parent.offsetWidth : window.innerWidth;
      height = parent ? parent.offsetHeight : window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = buildNodes(width, height, PALETTE);
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist >= LINK_DISTANCE) continue;
          ctx!.globalAlpha = (1 - dist / LINK_DISTANCE) * 0.35;
          ctx!.strokeStyle = a.color;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }

      ctx!.globalAlpha = 1;
      for (const n of nodes) {
        ctx!.beginPath();
        ctx!.fillStyle = n.color;
        ctx!.shadowColor = n.color;
        ctx!.shadowBlur = 8;
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;
    }

    function step() {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        // Relax any click-excited node back toward the ambient drift speed.
        const speed = Math.hypot(n.vx, n.vy);
        if (speed > DRIFT_SPEED) {
          const eased = speed + (DRIFT_SPEED - speed) * SPEED_RECOVERY;
          const scale = eased / speed;
          n.vx *= scale;
          n.vy *= scale;
        }
      }
      draw();
    }

    resize();
    draw();

    if (reducedMotion) return undefined;

    function frame() {
      step();
      frameId = requestAnimationFrame(frame);
    }

    function applyImpulse(cx: number, cy: number) {
      for (const n of nodes) {
        const dx = n.x - cx;
        const dy = n.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        // No cutoff — every node gets a kick. Gentle hyperbolic decay means
        // the closest nodes get nearly the full impulse while far corners
        // still get a real, visible nudge instead of nothing.
        const force = IMPULSE_STRENGTH * (IMPULSE_RADIUS / (dist + IMPULSE_RADIUS));
        n.vx += (dx / dist) * force;
        n.vy += (dy / dist) * force;
      }
      if (!frameId) frame();
    }

    function handlePointerDown(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      applyImpulse(event.clientX - rect.left, event.clientY - rect.top);
    }
    canvas.addEventListener('pointerdown', handlePointerDown, { passive: true });

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (!frameId) frame();
        } else if (frameId) {
          cancelAnimationFrame(frameId);
          frameId = 0;
        }
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const ro = new ResizeObserver(() => resize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      io.disconnect();
      ro.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="pointer-events-auto h-full w-full cursor-pointer" aria-hidden="true" />
  );
}
