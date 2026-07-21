import type { HealthScore } from '@pilengine/simulation-engine';
import { Card } from '@/components/ui/Card';
import { AdvisoryList } from '@/components/ui/AdvisoryList';

function scoreColor(v: number): string {
  if (v >= 70) return 'var(--status-nominal-text)';
  if (v >= 45) return 'var(--status-warn-text)';
  return 'var(--status-critical-text)';
}

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-[var(--text-faint)]">
        <span>{label}</span>
        <span className="font-mono text-[var(--text-secondary)]">{value.toFixed(0)}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[var(--bg-well)]">
        <div className="h-1.5 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: scoreColor(value) }} />
      </div>
    </div>
  );
}

export function HealthPanel({ health }: { health: HealthScore }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-medium text-[var(--text-secondary)]">Compost Intelligence Score</h2>
          <span className="font-display text-3xl font-semibold tabular-nums" style={{ color: scoreColor(health.total) }}>
            {health.total.toFixed(0)}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{health.label}</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <SubScore label="Temperature" value={health.temperature} />
          <SubScore label="Moisture" value={health.moisture} />
          <SubScore label="C/N Ratio" value={health.cn} />
          <SubScore label="Oxygen" value={health.oxygen} />
        </div>
      </Card>
      <AdvisoryList advisories={health.advisories} />
    </div>
  );
}
