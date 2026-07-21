import type { SimulationStep } from '@pilengine/simulation-engine';
import { Card } from '@/components/ui/Card';
import { StepMetricChart } from './StepMetricChart';
import { MicrobialChart } from './MicrobialChart';

export function SimulationCharts({ steps, day }: { steps: SimulationStep[]; day: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="font-display text-sm font-medium text-[var(--text-secondary)]">Temperature</h3>
        <StepMetricChart steps={steps} metric="temperatureC" name="Temperature" color="var(--phase-thermophilic)" unit="°C" day={day} targetMin={55} targetMax={65} height={200} />
      </Card>
      <Card className="p-5">
        <h3 className="font-display text-sm font-medium text-[var(--text-secondary)]">Moisture</h3>
        <StepMetricChart steps={steps} metric="moisturePct" name="Moisture" color="var(--phase-mesophilic)" unit="%" day={day} targetMin={40} targetMax={65} height={200} />
      </Card>
      <Card className="p-5">
        <h3 className="font-display text-sm font-medium text-[var(--text-secondary)]">C/N Ratio</h3>
        <StepMetricChart steps={steps} metric="cnRatio" name="C/N" color="var(--pastel-yellow-text)" day={day} targetMin={25} targetMax={35} height={200} />
      </Card>
      <Card className="p-5">
        <h3 className="font-display text-sm font-medium text-[var(--text-secondary)]">Interstitial Oxygen</h3>
        <StepMetricChart steps={steps} metric="oxygenPct" name="Oxygen" color="var(--phase-maturation)" unit="%" day={day} targetMin={5} targetMax={21} height={200} />
      </Card>
      <Card className="p-5 lg:col-span-2">
        <h3 className="font-display text-sm font-medium text-[var(--text-secondary)]">Microbial Populations</h3>
        <MicrobialChart steps={steps} day={day} height={220} />
      </Card>
    </div>
  );
}
