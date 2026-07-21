import { useEffect } from 'react';
import { Thermometer, Drop, TestTube, Bug, Wind, Gauge, Leaf } from '@phosphor-icons/react';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { PhasePill } from '@/components/ui/PhasePill';
import { AdvisoryList } from '@/components/ui/AdvisoryList';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { ExperimentsTable } from '@/components/experiments/ExperimentsTable';
import { usePileStore } from '@/state/usePile';
import { useSimulation, usePileState } from '@/lib/useSimulation';
import { fmtCn, fmtPct, fmtTemp, scoreTone } from '@/lib/format';
import { shannonDiversity, GUILDS } from '@pilengine/simulation-engine';

function trendOf(curr: number, prev: number): { value: string; direction: 'up' | 'down' | 'flat' } {
  const delta = curr - prev;
  if (Math.abs(delta) < 0.05) return { value: '±0.0', direction: 'flat' };
  return { value: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`, direction: delta > 0 ? 'up' : 'down' };
}

export default function Dashboard() {
  const config = usePileStore((s) => s.config);
  const day = usePileStore((s) => s.day);
  const setDay = usePileStore((s) => s.setDay);
  const result = useSimulation(config);
  const { step, health } = usePileState(result, day);
  const { step: prevStep, health: prevHealth } = usePileState(result, Math.max(0, day - 1));

  useEffect(() => {
    if (window.location.hash === '#advisories') {
      document.getElementById('advisories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const diversity = shannonDiversity(step.microbes);
  const dominant = GUILDS.reduce((a, b) => (step.microbes[b.key] > step.microbes[a.key] ? b : a));

  const nitrogenRetentionPct = (step.nitrogenKg / Math.max(result.initial.nitrogenKg, 1e-9)) * 100;
  const prevNitrogenRetentionPct = (prevStep.nitrogenKg / Math.max(result.initial.nitrogenKg, 1e-9)) * 100;

  return (
    <Shell title="Dashboard">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-display text-sm font-medium text-[var(--text-secondary)]">Pile state</span>
              <PhasePill phase={step.phase} />
            </div>
            <p className="mt-1 text-xs text-[var(--text-faint)]">{health.label}</p>
          </div>
          <span className="font-mono text-xs text-[var(--text-faint)]">
            {config.recipe.length} feedstocks · {config.aeration} aeration
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={config.durationDays}
          step={0.1}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="mt-5 w-full accent-[var(--color-accent)]"
          aria-label="Day"
        />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-[var(--text-faint)]">
          <span>Day 0</span>
          <span className="text-[var(--text-primary)]">Day {day.toFixed(1)}</span>
          <span>Day {config.durationDays}</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Compost Health Score"
          value={health.total.toFixed(0)}
          detail={health.label}
          tone={scoreTone(health.total)}
          icon={<Gauge size={18} />}
          trend={trendOf(health.total, prevHealth.total)}
        />
        <StatTile
          label="Temperature"
          value={fmtTemp(step.temperatureC)}
          detail={`Score ${health.temperature.toFixed(0)}/100`}
          tone={scoreTone(health.temperature)}
          icon={<Thermometer size={18} />}
          trend={trendOf(step.temperatureC, prevStep.temperatureC)}
        />
        <StatTile
          label="Moisture"
          value={fmtPct(step.moisturePct)}
          detail={`Score ${health.moisture.toFixed(0)}/100`}
          tone={scoreTone(health.moisture)}
          icon={<Drop size={18} />}
          trend={trendOf(step.moisturePct, prevStep.moisturePct)}
        />
        <StatTile
          label="Nitrogen Retention"
          value={fmtPct(nitrogenRetentionPct, 1)}
          detail="Of starting nitrogen mass"
          tone={scoreTone(nitrogenRetentionPct)}
          icon={<Leaf size={18} />}
          trend={trendOf(nitrogenRetentionPct, prevNitrogenRetentionPct)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile
          label="C/N Ratio"
          value={fmtCn(step.cnRatio)}
          detail={`Score ${health.cn.toFixed(0)}/100`}
          tone={scoreTone(health.cn)}
          icon={<TestTube size={18} />}
        />
        <StatTile
          label="Microbial Ecosystem"
          value={dominant.name}
          detail={`Diversity ${diversity.toFixed(2)}`}
          tone="neutral"
          icon={<Bug size={18} />}
        />
        <StatTile
          label="Interstitial Oxygen"
          value={fmtPct(step.oxygenPct, 1)}
          detail={`Score ${health.oxygen.toFixed(0)}/100`}
          tone={scoreTone(health.oxygen)}
          icon={<Wind size={18} />}
        />
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-sm font-medium text-[var(--text-secondary)]">Metrics over time</h2>
        <div className="mt-3">
          <TimeSeriesChart steps={result.steps} day={day} />
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-sm font-medium text-[var(--text-secondary)]">Experiments</h2>
        <ExperimentsTable />
      </div>

      <div id="advisories">
        <h2 className="mb-3 font-display text-sm font-medium text-[var(--text-secondary)]">Advisories</h2>
        <AdvisoryList advisories={health.advisories} />
      </div>
    </Shell>
  );
}
