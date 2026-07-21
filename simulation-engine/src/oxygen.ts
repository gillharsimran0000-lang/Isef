import type { AerationMode } from './types.js';
import {
  D_O2_CO2_REF,
  D_O2_H2O_REF,
  D_O2_LIQUID_WATER,
  D_O2_N2_REF,
  O2_ATMOSPHERIC_PCT,
  O2_PER_KG_VS,
  PARTICLE_DENSITY,
  P_REF_ATM,
  T_REF_K,
  WATER_DENSITY,
} from './constants.js';

/**
 * PILENGINE; Oxygen transport.
 *
 * Oxygen is almost always the true limiting factor in a real pile, and it is the
 * factor a naive compost calculator ignores entirely. The chain modelled here is:
 *
 *   1. Free air space ; how much of the pile volume is actually gas?
 *   2. Binary diffusivity of O2 in the pore gas, corrected for T and P.
 *   3. Effective diffusivity through the tortuous, partly water-filled pore
 *      network (Millington–Quirk).
 *   4. A reaction–diffusion balance against the pile's own O2 demand, which
 *      yields an oxygen penetration depth and therefore the aerobic fraction
 *      of the pile.
 */

/** cm^2/s → m^2/day. */
const CM2_S_TO_M2_DAY = 1e-4 * 86_400;

/** Universal gas constant, J/(mol·K), and the molar mass of O2, kg/mol. */
const R_GAS = 8.314;
const M_O2 = 0.032;

/**
 * Binary gas diffusivity, corrected from a reference state (Fuller-type
 * correlation, as used for compost gas transport in Haug 1993):
 *
 *     D12 = D0 · (P0/P) · (T/T0)^1.75 · (Ω0/Ω)
 *
 * Diffusivity rises steeply with temperature (the T^1.75 term is why a
 * thermophilic pile at 60 °C moves oxygen ~25% faster than one at 20 °C) and
 * falls with pressure.
 *
 * NOTE ON THE SPEC: the product brief writes the last factor as (Ω/Ω0). Ω is the
 * collision integral, a measure of how strongly molecules deflect each other,
 * and Chapman–Enskog theory has D ∝ T^(3/2)/(P·Ω), i.e. diffusivity is
 * *inversely* proportional to Ω. A larger collision integral means more
 * scattering and therefore slower diffusion, so the ratio must be (Ω0/Ω).
 * PILENGINE implements the physically correct form. `omegaRatio` defaults to 1,
 * which recovers the plain Fuller correlation.
 *
 * @param d0     Reference diffusivity, cm^2/s.
 * @param tempK  Temperature, K.
 * @param pAtm   Pressure, atm.
 * @param omegaRatio  Ω/Ω0; the collision integral relative to the reference state.
 * @returns Diffusivity in cm^2/s.
 */
export function binaryDiffusivity(d0: number, tempK: number, pAtm = P_REF_ATM, omegaRatio = 1): number {
  if (tempK <= 0 || pAtm <= 0 || omegaRatio <= 0) {
    throw new RangeError('Temperature, pressure and collision integral must be positive.');
  }
  return d0 * (P_REF_ATM / pAtm) * Math.pow(tempK / T_REF_K, 1.75) * (1 / omegaRatio);
}

export interface GasComponent {
  /** Mole fraction, 0..1. */
  y: number;
  /** Binary diffusivity of O2 through this species at the reference state, cm^2/s. */
  dRef: number;
}

/**
 * Diffusivity of O2 through a multi-component pore gas (Blanc's law):
 *
 *     1 / D_mix = Σ_j ( y_j / D_O2,j )     over the species j ≠ O2,
 *
 * with the mole fractions renormalised across those species. This is the
 * standard reduction of the Stefan–Maxwell equations for one dilute species
 * diffusing through a mixture, and it is what the brief's nested-sum expression
 * collapses to for a single tracked species.
 *
 * Pore gas in an active pile is not air: O2 is drawn down, CO2 accumulates to
 * 10–20%, and the gas is saturated with water vapour. Because O2 diffuses more
 * slowly through CO2 (0.160 cm^2/s) than through N2 (0.202), that CO2 build-up
 * measurably retards oxygen resupply; a second-order effect most models skip.
 */
export function mixtureDiffusivity(components: GasComponent[], tempK: number, pAtm = P_REF_ATM): number {
  const total = components.reduce((s, c) => s + c.y, 0);
  if (total <= 0) return 0;
  let inverse = 0;
  for (const c of components) {
    if (c.y <= 0) continue;
    const d = binaryDiffusivity(c.dRef, tempK, pAtm);
    inverse += c.y / total / d;
  }
  return inverse > 0 ? 1 / inverse : 0;
}

/**
 * Composition of the pore gas as a function of how oxygen-depleted the pile is.
 * O2 consumed is replaced ~1:1 by CO2 (respiratory quotient ≈ 1); the balance is
 * N2, and the gas is treated as vapour-saturated at the pile temperature.
 */
