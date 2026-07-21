import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/lib/nav';

export function MobileTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur md:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              isActive ? 'text-[var(--color-accent)]' : 'text-[var(--text-faint)]'
            }`
          }
        >
          <Icon size={20} weight="bold" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
