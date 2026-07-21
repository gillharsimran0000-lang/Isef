import type { Advisory, HealthScore, SimulationStep } from './types.js';
import {
  CN_ACCEPTABLE_MAX,
  CN_ACCEPTABLE_MIN,
  FAS_MIN,
  MOISTURE_MAX,
  MOISTURE_MIN,
  O2_ANAEROBIC_THRESHOLD_PCT,
  T_CRITICAL,
  T_THERMOPHILIC_MAX,
  T_THERMOPHILIC_MIN,
} from './constants.js';

/**
 * PILENGINE; Compost Intelligence Score.
 *
 *     Health = (T_score + M_score + CN_score + O2_score) / 4
 *
 * Four sub-scores, each 0–100, averaged. The average is deliberate here, in
 * contrast to the *rate* model in kinetics.ts, which multiplies its factors.
 * The distinction matters:
 *
 *   - The rate model answers "how fast is this pile actually working right now?"
 *     One factor at zero stops everything, so the factors multiply.
 *   - The health score answers "how far is this pile from where I want it, and
 *     what should I fix first?" A pile that is perfect on three axes and broken
 *     on one is a *fixable* pile, and the score should say so rather than
 *     collapsing to zero and telling the operator nothing.
 *
 * The advisories carry the diagnosis that the single number cannot.
 */
export function healthScore(step: SimulationStep): HealthScore {
  const temperature = temperatureScore(step.temperatureC);
  const moisture = moistureScore(step.moisturePct);
  const cn = cnScore(step.cnRatio);
  const oxygen = oxygenScore(step.oxygenPct, step.freeAirSpacePct);

  const total = (temperature + moisture + cn + oxygen) / 4;

  return {
    total,
    temperature,
    moisture,
    cn,
    oxygen,
    label: scoreLabel(total),
    advisories: buildAdvisories(step),
  };
}

function temperatureScore(tempC: number): number {
  if (tempC >= T_THERMOPHILIC_MIN && tempC <= T_THERMOPHILIC_MAX) {
    // Peak biological output sits at 55 °C: hot enough to sanitise, not so hot
    // that the community starts cooking itself.
    return 100 - Math.abs(tempC - 55) * 0.8;
  }
  if (tempC > T_THERMOPHILIC_MAX) {
    // Falls away fast past 65 °C; the biology is being destroyed.
    return Math.max(0, 92 - (tempC - T_THERMOPHILIC_MAX) * 6);
  }
  // Mesophilic: fine, just not doing the heavy work yet.
  return Math.max(15, 30 + (tempC / T_THERMOPHILIC_MIN) * 55);
}

function moistureScore(pct: number): number {
  if (pct >= 50 && pct <= 60) return 100;
  if (pct >= MOISTURE_MIN && pct <= MOISTURE_MAX) return 100 - Math.abs(pct - 55) * 1.5;
  if (pct < MOISTURE_MIN) return Math.max(0, 85 - (MOISTURE_MIN - pct) * 4);
  return Math.max(0, 85 - (pct - MOISTURE_MAX) * 4);
}

function cnScore(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  if (ratio >= 28 && ratio <= 33) return 100;
  if (ratio >= CN_ACCEPTABLE_MIN && ratio <= CN_ACCEPTABLE_MAX) return 100 - Math.abs(ratio - 30) * 2;
  if (ratio < CN_ACCEPTABLE_MIN) return Math.max(0, 90 - (CN_ACCEPTABLE_MIN - ratio) * 4);
  return Math.max(0, 90 - (ratio - CN_ACCEPTABLE_MAX) * 2.2);
}

function oxygenScore(o2Pct: number, fasPct: number): number {
  // Above ~10% v/v the microbes cannot tell the difference; below 5% the pile is
  // turning anaerobic.
  const o2 = o2Pct >= 10 ? 100 : Math.max(0, (o2Pct / 10) * 100);
  // Structural component: without free air space there is no path for gas at all.
  const structure = fasPct >= FAS_MIN ? 100 : Math.max(0, (fasPct / FAS_MIN) * 100);
  return 0.7 * o2 + 0.3 * structure;
}

function scoreLabel(total: number): string {
  if (total >= 90) return 'Excellent Biological Conditions';
  if (total >= 78) return 'Strong Biological Activity';
  if (total >= 62) return 'Functional; Room to Optimise';
  if (total >= 45) return 'Impaired; Intervention Advised';
  if (total >= 25) return 'Failing; Process Stalled';
  return 'Critical; Not Composting';
}

