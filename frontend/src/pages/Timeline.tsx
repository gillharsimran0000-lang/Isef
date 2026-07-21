import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { PhaseTimelineChart, phaseBands } from '@/components/charts/PhaseTimelineChart';
import { usePileStore } from '@/state/usePile';
import { useSimulation } from '@/lib/useSimulation';
import { PHASE_LABEL, PHASE_VAR } from '@/lib/format';

const PHASE_DESCRIPTION: Record<string, string> = {
  mesophilic: 'Moderate-temperature bacteria consume simple sugars and starches, releasing heat that drives the pile toward the thermophilic range.',
  thermophilic: 'Heat-loving bacteria dominate above 40 °C, degrading proteins and fats quickly enough to sustain temperatures that destroy pathogens.',
  cooling: 'As easily degraded substrate runs out, biological heat production falls below losses and core temperature declines.',
  maturation: 'Actinomycetes and fungi break down cellulose and lignin; the C/N ratio stabilises toward a mature ~12:1.',
  finished: 'The pile has stabilised: minimal further mass loss, temperature at ambient, C/N and moisture settled.',
};

export default function Timeline() {
  const config = usePileStore((s) => s.config);
  const day = usePileStore((s) => s.day);
  const result = useSimulation(config);
  const bands = phaseBands(result.steps);
  const { summary } = result;

  return (
    <Shell title="Timeline">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Peak Temperature" value={`${summary.peakTemperatureC.toFixed(1)}°C`} detail={`Day ${summary.peakTemperatureDay.toFixed(1)}`} />
        <StatTile label="Days ≥ 55°C" value={summary.daysAbove55.toFixed(1)} detail="PFRP pathogen-kill threshold" />
        <StatTile label="Days ≥ 65°C" value={summary.daysAbove65.toFixed(1)} detail="Self-inhibition ceiling" />
        <StatTile label="Maturity" value={`Day ${summary.maturityDay.toFixed(0)}`} detail={`${summary.massLossPct.toFixed(1)}% mass loss`} />
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-sm font-medium text-[var(--text-secondary)]">All Curves, One Time Axis</h2>
        <p className="mt-1 text-xs text-[var(--text-faint)]">
          Temperature, moisture, oxygen and organic matter, each normalised to its own scale, against phase bands.
        </p>
        <div className="mt-3">
          <PhaseTimelineChart steps={result.steps} day={day} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bands.map((b, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PHASE_VAR[b.phase] }} />
              <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">{PHASE_LABEL[b.phase] ?? b.phase}</h3>
            </div>
            <p className="mt-1 font-mono text-xs text-[var(--text-faint)]">
              Day {b.from.toFixed(1)} – {b.to.toFixed(1)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{PHASE_DESCRIPTION[b.phase]}</p>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
