import type { Material, RecipeItem } from './types.js';
import { resolveRecipe } from './materials.js';
import { MOISTURE_MAX, MOISTURE_MIN } from './constants.js';

/**
 * PILENGINE; Moisture.
 *
 * Gravimetric moisture content, wet basis:
 *
 *     M = [ (Ww − Wd) / Ww ] × 100
 *
 * Ww = wet (as-received) sample weight, Wd = oven-dry weight. This is the
 * standard field measurement: dry a sample at 105 °C to constant weight and
 * apply the above. The wet basis is used everywhere in PILENGINE because it is
 * what a moisture probe reads and what compost literature reports.
 */
export function moistureFromSample(wetWeight: number, dryWeight: number): number {
  if (!(wetWeight > 0)) return 0;
  if (dryWeight < 0 || dryWeight > wetWeight) {
    throw new RangeError('Dry weight must be between 0 and the wet weight.');
  }
  return ((wetWeight - dryWeight) / wetWeight) * 100;
}

/**
 * Moisture of a mixture; a wet-mass-weighted average:
 *
 *     Mmix = Σ(Qn × Mn) / ΣQn
 *
 * This is exact (not an approximation) because water mass is conserved on
 * mixing: Σ(Qn·Mn/100) is the total water, and ΣQn the total wet mass.
 */
export function mixtureMoisture(recipe: RecipeItem[]): number {
  const items = resolveRecipe(recipe);
  let water = 0;
  let total = 0;
  for (const it of items) {
    water += it.massKg * it.moisturePct;
    total += it.massKg;
  }
  return total > 0 ? water / total : 0;
}

export interface MoistureSolution {
  massKg: number;
  feasible: boolean;
  reason?: string;
}

/**
 * Two-material moisture solver: given Q1 of material 1, how much of material 2
 * lands the blend on a moisture goal G?
 *
 *     Q2 = Q1(G − M1) / (M2 − G)
 *
 * Derivation: from Mmix = (Q1·M1 + Q2·M2) / (Q1 + Q2) = G, expand and collect Q2.
 * The solution is positive only when G lies strictly between M1 and M2; you
 * cannot mix two dry materials into a wet one. Adding `water` (M = 100%) as
 * material 2 is the standard way to wet a dry mix.
 */
export function solveMoistureTwoMaterial(
  m1: Material,
  q1Kg: number,
  m2: Material,
  goalPct: number,
): MoistureSolution {
  const denominator = m2.moisturePct - goalPct;
  if (Math.abs(denominator) < 1e-9) {
    return { massKg: 0, feasible: false, reason: `${m2.name} is already at the ${goalPct}% goal, so it cannot shift the blend.` };
  }
  const massKg = (q1Kg * (goalPct - m1.moisturePct)) / denominator;
  if (!Number.isFinite(massKg) || massKg <= 0) {
    const between = (m1.moisturePct - goalPct) * (m2.moisturePct - goalPct) < 0;
    return {
      massKg: 0,
      feasible: false,
      reason: between
        ? `No positive mass of ${m2.name} reaches ${goalPct}%.`
        : `The ${goalPct}% goal is not between ${m1.name} (${m1.moisturePct}%) and ${m2.name} (${m2.moisturePct}%). A blend can only land between its ingredients; pick a wetter or drier second material.`,
    };
  }
  return { massKg, feasible: true };
}

/**
 * Three-material moisture solver: Q1 and Q2 are fixed, solve for Q3.
 *
 *     Q3 = [ G(Q1 + Q2) − Q1·M1 − Q2·M2 ] / (M3 − G)
 *
 * Same water balance as above, with the first two materials pre-blended.
 */
export function solveMoistureThreeMaterial(
  m1: Material,
  q1Kg: number,
  m2: Material,
  q2Kg: number,
  m3: Material,
  goalPct: number,
): MoistureSolution {
  const denominator = m3.moisturePct - goalPct;
  if (Math.abs(denominator) < 1e-9) {
    return { massKg: 0, feasible: false, reason: `${m3.name} is already at the ${goalPct}% goal.` };
  }
  const massKg = (goalPct * (q1Kg + q2Kg) - q1Kg * m1.moisturePct - q2Kg * m2.moisturePct) / denominator;
  if (!Number.isFinite(massKg) || massKg <= 0) {
    const blend = (q1Kg * m1.moisturePct + q2Kg * m2.moisturePct) / (q1Kg + q2Kg);
    return {
      massKg: 0,
      feasible: false,
      reason: `The first two materials already blend to ${blend.toFixed(1)}%, which is on the same side of ${goalPct}% as ${m3.name} (${m3.moisturePct}%). No positive amount of ${m3.name} can bring the mix to the goal.`,
    };
  }
  return { massKg, feasible: true };
}

/** Where a moisture reading sits relative to the composting window. */
export function classifyMoisture(pct: number): {
  status: 'dry' | 'optimal' | 'acceptable' | 'wet';
  label: string;
  detail: string;
} {
  if (pct < 30) {
    return {
      status: 'dry',
      label: 'Critically Dry',
      detail:
        'Below ~30% the water film around particles breaks up and microbial activity effectively stops. The pile is not composting; it is just sitting there. Add water.',
    };
  }
  if (pct < MOISTURE_MIN) {
    return {
      status: 'dry',
      label: 'Too Dry',
      detail: 'Microbes need free water to move and to transport dissolved nutrients. Decomposition is throttled. Add water while turning.',
    };
  }
  if (pct <= MOISTURE_MAX) {
    const optimal = pct >= 50 && pct <= 60;
    return {
      status: optimal ? 'optimal' : 'acceptable',
      label: optimal ? 'Optimal Moisture' : 'Acceptable',
      detail: optimal
        ? 'The squeeze test would yield a damp sponge with one or two drops. Water films support microbial transport without flooding the pores that carry oxygen.'
        : 'Workable, but drifting away from the 50–60% sweet spot.',
    };
  }
  if (pct <= 75) {
    return {
      status: 'wet',
      label: 'Too Wet',
      detail:
        'Water is displacing air from the pore space. Because oxygen diffuses roughly 10,000× more slowly through water than air, the pile is drifting anaerobic. Turn it and add dry bulking material.',
    };
  }
  return {
    status: 'wet',
    label: 'Waterlogged',
    detail:
      'The pore network is flooded. Oxygen cannot reach the interior, fermentation replaces respiration, and the pile will go sour and smell of ammonia and sulphide. Add dry carbon and turn immediately.',
  };
}

export { MOISTURE_MIN, MOISTURE_MAX };
