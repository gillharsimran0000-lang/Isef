import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SimulationStep, Forecast } from '@pilengine/simulation-engine';
import { ChartTooltip } from './ChartTooltip';

export function ExponentialFitChart({ steps, fit }: { steps: SimulationStep[]; fit: Forecast['exponentialFit'] }) {
  const mechanistic = new Map(steps.map((s) => [Math.round(s.t * 10), s.organicMatterPct]));
  const data = fit.curve.map((c) => ({
    t: c.t,
    exponential: c.pct,
    mechanistic: mechanistic.get(Math.round(c.t * 10)) ?? mechanistic.get(Math.round(c.t * 10) - 1),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="t" tickFormatter={(v) => `${Math.round(v)}`} tick={{ fill: 'var(--text-faint)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />} cursor={{ stroke: 'var(--border-strong)' }} />
        <Line type="monotone" dataKey="mechanistic" name="Mechanistic (PILENGINE)" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="exponential" name={`First-order fit (k=${fit.k.toFixed(3)}/d)`} stroke="var(--text-faint)" strokeDasharray="4 4" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
