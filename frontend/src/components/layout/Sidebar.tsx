import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CaretLineLeft, CaretLineRight } from '@phosphor-icons/react';
import { NAV_ITEMS } from '@/lib/nav';
import { Logo } from '@/components/ui/Logo';

const STORAGE_KEY = 'pilengine:sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // localStorage unavailable (private browsing, etc.) — collapse state just won't persist.
    }
  }, [collapsed]);

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] transition-[width] duration-200 ease-out-strong md:flex ${
        collapsed ? 'md:w-[68px]' : 'md:w-60'
      }`}
    >
      <div className={`flex items-center gap-2.5 px-5 py-5 ${collapsed ? 'justify-center px-0' : ''}`}>
        <Logo size={20} />
        {!collapsed && (
          <span className="font-display text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
            PILENGINE
          </span>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              }`
            }
          >
            <Icon size={18} weight="bold" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`flex items-center gap-2 border-t border-[var(--border)] px-5 py-3 text-[var(--text-faint)] transition-colors duration-150 hover:text-[var(--text-secondary)] ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        {collapsed ? <CaretLineRight size={16} /> : <CaretLineLeft size={16} />}
        {!collapsed && <span className="text-xs">Collapse</span>}
      </button>
      {!collapsed && (
        <div className="border-t border-[var(--border)] px-5 py-4 text-xs text-[var(--text-faint)]">
          Scientific Compost Intelligence
        </div>
      )}
    </aside>
  );
}
