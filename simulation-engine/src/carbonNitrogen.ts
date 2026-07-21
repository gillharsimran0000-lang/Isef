import type { Material, RecipeItem } from './types.js';
import { resolveRecipe } from './materials.js';

/**
 * PILENGINE; Carbon / Nitrogen balance.
 *
 * The governing relation (Cornell Waste Management Institute; Rynk 1992):
 *
 *     R = Σ[ Qn · Cn · (100 − Mn) ] / Σ[ Qn · Nn · (100 − Mn) ]
 *
 * where for each material n:
 *     Qn = wet mass                Cn = carbon, % of dry mass
 *     Mn = moisture, % of wet mass Nn = nitrogen, % of dry mass
 *
 * The (100 − Mn) factor converts wet mass to dry mass, because C and N are
 * reported on a dry basis. Omitting it is the classic recipe-math error: a
 * bucket of 80%-moisture food scraps contributes only a fifth of the nitrogen
 * its wet weight suggests.
 */
export function cnRatio(recipe: RecipeItem[]): number {
  const items = resolveRecipe(recipe);
  let numerator = 0;
  let denominator = 0;
  for (const it of items) {
    const dry = it.massKg * (100 - it.moisturePct);
    numerator += dry * it.carbonPct;
    denominator += dry * it.nitrogenPct;
  }
  if (denominator <= 0) return Infinity;
  return numerator / denominator;
}

/** Total carbon and nitrogen mass (kg) in a recipe, and the resulting ratio. */
export function cnMass(recipe: RecipeItem[]): {
  carbonKg: number;
  nitrogenKg: number;
  ratio: number;
} {
  const items = resolveRecipe(recipe);
  const carbonKg = items.reduce((s, i) => s + i.carbonKg, 0);
  const nitrogenKg = items.reduce((s, i) => s + i.nitrogenKg, 0);
  return {
    carbonKg,
    nitrogenKg,
    ratio: nitrogenKg > 0 ? carbonKg / nitrogenKg : Infinity,
  };
}

export interface TwoMaterialSolution {
  /** Mass of material 2 required, kg. */
  massKg: number;
  /** True when the target ratio is reachable with a positive mass of material 2. */
  feasible: boolean;
  reason?: string;
  /** Ratio actually achieved (equals the target when feasible). */
  achievedRatio: number;
}

/**
 * Two-material C/N solver: given a fixed mass Q1 of material 1, find the mass
 * Q2 of material 2 that lands the blend on a target ratio R.
 *
 * Derivation; start from the governing relation for two materials:
 *
 *     R = [Q1·C1·(100−M1) + Q2·C2·(100−M2)] / [Q1·N1·(100−M1) + Q2·N2·(100−M2)]
 *
 * Multiply out and collect the Q2 terms:
 *
 *     R·Q1·N1·(100−M1) + R·Q2·N2·(100−M2) = Q1·C1·(100−M1) + Q2·C2·(100−M2)
 *     Q2·(100−M2)·(R·N2 − C2)             = Q1·(100−M1)·(C1 − R·N1)
 *
 *     ⇒  Q2 = Q1·(C1 − R·N1)·(100 − M1) / [ (R·N2 − C2)·(100 − M2) ]
 *
 * NOTE ON THE SPEC: the product brief writes this solver as
 *     Q2 = [Q1(G−M1) − Q1(C1−R·N1)(100−M1)] / [R·N2(100−M2) − C2(100−M2)]
 * The leading Q1(G−M1) term belongs to the *moisture* solver (see moisture.ts),
 * not to the C/N solver; G is a moisture goal and cannot appear in a
 * carbon/nitrogen mass balance, where it would be dimensionally inconsistent
 * with the (C − R·N) terms it is added to. PILENGINE implements the correct
 * algebraic solution above; `solveMoistureTwoMaterial` handles the G term.
 *
 * Feasibility: the solution is only physical when material 2 pulls the blend
 * toward R from the opposite side of material 1. Concretely, the numerator and
 * denominator must share a sign; i.e. one material must sit above the target
 * ratio and the other below it. Two "browns" can never average to 30:1.
 */