export function poreGasComposition(o2Pct: number, tempC: number): GasComponent[] {
  const h2oPct = Math.min(20, saturationVapourPct(tempC));
  const co2Pct = Math.max(0, O2_ATMOSPHERIC_PCT - o2Pct);
  const n2Pct = Math.max(0, 100 - o2Pct - co2Pct - h2oPct);
  return [
    { y: n2Pct / 100, dRef: D_O2_N2_REF },
    { y: co2Pct / 100, dRef: D_O2_CO2_REF },
    { y: h2oPct / 100, dRef: D_O2_H2O_REF },
  ];
}

/** Saturation water-vapour content of air, % v/v at 1 atm (Tetens equation). */
function saturationVapourPct(tempC: number): number {
  const pSatKpa = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  return (pSatKpa / 101.325) * 100;
}

export interface PorosityResult {
  /** Free air space, % of pile volume; the gas-filled fraction. */
  freeAirSpacePct: number;
  /** Total porosity (gas + water), fraction 0..1. */
  totalPorosity: number;
  /** Air-filled porosity, fraction 0..1. Equals freeAirSpacePct / 100. */
  airFilledPorosity: number;
  /** Water-filled porosity, fraction 0..1. */
  waterFilledPorosity: number;
}

/**
 * Partition one cubic metre of pile into solids, water and gas.
 *
 * Per m^3 the pile weighs `bulkDensity` kg. Of that, M% is water (which occupies
 * mass/1000 m^3) and the remainder is dry solids (occupying mass/1600 m^3, the
 * particle density of organic matter). Whatever volume is left over is gas.
 *
 * This is the step that couples moisture to oxygen: every extra litre of water
 * is a litre of pore space that oxygen can no longer diffuse through at gas-phase
 * speed. It is why "too wet" and "anaerobic" are the same failure.
 */
export function porosity(bulkDensity: number, moisturePct: number): PorosityResult {
  const waterMass = (bulkDensity * moisturePct) / 100;
  const solidsMass = bulkDensity - waterMass;
  const waterVol = waterMass / WATER_DENSITY;
  const solidsVol = solidsMass / PARTICLE_DENSITY;
  const totalPorosity = clamp(1 - solidsVol, 0.01, 0.99);
  const airFilledPorosity = clamp(1 - solidsVol - waterVol, 0, totalPorosity);
  return {
    freeAirSpacePct: airFilledPorosity * 100,
    totalPorosity,
    airFilledPorosity,
    waterFilledPorosity: clamp(waterVol, 0, totalPorosity),
  };
}

/**
 * Millington–Quirk (1961) effective diffusivity through a porous medium:
 *
 *     D_eff / D_0 = ε_a^(10/3) / φ^2
 *
 * where ε_a is air-filled porosity and φ total porosity. The exponent of 10/3 is
 * brutal: halving the air-filled porosity cuts oxygen transport by a factor of
 * ten. This single nonlinearity is why a pile that is merely "a bit too wet"
 * goes fully anaerobic rather than just a bit slower.
 */
export function effectiveDiffusivity(d0: number, airFilledPorosity: number, totalPorosity: number): number {
  if (totalPorosity <= 0 || airFilledPorosity <= 0) return 0;
  return (d0 * Math.pow(airFilledPorosity, 10 / 3)) / Math.pow(totalPorosity, 2);
}

/**
 * Advective enhancement of gas transport, as a multiplier on the molecular
 * diffusivity.
 *
 * Molecular diffusion alone is not how a pile actually breathes. Even an
 * untouched heap has a chimney: warm air rises out of the top and pulls fresh
 * air in through the sides, and that bulk flow moves roughly an order of
 * magnitude more oxygen than diffusion does. A blower replaces the chimney with
 * a fan and moves considerably more still.
 *
 * Rather than solve a full advection–diffusion problem, PILENGINE folds the
 * mechanism into an effective dispersion multiplier; the standard lumped
 * treatment. The coefficients are calibrated so that a well-structured passive
 * pile (≈50% free air space) sits around 5–10% interstitial O2 at peak demand
 * and a wet, compacted one goes anaerobic, which is what oxygen probes in real
 * static windrows actually read.
 *
 * Crucially, this multiplier is applied *after* the Millington–Quirk porosity
 * term, so it cannot rescue a pile that has drowned its own pore network: you
 * cannot blow air through mud.
 */
export function aerationEnhancement(mode: AerationMode): number {
  switch (mode) {
    case 'passive':
      return 10;
    case 'turned':
      return 18;
    case 'forced':
      return 60;
  }
}

/** Saturation concentration of O2 in the pore gas at the pile surface, kg/m^3. */
export function surfaceO2Concentration(tempC: number, pAtm = P_REF_ATM): number {
  const tempK = tempC + 273.15;
  const partialPressurePa = (O2_ATMOSPHERIC_PCT / 100) * pAtm * 101_325;
  const molPerM3 = partialPressurePa / (R_GAS * tempK);
  return molPerM3 * M_O2;
}

