import type {
  InitialState,
  MicrobePopulations,
  ResolvedItem,
  Phase,
  PileConfig,
  SimulationResult,
  SimulationStep,
  SimulationSummary,
} from './types.js';
import { resolveRecipe } from './materials.js';
import {
  CN_MATURE,
  DEGRADABLE_ACCESSIBILITY,
  PACKING_EFFICIENCY,
  K_RAPID_OPT,
  K_SLOW_OPT,
  MOISTURE_MIN,
  MOISTURE_OPTIMAL,
  O2_ATMOSPHERIC_PCT,
  PARTICLE_DENSITY,
  PATHOGEN_KILL_DAYS,
  T_CRITICAL,
  T_PATHOGEN_KILL,
  T_THERMOPHILIC_MIN,
  WATER_DENSITY,
} from './constants.js';
import { cnFactor, fasFactor, moistureFactor, oxygenFactor, temperatureFactor } from './kinetics.js';
import { oxygenBalance, porosity } from './oxygen.js';
import { seedPopulations, shannonDiversity, stepPopulations } from './microbial.js';
import { thermalBalance } from './thermal.js';

/**
 * PILENGINE; the lifecycle integrator.
 *
 * Six coupled state variables are advanced together:
 *
 *   1. rapid substrate      (kg dry)     ; sugars, starch, protein
 *   2. slow substrate       (kg dry)     ; cellulose, hemicellulose
 *   3. water                (kg)
 *   4. temperature          (°C)
 *   5. four microbial populations
 *   6. nitrogen             (kg)         ; lost to ammonia volatilisation
 *
 * They are coupled in a loop, and that loop is the whole point:
 *
 *     substrate → respiration → heat → temperature → reaction rate → substrate
 *                      ↓                                    ↑
 *                 O2 demand → oxygen depletion ─────────────┘
 *                      ↑
 *              water → pore space → oxygen supply
 *
 * Nothing here scripts the three classic phases. Feed it a pile and the phases
 * fall out of the arithmetic; or fail to, if the recipe is bad.
 */

const DT = 0.01; // integration step, days (~14 minutes)

export function defaultConfig(): PileConfig {
  return {
    // Not guessed; this is the exact output of balanceRecipe() for a 1,000 kg
    // batch at 30:1 and 55% moisture, holding 120 kg of wood chips fixed as the
    // bulking agent. Alfalfa is what makes it work: it is the rare feedstock
    // that is nitrogen-rich AND dry, so it fixes the C/N without drowning the pile.
    recipe: [
      { materialId: 'food-scraps', massKg: 490.6 },
      { materialId: 'dry-leaves', massKg: 273.0 },
      { materialId: 'alfalfa', massKg: 116.4 },
      { materialId: 'wood-chips', massKg: 120 },
    ],
    ambientC: 20,
    aeration: 'forced',
    turnIntervalDays: 14,
    heightM: 1.5,
    insulation: 0.3,
    q10: 2.5,
    moistureManaged: true,
    durationDays: 120,
  };
}

/**
 * Volume of the pile's structural skeleton, m³; the framework the solids build.
 *
 * A material's as-received bulk density already accounts for the water it
 * carries, so the volume it contributes per kilogram of DRY matter is
 * 1 / (ρbulk · (1 − M/100)). Summing that over the dry masses gives the skeleton.
 *
 * Water contributes nothing here, and that is the whole point. Pure water has no
 * dry mass, so it adds no structure. The first version of this model treated
 * water as just another material with a bulk density of 1000 kg/m³, which made a
 * bucket of water *expand* the pile and left a waterlogged heap looking
 * comfortably airy. Water does not enlarge a pile; it drowns the pores that are
 * already there.
 *
 * PACKING_EFFICIENCY then accounts for fines settling into the voids between
 * coarse particles, and for the heap compacting under its own weight.
 */
function structuralVolume(items: ResolvedItem[]): number {
  let v = 0;
  for (const i of items) {
    if (i.dryMassKg <= 0) continue; // pure water: no skeleton
    const dryFraction = 1 - i.moisturePct / 100;
    if (dryFraction <= 0) continue;
    v += i.dryMassKg / (i.bulkDensity * dryFraction);
  }
  return v * PACKING_EFFICIENCY;
}

/**
 * Total pile volume, m³.
 *
 * Normally the skeleton sets the volume and water simply occupies its pores. But
 * once you pour in more water than the pore space can hold, the pile stops being
 * a porous solid and starts being a slurry; at which point its volume is just
 * solids plus water, and its free air space is zero. Taking the max of the two
 * captures both regimes with no special-casing.
 */
