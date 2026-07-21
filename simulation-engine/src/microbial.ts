import type { MicrobePopulations } from './types.js';
import { clamp01, moistureFactor, oxygenFactor } from './kinetics.js';

/**
 * PILENGINE; Microbial succession.
 *
 * The four guilds that run a compost pile do not coexist peacefully; they take
 * turns. Each has a distinct thermal niche and a distinct substrate preference,
 * and the succession you observe; mesophiles → thermophiles → actinomycetes and
 * fungi; is an emergent consequence of the pile cooking itself through those
 * niches in sequence. PILENGINE does not script the succession. It defines the
 * four niches and lets the competition play out.
 */

export interface Guild {
  key: keyof MicrobePopulations;
  name: string;
  /** Cardinal temperatures, °C; below Tmin and above Tmax, growth is zero. */
  tMin: number;
  tOpt: number;
  tMax: number;
  /** Maximum specific growth rate at the optimum, 1/day. */
  muMax: number;
  /** Basal death / washout rate, 1/day. */
  death: number;
  /**
   * Substrate preference, 0..1; the weight this guild places on the *rapidly*
   * degradable pool versus the recalcitrant one. Bacteria want sugar; fungi and
   * actinomycetes are the only guilds equipped to attack cellulose and lignin,
   * so they thrive precisely when the easy food is gone.
   */
  prefersLabile: number;
  /** Tolerance of low oxygen, 0..1. Fungi are strict aerobes; bacteria less so. */
  aerobeStrictness: number;
  role: string;
}

export const GUILDS: Guild[] = [
  {
    key: 'mesophilicBacteria',
    name: 'Mesophilic Bacteria',
    tMin: 5,
    tOpt: 35,
    tMax: 45,
    muMax: 12,
    death: 1.0,
    prefersLabile: 0.95,
    aerobeStrictness: 0.5,
    role: 'Bacillus and soil bacteria. First responders; they consume simple sugars, starches and proteins within hours, and the heat they release is what drives the pile into the thermophilic range and out of their own comfort zone.',
  },
  {
    key: 'thermophilicBacteria',
    name: 'Thermophilic Bacteria',
    tMin: 35,
    tOpt: 55,
    tMax: 70,
    muMax: 15,
    death: 1.2,
    prefersLabile: 0.75,
    aerobeStrictness: 0.6,
    role: 'Heat-loving bacteria that take over above 40 °C. They break down proteins, fats and hemicellulose at high speed, and their heat sterilises the pile; sustained 55 °C destroys human and plant pathogens and most weed seeds.',
  },
  {
    key: 'actinomycetes',
    name: 'Actinomycetes',
    tMin: 10,
    tOpt: 42,
    tMax: 60,
    muMax: 2.5,
    death: 0.15,
    prefersLabile: 0.15,
    aerobeStrictness: 0.85,
    role: 'Filamentous bacteria with the enzymes to attack cellulose and lignin; the tough structural polymers nothing else will touch. They colonise late, grow slowly, and give finished compost its earthy petrichor smell (the compound is geosmin).',
  },
  {
    key: 'fungi',
    name: 'Fungi',
    tMin: 5,
    tOpt: 30,
    tMax: 45,
    muMax: 3.0,
    death: 0.20,
    prefersLabile: 0.2,
    aerobeStrictness: 0.95,
    role: 'Moulds and higher fungi. Killed off during the thermophilic peak, they recolonise from the cool outer shell as the pile cools, and finish the job on the most complex organics. Strict aerobes; the first guild lost when a pile goes wet and anaerobic.',
  },
];

/**
 * Cardinal Temperature Model with Inflection; Rosso et al. (1993).
 *
 *     γ(T) = (T − Tmax)(T − Tmin)²
 *            ────────────────────────────────────────────────────────────
 *            (Topt − Tmin)[ (Topt − Tmin)(T − Topt)
 *                         − (Topt − Tmax)(Topt + Tmin − 2T) ]
 *
 * γ = 1 at the optimum and 0 outside [Tmin, Tmax]. Unlike a Gaussian, it is
 * asymmetric; the fall-off above the optimum is far steeper than the rise below
 * it, which is exactly how real organisms behave: you can chill a microbe and it
 * survives, you cook it and it dies. Using this rather than a symmetric bell is
 * what lets the model reproduce the *sudden* thermophilic die-off above 70 °C.
 */
