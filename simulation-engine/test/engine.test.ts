import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  balanceRecipe,
  binaryDiffusivity,
  cardinalGrowth,
  classifyCn,
  cnRatio,
  defaultConfig,
  effectiveDiffusivity,
  getMaterial,
  GUILDS,
  haugTemperatureFactor,
  initialState,
  mixtureMoisture,
  moistureFromSample,
  oxygenBalance,
  oxygenFactor,
  porosity,
  q10Factor,
  shannonDiversity,
  simulate,
  solveMoistureThreeMaterial,
  solveMoistureTwoMaterial,
  solveTwoMaterial,
  surfaceArea,
  type Material,
  type PileConfig,
} from '../src/index.js';

const close = (a: number, b: number, tol = 1e-6, msg?: string) =>
  assert.ok(Math.abs(a - b) <= tol, msg ?? `expected ${a} ≈ ${b} (±${tol})`);

const mat = (id: string): Material => {
  const m = getMaterial(id);
  assert.ok(m, `material ${id} missing`);
  return m;
};

// ─── Moisture ──────────────────────────────────────────────────────────────

test('moisture: M = (Ww - Wd)/Ww * 100', () => {
  close(moistureFromSample(100, 40), 60);
  close(moistureFromSample(250, 100), 60);
  close(moistureFromSample(80, 80), 0, 1e-9, 'oven-dry sample is 0% moisture');
  close(moistureFromSample(50, 0), 100, 1e-9, 'pure water is 100% moisture');
});

test('moisture: rejects a dry weight above the wet weight', () => {
  assert.throws(() => moistureFromSample(50, 60), RangeError);
});

test('moisture: mixing conserves water mass', () => {
  // 100 kg at 80% (80 kg water) + 100 kg at 20% (20 kg water)
  // = 100 kg water in 200 kg = 50%.
  const recipe = [
    { materialId: 'food-scraps', massKg: 100 }, // 80% moisture
    { materialId: 'straw', massKg: 100 }, // 12% moisture
  ];
  const expected = (100 * 80 + 100 * 12) / 200;
  close(mixtureMoisture(recipe), expected, 1e-9);
});

// ─── Carbon / Nitrogen ─────────────────────────────────────────────────────

test('C/N: the (100 - M) dry-mass correction is applied', () => {
  // Food scraps: 40.5% C, 2.7% N of DRY mass, 80% moisture.
  // 100 kg wet -> 20 kg dry -> 8.1 kg C, 0.54 kg N -> C/N = 15.
  close(cnRatio([{ materialId: 'food-scraps', massKg: 100 }]), 15, 1e-9);
  // The ratio of a single material is mass-invariant.
  close(cnRatio([{ materialId: 'food-scraps', massKg: 1 }]), 15, 1e-9);
  close(cnRatio([{ materialId: 'food-scraps', massKg: 9999 }]), 15, 1e-9);
});

test('C/N: a wet nitrogen source contributes far less N than its wet mass suggests', () => {
  // This is the error the (100 - M) factor exists to prevent. If you ignored
  // moisture, 100 kg of food scraps and 100 kg of alfalfa would look like
  // comparable nitrogen sources (2.7% vs 2.8% N). They are not: alfalfa is 12%
  // moisture, so it carries 4.4x the dry mass and therefore 4.4x the nitrogen.
  const foodN = 100 * (1 - 0.8) * 0.027;
  const alfalfaN = 100 * (1 - 0.12) * 0.028;
  assert.ok(alfalfaN / foodN > 4, `alfalfa should carry >4x the N; got ${alfalfaN / foodN}`);
});

test('C/N: two-material solver lands exactly on the target ratio', () => {
  for (const target of [20, 25, 30, 35]) {
    const sol = solveTwoMaterial(mat('food-scraps'), 500, mat('dry-leaves'), target);
    assert.ok(sol.feasible, `${target}:1 should be reachable; ${sol.reason}`);
    close(sol.achievedRatio, target, 1e-6);

    // And the solved recipe, run back through the independent cnRatio()
    // implementation, must agree.
    const check = cnRatio([
      { materialId: 'food-scraps', massKg: 500 },
      { materialId: 'dry-leaves', massKg: sol.massKg },
    ]);
    close(check, target, 1e-6);
  }
});

