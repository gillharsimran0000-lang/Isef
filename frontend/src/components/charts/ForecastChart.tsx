import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ForecastPoint } from '@pilengine/simulation-engine';
import { ChartTooltip } from './ChartTooltip';

const METRICS: { key: keyof ForecastPoint; label: string; color: string; unit: string }[] = [
  { key: 'temperatureC', label: 'Temperature', color: 'var(--phase-thermophilic)', unit: '°C' },
  { key: 'moisturePct', label: 'Moisture', color: 'var(--phase-mesophilic)', unit: '%' },
  { key: 'oxygenPct', label: 'Oxygen', color: 'var(--phase-maturation)', unit: '%' },
  { key: 'cnRatio', label: 'C/N', color: 'var(--pastel-yellow-text)', unit: '' },
  { key: 'organicMatterPct', label: 'Organic Matter', color: 'var(--phase-finished)', unit: '%' },
];

export function ForecastChart({ points, xUnit }: { points: ForecastPoint[]; xUnit: 'h' | 'd' }) {
  const [metric, setMetric] = useState(METRICS[0]!);
  const gradientId = `fc-${metric.key}`;
  // `t` on ForecastPoint is always in days; the 24h window expresses that as
  // fractional days (0..1), so it has to be scaled up to hours for display.
  const toDisplay = xUnit === 'h' ? (t: number) => t * 24 : (t: number) => t;
  const data = points.map((p) => ({ t: toDisplay(p.t), value: p[metric.key] as number }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              metric.key === m.key ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-faint)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metric.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v) => `${xUnit === 'h' ? Math.round(v) : v.toFixed(1)}${xUnit}`}
            tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            content={
              <ChartTooltip
                formatter={(v) => `${v.toFixed(1)}${metric.unit}`}
                labelFormatter={(v) => (xUnit === 'h' ? `Hour ${v.toFixed(0)}` : `Day ${v.toFixed(1)}`)}
              />
            }
            cursor={{ stroke: 'var(--border-strong)' }}
          />
          <Area type="monotone" dataKey="value" name={metric.label} stroke={metric.color} strokeWidth={2} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
