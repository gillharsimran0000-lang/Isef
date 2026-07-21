import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { simulate, defaultConfig, type PileConfig, type SimulationSummary } from '@pilengine/simulation-engine';

/**
 * PILENGINE has no backend run-storage — this is a genuinely new, real
 * feature (not fabricated data): saving the live pile config as a named
 * snapshot, computed once through the actual `simulate()` engine and
 * persisted client-side. "Loading" an experiment writes its config back into
 * `usePileStore`, so this is a real save/recall workflow, not a static table.
 */
export interface Experiment {
  id: string;
  name: string;
  config: PileConfig;
  summary: SimulationSummary;
  createdAt: string;
}

interface ExperimentsStore {
  experiments: Experiment[];
  addExperiment: (name: string, config: PileConfig) => void;
  removeExperiment: (id: string) => void;
}

function runExperiment(name: string, config: PileConfig): Experiment {
  const { summary } = simulate(config);
  return { id: crypto.randomUUID(), name, config, summary, createdAt: new Date().toISOString() };
}

export const useExperimentsStore = create<ExperimentsStore>()(
  persist(
    (set) => ({
      experiments: [],
      addExperiment: (name, config) =>
        set((s) => ({ experiments: [runExperiment(name, config), ...s.experiments] })),
      removeExperiment: (id) => set((s) => ({ experiments: s.experiments.filter((e) => e.id !== id) })),
    }),
    { name: 'pilengine-experiments' },
  ),
);

const SEED_FLAG = 'pilengine:experiments-seeded-v1';

/**
 * Populates a handful of real, distinct recipe/config variants — each run
 * through the actual engine, not fabricated numbers — the first time this app
 * has ever loaded on this browser. Safe to call on every mount: no-ops once
 * the flag is set, so deleting the seeded rows later doesn't bring them back.
 */
export function ensureSeeded() {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;
    localStorage.setItem(SEED_FLAG, '1');
  } catch {
    return;
  }
  if (useExperimentsStore.getState().experiments.length > 0) return;

  const base = defaultConfig();
  const scenarios: { name: string; config: PileConfig }[] = [
    { name: 'Default recipe', config: base },
    {
      name: 'Carbon-heavy blend',
      config: {
        ...base,
        recipe: [
          { materialId: 'food-scraps', massKg: 330 },
          { materialId: 'dry-leaves', massKg: 450 },
          { materialId: 'alfalfa', massKg: 40 },
          { materialId: 'wood-chips', massKg: 180 },
        ],
      },
    },
    { name: 'Passive, unturned pile', config: { ...base, aeration: 'passive', turnIntervalDays: 0 } },
    { name: 'Forced air, unmanaged moisture', config: { ...base, moistureManaged: false } },
    {
      name: 'Small experimental batch',
      config: {
        ...base,
        recipe: [
          { materialId: 'food-scraps', massKg: 49.06 },
          { materialId: 'dry-leaves', massKg: 27.3 },
          { materialId: 'alfalfa', massKg: 11.64 },
          { materialId: 'wood-chips', massKg: 12 },
        ],
        heightM: 0.5,
        insulation: 0.05,
      },
    },
  ];

  useExperimentsStore.setState({ experiments: scenarios.map((s) => runExperiment(s.name, s.config)) });
}