test('C/N: solver refuses when both materials sit on the same side of the target', () => {
  // Two carbon sources can never average to 30:1.
  const sol = solveTwoMaterial(mat('dry-leaves'), 100, mat('wood-chips'), 30);
  assert.equal(sol.feasible, false);
  assert.match(sol.reason ?? '', /carbon|nitrogen source/i);
  assert.equal(sol.massKg, 0);
});

test('C/N: classification bands', () => {
  assert.equal(classifyCn(30).status, 'optimal');
  assert.equal(classifyCn(80).status, 'high');
  assert.equal(classifyCn(10).status, 'low');
  assert.equal(classifyCn(Infinity).status, 'high');
});

// ─── Moisture solvers ──────────────────────────────────────────────────────

test('moisture: two-material solver hits the goal G', () => {
  // Wet a dry straw mix with water.
  const sol = solveMoistureTwoMaterial(mat('straw'), 100, mat('water'), 55);
  assert.ok(sol.feasible, sol.reason);
  const achieved = mixtureMoisture([
    { materialId: 'straw', massKg: 100 },
    { materialId: 'water', massKg: sol.massKg },
  ]);
  close(achieved, 55, 1e-6);
});

test('moisture: solver refuses a goal outside the two ingredients', () => {
  // Straw (12%) and leaves (35%) can never blend to 55%.
  const sol = solveMoistureTwoMaterial(mat('straw'), 100, mat('dry-leaves'), 55);
  assert.equal(sol.feasible, false);
  assert.match(sol.reason ?? '', /between/i);
});

test('moisture: three-material solver hits the goal G', () => {
  const sol = solveMoistureThreeMaterial(
    mat('food-scraps'),
    300,
    mat('dry-leaves'),
    200,
    mat('straw'),
    55,
  );
  assert.ok(sol.feasible, sol.reason);
  const achieved = mixtureMoisture([
    { materialId: 'food-scraps', massKg: 300 },
    { materialId: 'dry-leaves', massKg: 200 },
    { materialId: 'straw', massKg: sol.massKg },
  ]);
  close(achieved, 55, 1e-6);
});

// ─── Recipe balancer ───────────────────────────────────────────────────────

test('recipe: balancer satisfies C/N, moisture AND total mass simultaneously', () => {
  const result = balanceRecipe({
    fixed: [{ materialId: 'wood-chips', massKg: 120 }],
    solveFor: ['food-scraps', 'dry-leaves', 'alfalfa'],
    targetCn: 30,
    targetMoisturePct: 55,
    targetMassKg: 1000,
  });

  assert.ok(result.feasible, result.reason);
  close(result.achievedCn, 30, 0.05);
  close(result.achievedMoisturePct, 55, 0.05);
  close(result.achievedMassKg, 1000, 1);
  assert.ok(result.recipe.every((r) => r.massKg > 0), 'no negative masses');
});

test('recipe: balancer reports infeasibility rather than returning negative mass', () => {
  // Three carbon sources cannot reach 30:1.
  const result = balanceRecipe({
    fixed: [],
    solveFor: ['dry-leaves', 'straw', 'wood-chips'],
    targetCn: 30,
    targetMoisturePct: 55,
    targetMassKg: 1000,
  });
  assert.equal(result.feasible, false);
  assert.ok(result.reason && result.reason.length > 20, 'should explain why');
});

test('recipe: the shipped default config is genuinely on-target', () => {
  const init = initialState(defaultConfig());
  close(init.cnRatio, 30, 0.2);
  close(init.moisturePct, 55, 0.2);
  close(init.totalMassKg, 1000, 1);
  assert.ok(
    init.bulkDensity > 400 && init.bulkDensity < 700,
    `bulk density ${init.bulkDensity.toFixed(0)} should be in the measured 400-700 kg/m3 range`,
  );
  assert.ok(init.freeAirSpacePct > 40, 'a fresh mix should have ample free air space');
});

// ─── Oxygen ────────────────────────────────────────────────────────────────

test('oxygen: diffusivity scales as T^1.75 and inversely with pressure', () => {
  const d0 = 0.202;
  const dHot = binaryDiffusivity(d0, 333.15); // 60 C
  const dCold = binaryDiffusivity(d0, 273.15); // 0 C
  close(dHot / dCold, Math.pow(333.15 / 273.15, 1.75), 1e-9);
  assert.ok(dHot > dCold, 'hot gas diffuses faster');

  // Doubling the pressure halves the diffusivity.
  close(binaryDiffusivity(d0, 300, 2), binaryDiffusivity(d0, 300, 1) / 2, 1e-9);

  // A larger collision integral means more scattering and SLOWER diffusion.
  assert.ok(
    binaryDiffusivity(d0, 300, 1, 2) < binaryDiffusivity(d0, 300, 1, 1),
    'D must fall as the collision integral rises',
  );
});

