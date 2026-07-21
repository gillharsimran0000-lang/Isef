import type { TooltipProps } from 'recharts';

export function ChartTooltip({ active, payload, label, formatter, labelFormatter }: TooltipProps<number, string> & {
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs shadow-none">
      <div className="mb-1 font-mono text-[var(--text-faint)]">
        {labelFormatter ? labelFormatter(Number(label)) : `Day ${Number(label).toFixed(1)}`}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--text-secondary)]">{p.name}</span>
          <span className="ml-auto font-mono tabular-nums text-[var(--text-primary)]">
            {formatter ? formatter(p.value as number, p.name as string) : (p.value as number).toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}
