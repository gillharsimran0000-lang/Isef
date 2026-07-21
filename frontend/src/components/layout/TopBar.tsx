import { useLocation, useNavigate } from 'react-router-dom';
import { Bell } from '@phosphor-icons/react';
import { usePileStore } from '@/state/usePile';
import { useSimulation, usePileState } from '@/lib/useSimulation';
import { GlobalSearch } from './GlobalSearch';

export function TopBar({ title }: { title: string }) {
  const config = usePileStore((s) => s.config);
  const day = usePileStore((s) => s.day);
  const duration = config.durationDays;
  const result = useSimulation(config);
  const { health } = usePileState(result, day);
  const navigate = useNavigate();
  const location = useLocation();

  const alertCount = health.advisories.filter((a) => a.severity === 'critical' || a.severity === 'warning').length;

  function openAdvisories() {
    if (location.pathname === '/dashboard') {
      document.getElementById('advisories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/dashboard#advisories');
    }
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-base)]/80 px-5 py-4 backdrop-blur-md sm:px-8">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
        <p className="mt-0.5 text-xs text-[var(--text-faint)]">
          Day {day.toFixed(1)} of {duration}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <GlobalSearch />
        </div>
        <button
          type="button"
          onClick={openAdvisories}
          aria-label={alertCount > 0 ? `${alertCount} open advisories` : 'Advisories'}
          title="Advisories"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <Bell size={18} weight="bold" />
          {alertCount > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[var(--status-critical-text)] px-[3px] text-[9px] font-semibold text-[var(--bg-base)]">
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