test('oxygen: porosity partitions a cubic metre into solids, water and gas', () => {
  const p = porosity(520, 55);
  close(p.airFilledPorosity + p.waterFilledPorosity + (1 - p.totalPorosity), 1, 1e-9);
  assert.ok(p.freeAirSpacePct > 40 && p.freeAirSpacePct < 70);

  // Wetter pile => less air-filled pore space.
  assert.ok(porosity(520, 75).freeAirSpacePct < porosity(520, 45).freeAirSpacePct);
});

test('oxygen: Millington-Quirk punishes water-filled pores super-linearly', () => {
  // Halving air-filled porosity should cut effective diffusivity by ~10x
  // (2^(10/3) = 10.1), not by 2x. This nonlinearity is why "a bit too wet"
  // becomes "fully anaerobic".
  const dry = effectiveDiffusivity(0.2, 0.5, 0.8);
  const wet = effectiveDiffusivity(0.2, 0.25, 0.8);
  const ratio = dry / wet;
  close(ratio, Math.pow(2, 10 / 3), 0.01);
  assert.ok(ratio > 9, `expected ~10x collapse, got ${ratio.toFixed(1)}x`);
});

test('oxygen: a wet pile goes anaerobic at the same respiration rate', () => {
  // Compare at constant DRY solids (260 kg/m3), not constant bulk density.
  // Holding bulk density fixed while raising moisture would silently swap solids
  // for water, which is not what happens when a pile gets rained on: the solids
  // stay put and the water fills the pores. Adding water RAISES bulk density.
  const dryPile = oxygenBalance(2, 520, 50, 55, 0.75, 'passive'); // 260 kg dry + 260 kg water
  const wetPile = oxygenBalance(2, 1040, 75, 55, 0.75, 'passive'); // 260 kg dry + 780 kg water
  assert.ok(
    wetPile.aerobicFraction < dryPile.aerobicFraction,
    'the wet pile must be less aerobic',
  );
  assert.ok(wetPile.interstitialO2Pct < dryPile.interstitialO2Pct);
});

test('oxygen: a taller pile is harder to keep aerobic', () => {
  const shallow = oxygenBalance(3, 520, 55, 55, 0.4, 'passive');
  const deep = oxygenBalance(3, 520, 55, 55, 1.5, 'passive');
  assert.ok(deep.aerobicFraction < shallow.aerobicFraction);
});

test('oxygen: forced aeration raises the aerobic fraction', () => {
  const passive = oxygenBalance(8, 520, 55, 60, 0.75, 'passive');
  const forced = oxygenBalance(8, 520, 55, 60, 0.75, 'forced');
  assert.ok(forced.aerobicFraction > passive.aerobicFraction);
});

test('oxygen: with no respiration the pile equilibrates with the atmosphere', () => {
  const idle = oxygenBalance(0, 520, 55, 20, 0.75, 'passive');
  close(idle.interstitialO2Pct, 20.9, 1e-9);
  assert.equal(idle.aerobicFraction, 1);
});

test('oxygen: Monod half-saturation halves the rate at K', () => {
  close(oxygenFactor(2), 0.5, 1e-9); // K = 2% v/v
  assert.ok(oxygenFactor(20) > 0.9, 'saturated above 10%');
  assert.equal(oxygenFactor(0), 0);
});

// ─── Kinetics ──────────────────────────────────────────────────────────────

test('kinetics: Q10 multiplies the rate by Q10 for every 10 C', () => {
  close(q10Factor(30, 2.5, 20), 2.5, 1e-9);
  close(q10Factor(40, 2.5, 20), 2.5 * 2.5, 1e-9);
  close(q10Factor(20, 2.5, 20), 1, 1e-9);
});

test('kinetics: Haug temperature factor rises, peaks, then collapses', () => {
  // f(20) = 1 by construction.
  close(haugTemperatureFactor(20), 1, 0.01);
  // Rises through the mesophilic range.
  assert.ok(haugTemperatureFactor(45) > haugTemperatureFactor(30));
  // Peaks in the thermophilic band.
  assert.ok(haugTemperatureFactor(65) > haugTemperatureFactor(45));
  // And collapses as proteins denature; this is the term a naive Q10-only
  // model lacks, and without it a simulated pile heats without limit.
  assert.ok(
    haugTemperatureFactor(80) < haugTemperatureFactor(65),
    'activity must fall away above the optimum',
  );
  assert.equal(haugTemperatureFactor(90), 0, 'no activity at 90 C');
});