function buildAdvisories(step: SimulationStep): Advisory[] {
  const out: Advisory[] = [];
  const { temperatureC: t, moisturePct: m, cnRatio: cn, oxygenPct: o2, freeAirSpacePct: fas } = step;

  // ── Critical ──────────────────────────────────────────────────────────
  if (t >= T_CRITICAL) {
    out.push({
      severity: 'critical',
      title: 'Microbial activity declining',
      detail: `At ${t.toFixed(1)} °C the pile has passed the thermal ceiling of its own workforce. Thermophile death is now outpacing growth, and the mesophiles and fungi that finish the compost are being sterilised out entirely. Turn the pile to vent heat, or increase aeration.`,
    });
  }

  if (o2 < O2_ANAEROBIC_THRESHOLD_PCT) {
    out.push({
      severity: 'critical',
      title: 'Pile going anaerobic',
      detail: `Interstitial oxygen has fallen to ${o2.toFixed(1)}% (aerobic respiration needs >5%). Fermentation is replacing respiration, which produces a tenth of the energy and generates organic acids, methane and hydrogen sulphide; the sour, rotten-egg smell of a failed pile. Turn it now.`,
    });
  }

  if (fas < FAS_MIN) {
    out.push({
      severity: 'critical',
      title: 'Pore network collapsed',
      detail: `Free air space is ${fas.toFixed(0)}%, below the ~30% at which gas-filled pores stop connecting to one another. Oxygen has no continuous path into the pile regardless of how hard you aerate. Add coarse bulking material; wood chips or bark; and rebuild the pile.`,
    });
  }

  // ── Warnings ──────────────────────────────────────────────────────────
  if (m > MOISTURE_MAX && o2 >= O2_ANAEROBIC_THRESHOLD_PCT) {
    out.push({
      severity: 'warning',
      title: 'Excess moisture displacing oxygen',
      detail: `At ${m.toFixed(0)}% moisture, water is filling the pores that carry air. Oxygen diffuses roughly 4,000× more slowly through water than through air, so the pile is on a path to anaerobia even though it has not arrived yet. Add dry carbon and turn.`,
    });
  }

  if (m < MOISTURE_MIN && m >= 30) {
    out.push({
      severity: 'warning',
      title: 'Moisture below the working window',
      detail: `At ${m.toFixed(0)}% the water films that microbes live and move in are thinning. Decomposition is being throttled by dehydration, not by any lack of food. Water the pile as you turn it.`,
    });
  } else if (m < 30) {
    out.push({
      severity: 'critical',
      title: 'Pile desiccated',
      detail: `At ${m.toFixed(0)}% moisture microbial activity has effectively ceased. The pile is not decomposing slowly; it has stopped. Rehydrate to 50–60%.`,
    });
  }

  if (Number.isFinite(cn) && cn > 40) {
    out.push({
      severity: 'warning',
      title: 'Nitrogen-starved',
      detail: `At ${cn.toFixed(0)}:1 there is far more carbon than the microbes can build into protein. They cannot multiply fast enough to generate heat, so the pile will sit lukewarm for months. Add a nitrogen source: grass, manure or food scraps.`,
    });
  } else if (cn < 20 && cn > 0) {
    out.push({
      severity: 'warning',
      title: 'Nitrogen being lost as ammonia',
      detail: `At ${cn.toFixed(0)}:1 the surplus nitrogen has nowhere to go and is volatilising as NH₃. You are losing the fertiliser value you are trying to create, and it smells. Add a bulky carbon source.`,
    });
  }

  // ── Good ──────────────────────────────────────────────────────────────
  if (t >= 55 && t < T_CRITICAL) {
    out.push({
      severity: 'good',
      title: 'Pathogen reduction underway',
      detail: `Sustained temperatures above 55 °C destroy human and plant pathogens and most weed seeds. Three consecutive days at this temperature meets the US EPA's PFRP standard for a safe, sanitised product.`,
    });
  }

  if (out.length === 0) {
    out.push({
      severity: 'good',
      title: 'All parameters nominal',
      detail:
        'Temperature, moisture, carbon/nitrogen balance and oxygen are all inside their working windows. The pile is decomposing at close to its theoretical maximum rate. No intervention needed.',
    });
  }

  const order = { critical: 0, warning: 1, info: 2, good: 3 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Temperature phase label + the band it falls in. */
export function temperaturePhase(tempC: number): { label: string; band: string; warning?: string } {
  if (tempC >= T_CRITICAL) {
    return {
      label: 'Critical Zone',
      band: '> 65 °C',
      warning: 'Microbial activity declining',
    };
  }
  if (tempC >= T_THERMOPHILIC_MIN) {
    return { label: 'Thermophilic Phase', band: '40 – 60 °C' };
  }
  return { label: 'Mesophilic Phase', band: '0 – 40 °C' };
}
