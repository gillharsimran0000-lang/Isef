import type { PileConfig, SimulationResult, SimulationStep } from './types.js';
import { simulate } from './simulate.js';
import { q10Factor } from './kinetics.js';
import { shannonDiversity } from './microbial.js';
import { CN_MATURE } from './constants.js';

/**
 * PILENGINE; Forecasting.
 *
 * There is no statistical model and no fitted curve here, and that is the point.
 * The forecast is produced by running the mechanistic simulation forward and
 * reading off the state. If the model is right about the physics, it is right
 * about the future; if it is wrong, the forecast is wrong in a way you can trace
 * to a specific equation. A regression fitted to past piles could never tell you
 * *why* your pile is about to stall.
 */

export interface ForecastPoint {
  t: number;
  temperatureC: number;
  moisturePct: number;
  organicMatterPct: number;
  cnRatio: number;
  oxygenPct: number;
}

export interface Forecast {
  /** Hourly, out to 24 h. */
  next24h: ForecastPoint[];
  /** Daily, out to 7 days. */
  next7d: ForecastPoint[];
  /** The full run to completion. */
  lifecycle: ForecastPoint[];
  outcome: FinalPrediction;
  /** Decomposition curve, M(t) = M0·e^(−kt), for comparison against the mechanistic run. */
  exponentialFit: { k: number; halfLifeDays: number; curve: { t: number; pct: number }[] };
}

export interface FinalPrediction {
  completionDay: number;
  completionDate: string;
  finalCn: number;
  finalMoisturePct: number;
  finalOrganicMatterPct: number;
  qualityScore: number;
  microbialDiversity: number;
  peakTemperatureC: number;
  peakTemperatureDay: number;
  pathogenReduction: boolean;
  massLossPct: number;
}

/** Build a full forecast from a pile configuration. */
export function forecast(config: PileConfig, startDate = new Date()): Forecast {
  const result = simulate(config);
  const steps = result.steps;

  const next24h = resample(steps, 0, 1, 24);
  const next7d = resample(steps, 0, 7, 7);
  const lifecycle = resample(steps, 0, config.durationDays, 120);

  const completionDay = result.summary.maturityDay;
  const completionDate = new Date(startDate.getTime() + completionDay * 86_400_000);

  return {
    next24h,
    next7d,
    lifecycle,
    outcome: {
      completionDay,
      completionDate: completionDate.toISOString(),
      finalCn: result.summary.finalCn,
      finalMoisturePct: result.summary.finalMoisturePct,
      finalOrganicMatterPct: result.summary.finalOrganicMatterPct,
      qualityScore: result.summary.qualityScore,
      microbialDiversity: result.summary.microbialDiversity,
      peakTemperatureC: result.summary.peakTemperatureC,
      peakTemperatureDay: result.summary.peakTemperatureDay,
      pathogenReduction: result.summary.pathogenReduction,
      massLossPct: result.summary.massLossPct,
    },
    exponentialFit: fitExponential(steps, config.durationDays),
  };
}

function resample(steps: SimulationStep[], fromDay: number, toDay: number, n: number): ForecastPoint[] {
  if (steps.length === 0) return [];
  const out: ForecastPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = fromDay + ((toDay - fromDay) * i) / n;
    const s = interpolate(steps, t);
    out.push({
      t,
      temperatureC: s.temperatureC,
      moisturePct: s.moisturePct,
      organicMatterPct: s.organicMatterPct,
      cnRatio: Number.isFinite(s.cnRatio) ? s.cnRatio : 999,
      oxygenPct: s.oxygenPct,
    });
  }
  return out;
}