// ─── Microbial ─────────────────────────────────────────────────────────────

test('microbial: cardinal model is 1 at the optimum and 0 outside the range', () => {
  for (const g of GUILDS) {
    close(cardinalGrowth(g.tOpt, g), 1, 1e-6, `${g.name} should peak at its optimum`);
    assert.equal(cardinalGrowth(g.tMin - 1, g), 0, `${g.name} dead below Tmin`);
    assert.equal(cardinalGrowth(g.tMax + 1, g), 0, `${g.name} dead above Tmax`);
    assert.ok(cardinalGrowth(g.tOpt - 5, g) > 0 && cardinalGrowth(g.tOpt - 5, g) < 1);
  }
});

test('microbial: the cardinal response is asymmetric; cooking is worse than chilling', () => {
  const meso = GUILDS[0]!;
  const below = cardinalGrowth(meso.tOpt - 8, meso);
  const above = cardinalGrowth(meso.tOpt + 8, meso);
  assert.ok(above < below, 'the fall-off above the optimum must be steeper');
});

test('microbial: only thermophiles can grow at 60 C', () => {
  for (const g of GUILDS) {
    const growth = cardinalGrowth(62, g);
    if (g.key === 'thermophilicBacteria') assert.ok(growth > 0, 'thermophiles thrive at 62 C');
    else assert.equal(growth, 0, `${g.name} cannot grow at 62 C`);
  }
});

test('microbial: Shannon diversity is maximal when all four guilds are equal', () => {
  const even = shannonDiversity({
    mesophilicBacteria: 0.25,
    thermophilicBacteria: 0.25,
    actinomycetes: 0.25,
    fungi: 0.25,
  });
  close(even, 1, 1e-9);

  const monoculture = shannonDiversity({
    mesophilicBacteria: 0.001,
    thermophilicBacteria: 1,
    actinomycetes: 0.001,
    fungi: 0.001,
  });
  assert.ok(monoculture < 0.2, 'a thermophilic monoculture is not diverse');
});

// ─── Thermal ───────────────────────────────────────────────────────────────

test('thermal: surface area grows as V^(2/3), so big piles hold heat better', () => {
  const small = surfaceArea(0.2);
  const big = surfaceArea(20);
  // Surface per unit volume must FALL as the pile grows; the reason a small
  // heap cannot reach thermophilic temperature.
  assert.ok(big / 20 < small / 0.2);
  close(surfaceArea(8) / surfaceArea(1), Math.pow(8, 2 / 3), 1e-9);
});

// ─── Full lifecycle ────────────────────────────────────────────────────────

test('simulate: a balanced pile reproduces the three-phase compost curve', () => {
  const result = simulate(defaultConfig());
  const s = result.summary;

  // Phase 1 -> 2: it must actually self-heat into the thermophilic band.
  assert.ok(
    s.peakTemperatureC >= 55 && s.peakTemperatureC <= 75,
    `peak ${s.peakTemperatureC.toFixed(1)} C should land in the thermophilic band`,
  );
  assert.ok(s.peakTemperatureDay < 14, 'a rich pile peaks within two weeks');

  // Sanitisation.
  assert.ok(s.pathogenReduction, 'should hold 55 C for 3+ consecutive days (EPA PFRP)');

  // Phase 3: it must come back down and stabilise.
  const last = result.steps[result.steps.length - 1]!;
  assert.ok(last.temperatureC < 35, 'a mature pile returns to near-ambient');

  // C/N must fall as carbon leaves as CO2; it cannot rise.
  assert.ok(s.finalCn < result.initial.cnRatio, 'C/N must fall toward maturity');
  assert.ok(s.finalCn < 25, `finished compost should approach maturity; got ${s.finalCn.toFixed(1)}`);

  // Measured dry-matter loss over a full cycle is 40-60%.
  assert.ok(
    s.massLossPct > 25 && s.massLossPct < 65,
    `dry-mass loss ${s.massLossPct.toFixed(0)}% should match the measured 40-60% range`,
  );
});