function pileVolume(skeletonM3: number, dryMassKg: number, waterKg: number): number {
  const solidsM3 = dryMassKg / PARTICLE_DENSITY;
  const waterM3 = waterKg / WATER_DENSITY;
  return Math.max(skeletonM3, solidsM3 + waterM3);
}

/** Characterise the starting mix, before any biology happens. */
export function initialState(config: PileConfig): InitialState {
  const items = resolveRecipe(config.recipe);

  const totalMassKg = items.reduce((s, i) => s + i.massKg, 0);
  const dryMassKg = items.reduce((s, i) => s + i.dryMassKg, 0);
  const waterKg = items.reduce((s, i) => s + i.waterKg, 0);
  const carbonKg = items.reduce((s, i) => s + i.carbonKg, 0);
  const nitrogenKg = items.reduce((s, i) => s + i.nitrogenKg, 0);

  const moisturePct = totalMassKg > 0 ? (waterKg / totalMassKg) * 100 : 0;

  const volumeM3 = pileVolume(structuralVolume(items), dryMassKg, waterKg);
  const bulkDensity = volumeM3 > 0 ? totalMassKg / volumeM3 : 500;

  const degradableKg = items.reduce(
    (s, i) => s + (i.dryMassKg * (100 - i.ligninPct)) / 100,
    0,
  ) * DEGRADABLE_ACCESSIBILITY;

  return {
    totalMassKg,
    dryMassKg,
    waterKg,
    carbonKg,
    nitrogenKg,
    cnRatio: nitrogenKg > 0 ? carbonKg / nitrogenKg : Infinity,
    moisturePct,
    bulkDensity,
    freeAirSpacePct: porosity(bulkDensity, moisturePct).freeAirSpacePct,
    degradableKg,
  };
}