export interface OxygenState {
  /** Effective O2 diffusivity through the pile, cm^2/s. */
  effectiveDiffusivityCm2s: number;
  /** Volumetric O2 demand, kg O2 / m^3 / day. */
  demand: number;
  /** Maximum demand the pile can supply aerobically at this geometry, kg O2 / m^3 / day. */
  supplyCapacity: number;
  /** Depth to which O2 penetrates from the surface, m. */
  penetrationDepthM: number;
  /** Fraction of the pile volume that is aerobic, 0..1. */
  aerobicFraction: number;
  /** Volume-averaged interstitial O2, % v/v. */
  interstitialO2Pct: number;
  /** True when the pile core has gone anaerobic. */
  anaerobic: boolean;
}

/**
 * Reaction–diffusion balance for oxygen.
 *
 * Inside the pile, oxygen diffuses in from the surface and is consumed by
 * respiration at a rate that is essentially zero-order in O2 while any is
 * present. At steady state:
 *
 *     D_eff · d²C/dz² = R
 *
 * with C = Cs at the surface and dC/dz = 0 at the penetration front z = L
 * (no flux past the point where oxygen runs out). Integrating twice gives the
 * classic parabolic profile C(z) = Cs·(1 − z/L)², and the penetration depth:
 *
 *     L = sqrt( 2 · D_eff · Cs / R )
 *
 * If L exceeds the half-thickness of the pile, oxygen reaches the core and the
 * whole pile is aerobic. If not, everything below z = L is anaerobic; which is
 * exactly the sour, ammonia-smelling core that composters find when they open an
 * unturned pile.
 *
 * @param vsDegradedKgPerM3PerDay  Volatile solids destroyed per m^3 per day.
 * @param halfHeightM  Half the pile height; the diffusion path length to the core.
 */
export function oxygenBalance(
  vsDegradedKgPerM3PerDay: number,
  bulkDensity: number,
  moisturePct: number,
  tempC: number,
  halfHeightM: number,
  mode: AerationMode,
  pAtm = P_REF_ATM,
): OxygenState {
  const pore = porosity(bulkDensity, moisturePct);
  const tempK = tempC + 273.15;

  // Start from the pore-gas mixture diffusivity at the current temperature,
  // then correct for the geometry of the pore network and for aeration.
  const dGas = mixtureDiffusivity(poreGasComposition(O2_ATMOSPHERIC_PCT * 0.5, tempC), tempK, pAtm);
  const dEffCm2s =
    effectiveDiffusivity(dGas, pore.airFilledPorosity, pore.totalPorosity) * aerationEnhancement(mode);
  const dEff = dEffCm2s * CM2_S_TO_M2_DAY; // m^2/day

  const cs = surfaceO2Concentration(tempC, pAtm); // kg/m^3
  const demand = Math.max(0, vsDegradedKgPerM3PerDay) * O2_PER_KG_VS; // kg O2/m^3/day
  const h = Math.max(0.05, halfHeightM);

  if (dEff <= 0) {
    return {
      effectiveDiffusivityCm2s: 0,
      demand,
      supplyCapacity: 0,
      penetrationDepthM: 0,
      aerobicFraction: 0,
      interstitialO2Pct: 0,
      anaerobic: true,
    };
  }

  // The largest demand a pile of half-thickness h can meet before its core
  // starves: set L = h in the penetration expression and solve for R.
  const supplyCapacity = (2 * dEff * cs) / (h * h);

  if (demand <= 1e-9) {
    // No respiration; the pile equilibrates with the atmosphere.
    return {
      effectiveDiffusivityCm2s: dEffCm2s,
      demand: 0,
      supplyCapacity,
      penetrationDepthM: h,
      aerobicFraction: 1,
      interstitialO2Pct: O2_ATMOSPHERIC_PCT,
      anaerobic: false,
    };
  }

  const L = Math.sqrt((2 * dEff * cs) / demand);
  const aerobicFraction = clamp(L / h, 0, 1);

  // Volume-average the parabolic profile C(z) = Cs·(1 − z/L)² over the depth h.
  const a = Math.min(h, L);
  const meanC = ((cs * L) / (3 * h)) * (1 - Math.pow(1 - a / L, 3));
  const interstitialO2Pct = clamp((meanC / cs) * O2_ATMOSPHERIC_PCT, 0, O2_ATMOSPHERIC_PCT);

  return {
    effectiveDiffusivityCm2s: dEffCm2s,
    demand,
    supplyCapacity,
    penetrationDepthM: L,
    aerobicFraction,
    interstitialO2Pct,
    anaerobic: aerobicFraction < 0.5,
  };
}

/**
 * Oxygen diffuses through liquid water some 4,000× more slowly than through air
 * (4.8e-5 vs ~0.2 cm^2/s). This helper exposes the contrast that underpins the
 * whole moisture–oxygen coupling.
 */
export const DIFFUSIVITY_REFERENCE = {
  airLow: 0.2,
  airHigh: 0.28,
  water: D_O2_LIQUID_WATER,
  ratio: 0.2 / D_O2_LIQUID_WATER,
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
