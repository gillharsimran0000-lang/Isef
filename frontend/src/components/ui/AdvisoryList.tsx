import type { Advisory } from '@pilengine/simulation-engine';
import { SEVERITY_TOKENS } from '@/lib/format';
import { Card } from './Card';

const SEVERITY_LABEL: Record<Advisory['severity'], string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
  good: 'Good',
};

export function AdvisoryList({ advisories }: { advisories: Advisory[] }) {
  return (
    <div className="flex flex-col gap-3">
      {advisories.map((a, i) => {
        const t = SEVERITY_TOKENS[a.severity];
        return (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ backgroundColor: t.bg, color: t.text }}
              >
                {SEVERITY_LABEL[a.severity]}
              </span>
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{a.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{a.detail}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
