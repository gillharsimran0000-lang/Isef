import type { Material, RecipeItem } from './types.js';
import { getMaterial, resolveRecipe } from './materials.js';
import { cnRatio } from './carbonNitrogen.js';
import { mixtureMoisture } from './moisture.js';

/**
 * PILENGINE; Recipe balancing.
 *
 * The two-material solvers in carbonNitrogen.ts and moisture.ts each hit ONE
 * target. In practice a composter has two targets at once; get to 30:1 *and*
 * get to 55% moisture; and the two fight each other. Nitrogen-rich feedstocks
 * are almost always wet feedstocks (food scraps are 80% water), so every kilo of
 * nitrogen you add to fix the C/N pushes the moisture the wrong way. That is the
 * actual difficulty of building a compost recipe, and it is why so many piles end
 * up either cold or slimy.
 *
 * Both constraints are *linear* in the material masses, which means you can
 * satisfy them exactly rather than iterating by hand. With three free materials
 * and three constraints; C/N, moisture, and total batch mass; the system is
 * square:
 *
 *   (1)  Σ qᵢ·(Cᵢ − R·Nᵢ)·(100 − Mᵢ)  =  0        target C/N = R
 *   (2)  Σ qᵢ·(Mᵢ − G)                =  0        target moisture = G
 *   (3)  Σ qᵢ                         =  T        target batch mass
 *
 * Equation (1) is just the governing C/N relation with everything moved to one
 * side; equation (2) is the water balance. Solve the 3×3 system and you have the
 * recipe. Any additional materials the user has already committed to (a fixed
 * quantity of wood chips for structure, say) move to the right-hand side as
 * constants.
 */

export interface BalanceRequest {
  /** Materials whose masses are already decided; e.g. the bulking agent. */
  fixed: RecipeItem[];
  /** Exactly three material ids whose masses PILENGINE should solve for. */
  solveFor: [string, string, string];
  targetCn: number;
  targetMoisturePct: number;
  targetMassKg: number;
}

export interface BalanceResult {
  feasible: boolean;
  recipe: RecipeItem[];
  achievedCn: number;
  achievedMoisturePct: number;
  achievedMassKg: number;
  reason?: string;
}

export function balanceRecipe(request: BalanceRequest): BalanceResult {
  const { fixed, solveFor, targetCn: R, targetMoisturePct: G, targetMassKg: T } = request;

  const mats = solveFor.map((id) => getMaterial(id));
  if (mats.some((m) => !m)) {
    return fail('One or more of the selected materials is not in the database.');
  }
  const [m1, m2, m3] = mats as [Material, Material, Material];

  // Contribution of the already-fixed materials; these become constants that
  // the three free materials must compensate for.
  const fixedItems = resolveRecipe(fixed);
  let cnConst = 0;
  let moistConst = 0;
  let massConst = 0;
  for (const f of fixedItems) {
    cnConst += f.massKg * (f.carbonPct - R * f.nitrogenPct) * (100 - f.moisturePct);
    moistConst += f.massKg * (f.moisturePct - G);
    massConst += f.massKg;
  }

  // Row per constraint, column per free material.
  const A: number[][] = [
    mats.map((m) => (m!.carbonPct - R * m!.nitrogenPct) * (100 - m!.moisturePct)),
    mats.map((m) => m!.moisturePct - G),
    [1, 1, 1],
  ];
  const b = [-cnConst, -moistConst, T - massConst];

  const q = solve3x3(A, b);
  if (!q) {
    return fail(
      'These three materials are not independent enough to hit both targets; two of them pull the blend in the same direction. Swap one for a material on the other side of the C/N or moisture goal.',
    );
  }

  const negative = q.findIndex((v) => v < -1e-6);
  if (negative >= 0) {
    const culprit = [m1, m2, m3][negative]!;
    return fail(
      `Reaching ${R}:1 at ${G}% moisture would require a negative mass of ${culprit.name}; that is the solver telling you the two targets are incompatible with this material set. ${suggest(m1, m2, m3, R, G)}`,
    );
  }

  const recipe: RecipeItem[] = [
    ...fixed.filter((f) => f.massKg > 0),
    ...solveFor.map((id, i) => ({ materialId: id, massKg: round(q[i]!) })),
  ].filter((r) => r.massKg > 0.01);

  return {
    feasible: true,
    recipe,
    achievedCn: cnRatio(recipe),
    achievedMoisturePct: mixtureMoisture(recipe),
    achievedMassKg: recipe.reduce((s, r) => s + r.massKg, 0),
  };

  function fail(reason: string): BalanceResult {
    return {
      feasible: false,
      recipe: fixed,
      achievedCn: cnRatio(fixed),
      achievedMoisturePct: mixtureMoisture(fixed),
      achievedMassKg: fixed.reduce((s, r) => s + r.massKg, 0),
      reason,
    };
  }
}

/**
 * Explain *why* a material set cannot hit both targets, in terms the user can act
 * on. The usual failure is that all three materials sit on the same side of one
 * of the two goals; three carbon sources can never average to 30:1, and three
 * soggy greens can never average to 55% moisture.
 */
function suggest(m1: Material, m2: Material, m3: Material, R: number, G: number): string {
  const all = [m1, m2, m3];
  const cns = all.map((m) => (m.nitrogenPct > 0 ? m.carbonPct / m.nitrogenPct : Infinity));

  if (cns.every((c) => c > R)) {
    return 'All three are carbon sources. Add a nitrogen source such as poultry manure or alfalfa.';
  }
  if (cns.every((c) => c < R)) {
    return 'All three are nitrogen sources. Add a carbon source such as dry leaves or straw.';
  }
  if (all.every((m) => m.moisturePct > G)) {
    return `All three are wetter than ${G}%. You need a dry ingredient; straw, shredded paper or alfalfa hay.`;
  }
  if (all.every((m) => m.moisturePct < G)) {
    return `All three are drier than ${G}%. Add water, or a wet feedstock.`;
  }
  return 'Try substituting a material that is dry *and* nitrogen-rich; alfalfa hay or poultry manure are the classic solutions to exactly this bind.';
}

/** Gaussian elimination with partial pivoting. Returns null for a singular system. */
function solve3x3(A: number[][], b: number[]): [number, number, number] | null {
  const m: number[][] = A.map((row, i) => [...row, b[i]!]);

  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(m[pivot]![col]!) < 1e-9) return null;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];

    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const factor = m[r]![col]! / m[col]![col]!;
      for (let c = col; c <= 3; c++) m[r]![c]! -= factor * m[col]![c]!;
    }
  }

  const x: number[] = [];
  for (let i = 0; i < 3; i++) {
    x.push(m[i]![3]! / m[i]![i]!);
  }
  if (x.some((v) => !Number.isFinite(v))) return null;
  return x as [number, number, number];
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}
