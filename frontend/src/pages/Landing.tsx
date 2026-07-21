import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { NetworkField } from '@/components/marketing/NetworkField';

const FAILURE_MODES = [
  { scenario: '100 kg heap', prediction: 'Never exceeds 27°C', why: 'Surface area scales as V^(2/3); a small pile loses heat faster than it makes it.' },
  { scenario: 'Waterlogged', prediction: 'Stalls, goes anaerobic', why: 'Halving air-filled porosity cuts O₂ transport tenfold.' },
  { scenario: 'C/N 80:1', prediction: '10% mass loss in 120 days', why: 'Nitrogen-starved; microbes cannot build protein.' },
  { scenario: 'Forced aeration', prediction: 'Pinned at 63°C, 0 days above 65', why: 'A thermostatic blower strips heat as latent water vapour.' },
  { scenario: 'Moisture unmanaged', prediction: 'Desiccates and stalls', why: 'An active pile evaporates 20-100 kg water per tonne per day at peak.' },
];

const STEPS = [
  { title: 'Build a recipe', body: 'Choose feedstocks from a 24-material database, or let the solver hit a C/N ratio, moisture target and batch mass all at once.' },
  { title: 'Watch the physics run', body: 'A coupled heat, mass, oxygen and microbial model integrates forward through 12,000 steps. No phase is scripted. They fall out of the arithmetic.' },
  { title: 'Read the diagnosis', body: 'A 0-100 Compost Intelligence Score and worst-first advisories tell you exactly which equation is limiting the pile right now.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Landing() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-base)]/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo size={64} />
            <span className="font-display text-xl font-semibold tracking-tight text-[var(--text-primary)]">PILENGINE</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button size="sm">
                Open App <ArrowRight size={14} weight="bold" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <NetworkField />
        </div>
        <motion.div
          initial={reduceMotion ? undefined : 'hidden'}
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 py-24 text-center sm:px-8 sm:py-32"
        >
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif text-4xl italic tracking-tight text-[var(--text-primary)] sm:text-6xl"
            style={{ lineHeight: 1.1 }}
          >
            Compost, simulated from first principles.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg"
          >
            PILENGINE runs a coupled heat, mass, oxygen and microbial model through a pile's full lifecycle, and
            shows which equation drives the outcome.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/reactor">
              <Button>
                Enter the Reactor <ArrowRight size={15} weight="bold" />
              </Button>
            </Link>
            <Link to="/science">
              <Button variant="secondary">Read the Science</Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
        <motion.h2
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl"
        >
          How it works
        </motion.h2>
        <div className="mt-8 flex flex-col">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex gap-5 border-b border-[var(--border)] py-6 last:border-0"
            >
              <div className="flex flex-col items-center">
                <span className="font-mono text-sm text-[var(--text-faint)]">0{i + 1}</span>
                {i < STEPS.length - 1 && <span className="mt-2 w-px flex-1 bg-[var(--border)]" />}
              </div>
              <div className="pb-2">
                <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">{s.title}</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--text-secondary)]">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <motion.h2
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl"
        >
          Failure modes are real, and they emerge
        </motion.h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          Nothing here is scripted. Feed the model a bad recipe or a bad operating condition and it fails the way
          real compost fails.
        </p>
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 overflow-x-auto rounded-lg border border-[var(--border)]"
        >
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-well)]">
                <th className="px-4 py-2.5 text-left font-medium text-[var(--text-faint)]">Scenario</th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--text-faint)]">PILENGINE predicts</th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--text-faint)]">Why</th>
              </tr>
            </thead>
            <tbody>
              {FAILURE_MODES.map((f) => (
                <tr key={f.scenario} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{f.scenario}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{f.prediction}</td>
                  <td className="px-4 py-3 text-[var(--text-faint)]">{f.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </section>

      <footer className="border-t border-[var(--border)] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-faint)]">
          <span>PILENGINE · Scientific Compost Intelligence Platform</span>
          <Link to="/science" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Sources &amp; derivations
          </Link>
        </div>
      </footer>
    </div>
  );
}
