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
        <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">Governing Equations</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          The full set of equations behind the model, grouped by what they govern. Each links to the file that
          implements it — several go beyond the literature's own formulation, as noted.
        </p>
        <div className="mt-5 flex flex-col gap-6">
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">1. Carbon-to-nitrogen (C/N) ratio</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Multi-material mixture:{' '}
              <code className="font-mono text-xs">R = Σ[Qₙ·Cₙ·(100−Mₙ)] / Σ[Qₙ·Nₙ·(100−Mₙ)]</code>. Two-material
              solver, given a fixed mass of material 1 and a target ratio R:{' '}
              <code className="font-mono text-xs">Q₂ = Q₁(C₁−R·N₁)(100−M₁) / [(R·N₂−C₂)(100−M₂)]</code> — the corrected
              form; see below. <code className="font-mono text-xs">carbonNitrogen.ts</code>.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">2. Moisture content</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Sample: <code className="font-mono text-xs">M = [(Ww−Wd)/Ww]×100</code>. Mixture:{' '}
              <code className="font-mono text-xs">M_mix = Σ(Qₙ·Mₙ) / ΣQₙ</code>. Two-material, given a moisture goal
              G: <code className="font-mono text-xs">Q₂ = Q₁(G−M₁) / (M₂−G)</code>. Three-material, solving for the
              third given the first two: <code className="font-mono text-xs">Q₃ = [G(Q₁+Q₂) − Q₁M₁ − Q₂M₂] / (M₃−G)</code>.{' '}
              <code className="font-mono text-xs">moisture.ts</code>.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">3. Oxygen diffusion</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Binary diffusivity (Fuller-type correlation):{' '}
              <code className="font-mono text-xs">D₁₂ = D₀·(P₀/P)·(T/T₀)^1.75·(Ω₀/Ω)</code> — corrected ratio
              direction; see below. Multi-component pore gas (Blanc's law, the dilute-species reduction of
              Stefan–Maxwell): <code className="font-mono text-xs">1/D_mix = Σⱼ(yⱼ/D_O₂,ⱼ)</code>. Effective
              diffusivity through the porous pile (Millington–Quirk 1961, beyond the reference literature):{' '}
              <code className="font-mono text-xs">D_eff/D₀ = εₐ^(10/3) / φ²</code>. Dissolved oxygen in liquid water:{' '}
              <code className="font-mono text-xs">D_water ≈ 4.8×10⁻⁵ cm²/s</code>, roughly four orders of magnitude
              slower than in air — the physical reason a waterlogged pile suffocates.{' '}
              <code className="font-mono text-xs">oxygen.ts</code>.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">4. Q10 temperature kinetics</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              <code className="font-mono text-xs">R(T) = R₀ · Q10^[(T−T₀)/10]</code>, Q10 ≈ 2–3 for biological
              systems (PILENGINE default 2.5). Used alone this predicts unbounded heating, so the engine layers Haug's
              (1993) thermal-inactivation factor on top:{' '}
              <code className="font-mono text-xs">f(T) = 1.066^(T−20) − 1.21^(T−60)</code>, which peaks near 58–60 °C
              and crosses zero above 70 °C. <code className="font-mono text-xs">kinetics.ts</code>.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">5. Simultaneous recipe balancing</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Rather than hand-deriving coefficients for one moisture/C/N pair, PILENGINE solves the general 3×3
              linear system directly — C/N target, moisture target, and total batch mass, all three at once — by
              Gaussian elimination with partial pivoting. <code className="font-mono text-xs">recipe.ts</code>.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">6. Biodegradable carbon (lignin accessibility)</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Instead of one adjusted C/N number from a single biodegradability percentage, PILENGINE splits organic
              matter into a rapidly degradable pool (sugars, starch, protein), a slowly degradable pool (cellulose,
              hemicellulose), and inert lignin — each with its own first-order rate constant.{' '}
              <code className="font-mono text-xs">simulate.ts</code>, <code className="font-mono text-xs">constants.ts</code>.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">7. Thermophilic succession</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Cardinal temperature model with inflection (Rosso et al. 1993):{' '}
              <code className="font-mono text-xs">
                γ(T) = (T−Tmax)(T−Tmin)² / {'{'}(Topt−Tmin)[(Topt−Tmin)(T−Topt) − (Topt−Tmax)(Topt+Tmin−2T)]{'}'}
              </code>
              . Four guilds (mesophilic and thermophilic bacteria, actinomycetes, fungi) compete for a shared carrying
              capacity; the mesophilic → thermophilic → actinomycete/fungal succession emerges from that competition
              rather than being scripted by day count. <code className="font-mono text-xs">microbial.ts</code>.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">8. Parameter ranges</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              C/N 30:1 to start, ~10–12:1 finished (Rynk 1992). Moisture 40–65% workable, 50–60% optimal, &lt;30%
              critically dry. Mesophilic to 40 °C, thermophilic 40–60 °C, critical above 65 °C. US EPA 40 CFR 503
              PFRP: 55 °C sustained for 3 consecutive days destroys human and plant pathogens.{' '}
              <code className="font-mono text-xs">constants.ts</code>.
            </p>
          </div>
        </div>
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
