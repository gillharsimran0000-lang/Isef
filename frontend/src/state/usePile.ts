import { create } from 'zustand';
import { defaultConfig, type PileConfig } from '@pilengine/simulation-engine';

/**
 * The single reactor PILENGINE simulates. One config, shared by every page,
 * so editing the recipe on the Reactor page is immediately reflected on
 * Dashboard/Predictions/Timeline; there is no fleet of demo reactors.
 */
interface PileStore {
  config: PileConfig;
  day: number;
  setConfig: (config: PileConfig) => void;
  updateConfig: (patch: Partial<PileConfig>) => void;
  setDay: (day: number) => void;
  resetConfig: () => void;
}

export const usePileStore = create<PileStore>((set) => ({
  config: defaultConfig(),
  day: 5,
  setConfig: (config) => set({ config }),
  updateConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  setDay: (day) => set({ day }),
  resetConfig: () => set({ config: defaultConfig() }),
}));
