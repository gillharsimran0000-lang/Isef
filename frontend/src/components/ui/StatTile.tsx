import type { ReactNode } from 'react';
import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import { Card } from './Card';

interface StatTileProps {
  label: string;
  value: string;
  detail?: string;
  tone?: 'nominal' | 'warn' | 'critical' | 'neutral';
  icon?: ReactNode;
  /** Change vs. the previous day, purely directional — not a good/bad judgement. */
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
}

const TONE_VAR: Record<NonNullable<StatTileProps['tone']>, string> = {
  nominal: 'var(--status-nominal-text)',
  warn: 'var(--status-warn-text)',
  critical: 'var(--status-critical-text)',
  neutral: 'var(--text-primary)',
};

const TREND_ICON = { up: TrendUp, down: TrendDown, flat: Minus };

export function StatTile({ label, value, detail, tone = 'neutral', icon, trend }: StatTileProps) {
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
        {icon && <span className="text-[var(--text-faint)]">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className="font-display text-3xl font-semibold tracking-tight tabular-nums"
          style={{ color: TONE_VAR[tone] }}
        >
          {value}
        </span>
        {trend && TrendIcon && (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--text-faint)]">
            <TrendIcon size={12} weight="bold" />
            {trend.value}
          </span>
        )}
      </div>
      {detail && <div className="mt-1.5 text-sm text-[var(--text-faint)]">{detail}</div>}
    </Card>
  );
}
