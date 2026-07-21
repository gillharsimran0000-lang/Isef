/**
 * PILENGINE; Physical and biological constants.
 * Every value carries its source so results are defensible.
 */

/** Heat of combustion of degraded volatile solids, kJ per kg VS destroyed. Haug (1993), Table 5.4. */
export const HEAT_OF_COMBUSTION_KJ_PER_KG = 21_000;

/** Specific heat of a wet compost matrix, kJ/(kg·K). Haug (1993). Water dominates. */
export const SPECIFIC_HEAT_WATER = 4.186;
export const SPECIFIC_HEAT_SOLIDS = 1.95;

/** Latent heat of vaporisation of water at compost temperatures, kJ/kg. */
export const LATENT_HEAT_VAPORISATION = 2_430;

/** Particle (solid) density of organic matter, kg/m^3. Used for total porosity. */
export const PARTICLE_DENSITY = 1_600;

/**
 * Volumes are not additive when feedstocks are mixed. Fine, dense material
 * settles into the voids between coarse material, and the heap compacts under
 * its own weight. The blended volume is this fraction of the sum of the
 * as-received volumes. Calibrated so a typical mixed pile lands at the
 * 450-650 kg/m^3 that field measurements report.
 */
export const PACKING_EFFICIENCY = 0.6;

/** Density of water, kg/m^3. */
export const WATER_DENSITY = 1_000;

/** Binary diffusivity of O2 in N2 at reference conditions, cm^2/s. Reid, Prausnitz & Poling. */
export const D_O2_N2_REF = 0.202;
/** Binary diffusivity of O2 in CO2 at reference conditions, cm^2/s. */
export const D_O2_CO2_REF = 0.160;
/** Binary diffusivity of O2 in water vapour at reference conditions, cm^2/s. */
export const D_O2_H2O_REF = 0.282;
/** Diffusivity of dissolved O2 in liquid water, cm^2/s; four orders of magnitude slower. */
export const D_O2_LIQUID_WATER = 4.8e-5;

/** Reference state for the Fuller-type diffusivity correlation. */
export const T_REF_K = 273.15;
export const P_REF_ATM = 1.0;

/** Atmospheric O2, % v/v. */
export const O2_ATMOSPHERIC_PCT = 20.9;
/** Half-saturation constant for O2 uptake (Monod), % v/v. Haug (1993). */
export const O2_HALF_SATURATION_PCT = 2.0;
/** Below this interstitial O2 the pile goes anaerobic and starts producing odour. */
export const O2_ANAEROBIC_THRESHOLD_PCT = 5.0;

/** Specific O2 demand: kg O2 consumed per kg of volatile solids destroyed. Haug (1993). */
export const O2_PER_KG_VS = 1.4;

/** Optimal C/N for a starting mix. Rynk, On-Farm Composting Handbook (1992). */
export const CN_OPTIMAL = 30;
export const CN_ACCEPTABLE_MIN = 25;
export const CN_ACCEPTABLE_MAX = 35;
/** A finished, mature compost. */
export const CN_MATURE = 12;

/** Moisture window, % wet basis. */
export const MOISTURE_OPTIMAL = 55;
export const MOISTURE_MIN = 40;
export const MOISTURE_MAX = 65;

/** Temperature bands, degrees C. */
export const T_MESOPHILIC_MAX = 40;
export const T_THERMOPHILIC_MIN = 40;
export const T_THERMOPHILIC_MAX = 60;
/** Above this the biology inhibits itself; see haugTemperatureFactor. */
export const T_CRITICAL = 65;
/** US EPA 503 PFRP: 55 C held for 3 consecutive days destroys human pathogens. */
export const T_PATHOGEN_KILL = 55;
export const PATHOGEN_KILL_DAYS = 3;

/** Free air space window, % of pile volume. Below 30% O2 transport collapses. */
export const FAS_MIN = 30;
export const FAS_OPTIMAL = 50;

/**
 * First-order decay constants at the THERMAL OPTIMUM with every other factor
 * ideal, 1/day. Two-pool model (Haug 1993; Kaiser 1996):
 *
 *   - a rapidly degradable pool (sugars, starch, protein, fats) with a
 *     half-life of ~3 days; this is the pool whose combustion drives the
 *     initial self-heating spike;
 *   - a slowly degradable pool (cellulose, hemicellulose) with a half-life of
 *     ~2 months; this is what sustains the long thermophilic plateau and the
 *     maturation tail.
 *
 * Lignin is treated as inert: it does not meaningfully degrade on compost
 * timescales, and counting it as substrate is why simple models over-predict
 * mass loss.
 */
export const K_RAPID_OPT = 0.27;
export const K_SLOW_OPT = 0.05;

/**
 * Not all of the non-lignin organic matter is actually reachable. Physical
 * occlusion, humification of intermediates into stable compounds, and simple
 * kinetic exhaustion mean a real pile stabilises with substrate still present.
 * Measured dry-mass loss over a full cycle is typically 40–60%.
 */
export const DEGRADABLE_ACCESSIBILITY = 0.75;

/** Reference temperature for the Q10 relation, degrees C. */
export const T_REF_Q10 = 20;
export const Q10_DEFAULT = 2.5;
