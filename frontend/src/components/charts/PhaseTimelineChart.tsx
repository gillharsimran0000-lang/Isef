import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SimulationStep } from '@pilengine/simulation-engine';
import { PHASE_VAR } from '@/lib/format';
import { ChartTooltip } from './ChartTooltip';

interface Series {
  key: 'temperatureC' | 'moisturePct' | 'oxygenPct' | 'organicMatterPct';
  name: string;
  color: string;
  /** Divide raw value by this to normalise onto a shared 0-1-ish axis. */
  scale: number;
  unit: string;
}

const SERIES: Series[] = [
  { key: 'temperatureC', name: 'Temperature', color: 'var(--phase-thermophilic)', scale: 80, unit: '°C' },
  { key: 'moisturePct', name: 'Moisture', color: 'var(--phase-mesophilic)', scale: 100, unit: '%' },
  { key: 'oxygenPct', name: 'Oxygen', color: 'var(--phase-maturation)', scale: 21, unit: '%' },
  { key: 'organicMatterPct', name: 'Organic Matter', color: 'var(--phase-finished)', scale: 100, unit: '%' },
];

/** Contiguous runs of a constant phase, as [startDay, endDay] bands. */
export function phaseBands(steps: SimulationStep[]): { phase: string; from: number; to: number }[] {
  if (steps.length === 0) return [];
  const bands: { phase: string; from: number; to: number }[] = [];
  let current = steps[0]!.phase;
  let from = steps[0]!.t;
  for (const s of steps) {
    if (s.phase !== current) {
      bands.push({ phase: current, from, to: s.t });
      current = s.phase;
      from = s.t;
    }
  }
  bands.push({ phase: current, from, to: steps[steps.length - 1]!.t });
  return bands;
}

export function PhaseTimelineChart({ steps, day, height = 340 }: { steps: SimulationStep[]; day?: number; height?: number }) {
  const data = steps.map((s) => ({
    t: s.t,
    temperatureC: s.temperatureC / 80,
    moisturePct: s.moisturePct / 100,
    oxygenPct: s.oxygenPct / 21,
    organicMatterPct: s.organicMatterPct / 100,
    raw: s,
  }));
  const bands = phaseBands(steps);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        {bands.map((b, i) => (
          <ReferenceArea
            key={i}
            x1={b.from}
            x2={b.to}
            fill={PHASE_VAR[b.phase] ?? 'transparent'}
            fillOpacity={0.06}
            stroke="none"
          />
        ))}
        <XAxis
          dataKey="t"
          tickFormatter={(v) => `${Math.round(v)}`}
          tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis domain={[0, 1.05]} hide />
        {day !== undefined && <ReferenceLine x={day} stroke="var(--color-accent)" strokeWidth={1.5} />}
        <Tooltip
          content={
            <ChartTooltip
              formatter={(v, name) => {
                const s = SERIES.find((s) => s.name === name);
                return s ? `${(v * s.scale).toFixed(1)}${s.unit}` : v.toFixed(2);
              }}
            />
          }
          cursor={{ stroke: 'var(--border-strong)' }}
        />
        {SERIES.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