export function simulate(config: PileConfig): SimulationResult {
  const items = resolveRecipe(config.recipe);
  const init = initialState(config);

  if (items.length === 0 || init.totalMassKg <= 0) {
    return { steps: [], initial: init, summary: emptySummary() };
  }

  // Split the degradable organic matter into its two kinetic pools. The lignin
  // in each material is subtracted first; it never enters the substrate.
  let rapidKg = 0;
  let slowKg = 0;
  for (const i of items) {
    const accessible = i.dryMassKg * DEGRADABLE_ACCESSIBILITY;
    const rapid = accessible * i.rapidFraction;
    const slow = accessible * Math.max(0, 1 - i.rapidFraction - i.ligninPct / 100);
    rapidKg += rapid;
    slowKg += slow;
  }
  const rapid0 = rapidKg;
  const slow0 = slowKg;
  const degradable0 = rapidKg + slowKg;

  // Inert dry matter: lignin, ash, minerals. Never leaves the pile.
  const inertKg = init.dryMassKg - degradable0;

  // The structural skeleton at t=0. As the pile degrades, the skeleton shrinks
  // in proportion to the dry matter that built it.
  const skeleton0 = structuralVolume(items);

  let waterKg = init.waterKg;
  let carbonKg = init.carbonKg;
  let nitrogenKg = init.nitrogenKg;
  let tempC = config.ambientC;
  let microbes: MicrobePopulations = seedPopulations();

  // The carbon fraction of the degradable pool; what leaves as CO2 per kg VS.
  const carbonPerVs = degradable0 > 0 ? Math.min(0.6, init.carbonKg / init.dryMassKg) : 0.5;

  const steps: SimulationStep[] = [];
  const totalSteps = Math.ceil(config.durationDays / DT);
  const sampleEvery = Math.max(1, Math.round(0.25 / DT)); // record 4 points per day (exact at DT=0.01)

  let lastTurnDay = 0;
  let daysAbove55 = 0;
  let daysAbove65 = 0;
  let consecutive55 = 0;
  let bestConsecutive55 = 0;
  let peakTemperatureC = tempC;
  let peakTemperatureDay = 0;
  let diversityIntegral = 0;

  // Oxygen is solved to a fixed point each step, so the previous value is a
  // good starting guess.
  let o2Pct = 20.9;

  for (let n = 0; n <= totalSteps; n++) {
    const t = n * DT;

    const dryMassKg = rapidKg + slowKg + inertKg;
    const totalMassKg = dryMassKg + waterKg;
    if (totalMassKg <= 0.001) break;

    const moisturePct = (waterKg / totalMassKg) * 100;

    // The pile collapses on itself as it decomposes. Particles break down, the
    // skeleton that held the pores open dissolves, and bulk density climbs. This
    // is why an unturned pile suffocates over time even when it started with
    // excellent porosity; and why turning, which rebuilds the structure, is the
    // single most effective intervention a composter has.
    const settling = 1 + 0.35 * (1 - (rapidKg + slowKg) / Math.max(degradable0, 1e-9));
    const skeleton = (skeleton0 * (dryMassKg / Math.max(init.dryMassKg, 1e-9))) / settling;
    const volumeM3 = pileVolume(skeleton, dryMassKg, waterKg);
    const bulkDensity = totalMassKg / Math.max(volumeM3, 1e-6);

    const pore = porosity(bulkDensity, moisturePct);
    const freeAirSpacePct = pore.freeAirSpacePct;

    const cnRatio = nitrogenKg > 1e-9 ? carbonKg / nitrogenKg : Infinity;

    // ── Fixed point on oxygen ────────────────────────────────────────────
    // Reaction rate depends on O2; O2 depends on the reaction rate through the
    // pile's own demand. Iterate to the self-consistent solution. The map is a
    // contraction (more demand → less O2 → less demand), so this converges in a
    // handful of passes.
    const fT = temperatureFactor(tempC);
    const fM = moistureFactor(moisturePct);
    const fCn = cnFactor(cnRatio);
    const fFas = fasFactor(freeAirSpacePct);
    const abiotic = fT * fM * fCn * fFas;

    // Microbial biomass scales the rate: substrate does not decompose on its
    // own, it decomposes because there are organisms present to do it.
    const biomass = Math.min(
      1,
      (microbes.mesophilicBacteria +
        microbes.thermophilicBacteria +
        microbes.actinomycetes +
        microbes.fungi) /
        0.9,
    );

    let vsRate = 0;
    let oxy = oxygenBalance(0, bulkDensity, moisturePct, tempC, config.heightM / 2, config.aeration);
    for (let iter = 0; iter < 8; iter++) {
      const fO2 = oxygenFactor(o2Pct);
      const kRapid = K_RAPID_OPT * abiotic * fO2 * biomass;
      const kSlow = K_SLOW_OPT * abiotic * fO2 * biomass;
      const nextRate = kRapid * rapidKg + kSlow * slowKg;

      oxy = oxygenBalance(
        nextRate / Math.max(volumeM3, 1e-6),
        bulkDensity,
        moisturePct,
        tempC,
        config.heightM / 2,
        config.aeration,
      );

      const nextO2 = oxy.interstitialO2Pct;
      const converged = Math.abs(nextO2 - o2Pct) < 0.01 && Math.abs(nextRate - vsRate) < 1e-4;
      // Damped update keeps the iteration stable when demand is far above supply.
      o2Pct = o2Pct + 0.6 * (nextO2 - o2Pct);
      vsRate = nextRate;
      if (converged) break;
    }

    const fO2 = oxygenFactor(o2Pct);
    const kEff = degradable0 > 0 && rapidKg + slowKg > 0
      ? vsRate / (rapidKg + slowKg)
      : 0;

    // ── Energy balance ───────────────────────────────────────────────────
    const thermal = thermalBalance({
      vsRateKgPerDay: vsRate,
      tempC,
      ambientC: config.ambientC,
      massKg: totalMassKg,
      volumeM3,
      moisturePct,
      insulation: config.insulation,
      mode: config.aeration,
    });

    // ── Record ───────────────────────────────────────────────────────────
    const organicMatterKg = rapidKg + slowKg;
    const organicMatterPct = degradable0 > 0 ? (organicMatterKg / degradable0) * 100 : 0;

    if (n % sampleEvery === 0) {
      steps.push({
        t,
        temperatureC: tempC,
        moisturePct,
        organicMatterKg,
        organicMatterPct,
        cnRatio,
        nitrogenKg,
        freeAirSpacePct,
        oxygenPct: o2Pct,
        aerobicFraction: oxy.aerobicFraction,
        kEff,
        microbes: { ...microbes },
        factors: {
          temperature: fT,
          moisture: fM,
          oxygen: fO2,
          cn: fCn,
          freeAirSpace: fFas,
        },
        phase: classifyPhase(tempC, organicMatterPct, t),
      });
    }

    // ── Statistics ───────────────────────────────────────────────────────
    if (tempC > peakTemperatureC) {
      peakTemperatureC = tempC;
      peakTemperatureDay = t;
    }
    if (tempC >= T_PATHOGEN_KILL) {
      daysAbove55 += DT;
      consecutive55 += DT;
      bestConsecutive55 = Math.max(bestConsecutive55, consecutive55);
    } else {
      consecutive55 = 0;
    }
    if (tempC >= T_CRITICAL) daysAbove65 += DT;
    diversityIntegral += shannonDiversity(microbes) * DT;

    // ── Advance state ────────────────────────────────────────────────────
    const kRapid = K_RAPID_OPT * abiotic * fO2 * biomass;
    const kSlow = K_SLOW_OPT * abiotic * fO2 * biomass;
    const dRapid = kRapid * rapidKg * DT;
    const dSlow = kSlow * slowKg * DT;
    const vsConsumed = Math.min(dRapid + dSlow, rapidKg + slowKg);

    rapidKg = Math.max(0, rapidKg - dRapid);
    slowKg = Math.max(0, slowKg - dSlow);

    // Carbon leaves as CO2 in proportion to the volatile solids destroyed.
    carbonKg = Math.max(0, carbonKg - vsConsumed * carbonPerVs);

    // Nitrogen loss to ammonia volatilisation. Two things drive it: a C/N below
    // ~25 means microbes have more nitrogen than they can build into protein and
    // shed the surplus as NH3, and high temperature and pH accelerate the escape
    // of that NH3. This is why a nitrogen-heavy pile both smells and ends up
    // *poorer* in fertiliser value than the recipe promised.
    const surplusN = cnRatio < 25 ? (25 - Math.min(cnRatio, 25)) / 25 : 0;
    const volatilisation = surplusN * 0.06 * Math.max(0, (tempC - 30) / 30);
    nitrogenKg = Math.max(1e-9, nitrogenKg - nitrogenKg * volatilisation * DT);

    // Water: gained from oxidation, lost to the exiting air stream.
    waterKg = Math.max(
      0,
      waterKg + (thermal.metabolicWaterKgPerDay - thermal.evaporationKgPerDay) * DT,
    );

    tempC = Math.max(config.ambientC - 2, tempC + thermal.dTdt * DT);

    microbes = stepPopulations(
      microbes,
      {
        tempC,
        moisturePct,
        o2Pct,
        labileFraction: rapid0 > 0 ? rapidKg / rapid0 : 0,
        recalcitrantFraction: slow0 > 0 ? slowKg / slow0 : 0,
      },
      DT,
    );

    // ── Operator interventions ───────────────────────────────────────────
    // Turning does three things at once: it re-homogenises the pile, it moves
    // the cool outer shell into the hot core (venting accumulated heat), and it
    // flushes the pore space with fresh air.
    const turning =
      config.turnIntervalDays > 0 && t - lastTurnDay >= config.turnIntervalDays && t > 0;
    if (turning) {
      lastTurnDay = t;
      tempC -= (tempC - config.ambientC) * 0.25;
      o2Pct = O2_ATMOSPHERIC_PCT;
    }

    // Watering. An operator does not wait for turning day to water a pile that
    // has visibly dried out, so moisture management is triggered by the pile's
    // condition, not only by the schedule. Without it, evaporation during the
    // thermophilic peak desiccates the pile and stalls it; the failure mode
    // that forced-aeration systems are most prone to.
    if (config.moistureManaged) {
      const dry = rapidKg + slowKg + inertKg;
      const targetWater = (MOISTURE_OPTIMAL / (100 - MOISTURE_OPTIMAL)) * dry;
      if (turning || moisturePct < MOISTURE_MIN + 2) {
        if (waterKg < targetWater) waterKg = targetWater;
      }
    }
  }

  return {
    steps,
    initial: init,
    summary: summarise(steps, {
      init,
      degradable0,
      peakTemperatureC,
      peakTemperatureDay,
      daysAbove55,
      daysAbove65,
      bestConsecutive55,
      diversityIntegral,
      durationDays: config.durationDays,
    }),
  };
}

