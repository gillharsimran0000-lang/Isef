import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { ExponentialFitChart } from '@/components/charts/ExponentialFitChart';
import { usePileStore } from '@/state/usePile';
import { useSimulation, useForecast } from '@/lib/useSimulation';
import { fmtCn, fmtDate, fmtPct, fmtTemp } from '@/lib/format';

export default function Predictions() {
  const config = usePileStore((s) => s.config);
  const result = useSimulation(config);
  const forecast = useForecast(config);
  const { outcome } = forecast;

  return (
    <Shell title="Predictions">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-medium text-[var(--text-secondary)]">Forecast Outcome</h2>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              backgroundColor: outcome.pathogenReduction ? 'var(--pastel-green-bg)' : 'var(--pastel-red-bg)',
              color: outcome.pathogenReduction ? 'var(--pastel-green-text)' : 'var(--pastel-red-text)',
            }}
          >
            {outcome.pathogenReduction ? <CheckCircle size={14} weight="bold" /> : <XCircle size={14} weight="bold" />}
            {outcome.pathogenReduction ? 'Meets PFRP pathogen reduction' : 'Does not meet PFRP'}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Matures around <span className="font-medium text-[var(--text-primary)]">day {outcome.completionDay.toFixed(0)}</span> (
          {fmtDate(outcome.completionDate)}), finishing at{' '}
          <span className="font-medium text-[var(--text-primary)]">{fmtCn(outcome.finalCn)}</span> and{' '}
          {fmtPct(outcome.finalMoisturePct)} moisture.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Peak Temperature" value={fmtTemp(outcome.peakTemperatureC)} detail={`Day ${outcome.peakTemperatureDay.toFixed(1)}`} />
        <StatTile label="Quality Score" value={outcome.qualityScore.toFixed(0)} detail="0–100 composite" tone={outcome.qualityScore >= 70 ? 'nominal' : 'warn'} />
        <StatTile label="Microbial Diversity" value={outcome.microbialDiversity.toFixed(2)} detail="Shannon index, integrated" />
        <StatTile label="Mass Loss" value={fmtPct(outcome.massLossPct)} detail="Total dry-mass reduction" />
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-sm font-medium text-[var(--text-secondary)]">Next 24 Hours</h2>
        <ForecastChart points={forecast.next24h} xUnit="h" />
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-sm font-medium text-[var(--text-secondary)]">Next 7 Days</h2>
        <ForecastChart points={forecast.next7d} xUnit="d" />
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-sm font-medium text-[var(--text-secondary)]">Full Lifecycle</h2>
        <ForecastChart points={forecast.lifecycle} xUnit="d" />
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-sm font-medium text-[var(--text-secondary)]">Mechanistic vs. First-Order Decay</h2>
        <p className="mt-1 text-xs text-[var(--text-faint)]">
          A textbook single-exponential fit overlaid on the coupled simulation. Where they diverge is where the
          biology is doing something a constant-rate model cannot see.
        </p>
        <div className="mt-3">
          <ExponentialFitChart steps={result.steps} fit={forecast.exponentialFit} />
        </div>
      </Card>
    </Shell>
  );
}
