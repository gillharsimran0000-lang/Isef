import { useMemo } from 'react';
import {
  simulate,
  forecast,
  healthScore,
  interpolate,
  type PileConfig,
  type SimulationResult,
  type Forecast,
  type SimulationStep,
  type HealthScore,
} from '@pilengine/simulation-engine';

/** Runs the coupled integrator once per config change; ~12,000 steps, cheap arithmetic. */
export function useSimulation(config: PileConfig): SimulationResult {
  return useMemo(() => simulate(config), [config]);
}

export function useForecast(config: PileConfig): Forecast {
  return useMemo(() => forecast(config), [config]);
}

export function usePileState(
  result: SimulationResult,
  day: number,
): { step: SimulationStep; health: HealthScore } {
  return useMemo(() => {
    const step = interpolate(result.steps, day);
    return { step, health: healthScore(step) };
  }, [result, day]);
}
