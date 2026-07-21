import { Shell } from '@/components/layout/Shell';
import { Button } from '@/components/ui/Button';
import { RecipeBuilder } from '@/components/reactor/RecipeBuilder';
import { ConfigPanel } from '@/components/reactor/ConfigPanel';
import { RecipeSolvers } from '@/components/reactor/RecipeSolvers';
import { PlaybackControl } from '@/components/reactor/PlaybackControl';
import { HealthPanel } from '@/components/reactor/HealthPanel';
import { SimulationCharts } from '@/components/charts/SimulationCharts';
import { usePileStore } from '@/state/usePile';
import { useSimulation, usePileState } from '@/lib/useSimulation';

export default function Reactor() {
  const config = usePileStore((s) => s.config);
  const day = usePileStore((s) => s.day);
  const setDay = usePileStore((s) => s.setDay);
  const updateConfig = usePileStore((s) => s.updateConfig);
  const resetConfig = usePileStore((s) => s.resetConfig);

  const result = useSimulation(config);
  const { health } = usePileState(result, day);

  return (
    <Shell title="Reactor">
      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={resetConfig}>
          Reset to default recipe
        </Button>
      </div>

      <PlaybackControl day={day} durationDays={config.durationDays} onDayChange={setDay} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <RecipeBuilder recipe={config.recipe} onChange={(recipe) => updateConfig({ recipe })} />
          <ConfigPanel config={config} onChange={updateConfig} />
          <RecipeSolvers recipe={config.recipe} onApply={(recipe) => updateConfig({ recipe })} />
        </div>
        <HealthPanel health={health} />
      </div>

      <SimulationCharts steps={result.steps} day={day} />
    </Shell>
  );
}
