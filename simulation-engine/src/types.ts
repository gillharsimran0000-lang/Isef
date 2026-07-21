/**
 * PILENGINE; Core domain types.
 *
 * Convention used throughout the engine:
 *   - Mass (Q) is WET mass in kilograms, as weighed by the user.
 *   - Moisture (M) is a WET-BASIS percentage: M = (wet - dry) / wet * 100.
 *   - Carbon (C) and Nitrogen (N) are percentages of DRY mass.
 *   - Therefore dry mass = Q * (100 - M) / 100, which is why the factor
 *     (100 - M) appears in every C/N expression.
 * Mixing wet-basis and dry-basis figures is the single most common error in
 * compost recipe math, so the units are encoded in the type names below.
 */

/** A feedstock as characterised in the literature (per-unit properties). */
export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  /** Carbon, % of dry mass. */
  carbonPct: number;
  /** Nitrogen, % of dry mass. */
  nitrogenPct: number;
  /** Moisture, % of wet mass (as-received, typical). */
  moisturePct: number;
  /** Bulk density, kg/m^3 (as-received). Drives free air space. */
  bulkDensity: number;
  /** Fraction of the dry mass that is rapidly degradable (sugars, starches, proteins). */
  rapidFraction: number;
  /** Fraction of dry mass that is lignin; effectively inert on compost timescales. */
  ligninPct: number;
  source: string;
}

export type MaterialCategory = 'carbon' | 'nitrogen' | 'bulking' | 'amendment';

/** A material selected into the user's recipe, with its mass. */
export interface RecipeItem {
  materialId: string;
  /** Wet mass, kg. */
  massKg: number;
}

/** A fully resolved recipe line: the material plus the mass chosen for it. */
export interface ResolvedItem extends Material {
  massKg: number;
  dryMassKg: number;
  carbonKg: number;
  nitrogenKg: number;
  waterKg: number;
}

/** Physical + operational configuration of the pile. */
export interface PileConfig {
  recipe: RecipeItem[];
  /** Ambient air temperature, degrees C. */
  ambientC: number;
  /**
   * Aeration regime. Drives the convective/latent heat loss coefficient and
   * the oxygen replenishment rate.
   */
  aeration: AerationMode;
  /** Days between turning events. 0 = never turned. */
  turnIntervalDays: number;
  /** Characteristic pile height, m. Sets the oxygen diffusion path length. */
  heightM: number;
  /** Insulation quality 0..1; 0 is a bare thin pile, 1 is a well-insulated vessel. */
  insulation: number;
  /** Q10 temperature coefficient for the biological rate. Literature: 2–3. */
  q10: number;
  /**
   * Whether the operator actively maintains moisture; watering the pile when it
   * dries below the working band, and re-wetting as they turn.
   *
   * This is not a nicety. An active pile evaporates 20-100 kg of water per tonne
   * per day at peak, and forced aeration makes that far worse because the air it
   * blows through for cooling leaves saturated. A pile that is never re-wetted
   * desiccates and stalls long before it matures; which is exactly what the
   * simulation will show if you turn this off.
   */
  moistureManaged: boolean;
  /** Days to simulate. */
  durationDays: number;
}

export type AerationMode = 'passive' | 'turned' | 'forced';

/** One integration step of the lifecycle simulation. */
export interface SimulationStep {
  /** Days since start. */
  t: number;
  /** Core temperature, degrees C. */
  temperatureC: number;
  /** Moisture, % wet basis. */
  moisturePct: number;
  /** Degradable organic matter remaining, kg (dry). */
  organicMatterKg: number;
  /** Organic matter remaining as % of the initial degradable pool. */
  organicMatterPct: number;
  /** Current C/N ratio of the material remaining in the pile. */
  cnRatio: number;
  /** Nitrogen remaining in the pile, kg (lost to ammonia volatilisation over time). */
  nitrogenKg: number;
  /** Free air space, % of pile volume. */
  freeAirSpacePct: number;
  /** Interstitial O2 concentration, % v/v. */
  oxygenPct: number;
  /** Fraction of the pile volume that is aerobic, 0..1. */
  aerobicFraction: number;
  /** Effective first-order decay constant at this instant, 1/day. */
  kEff: number;
  /** Microbial guild populations, normalised 0..1 of carrying capacity. */
  microbes: MicrobePopulations;
  /** Rate-limiting factors at this instant, each 0..1. */
  factors: RateFactors;
  /** Lifecycle phase label. */
  phase: Phase;
}

export interface MicrobePopulations {
  mesophilicBacteria: number;
  thermophilicBacteria: number;
  actinomycetes: number;
  fungi: number;
}

export interface RateFactors {
  temperature: number;
  moisture: number;
  oxygen: number;
  cn: number;
  freeAirSpace: number;
}

export type Phase = 'mesophilic' | 'thermophilic' | 'cooling' | 'maturation' | 'finished';

/** Aggregate scorecard shown on the dashboard. */
export interface HealthScore {
  /** 0..100; the headline PILENGINE Compost Intelligence Score. */
  total: number;
  temperature: number;
  moisture: number;
  cn: number;
  oxygen: number;
  label: string;
  /** Human-readable diagnostics, worst-first. */
  advisories: Advisory[];
}

export interface Advisory {
  severity: 'critical' | 'warning' | 'info' | 'good';
  title: string;
  detail: string;
}

/** Output of a full lifecycle run. */
export interface SimulationResult {
  steps: SimulationStep[];
  initial: InitialState;
  summary: SimulationSummary;
}

export interface InitialState {
  totalMassKg: number;
  dryMassKg: number;
  waterKg: number;
  carbonKg: number;
  nitrogenKg: number;
  cnRatio: number;
  moisturePct: number;
  bulkDensity: number;
  freeAirSpacePct: number;
  degradableKg: number;
}

export interface SimulationSummary {
  peakTemperatureC: number;
  peakTemperatureDay: number;
  /** Consecutive days at or above 55 C; the PFRP pathogen-kill threshold. */
  daysAbove55: number;
  /** Days at or above 65 C, where the biology self-inhibits. */
  daysAbove65: number;
  /** Day the pile is considered mature (stable, C/N and temperature settled). */
  maturityDay: number;
  finalCn: number;
  finalMoisturePct: number;
  finalOrganicMatterPct: number;
  /** Nitrogen remaining at the end of the run, as % of the starting nitrogen mass. */
  nitrogenRetentionPct: number;
  /** Total dry-mass loss, % of initial. */
  massLossPct: number;
  /** Shannon diversity of the four guilds, integrated over the run, 0..1 normalised. */
  microbialDiversity: number;
  /** 0..100 composite quality score of the finished product. */
  qualityScore: number;
  pathogenReduction: boolean;
}
