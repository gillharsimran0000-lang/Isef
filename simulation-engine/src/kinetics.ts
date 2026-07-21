import {
  CN_OPTIMAL,
  FAS_MIN,
  O2_HALF_SATURATION_PCT,
  Q10_DEFAULT,
  T_REF_Q10,
} from './constants.js';

/**
 * PILENGINE; Reaction kinetics.
 *
 * Decomposition is modelled as first-order in the remaining degradable
 * substrate, with a rate constant that is modulated by every environmental
 * factor at once:
 *
 *     k_eff = k_ref · f(T) · f(M) · f(O2) · f(C/N) · f(FAS)
 *
 * The factors multiply rather than average, which encodes Liebig's law of the
 * minimum: a pile that is perfect in every respect but bone dry does not compost
 * at 80% speed; it does not compost at all. Any single factor going to zero
 * takes the whole rate with it. Averaging the factors (a common shortcut) would
 * hide exactly the failures a composter most needs to see.
 */

/**
 * Q10 temperature coefficient:
 *
 *     R(T) = R0 · Q10^((T − T0) / 10)
 *
 * Q10 is the factor by which a biological rate multiplies for each 10 °C rise.
 * For compost microbial communities the literature puts it at 2–3, so every
 * 10 °C roughly doubles-to-triples the reaction speed. This is the engine of the
 * self-heating runaway: faster respiration makes more heat, which raises the
 * temperature, which makes respiration faster still.
 *
 * Used alone, Q10 predicts a pile that heats without limit. It does not, because
 * proteins denature; see `haugTemperatureFactor`.
 */
export function q10Rate(r0: number, tempC: number, q10 = Q10_DEFAULT, refTempC = T_REF_Q10): number {
  return r0 * Math.pow(q10, (tempC - refTempC) / 10);
}

/** The multiplier alone, without a reference rate; R(T)/R0. */
export function q10Factor(tempC: number, q10 = Q10_DEFAULT, refTempC = T_REF_Q10): number {
  return Math.pow(q10, (tempC - refTempC) / 10);
}

/**
 * Temperature response including thermal inactivation; Haug (1993), eq. 5-1:
 *
 *     f(T) = 1.066^(T − 20) − 1.21^(T − 60)
 *
 * Two competing exponentials. The first is Q10-like growth (1.066^10 ≈ 1.9, i.e.
 * an effective Q10 near 2). The second is a much steeper *death* term that only
 * matters once T approaches 60 °C, and then overwhelms everything: at 70 °C it
 * has grown to more than 6, wiping out the growth term entirely.
 *
 * The result peaks near 58–60 °C and crosses zero just above 70 °C. This is the
 * shape every real compost pile traces, and it is why a pile that gets *too* hot
 * cooks its own workforce and stalls. A naive Q10-only model cannot reproduce it.
 */
export function haugTemperatureFactor(tempC: number): number {
  return Math.max(0, Math.pow(1.066, tempC - 20) - Math.pow(1.21, tempC - 60));
}

/** Peak of `haugTemperatureFactor`, used to normalise it to 0..1. */
const HAUG_PEAK = (() => {
  let peak = 0;
  for (let t = 0; t <= 90; t += 0.1) peak = Math.max(peak, haugTemperatureFactor(t));
  return peak;
})();

/** `haugTemperatureFactor` rescaled to 0..1 so it composes with the other factors. */
export function temperatureFactor(tempC: number): number {
  return clamp01(haugTemperatureFactor(tempC) / HAUG_PEAK);
}

/**
 * Moisture response; Haug (1993), a logistic in moisture fraction:
 *
 *     f(M) = 1 / ( e^(−17.684·M + 7.0622) + 1 )
 *
 * with M as a fraction (0..1). Near-zero below 30% moisture, rising steeply
 * through 40%, and saturating above ~55%.
 *
 * Note what this function does *not* do: it never penalises a pile for being too
 * wet. That is deliberate and correct. Excess water does not poison microbes; it
 * drowns them, by filling the pores that carry oxygen. PILENGINE therefore lets
 * the wet-end penalty emerge where it physically originates, in the oxygen
 * term (see oxygen.ts), rather than double-counting it here.
 */
export function moistureFactor(moisturePct: number): number {
  const m = clamp01(moisturePct / 100);
  return 1 / (Math.exp(-17.684 * m + 7.0622) + 1);
}

/**
 * Oxygen response; Monod saturation:
 *
 *     f(O2) = O2 / (K + O2),   K ≈ 2% v/v
 *
 * Aerobes are indifferent to oxygen above ~10% and sharply limited below ~5%.
 * At the half-saturation constant the rate is exactly halved.
 */
export function oxygenFactor(o2Pct: number): number {
  const o2 = Math.max(0, o2Pct);
  return o2 / (O2_HALF_SATURATION_PCT + o2);
}

/**
 * C/N response.
 *
 * Below ~30:1 carbon is the limiting nutrient but the microbes are not actually
 * slowed; they simply shed the surplus nitrogen as ammonia, so the *rate* stays
 * high (the cost is nitrogen loss and odour, penalised in the health score, not
 * here). Above 30:1 nitrogen becomes limiting and the rate falls off roughly
 * hyperbolically: at 60:1 the pile runs at about half speed, at 100:1 it barely
 * heats at all.
 */
export function cnFactor(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0.05;
  if (ratio <= CN_OPTIMAL) return 1;
  return clamp01(CN_OPTIMAL / ratio);
}

/**
 * Free air space response.
 *
 * Below ~30% FAS the pore network stops percolating: the gas-filled pores are no
 * longer connected to each other, so bulk gas exchange collapses independently of
 * how fast oxygen would diffuse. Above 30% the structural penalty disappears.
 */
export function fasFactor(freeAirSpacePct: number): number {
  if (freeAirSpacePct >= FAS_MIN) return 1;
  return clamp01(freeAirSpacePct / FAS_MIN);
}

export interface KineticFactors {
  temperature: number;
  moisture: number;
  oxygen: number;
  cn: number;
  freeAirSpace: number;
  /** The product of all five; the fraction of the reference rate actually achieved. */
  combined: number;
  /** Which factor is currently costing the most rate. */
  limiting: 'temperature' | 'moisture' | 'oxygen' | 'cn' | 'freeAirSpace';
}

/** Evaluate every rate factor at once and identify the bottleneck. */
export function rateFactors(input: {
  tempC: number;
  moisturePct: number;
  o2Pct: number;
  cnRatio: number;
  freeAirSpacePct: number;
}): KineticFactors {
  const temperature = temperatureFactor(input.tempC);
  const moisture = moistureFactor(input.moisturePct);
  const oxygen = oxygenFactor(input.o2Pct);
  const cn = cnFactor(input.cnRatio);
  const freeAirSpace = fasFactor(input.freeAirSpacePct);

  const entries = [
    ['temperature', temperature],
    ['moisture', moisture],
    ['oxygen', oxygen],
    ['cn', cn],
    ['freeAirSpace', freeAirSpace],
  ] as const;

  let limiting: KineticFactors['limiting'] = 'temperature';
  let lowest = Infinity;
  for (const [name, value] of entries) {
    if (value < lowest) {
      lowest = value;
      limiting = name;
    }
  }

  return {
    temperature,
    moisture,
    oxygen,
    cn,
    freeAirSpace,
    combined: temperature * moisture * oxygen * cn * freeAirSpace,
    limiting,
  };
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
