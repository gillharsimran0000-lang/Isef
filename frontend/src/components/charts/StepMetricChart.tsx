import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SimulationStep } from '@pilengine/simulation-engine';
import { ChartTooltip } from './ChartTooltip';

interface StepMetricChartProps {
  steps: SimulationStep[];
  metric: keyof SimulationStep;
  name: string;
  color: string;
  unit?: string;
  day?: number;
  targetMin?: number;
  targetMax?: number;
  height?: number;
}

/** A single-series area chart of one metric over the pile's lifecycle. */
export function StepMetricChart({
  steps,
  metric,
  name,
  color,
  unit = '',
  day,
  targetMin,
  targetMax,
  height = 220,
}: StepMetricChartProps) {
  const data = steps.map((s) => ({ t: s.t, value: s[metric] as number }));
  const gradientId = `grad-${metric.toString().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
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
          width={40}
          tickFormatter={(v) => `${v}${unit}`}
        />
        {targetMin !== undefined && targetMax !== undefined && (
          <>
            <ReferenceLine y={targetMin} stroke="var(--text-faint)" strokeDasharray="4 4" />
            <ReferenceLine y={targetMax} stroke="var(--text-faint)" strokeDasharray="4 4" />
          </>
        )}
        {day !== undefined && <ReferenceLine x={day} stroke="var(--color-accent)" strokeWidth={1.5} />}
        <Tooltip
          content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}${unit}`} />}
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          name={name}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
