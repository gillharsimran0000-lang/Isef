import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Q10Chart } from '@/components/charts/Q10Chart';
import { MaterialTable } from '@/components/science/MaterialTable';
import { usePileStore } from '@/state/usePile';

const SOURCES = [
  { name: 'Rynk, R. (ed.), On-Farm Composting Handbook, NRAES-54', year: 1992, note: 'Feedstock data, C/N targets' },
  { name: 'Haug, R.T., The Practical Handbook of Compost Engineering', year: 1993, note: 'Energy balance, temperature/moisture response, O₂ stoichiometry' },
  { name: 'Cornell Waste Management Institute', year: 0, note: 'Compost chemistry, recipe algebra' },
  { name: 'Millington, R.J. & Quirk, J.P.', year: 1961, note: 'Effective diffusivity in porous media' },
  { name: 'Rosso, L. et al.', year: 1993, note: 'Cardinal temperature model with inflection' },
  { name: 'US EPA 40 CFR 503', year: 0, note: 'Process to Further Reduce Pathogens (55 °C × 3 days)' },
];

export default function Science() {
  const q10 = usePileStore((s) => s.config.q10);

  return (
    <Shell title="Science">
      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">A model, not a calculator</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          PILENGINE integrates a coupled heat/mass/oxygen/microbial model forward through 12,000 steps. Nothing
          schedules the three classic phases — no <code className="font-mono text-xs text-[var(--text-faint)]">if (day &lt; 3) return 'mesophilic'</code>.
          The pile heats because respiration liberates roughly 21 MJ per kg of volatile solids destroyed; it
          accelerates because the biological rate follows a Q10 of about 2.5; it peaks because proteins denature; it
          cools because it runs out of food. Feed it a bad recipe and there simply are no phases.
        </p>
        <div className="mt-5 flex flex-col items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-well)] p-5 text-center font-mono text-xs text-[var(--text-secondary)]">
          <span>substrate → respiration → heat → temperature → reaction rate → substrate</span>
          <span className="text-[var(--text-faint)]">↓ O₂ demand → oxygen depletion ↑</span>
          <span className="text-[var(--text-faint)]">water → pore space → oxygen supply</span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          The rate factors multiply, not average: <code className="font-mono text-xs text-[var(--text-faint)]">k_eff = k_ref · f(T) · f(M) · f(O₂) · f(C/N) · f(FAS)</code>{' '}
          — Liebig's law of the minimum. A pile perfect in every respect but bone dry does not run at 80% speed; it
          does not run at all.
        </p>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">Q10 vs. Thermal Inactivation</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          A pure Q10 relation (dashed) predicts the reaction rate keeps climbing with temperature forever. The
          model's actual thermal factor (solid) tracks Q10 up to about 45 °C, then diverges sharply — proteins begin
          denaturing and the workforce dies faster than it grows. That divergence is the entire difference between a
          pile that peaks and a pile that cooks itself.
        </p>
        <div className="mt-3">
          <Q10Chart q10={q10} />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">Two Corrections to the Original Specification</h2>
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">1. The two-material C/N solver</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              The brief's leading term for a moisture goal <code className="font-mono text-xs">G</code> is dimensionally inconsistent when
              added into a carbon/nitrogen mass balance built from <code className="font-mono text-xs">(C − R·N)</code> terms. PILENGINE
              derives and implements the correct solution,{' '}
              <code className="font-mono text-xs">Q₂ = Q₁(C₁ − R·N₁)(100 − M₁) / [(R·N₂ − C₂)(100 − M₂)]</code>, verified by tests that land
              exactly on the target ratio.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">2. The gas-diffusion collision integral</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Chapman–Enskog theory gives <code className="font-mono text-xs">D ∝ T^(3/2) / (P·Ω)</code>. A larger collision integral means
              more scattering and therefore slower diffusion, so the ratio in the diffusivity relation must be{' '}
              <code className="font-mono text-xs">(Ω₀/Ω)</code>, not <code className="font-mono text-xs">(Ω/Ω₀)</code>.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">Feedstock Database</h2>
        <p className="mt-1 mb-4 text-sm text-[var(--text-secondary)]">24 materials characterised from the literature.</p>
        <MaterialTable />
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">Sources</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {SOURCES.map((s, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium text-[var(--text-primary)]">
                {s.name}
                {s.year > 0 && ` (${s.year})`}
              </span>
              <span className="text-[var(--text-faint)]">— {s.note}</span>
            </li>
          ))}
        </ul>
      </Card>
    </Shell>
  );
}
