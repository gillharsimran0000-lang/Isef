import { PHASE_LABEL, PHASE_VAR } from '@/lib/format';

export function PhasePill({ phase }: { phase: string }) {
  const color = PHASE_VAR[phase] ?? 'var(--text-secondary)';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-pixel-circle text-xs uppercase tracking-wide"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {PHASE_LABEL[phase] ?? phase}
    </span>
  );
}
