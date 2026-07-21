import { useMemo, useState } from 'react';
import { Area, AreaChart, Brush, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SimulationStep } from '@pilengine/simulation-engine';
import { ChartTooltip } from './ChartTooltip';

const METRICS: { key: keyof SimulationStep; label: string; color: string; unit: string }[] = [
  { key: 'temperatureC', label: 'Temperature', color: 'var(--phase-thermophilic)', unit: '°C' },
  { key: 'moisturePct', label: 'Moisture', color: 'var(--phase-mesophilic)', unit: '%' },
  { key: 'oxygenPct', label: 'Oxygen', color: 'var(--phase-maturation)', unit: '%' },
  { key: 'cnRatio', label: 'C/N', color: 'var(--pastel-yellow-text)', unit: '' },
];

/**
 * PILENGINE has no wall-clock time — the whole lifecycle is precomputed at
 * once. These labels are the closest honest translation of a real-time range
 * toggle onto a day-indexed series: each window ends at the current scrubbed
 * day (the day scrubber above this chart is "now"), except "All" which always
 * shows the full precomputed run.
 */
const RANGES: { key: string; label: string; days: number }[] = [
  { key: '1d', label: '1D', days: 1 },
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: 'all', label: 'All', days: Infinity },
];

function pillClass(active: boolean) {
  return `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
    active ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-faint)] hover:text-[var(--text-secondary)]'
  }`;
}

export function TimeSeriesChart({ steps, day }: { steps: SimulationStep[]; day: number }) {
  const [metric, setMetric] = useState(METRICS[0]!);
  const [range, setRange] = useState(RANGES[3]!);

  const windowed = useMemo(() => {
    if (range.days === Infinity) return steps;
    const start = Math.max(0, day - range.days);
    return steps.filter((s) => s.t >= start - 1e-6 && s.t <= day + 1e-6);
  }, [steps, day, range]);

  const data = useMemo(() => windowed.map((s) => ({ t: s.t, value: s[metric.key] as number })), [windowed, metric]);
  const gradientId = `ts-${metric.key}`;
  const targetBand = metric.key === 'temperatureC' ? { min: 55, max: 65 } : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {METRICS.map((m) => (
            <button key={m.key} type="button" onClick={() => setMetric(m)} className={pillClass(metric.key === m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button key={r.key} type="button" onClick={() => setRange(r)} className={pillClass(range.key === r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metric.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v) => `${Math.round(v)}`}
            tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            label={{ value: 'Day', position: 'insideBottomRight', offset: -4, fill: 'var(--text-faint)', fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v) => `${v}${metric.unit}`}
          />
          {targetBand && (
            <>
              <ReferenceLine y={targetBand.min} stroke="var(--text-faint)" strokeDasharray="4 4" />
              <ReferenceLine y={targetBand.max} stroke="var(--text-faint)" strokeDasharray="4 4" />
            </>
          )}
          <ReferenceLine x={day} stroke="var(--color-accent)" strokeWidth={1.5} />
          <Tooltip
            content={
              <ChartTooltip
                formatter={(v) => `${v.toFixed(1)}${metric.unit}`}
                labelFormatter={(v) => `Day ${v.toFixed(1)}`}
              />
            }
            cursor={{ stroke: 'var(--border-strong)' }}
          />
          <Area type="monotone" dataKey="value" name={metric.label} stroke={metric.color} strokeWidth={2} fill={`url(#${gradientId})`} />
          {data.length > 20 && (
            <Brush
              dataKey="t"
              height={24}
              travellerWidth={8}
              stroke="var(--border-strong)"
              fill="var(--bg-well)"
              tickFormatter={(v) => `${Math.round(v as number)}`}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
