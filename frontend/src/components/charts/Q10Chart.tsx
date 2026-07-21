import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { q10Sweep, temperatureFactor } from '@pilengine/simulation-engine';
import { ChartTooltip } from './ChartTooltip';

/** Overlays the pure-Q10 rate against the model's actual (Haug) thermal-inactivation factor, both normalised to 0..1. */
export function Q10Chart({ q10, height = 240 }: { q10: number; height?: number }) {
  const sweep = q10Sweep(q10);
  const peak = Math.max(...sweep.map((p) => p.rate));
  const data = sweep.map((p) => ({
    tempC: p.tempC,
    q10Rate: p.rate / peak,
    actualFactor: temperatureFactor(p.tempC),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="tempC"
          tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          label={{ value: '°C', position: 'insideBottomRight', offset: -4, fill: 'var(--text-faint)', fontSize: 11 }}
        />
        <YAxis domain={[0, 1.05]} tick={{ fill: 'var(--text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip content={<ChartTooltip formatter={(v) => v.toFixed(2)} />} cursor={{ stroke: 'var(--border-strong)' }} />
        <Line type="monotone" dataKey="q10Rate" name="Q10 (unbounded)" stroke="var(--text-faint)" strokeDasharray="4 4" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="actualFactor" name="Actual (thermal inactivation)" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
