import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SimulationStep } from '@pilengine/simulation-engine';
import { GUILDS } from '@pilengine/simulation-engine';
import { ChartTooltip } from './ChartTooltip';

const GUILD_COLOR: Record<string, string> = {
  mesophilicBacteria: 'var(--guild-meso)',
  thermophilicBacteria: 'var(--guild-thermo)',
  actinomycetes: 'var(--guild-actino)',
  fungi: 'var(--guild-fungi)',
};

export function MicrobialChart({ steps, day, height = 240 }: { steps: SimulationStep[]; day?: number; height?: number }) {
  const data = steps.map((s) => ({
    t: s.t,
    mesophilicBacteria: s.microbes.mesophilicBacteria,
    thermophilicBacteria: s.microbes.thermophilicBacteria,
    actinomycetes: s.microbes.actinomycetes,
    fungi: s.microbes.fungi,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(v) => `${Math.round(v)}`}
          tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={32}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
        />
        {day !== undefined && <ReferenceLine x={day} stroke="var(--color-accent)" strokeWidth={1.5} />}
        <Tooltip content={<ChartTooltip formatter={(v) => `${(v * 100).toFixed(0)}%`} />} cursor={{ stroke: 'var(--border-strong)' }} />
        {GUILDS.map((g) => (
          <Line
            key={g.key}
            type="monotone"
            dataKey={g.key}
            name={g.name}
            stroke={GUILD_COLOR[g.key]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
