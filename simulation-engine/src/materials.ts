import type { Material, RecipeItem, ResolvedItem } from './types.js';

/**
 * PILENGINE feedstock database.
 *
 * Carbon and nitrogen are % of DRY mass; moisture is % of WET mass.
 * Where a source publishes a C:N ratio and %N (the usual convention),
 * carbon is reconstructed as C = N x (C:N).
 *
 * Primary sources:
 *   [Rynk]    Rynk, R. (ed.), On-Farm Composting Handbook, NRAES-54, 1992; Appendix A.
 *   [Cornell] Cornell Waste Management Institute, Compost Chemistry / Field Guide.
 *   [Haug]    Haug, R.T., The Practical Handbook of Compost Engineering, 1993.
 */
export const MATERIALS: Material[] = [
  // ── High-carbon "browns" ───────────────────────────────────────────────
  {
    id: 'dry-leaves',
    name: 'Dry Leaves',
    category: 'carbon',
    carbonPct: 49.5,
    nitrogenPct: 0.9,
    moisturePct: 35,
    bulkDensity: 250,
    rapidFraction: 0.1,
    ligninPct: 20,
    source: 'Rynk 1992 (C:N 55, N 0.9%)',
  },
  {
    id: 'wood-chips',
    name: 'Wood Chips',
    category: 'bulking',
    carbonPct: 60,
    nitrogenPct: 0.15,
    moisturePct: 40,
    bulkDensity: 300,
    rapidFraction: 0.02,
    ligninPct: 28,
    source: 'Rynk 1992 (C:N 400, N 0.15%)',
  },
  {
    id: 'sawdust',
    name: 'Sawdust',
    category: 'carbon',
    carbonPct: 48.4,
    nitrogenPct: 0.11,
    moisturePct: 35,
    bulkDensity: 250,
    rapidFraction: 0.03,
    ligninPct: 26,
    source: 'Rynk 1992 (C:N 440, N 0.11%)',
  },
  {
    id: 'cardboard',
    name: 'Corrugated Cardboard',
    category: 'carbon',
    carbonPct: 52.5,
    nitrogenPct: 0.15,
    moisturePct: 8,
    bulkDensity: 130,
    rapidFraction: 0.05,
    ligninPct: 18,
    source: 'Cornell CWMI (C:N ~350)',
  },
  {
    id: 'paper',
    name: 'Shredded Paper',
    category: 'carbon',
    carbonPct: 48,
    nitrogenPct: 0.12,
    moisturePct: 6,
    bulkDensity: 150,
    rapidFraction: 0.05,
    ligninPct: 20,
    source: 'Rynk 1992 (newsprint, C:N ~400)',
  },
  {
    id: 'straw',
    name: 'Wheat Straw',
    category: 'carbon',
    carbonPct: 48,
    nitrogenPct: 0.6,
    moisturePct: 12,
    bulkDensity: 110,
    rapidFraction: 0.08,
    ligninPct: 15,
    source: 'Rynk 1992 (C:N 80, N 0.6%)',
  },
  {
    id: 'corn-stalks',
    name: 'Corn Stalks',
    category: 'carbon',
    carbonPct: 48,
    nitrogenPct: 0.8,
    moisturePct: 12,
    bulkDensity: 140,
    rapidFraction: 0.12,
    ligninPct: 13,
    source: 'Rynk 1992 (C:N 60, N 0.8%)',
  },
  {
    id: 'pine-needles',
    name: 'Pine Needles',
    category: 'carbon',
    carbonPct: 48,
    nitrogenPct: 0.6,
    moisturePct: 30,
    bulkDensity: 160,
    rapidFraction: 0.05,
    ligninPct: 25,
    source: 'Rynk 1992 (C:N 80)',
  },
  {
    id: 'bark',
    name: 'Tree Bark',
    category: 'bulking',
    carbonPct: 49,
    nitrogenPct: 0.35,
    moisturePct: 40,
    bulkDensity: 320,
    rapidFraction: 0.03,
    ligninPct: 35,
    source: 'Rynk 1992 (C:N 100–200)',
  },

  // ── High-nitrogen "greens" ─────────────────────────────────────────────
  {
    id: 'food-scraps',
    name: 'Vegetable Food Scraps',
    category: 'nitrogen',
    carbonPct: 40.5,
    nitrogenPct: 2.7,
    moisturePct: 80,
    bulkDensity: 600,
    rapidFraction: 0.6,
    ligninPct: 3,
    source: 'Rynk 1992 (C:N 15, N 2.7%)',
  },
  {
    id: 'fruit-waste',
    name: 'Fruit Waste',
    category: 'nitrogen',
    carbonPct: 49,
    nitrogenPct: 1.4,
    moisturePct: 80,
    bulkDensity: 550,
    rapidFraction: 0.65,
    ligninPct: 2,
    source: 'Rynk 1992 (C:N 35, N 1.4%)',
  },
  {
    id: 'grass-clippings',
    name: 'Grass Clippings',
    category: 'nitrogen',
    carbonPct: 44.2,
    nitrogenPct: 2.6,
    moisturePct: 82,
    bulkDensity: 500,
    rapidFraction: 0.55,
    ligninPct: 5,
    source: 'Rynk 1992 (C:N 17, N 2.4–3.4%)',
  },
  {
    id: 'coffee-grounds',
    name: 'Coffee Grounds',
    category: 'nitrogen',
    carbonPct: 42,
    nitrogenPct: 2.1,
    moisturePct: 60,
    bulkDensity: 480,
    rapidFraction: 0.35,
    ligninPct: 8,
    source: 'Cornell CWMI (C:N 20, N 2.1%)',
  },
  {
    id: 'cow-manure',
    name: 'Dairy Cow Manure',
    category: 'nitrogen',
    carbonPct: 43.2,
    nitrogenPct: 2.4,
    moisturePct: 80,
    bulkDensity: 800,
    rapidFraction: 0.3,
    ligninPct: 12,
    source: 'Rynk 1992 (C:N 18, N 2.4%)',
  },
  {
    id: 'horse-manure',
    name: 'Horse Manure w/ Bedding',
    category: 'nitrogen',
    carbonPct: 48,
    nitrogenPct: 1.6,
    moisturePct: 70,
    bulkDensity: 500,
    rapidFraction: 0.25,
    ligninPct: 15,
    source: 'Rynk 1992 (C:N 30, N 1.6%)',
  },
  {
    id: 'poultry-manure',
    name: 'Poultry Manure',
    category: 'nitrogen',
    carbonPct: 40,
    nitrogenPct: 5.0,
    moisturePct: 55,
    bulkDensity: 900,
    rapidFraction: 0.45,
    ligninPct: 6,
    source: 'Rynk 1992 (C:N 8, N 5%)',
  },
  {
    id: 'alfalfa',
    name: 'Alfalfa Hay',
    category: 'nitrogen',
    carbonPct: 44.8,
    nitrogenPct: 2.8,
    moisturePct: 12,
    bulkDensity: 130,
    rapidFraction: 0.35,
    ligninPct: 10,
    source: 'Rynk 1992 (C:N 16, N 2.8%)',
  },
  {
    id: 'seaweed',
    name: 'Seaweed',
    category: 'nitrogen',
    carbonPct: 36.1,
    nitrogenPct: 1.9,
    moisturePct: 85,
    bulkDensity: 700,
    rapidFraction: 0.5,
    ligninPct: 2,
    source: 'Rynk 1992 (C:N 19)',
  },
  {
    id: 'fish-scraps',
    name: 'Fish Scraps',
    category: 'nitrogen',
    carbonPct: 47.5,
    nitrogenPct: 9.5,
    moisturePct: 76,
    bulkDensity: 800,
    rapidFraction: 0.85,
    ligninPct: 0,
    source: 'Rynk 1992 (C:N 5, N 9.5%)',
  },
  {
    id: 'blood-meal',
    name: 'Blood Meal',
    category: 'amendment',
    carbonPct: 45.5,
    nitrogenPct: 13,
    moisturePct: 10,
    bulkDensity: 700,
    rapidFraction: 0.9,
    ligninPct: 0,
    source: 'Rynk 1992 (C:N 3.5, N 13%)',
  },

  // ── Amendments ─────────────────────────────────────────────────────────
  {
    id: 'mature-compost',
    name: 'Mature Compost (inoculant)',
    category: 'amendment',
    carbonPct: 18,
    nitrogenPct: 1.5,
    moisturePct: 45,
    bulkDensity: 700,
    rapidFraction: 0.05,
    ligninPct: 30,
    source: 'Haug 1993 (C:N ~12, stabilised)',
  },
  {
    id: 'biochar',
    name: 'Biochar',
    category: 'amendment',
    carbonPct: 75,
    nitrogenPct: 0.5,
    moisturePct: 10,
    bulkDensity: 300,
    rapidFraction: 0,
    // Biochar carbon is aromatic and effectively inert on compost timescales;
    // modelled as a near-total recalcitrant fraction.
    ligninPct: 95,
    source: 'Recalcitrant C; excluded from the degradable pool',
  },
  {
    id: 'water',
    name: 'Water',
    category: 'amendment',
    carbonPct: 0,
    nitrogenPct: 0,
    moisturePct: 100,
    bulkDensity: 1000,
    rapidFraction: 0,
    ligninPct: 0,
    source: 'Used by the moisture solver to hit a target G',
  },
];

const BY_ID = new Map(MATERIALS.map((m) => [m.id, m]));

export function getMaterial(id: string): Material | undefined {
  return BY_ID.get(id);
}

/** C:N ratio of a single material (dry basis). Infinite for zero-N materials. */
export function materialCn(m: Material): number {
  return m.nitrogenPct > 0 ? m.carbonPct / m.nitrogenPct : Infinity;
}

/**
 * Join a recipe against the material database, precomputing the dry-mass,
 * carbon, nitrogen and water contributed by each line.
 * Unknown material ids and non-positive masses are dropped.
 */
export function resolveRecipe(recipe: RecipeItem[]): ResolvedItem[] {
  const out: ResolvedItem[] = [];
  for (const item of recipe) {
    const m = BY_ID.get(item.materialId);
    if (!m || !(item.massKg > 0)) continue;
    const dryMassKg = (item.massKg * (100 - m.moisturePct)) / 100;
    out.push({
      ...m,
      massKg: item.massKg,
      dryMassKg,
      carbonKg: (dryMassKg * m.carbonPct) / 100,
      nitrogenKg: (dryMassKg * m.nitrogenPct) / 100,
      waterKg: item.massKg - dryMassKg,
    });
  }
  return out;
}
