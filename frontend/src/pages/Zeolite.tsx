import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowDown } from '@phosphor-icons/react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { ZeoliteCanvas } from '@/components/zeolite/ZeoliteCanvas';
import type { ProgressRef } from '@/components/zeolite/CageFramework';
import { STAGE_COUNT } from '@/components/zeolite/math';
import { useDragSpin } from '@/components/zeolite/useDragSpin';

interface Stat {
  value: string;
  label: string;
}

interface Beat {
  kicker: string;
  title: string;
  body: string;
  stats?: Stat[];
  align: 'start' | 'end';
}

const BEATS: Beat[] = [
  {
    kicker: '00 — Prototype',
    title: 'Zeolite 13X',
    body: 'A microporous aluminosilicate crystal, and a candidate additive for the compost pile. Scroll to go inside it.',
    align: 'start',
  },
  {
    kicker: '01 — The framework',
    title: 'A honeycomb of holes',
    body: 'This crystal habit belongs to the faujasite (FAU) family — one of the most open framework structures a zeolite can grow. Underneath the facets shown here is a lattice riddled with uniform, sub-nanometer pores, repeating in every direction.',
    stats: [
      { value: '~7.4 Å', label: 'pore window' },
      { value: '~13 Å', label: 'supercage diameter' },
    ],
    align: 'end',
  },
  {
    kicker: '02 — Cut it open',
    title: 'Underneath the facets',
    body: 'Strip away the outer crystal and this is what is actually there: cages built from linked silicon- and aluminum-oxygen tetrahedra. Each cage is shaped like a truncated octahedron — chemists call it a sodalite cage — and it repeats to fill the whole crystal.',
    align: 'start',
  },
  {
    kicker: '03 — Si, Al, O',
    title: 'A charged lattice',
    body: 'Every vertex is a silicon or aluminum atom, bridged corner-to-corner by oxygen. Silicon carries a 4+ charge, aluminum only 3+ — so every aluminum leaves the framework one electron short. 13X packs roughly one aluminum for every 1.2 silicons, among the most aluminum-rich, most charged frameworks a zeolite can have.',
    align: 'end',
  },
  {
    kicker: '04 — Balancing the charge',
    title: 'Cations move in',
    body: 'That spare negative charge has to be balanced, so sodium ions dock loosely inside the cages. Loosely enough that other cations — ammonium, potassium, calcium — can swap in and take their place without breaking the framework. That swap is the entire mechanism of cation exchange.',
    align: 'start',
  },
  {
    kicker: '05 — What it grabs',
    title: 'Molecular sieving',
    body: 'The same pores that hold sodium happen to be exactly the right size to trap small polar molecules. Water vapor, ammonia, CO₂, hydrogen sulfide — all fit; larger nonpolar molecules mostly bounce off. Size and polarity, not just charge, decide what gets caught.',
    align: 'end',
  },
  {
    kicker: '06 — In the pile',
    title: 'What this could do for compost',
    body: 'Mixed in at a few percent by mass, 13X is a candidate for three jobs at once: catching ammonia before it off-gasses — less nitrogen lost to smell, more retained as plant-available NH₄⁺ — buffering excess moisture, and quietly damping odor spikes (H₂S, VOCs) through the hot phase.',
    align: 'start',
  },
  {
    kicker: '07 — Prototype caveat',
    title: "What it doesn't do",
    body: "It doesn't fix a bad C/N ratio, replace aeration, or turn a waterlogged pile aerobic — the failure modes on the Science page still apply exactly as before. And unlike the reactor's kinetics, this page is illustrative: the geometry is simplified for teaching, and dosing/exchange numbers here are literature ballpark figures, not a validated sub-model of the simulator yet.",
    align: 'end',
  },
];

export default function Zeolite() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<ProgressRef>({ p: 0 });
  const reduceMotion = useReducedMotion();
  const spinRef = useDragSpin(stageRef);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current.p = v;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-base)]/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={28} />
            <span className="font-pixel-square text-xs tracking-wide text-[var(--text-primary)]">PILENGINE</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/science" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Science
              </Button>
            </Link>
            <Link to="/reactor">
              <Button size="sm">
                <span className="hidden sm:inline">Enter the Reactor</span>
                <span className="sm:hidden">Reactor</span> <ArrowRight size={14} weight="bold" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div ref={containerRef} className="relative" style={{ height: `${STAGE_COUNT * 100}vh` }}>
        <div ref={stageRef} className="sticky top-0 h-screen w-full overflow-hidden">
          <ZeoliteCanvas progressRef={progressRef} spinRef={spinRef} />
          {!reduceMotion && (
            <motion.div
              className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-1 text-xs text-[var(--text-faint)]"
              animate={{ opacity: [0.7, 0.2, 0.7], y: [0, 6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="font-pixel-triangle tracking-wide">Scroll to go inside · drag to spin it</span>
              <ArrowDown size={14} />
            </motion.div>
          )}
        </div>

        {BEATS.map((beat, i) => (
          <div
            key={beat.title}
            className={`pointer-events-none absolute inset-x-0 flex h-screen items-center px-5 sm:px-10 ${
              beat.align === 'start' ? 'justify-start' : 'justify-end'
            }`}
            style={{ top: `${(i / STAGE_COUNT) * 100}%` }}
          >
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/85 p-6 backdrop-blur-md sm:max-w-md sm:p-7"
            >
              <span className="font-pixel-line text-[13px] tracking-wider text-[var(--text-faint)]">{beat.kicker}</span>
              <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
                {beat.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{beat.body}</p>
              {beat.stats && (
                <div className="mt-4 flex gap-5">
                  {beat.stats.map((s) => (
                    <div key={s.label}>
                      <div className="font-pixel-line text-xl text-[var(--color-accent)]">{s.value}</div>
                      <div className="text-xs text-[var(--text-faint)]">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        ))}
      </div>

      <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Still a prototype
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
          This page renders one simplified sodalite cage, not a full unit cell, and its guest-molecule geometry is
          illustrative rather than measured. Treat it as a way to build intuition for how 13X might slot into a
          compost recipe, not as a simulated result.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/reactor">
            <Button>
              Try it in the Reactor <ArrowRight size={15} weight="bold" />
            </Button>
          </Link>
          <Link to="/science">
            <Button variant="secondary">Read the Science</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-faint)]">
          <span>PILENGINE · Scientific Compost Intelligence Platform</span>
          <Link to="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Back home
          </Link>
        </div>
      </footer>
    </div>
  );
}