export function solveTwoMaterial(
  m1: Material,
  q1Kg: number,
  m2: Material,
  targetRatio: number,
): TwoMaterialSolution {
  const numerator = q1Kg * (m1.carbonPct - targetRatio * m1.nitrogenPct) * (100 - m1.moisturePct);
  const denominator = (targetRatio * m2.nitrogenPct - m2.carbonPct) * (100 - m2.moisturePct);

  if (Math.abs(denominator) < 1e-9) {
    return {
      massKg: 0,
      feasible: false,
      achievedRatio: cnOfPair(m1, q1Kg, m2, 0),
      reason: `${m2.name} already sits at exactly ${targetRatio.toFixed(1)}:1, so no amount of it will move the blend.`,
    };
  }

  const massKg = numerator / denominator;

  if (!Number.isFinite(massKg) || massKg <= 0) {
    const c1 = m1.nitrogenPct > 0 ? m1.carbonPct / m1.nitrogenPct : Infinity;
    const c2 = m2.nitrogenPct > 0 ? m2.carbonPct / m2.nitrogenPct : Infinity;
    const both = c1 > targetRatio && c2 > targetRatio ? 'above' : c1 < targetRatio && c2 < targetRatio ? 'below' : null;
    return {
      massKg: 0,
      feasible: false,
      achievedRatio: cnOfPair(m1, q1Kg, m2, 0),
      reason: both
        ? `Both materials sit ${both} ${targetRatio.toFixed(1)}:1 (${fmt(c1)} and ${fmt(c2)}), so no blend of the two can reach it. Add a ${both === 'above' ? 'nitrogen' : 'carbon'} source.`
        : `No positive mass of ${m2.name} reaches ${targetRatio.toFixed(1)}:1 with this amount of ${m1.name}.`,
    };
  }

  return { massKg, feasible: true, achievedRatio: cnOfPair(m1, q1Kg, m2, massKg) };
}

function cnOfPair(m1: Material, q1: number, m2: Material, q2: number): number {
  const num = q1 * m1.carbonPct * (100 - m1.moisturePct) + q2 * m2.carbonPct * (100 - m2.moisturePct);
  const den = q1 * m1.nitrogenPct * (100 - m1.moisturePct) + q2 * m2.nitrogenPct * (100 - m2.moisturePct);
  return den > 0 ? num / den : Infinity;
}

function fmt(v: number): string {
  return Number.isFinite(v) ? `${v.toFixed(0)}:1` : 'no nitrogen';
}

/** Where a ratio sits relative to the composting window. */
export function classifyCn(ratio: number): {
  status: 'low' | 'optimal' | 'acceptable' | 'high';
  label: string;
  detail: string;
} {
  if (!Number.isFinite(ratio) || ratio > 40) {
    return {
      status: 'high',
      label: 'Carbon Excess',
      detail:
        'Nitrogen is the limiting nutrient. Microbes cannot build enough protein to multiply, so the pile will heat weakly and decompose slowly. Add a nitrogen source.',
    };
  }
  if (ratio > 35) {
    return {
      status: 'high',
      label: 'Carbon Rich',
      detail: 'Slightly nitrogen-starved. Decomposition will run but the thermophilic peak will be muted and shorter.',
    };
  }
  if (ratio >= 25) {
    const optimal = ratio >= 28 && ratio <= 33;
    return {
      status: optimal ? 'optimal' : 'acceptable',
      label: optimal ? 'Optimal' : 'Acceptable',
      detail: optimal
        ? 'Carbon and nitrogen are balanced for maximum microbial growth. Expect a strong, sustained thermophilic phase.'
        : 'Within the workable window. Decomposition will proceed at close to full rate.',
    };
  }
  if (ratio >= 20) {
    return {
      status: 'low',
      label: 'Nitrogen Rich',
      detail: 'Surplus nitrogen will be shed as ammonia. Expect some odour and a loss of fertiliser value. Add carbon.',
    };
  }
  return {
    status: 'low',
    label: 'Nitrogen Excess',
    detail:
      'Well below 25:1. Excess nitrogen volatilises as ammonia; this is the classic source of a sharp, acrid smell and of nitrogen loss to the atmosphere. Add a bulky carbon source.',
  };
}
