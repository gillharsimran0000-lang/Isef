import type { AerationMode } from './types.js';
import {
  HEAT_OF_COMBUSTION_KJ_PER_KG,
  LATENT_HEAT_VAPORISATION,
  SPECIFIC_HEAT_SOLIDS,
  SPECIFIC_HEAT_WATER,
} from './constants.js';

/**
 * PILENGINE; Thermal energy balance.
 *
 * A compost pile is a bioreactor that heats itself. The temperature you measure
 * is not an input to the process; it is the *result* of a balance between the
 * heat respiration liberates and the heat the pile sheds:
 *
 *     (m · cp) · dT/dt = Q_metabolic − Q_convective − Q_evaporative − Q_sensible
 *
 * Nothing in PILENGINE prescribes the classic mesophilic → thermophilic →
 * cooling curve. That curve is what this equation produces when the substrate
 * runs out.
 */

/** Specific heat of the wet matrix, kJ/(kg·K); a mass-weighted blend of water and solids. */
export function specificHeat(moisturePct: number): number {
  const w = moisturePct / 100;
  return w * SPECIFIC_HEAT_WATER + (1 - w) * SPECIFIC_HEAT_SOLIDS;
}

/**
 * Exposed surface area of a heap, m².
 *
 * Approximated from the volume as a squat heap sitting on the ground, so the
 * base does not exchange heat with the air. The 2/3 power is the key scaling:
 * heat *generation* goes with volume, heat *loss* with surface area, so a big
 * pile has proportionally less surface to lose through and runs hotter. It is
 * the reason a compost heap under about 1 m³ often refuses to reach thermophilic
 * temperature at all, no matter how good the recipe; it cannot outrun its own
 * surface-to-volume ratio.
 */
export function surfaceArea(volumeM3: number): number {
  return 5 * Math.pow(Math.max(volumeM3, 1e-3), 2 / 3);
}

/**
 * Overall heat transfer coefficient at the pile surface, kJ/(day·m²·K).
 *
 * This lumps three resistances in series: conduction out through the pile's own
 * outer shell, then convection and radiation from that surface to the air. The
 * shell dominates, and it is why a compost heap is so much better insulated than
 * its bare surface would suggest; the outer 20–30 cm of a pile is cool,
 * unreacting material that the hot core is effectively wearing as a coat.
 *
 * ~6 W/(m²·K) for a bare, exposed heap; far lower than the ~25 W/(m²·K) you
 * would get from a bare convecting surface, precisely because of that shell. A
 * cover, a vessel, or a deliberate capping layer of finished compost cuts it by
 * up to a further 70%.
 */
export function heatTransferCoefficient(insulation: number): number {
  const wPerM2K = 6 * (1 - 0.7 * clamp01(insulation));
  return wPerM2K * 86.4; // W/(m²·K) → kJ/(day·m²·K)
}

/**
 * Mass of O2 per m³ of air, kg. Air is ~1.2 kg/m³ and 23% O2 by mass.
 */
const O2_PER_M3_AIR = 1.2 * 0.23;

/**
 * Fraction of the oxygen in the through-flowing air that the pile actually
 * extracts. A pile does not strip the air it breathes down to zero; exhaust gas
 * from an active compost pile still measures 5–15% O2, so utilisation is well
 * under half.
 */
const O2_UTILISATION = 0.35;

/**
 * Airflow through the pile, m³/day.
 *
 * This is the term that couples the thermal model to the oxygen model, and
 * getting it wrong is what makes naive compost models stall. The air that
 * carries oxygen *in* is the same air that carries water vapour *out*. If you
 * size the airflow from buoyancy alone, as the first cut of this model did,
 * you end up ventilating the pile with less air than its own respiration demands,
 * which is thermodynamically incoherent: the pile is consuming oxygen it was
 * never delivered.
 *
 * So the flow is the greater of two lower bounds:
 *
 *   1. The chimney effect; buoyancy-driven flow, which scales with ΔT.
 *   2. The flow the pile's own oxygen demand *requires*, given that it can only
 *      strip ~35% of the O2 from the air passing through.
 *
 * At peak respiration the second term dominates by a factor of two or more, and
 * the water it carries away is the pile's largest heat sink after the surface.
 */
export function airflowM3PerDay(
  mode: AerationMode,
  tempC: number,
  ambientC: number,
  volumeM3: number,
  vsRateKgPerDay: number,
): number {
  const buoyancy = specificAirflow(mode, tempC, ambientC) * volumeM3 * 24;
  const o2Demand = Math.max(0, vsRateKgPerDay) * 1.4; // kg O2/day
  const respiratory = o2Demand / (O2_PER_M3_AIR * O2_UTILISATION);
  return Math.max(buoyancy, respiratory);
}

/**
 * Specific airflow through the pile, m³ air per m³ pile per hour.
 *
 * Passive piles are not sealed. Warm air rises out of the top and draws fresh
 * air in through the sides; a chimney effect driven by the very temperature
 * difference the pile creates. Airflow therefore scales with ΔT, which sets up a
 * negative feedback: a hotter pile ventilates itself harder and cools itself
 * faster.
 *
 * A forced-aeration blower is temperature-controlled, ramping up between 40 °C
 * and 60 °C. That is precisely how commercial aerated static pile systems hold a
 * pile in the thermophilic band without letting it cook itself past 70 °C.
 */
