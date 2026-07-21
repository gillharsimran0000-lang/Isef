import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { MATERIALS } from '@pilengine/simulation-engine';
import { NAV_ITEMS } from '@/lib/nav';

interface Result {
  key: string;
  label: string;
  detail: string;
  to: string;
  icon: (typeof NAV_ITEMS)[number]['icon'];
}

/**
 * Jumps to real destinations only: the five app pages and the 24-material
 * database (Science page). There is nothing else in PILENGINE to search.
 */
export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const q = query.trim().toLowerCase();
  const pageResults: Result[] = NAV_ITEMS.filter((n) => !q || n.label.toLowerCase().includes(q)).map((n) => ({
    key: `page-${n.to}`,
    label: n.label,
    detail: 'Page',
    to: n.to,
    icon: n.icon,
  }));
  const materialResults: Result[] = q
    ? MATERIALS.filter((m) => m.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map((m) => ({
          key: `material-${m.id}`,
          label: m.name,
          detail: 'Material · Science',
          to: '/science',
          icon: NAV_ITEMS.find((n) => n.to === '/science')!.icon,
        }))
    : [];
  const results = [...pageResults, ...materialResults].slice(0, 8);

  function go(to: string) {
    navigate(to);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5">
        <MagnifyingGlass size={14} className="text-[var(--text-faint)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search pages & materials"
          className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-1 shadow-none">
          {results.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => go(r.to)}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-well)] hover:text-[var(--text-primary)]"
            >
              <r.icon size={15} weight="bold" className="shrink-0 text-[var(--text-faint)]" />
              <span className="min-w-0 flex-1 truncate">{r.label}</span>
              <span className="shrink-0 text-xs text-[var(--text-faint)]">{r.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