function classifyPhase(tempC: number, organicMatterPct: number, t: number): Phase {
  if (organicMatterPct < 25 && tempC < 30) return 'finished';
  if (tempC >= T_THERMOPHILIC_MIN) return 'thermophilic';
  if (t < 3 && organicMatterPct > 80) return 'mesophilic';
  if (organicMatterPct < 45) return 'maturation';
  if (t > 3) return 'cooling';
  return 'mesophilic';
}

interface SummaryInput {
  init: InitialState;
  degradable0: number;
  peakTemperatureC: number;
  peakTemperatureDay: number;
  daysAbove55: number;
  daysAbove65: number;
  bestConsecutive55: number;
  diversityIntegral: number;
  durationDays: number;
}

function summarise(steps: SimulationStep[], input: SummaryInput): SimulationSummary {
  const last = steps[steps.length - 1];
  if (!last) return emptySummary();

  // Maturity: the pile is mature once respiration has all but stopped; it has
  // gone cool and stayed cool, and the C/N has settled. This is the physical
  // meaning of "stable", and it is the criterion PILENGINE uses rather than
  // simply counting days.
  let maturityDay = input.durationDays;
  for (const s of steps) {
    if (s.t > 14 && s.temperatureC < input.init.moisturePct * 0 + 30 && s.kEff < 0.004 && s.organicMatterPct < 55) {
      maturityDay = s.t;
      break;
    }
  }

  const finalDry = (last.organicMatterKg + (input.init.dryMassKg - input.degradable0));
  const massLossPct = ((input.init.dryMassKg - finalDry) / Math.max(input.init.dryMassKg, 1e-9)) * 100;

  const microbialDiversity = Math.min(1, input.diversityIntegral / Math.max(input.durationDays, 1));
  const pathogenReduction = input.bestConsecutive55 >= PATHOGEN_KILL_DAYS;
  const nitrogenRetentionPct = (last.nitrogenKg / Math.max(input.init.nitrogenKg, 1e-9)) * 100;

  const qualityScore = computeQuality({
    finalCn: last.cnRatio,
    finalMoisturePct: last.moisturePct,
    organicMatterPct: last.organicMatterPct,
    diversity: microbialDiversity,
    pathogenReduction,
    daysAbove65: input.daysAbove65,
    peakTemperatureC: input.peakTemperatureC,
  });

  return {
    peakTemperatureC: input.peakTemperatureC,
    peakTemperatureDay: input.peakTemperatureDay,
    daysAbove55: input.daysAbove55,
    daysAbove65: input.daysAbove65,
    maturityDay,
    finalCn: last.cnRatio,
    finalMoisturePct: last.moisturePct,
    finalOrganicMatterPct: last.organicMatterPct,
    nitrogenRetentionPct,
    massLossPct,
    microbialDiversity,
    qualityScore,
    pathogenReduction,
  };
}