export function specificAirflow(mode: AerationMode, tempC: number, ambientC: number): number {
  const deltaT = Math.max(0, tempC - ambientC);
  const buoyancy = Math.min(1, deltaT / 25);
  switch (mode) {
    case 'passive':
      return 2.0 * buoyancy;
    case 'turned':
      return 3.0 * buoyancy;
    case 'forced': {
      // A blower sized only for the pile's oxygen demand would be useless as a
      // control: respiration already draws that much air through on its own.
      // The point of forced aeration is to blow *far more* air than oxygen
      // requires, so that the excess strips heat out as water vapour. Real
      // aerated static piles run 5–20× the stoichiometric requirement, and the
      // blower is throttled on a thermostat; which is how they pin the pile at
      // a setpoint instead of letting it cook itself.
      const idle = 0.5;
      const cooling = 24.5 * clamp01((tempC - FORCED_SETPOINT_C + 10) / 20);
      return idle + cooling;
    }
  }
}

/**
 * Thermostat setpoint for forced aeration, °C.
 *
 * Chosen to sit inside a narrow window that a compost operator actually cares
 * about: comfortably above the 55 °C needed to destroy pathogens and weed seeds,
 * and comfortably below the 65 °C at which the microbial community begins
 * cooking itself. Set it at 55 and the controller holds the pile at 54; hitting
 * the target from below and never sanitising anything.
 */
export const FORCED_SETPOINT_C = 62;

/** Saturation vapour density of air, kg water per m³, from the Tetens equation. */
export function saturationVapourDensity(tempC: number): number {
  const pSatPa = 610.8 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const tempK = tempC + 273.15;
  return (pSatPa * 0.018) / (8.314 * tempK); // ideal gas, M(H2O) = 0.018 kg/mol
}

export interface ThermalStep {
  /** Heat liberated by respiration, kJ/day. */
  metabolicKj: number;
  /** Heat conducted/convected/radiated away at the surface, kJ/day. */
  convectiveKj: number;
  /** Heat carried off as latent heat in evaporated water, kJ/day. */
  evaporativeKj: number;
  /** Sensible heat carried out by the exiting air stream, kJ/day. */
  sensibleKj: number;
  /** Water evaporated, kg/day. */
  evaporationKgPerDay: number;
  /** Metabolic water produced by oxidation, kg/day. */
  metabolicWaterKgPerDay: number;
  /** Air drawn through the pile, m³/day. */
  airflowM3PerDay: number;
  /** Net rate of temperature change, °C/day. */
  dTdt: number;
}

/**
 * Assemble the full energy balance for one instant.
 *
 * @param vsRateKgPerDay  Volatile solids being destroyed, kg/day.
 * @param massKg          Current total (wet) pile mass.
 * @param volumeM3        Current pile volume.
 */
export function thermalBalance(input: {
  vsRateKgPerDay: number;
  tempC: number;
  ambientC: number;
  massKg: number;
  volumeM3: number;
  moisturePct: number;
  insulation: number;
  mode: AerationMode;
  ambientRh?: number;
}): ThermalStep {
  const { vsRateKgPerDay, tempC, ambientC, massKg, volumeM3, moisturePct, insulation, mode } = input;
  const ambientRh = input.ambientRh ?? 0.5;

  // Heat in: every kilogram of volatile solids oxidised liberates ~21 MJ.
  const metabolicKj = vsRateKgPerDay * HEAT_OF_COMBUSTION_KJ_PER_KG;

  // Heat out, path 1; the pile surface.
  const area = surfaceArea(volumeM3);
  const u = heatTransferCoefficient(insulation);
  const deltaT = tempC - ambientC;
  const convectiveKj = u * area * deltaT;

  // Heat out, path 2; evaporation. Air entering at ambient humidity leaves
  // very nearly saturated at pile temperature, carrying water (and its latent
  // heat) with it. This is why an active pile visibly steams, and why it dries.
  const airflow = airflowM3PerDay(mode, tempC, ambientC, volumeM3, vsRateKgPerDay);
  const deltaVapour = Math.max(
    0,
    saturationVapourDensity(tempC) - ambientRh * saturationVapourDensity(ambientC),
  );
  // A pile too dry to have free water cannot evaporate at the saturation rate.
  const waterAvailability = clamp01((moisturePct - 15) / 25);
  const evaporationKgPerDay = airflow * deltaVapour * 0.9 * waterAvailability;
  const evaporativeKj = evaporationKgPerDay * LATENT_HEAT_VAPORISATION;

  // Heat out, path 3; sensible heat in the exiting air (cp,air ≈ 1.0 kJ/kg·K,
  // ρ,air ≈ 1.2 kg/m³).
  const sensibleKj = airflow * 1.2 * 1.0 * Math.max(0, deltaT);

  // Oxidising carbohydrate makes water: C6H12O6 + 6 O2 → 6 CO2 + 6 H2O gives
  // ~0.6 kg of water per kg of volatile solids destroyed.
  const metabolicWaterKgPerDay = vsRateKgPerDay * 0.6;

  const heatCapacity = Math.max(1, massKg * specificHeat(moisturePct)); // kJ/K
  const dTdt = (metabolicKj - convectiveKj - evaporativeKj - sensibleKj) / heatCapacity;

  return {
    metabolicKj,
    convectiveKj,
    evaporativeKj,
    sensibleKj,
    evaporationKgPerDay,
    metabolicWaterKgPerDay,
    airflowM3PerDay: airflow,
    dTdt,
  };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