export function cardinalGrowth(tempC: number, guild: Guild): number {
  const { tMin, tOpt, tMax } = guild;
  if (tempC <= tMin || tempC >= tMax) return 0;

  const numerator = (tempC - tMax) * Math.pow(tempC - tMin, 2);
  const denominator =
    (tOpt - tMin) *
    ((tOpt - tMin) * (tempC - tOpt) - (tOpt - tMax) * (tOpt + tMin - 2 * tempC));

  if (Math.abs(denominator) < 1e-12) return 0;
  return clamp01(numerator / denominator);
}

export interface GuildEnvironment {
  tempC: number;
  moisturePct: number;
  o2Pct: number;
  /** Remaining rapidly-degradable substrate, as a fraction of its initial amount. */
  labileFraction: number;
  /** Remaining slowly-degradable substrate, as a fraction of its initial amount. */
  recalcitrantFraction: number;
}

/**
 * Per-guild specific growth rate under the current conditions, 1/day.
 *
 * Growth is the product of the thermal niche, the moisture and oxygen responses
 * (each scaled by how strict an aerobe the guild is), and a Monod term on the
 * substrate the guild actually eats.
 */
export function guildGrowthRate(guild: Guild, env: GuildEnvironment): number {
  const thermal = cardinalGrowth(env.tempC, guild);
  if (thermal <= 0) return 0;

  const water = moistureFactor(env.moisturePct);

  // A strict aerobe suffers the full Monod oxygen penalty; a facultative
  // organism keeps some fraction of its rate even as oxygen runs out.
  const o2 = oxygenFactor(env.o2Pct);
  const oxygenResponse = guild.aerobeStrictness * o2 + (1 - guild.aerobeStrictness);

  // Whichever substrate this guild specialises in.
  const substrate =
    guild.prefersLabile * env.labileFraction + (1 - guild.prefersLabile) * env.recalcitrantFraction;
  const substrateResponse = substrate / (0.1 + substrate); // Monod, Ks = 0.1

  return guild.muMax * thermal * water * oxygenResponse * substrateResponse;
}

/**
 * Advance the four populations by dt days.
 *
 * Logistic growth with a shared carrying capacity; the guilds compete for the
 * same physical pore space and the same pile:
 *
 *     dP_i/dt = μ_i(T, M, O2, S) · P_i · (1 − ΣP / K)  −  d_i · P_i
 *
 * A small immigration floor keeps every guild from going permanently extinct,
 * which is physically right: spores survive the thermophilic phase in the cool
 * outer shell of the pile and recolonise the core once it cools. Without that
 * term the model could never reproduce the fungal comeback during maturation.
 */
export function stepPopulations(
  populations: MicrobePopulations,
  env: GuildEnvironment,
  dtDays: number,
): MicrobePopulations {
  const total = GUILDS.reduce((s, g) => s + populations[g.key], 0);
  const crowding = clamp01(1 - total / 1.6); // shared carrying capacity K = 1.6
  const next = { ...populations };

  for (const guild of GUILDS) {
    const p = populations[guild.key];
    const mu = guildGrowthRate(guild, env);
    const dp = mu * p * crowding - guild.death * p;
    // Spore reservoir: a floor of 0.5% that lets a crashed guild recover.
    next[guild.key] = clamp01(Math.max(0.005, p + dp * dtDays));
  }

  return next;
}

/** Populations at inoculation; whatever rides in on the feedstock. */
export function seedPopulations(): MicrobePopulations {
  return {
    mesophilicBacteria: 0.12,
    thermophilicBacteria: 0.02,
    actinomycetes: 0.01,
    fungi: 0.03,
  };
}

/**
 * Shannon diversity index over the four guilds:
 *
 *     H = −Σ p_i · ln(p_i)
 *
 * normalised by ln(4), its maximum for four guilds, to give 0..1. A mature,
 * biologically rich compost scores high; a pile dominated by a single guild
 * (a raging thermophilic monoculture, or an anaerobic dead zone) scores low.
 * Diversity is the best single proxy for compost that will actually suppress
 * plant disease once applied.
 */
export function shannonDiversity(populations: MicrobePopulations): number {
  const values = GUILDS.map((g) => populations[g.key]).filter((v) => v > 1e-6);
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0 || values.length < 2) return 0;
  let h = 0;
  for (const v of values) {
    const p = v / total;
    h -= p * Math.log(p);
  }
  return clamp01(h / Math.log(GUILDS.length));
}