/**
 * Quality of the finished product, 0..100.
 *
 * Note that this scores the *output*, not the process. A pile can run a textbook
 * thermal curve and still yield mediocre compost if it was so hot for so long
 * that it sterilised itself of the very organisms that make compost valuable.
 */
function computeQuality(input: {
  finalCn: number;
  finalMoisturePct: number;
  organicMatterPct: number;
  diversity: number;
  pathogenReduction: boolean;
  daysAbove65: number;
  peakTemperatureC: number;
}): number {
  // Stability; a mature compost sits near 10–15:1.
  const cnScore = Number.isFinite(input.finalCn)
    ? Math.max(0, 100 - Math.abs(input.finalCn - CN_MATURE) * 4)
    : 0;

  // Degree of decomposition; the substrate should be mostly gone.
  const decomposition = Math.max(0, Math.min(100, 100 - input.organicMatterPct));

  // Biological richness; this is what makes compost more than mulch.
  const diversity = input.diversity * 100;

  // Sanitisation.
  const sanitisation = input.pathogenReduction ? 100 : 40;

  // Over-cooking penalty: sustained temperatures above 65 °C kill off the
  // beneficial mesophiles and fungi that recolonise during maturation, leaving a
  // biologically impoverished product.
  const overheat = Math.max(0, 100 - input.daysAbove65 * 8);

  const moisture = Math.max(0, 100 - Math.abs(input.finalMoisturePct - 45) * 3);

  const score =
    0.22 * cnScore +
    0.22 * decomposition +
    0.2 * diversity +
    0.16 * sanitisation +
    0.1 * overheat +
    0.1 * moisture;

  return Math.max(0, Math.min(100, score));
}

function emptySummary(): SimulationSummary {
  return {
    peakTemperatureC: 0,
    peakTemperatureDay: 0,
    daysAbove55: 0,
    daysAbove65: 0,
    maturityDay: 0,
    finalCn: 0,
    finalMoisturePct: 0,
    finalOrganicMatterPct: 100,
    nitrogenRetentionPct: 100,
    massLossPct: 0,
    microbialDiversity: 0,
    qualityScore: 0,
    pathogenReduction: false,
  };
}