/** Linear interpolation between recorded steps. */
export function interpolate(steps: SimulationStep[], t: number): SimulationStep {
  const first = steps[0]!;
  const last = steps[steps.length - 1]!;
  if (t <= first.t) return first;
  if (t >= last.t) return last;

  // Steps are evenly spaced, so index directly rather than searching.
  const dt = steps.length > 1 ? steps[1]!.t - first.t : 1;
  const idx = Math.min(steps.length - 2, Math.max(0, Math.floor((t - first.t) / dt)));
  const a = steps[idx]!;
  const b = steps[idx + 1]!;
  const span = b.t - a.t;
  const w = span > 0 ? (t - a.t) / span : 0;

  const lerp = (x: number, y: number) => x + (y - x) * w;
  return {
    ...a,
    t,
    temperatureC: lerp(a.temperatureC, b.temperatureC),
    moisturePct: lerp(a.moisturePct, b.moisturePct),
    organicMatterKg: lerp(a.organicMatterKg, b.organicMatterKg),
    organicMatterPct: lerp(a.organicMatterPct, b.organicMatterPct),
    cnRatio: lerp(a.cnRatio, b.cnRatio),
    nitrogenKg: lerp(a.nitrogenKg, b.nitrogenKg),
    freeAirSpacePct: lerp(a.freeAirSpacePct, b.freeAirSpacePct),
    oxygenPct: lerp(a.oxygenPct, b.oxygenPct),
    aerobicFraction: lerp(a.aerobicFraction, b.aerobicFraction),
    kEff: lerp(a.kEff, b.kEff),
  };
}

/**
 * Fit the textbook first-order decay law to the simulated run:
 *
 *     M(t) = M0 · e^(−k·t)     ⟺     ln(M/M0) = −k·t
 *
 * Taking logs linearises it, so k comes from an ordinary least-squares slope
 * through the origin: k = −Σ(t·ln(M/M0)) / Σt².
 *
 * PILENGINE shows this fit *alongside* the mechanistic curve rather than instead
 * of it, because the gap between the two is itself informative. A single
 * exponential assumes one uniform substrate decaying at a constant rate. Real
 * compost has at least two pools decaying at rates an order of magnitude apart,
 * under a rate constant that swings by 10× as the pile heats and cools. The
 * exponential will overshoot early and undershoot late; where it diverges most
 * is where the biology is doing something a constant-k model cannot see.
 */
function fitExponential(
  steps: SimulationStep[],
  durationDays: number,
): { k: number; halfLifeDays: number; curve: { t: number; pct: number }[] } {
  let numerator = 0;
  let denominator = 0;
  for (const s of steps) {
    if (s.t <= 0) continue;
    const frac = Math.max(1e-6, s.organicMatterPct / 100);
    numerator += s.t * Math.log(frac);
    denominator += s.t * s.t;
  }
  const k = denominator > 0 ? -numerator / denominator : 0;

  const curve: { t: number; pct: number }[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = (durationDays * i) / 120;
    curve.push({ t, pct: 100 * Math.exp(-k * t) });
  }

  return { k, halfLifeDays: k > 0 ? Math.LN2 / k : Infinity, curve };
}

/**
 * Q10 sensitivity sweep: how the reaction rate would respond to temperature if
 * *only* the Q10 relation applied. Overlaying this against the model's actual
 * temperature factor makes the thermal-inactivation term visible; the two
 * curves track each other up to about 45 °C and then diverge violently, and that
 * divergence is the entire difference between a pile that peaks and a pile that
 * cooks itself.
 */
export function q10Sweep(q10: number, refTempC = 20): { tempC: number; rate: number }[] {
  const out: { tempC: number; rate: number }[] = [];
  for (let t = 0; t <= 80; t += 2) {
    out.push({ tempC: t, rate: q10Factor(t, q10, refTempC) });
  }
  return out;
}

/** Microbial diversity of the final product, from the last simulated step. */
export function finalDiversity(result: SimulationResult): number {
  const last = result.steps[result.steps.length - 1];
  return last ? shannonDiversity(last.microbes) : 0;
}

/** How far the finished compost sits from a fully stabilised C/N of ~12:1. */
export function stabilityIndex(finalCn: number): number {
  if (!Number.isFinite(finalCn)) return 0;
  return Math.max(0, Math.min(1, 1 - Math.abs(finalCn - CN_MATURE) / 20));
}
