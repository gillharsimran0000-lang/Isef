import { useMemo, useState } from 'react';
import { CaretUp, CaretDown } from '@phosphor-icons/react';
import { MATERIALS, materialCn, type Material, type MaterialCategory } from '@pilengine/simulation-engine';

const CATEGORY_LABEL: Record<MaterialCategory, string> = {
  carbon: 'Carbon',
  nitrogen: 'Nitrogen',
  bulking: 'Bulking',
  amendment: 'Amendment',
};

type SortKey = 'name' | 'category' | 'cn' | 'moisturePct' | 'bulkDensity';

function sortValue(m: Material, key: SortKey): string | number {
  if (key === 'cn') return Number.isFinite(materialCn(m)) ? materialCn(m) : Infinity;
  if (key === 'category') return m.category;
  return m[key as keyof Material] as string | number;
}

export function MaterialTable() {
  const [category, setCategory] = useState<MaterialCategory | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [asc, setAsc] = useState(true);

  const rows = useMemo(() => {
    const filtered = category === 'all' ? MATERIALS : MATERIALS.filter((m) => m.category === category);
    return [...filtered].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return asc ? cmp : -cmp;
    });
  }, [category, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((a) => !a);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  const header = (key: SortKey, label: string) => (
    <th
      className="cursor-pointer select-none px-3 py-2 text-left font-medium text-[var(--text-faint)] transition-colors hover:text-[var(--text-secondary)]"
      onClick={() => toggleSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === key && (asc ? <CaretUp size={11} /> : <CaretDown size={11} />)}
      </span>
    </th>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        {(['all', 'carbon', 'nitrogen', 'bulking', 'amendment'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              category === c ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-faint)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {c === 'all' ? 'All' : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-well)]">
              {header('name', 'Material')}
              {header('category', 'Category')}
              {header('cn', 'C/N')}
              {header('moisturePct', 'Moisture')}
              {header('bulkDensity', 'Bulk Density')}
              <th className="px-3 py-2 text-left font-medium text-[var(--text-faint)]">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const cn = materialCn(m);
              return (
                <tr key={m.id} className="border-b border-[var(--border)] transition-colors duration-150 last:border-0 hover:bg-[var(--bg-well)]">
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{m.name}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{CATEGORY_LABEL[m.category]}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-[var(--text-secondary)]">
                    {Number.isFinite(cn) ? `${cn.toFixed(0)}:1` : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-[var(--text-secondary)]">{m.moisturePct}%</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-[var(--text-secondary)]">{m.bulkDensity} kg/m³</td>
                  <td className="px-3 py-2 text-xs text-[var(--text-faint)]">{m.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