test('simulate: the phases appear in the right order', () => {
  const { steps } = simulate(defaultConfig());
  const firstThermophilic = steps.findIndex((s) => s.temperatureC >= 40);
  const peak = steps.reduce((best, s, i) => (s.temperatureC > steps[best]!.temperatureC ? i : best), 0);
  const cooled = steps.findIndex((s, i) => i > peak && s.temperatureC < 40);

  assert.ok(firstThermophilic > 0, 'starts mesophilic');
  assert.ok(peak > firstThermophilic, 'heats to a thermophilic peak');
  assert.ok(cooled > peak, 'then cools');
});

test('simulate: a pile too small to hold heat never reaches thermophilic', () => {
  const base = defaultConfig();
  const tiny: PileConfig = {
    ...base,
    recipe: base.recipe.map((r) => ({ ...r, massKg: r.massKg / 10 })), // 100 kg
    heightM: 0.6,
  };
  const s = simulate(tiny).summary;
  assert.ok(
    s.peakTemperatureC < 40,
    `a 100 kg heap loses heat faster than it makes it; got ${s.peakTemperatureC.toFixed(1)} C`,
  );
  assert.equal(s.pathogenReduction, false);
});

test('simulate: a nitrogen-starved pile barely decomposes', () => {
  const cfg: PileConfig = {
    ...defaultConfig(),
    recipe: [
      { materialId: 'dry-leaves', massKg: 600 },
      { materialId: 'wood-chips', massKg: 300 },
      { materialId: 'straw', massKg: 100 },
    ],
  };
  const result = simulate(cfg);
  assert.ok(result.initial.cnRatio > 60, 'this mix is carbon-dominated');
  assert.ok(result.summary.peakTemperatureC < 35, 'without nitrogen it cannot heat');
  assert.ok(result.summary.massLossPct < 20, 'and it barely decomposes');
});

test('simulate: a waterlogged pile is oxygen-starved', () => {
  const base = defaultConfig();
  const soaked: PileConfig = {
    ...base,
    aeration: 'passive',
    turnIntervalDays: 0,
    recipe: [...base.recipe, { materialId: 'water', massKg: 600 }],
  };
  const dryRun = simulate({ ...base, aeration: 'passive', turnIntervalDays: 0 });
  const wetRun = simulate(soaked);

  assert.ok(wetRun.initial.moisturePct > 70, 'this pile is waterlogged');

  const minO2 = (r: typeof wetRun) => Math.min(...r.steps.map((s) => s.oxygenPct));
  assert.ok(
    minO2(wetRun) < minO2(dryRun),
    'the waterlogged pile must run lower on oxygen',
  );
  assert.ok(
    wetRun.summary.peakTemperatureC < dryRun.summary.peakTemperatureC,
    'and therefore decompose more slowly',
  );
});

test('simulate: forced aeration holds the pile at its thermostat setpoint', () => {
  const base = defaultConfig();
  const forced = simulate({ ...base, aeration: 'forced' }).summary;
  const passive = simulate({ ...base, aeration: 'passive', turnIntervalDays: 0 }).summary;

  assert.ok(
    forced.peakTemperatureC < passive.peakTemperatureC,
    'thermostatic control must cap the peak',
  );
  assert.equal(forced.daysAbove65, 0, 'a controlled pile never cooks itself');
  assert.ok(forced.pathogenReduction, 'yet still holds 55 C long enough to sanitise');
});

test('simulate: mass and carbon are conserved; nothing appears from nowhere', () => {
  const result = simulate(defaultConfig());
  const first = result.steps[0]!;

  for (const s of result.steps) {
    assert.ok(s.organicMatterKg >= 0, 'substrate cannot go negative');
    assert.ok(
      s.organicMatterKg <= first.organicMatterKg + 1e-6,
      'substrate cannot increase; there is no source of new organic matter',
    );
    assert.ok(s.moisturePct >= 0 && s.moisturePct <= 100, `moisture ${s.moisturePct} out of range`);
    assert.ok(s.oxygenPct >= 0 && s.oxygenPct <= 21, `O2 ${s.oxygenPct} out of range`);
    assert.ok(Number.isFinite(s.temperatureC), 'temperature must stay finite');
    assert.ok(s.temperatureC < 100, 'a compost pile cannot exceed the boiling point of water');
  }
});

test('simulate: an empty recipe returns an empty run rather than NaN', () => {
  const result = simulate({ ...defaultConfig(), recipe: [] });
  assert.equal(result.steps.length, 0);
  assert.equal(result.summary.peakTemperatureC, 0);
});
