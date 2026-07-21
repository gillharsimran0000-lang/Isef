import { Fragment, useEffect, useMemo, useState } from 'react';
import { CaretUp, CaretDown, CaretRight, UploadSimple, Trash } from '@phosphor-icons/react';
import { getMaterial } from '@pilengine/simulation-engine';
import { usePileStore } from '@/state/usePile';
import { useExperimentsStore, ensureSeeded, type Experiment } from '@/state/useExperiments';
import { fmtTemp, fmtCn, fmtPct, fmtMass, scoreTone, TONE_TOKENS } from '@/lib/format';
import { Button } from '@/components/ui/Button';

type SortKey = 'name' | 'quality' | 'peakTemp' | 'cn' | 'massLoss' | 'createdAt';
type StatusFilter = 'all' | 'nominal' | 'warn' | 'critical';

const PAGE_SIZE = 5;
const STATUS_LABEL: Record<'nominal' | 'warn' | 'critical', string> = {
  nominal: 'Nominal',
  warn: 'Warning',
  critical: 'Critical',
};

function sortValue(e: Experiment, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return e.name;
    case 'quality':
      return e.summary.qualityScore;
    case 'peakTemp':
      return e.summary.peakTemperatureC;
    case 'cn':
      return Number.isFinite(e.summary.finalCn) ? e.summary.finalCn : Infinity;
    case 'massLoss':
      return e.summary.massLossPct;
    case 'createdAt':
      return e.createdAt;
  }
}

export function ExperimentsTable() {
  const experiments = useExperimentsStore((s) => s.experiments);
  const addExperiment = useExperimentsStore((s) => s.addExperiment);
  const removeExperiment = useExperimentsStore((s) => s.removeExperiment);
  const currentConfig = usePileStore((s) => s.config);
  const setConfig = usePileStore((s) => s.setConfig);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [name, setName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    ensureSeeded();
  }, []);

  const rows = useMemo(() => {
    const filtered = status === 'all' ? experiments : experiments.filter((e) => scoreTone(e.summary.qualityScore) === status);
    return [...filtered].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return asc ? cmp : -cmp;
    });
  }, [experiments, status, sortKey, asc]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((a) => !a);
    else {
      setSortKey(key);
      setAsc(false);
    }
    setPage(0);
  }

  function handleSave() {
    addExperiment(name.trim() || 'Untitled experiment', currentConfig);
    setName('');
    setPage(0);
  }

  const header = (key: SortKey, label: string) => (
    <th
      className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left font-medium text-[var(--text-faint)] transition-colors hover:text-[var(--text-secondary)]"
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {(['all', 'nominal', 'warn', 'critical'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(0);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                status === s ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-faint)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this recipe…"
            className="h-8 w-40 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none sm:w-52"
          />
          <Button size="sm" variant="secondary" onClick={handleSave}>
            Save current pile
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-well)]">
              <th className="w-8 px-2 py-2" aria-hidden="true" />
              {header('name', 'Experiment')}
              <th className="px-3 py-2 text-left font-medium text-[var(--text-faint)]">Status</th>
              {header('quality', 'Quality')}
              {header('peakTemp', 'Peak Temp')}
              {header('cn', 'Final C/N')}
              {header('massLoss', 'Mass Loss')}
              {header('createdAt', 'Saved')}
              <th className="px-3 py-2 text-left font-medium text-[var(--text-faint)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-[var(--text-faint)]">
                  No experiments saved yet.
                </td>
              </tr>
            )}
            {pageRows.map((e) => {
              const tone = scoreTone(e.summary.qualityScore);
              const t = TONE_TOKENS[tone];
              const expanded = expandedId === e.id;
              return (
                <Fragment key={e.id}>
                  <tr
                    className="cursor-pointer border-b border-[var(--border)] transition-colors duration-150 last:border-0 hover:bg-[var(--bg-well)]"
                    onClick={() => setExpandedId(expanded ? null : e.id)}
                  >
                    <td className="px-2 py-2 text-[var(--text-faint)]">
                      {expanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
                    </td>
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{e.name}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                        style={{ backgroundColor: t.bg, color: t.text }}
                      >
                        {STATUS_LABEL[tone]}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-[var(--text-secondary)]">{e.summary.qualityScore.toFixed(0)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-[var(--text-secondary)]">{fmtTemp(e.summary.peakTemperatureC)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-[var(--text-secondary)]">{fmtCn(e.summary.finalCn)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-[var(--text-secondary)]">{fmtPct(e.summary.massLossPct, 1)}</td>
                    <td className="px-3 py-2 text-xs text-[var(--text-faint)]">
                      {new Date(e.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-3 py-2" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setConfig(e.config)}
                          title="Load into Reactor"
                          aria-label={`Load ${e.name} into the live pile`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                        >
                          <UploadSimple size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExperiment(e.id)}
                          title="Delete"
                          aria-label={`Delete ${e.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--status-critical-text)]"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-well)] last:border-0">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
                          <div>
                            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">Recipe</div>
                            <ul className="flex flex-col gap-1">
                              {e.config.recipe.map((r) => (
                                <li key={r.materialId} className="flex items-center gap-2 text-sm">
                                  <span className="text-[var(--text-secondary)]">{getMaterial(r.materialId)?.name ?? r.materialId}</span>
                                  <span className="font-mono tabular-nums text-xs text-[var(--text-faint)]">{fmtMass(r.massKg)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">Conditions</div>
                            <ul className="flex flex-col gap-1 text-sm text-[var(--text-secondary)]">
                              <li>{e.config.aeration} aeration, turned every {e.config.turnIntervalDays || '—'} days</li>
                              <li>Moisture {e.config.moistureManaged ? 'actively managed' : 'unmanaged'}</li>
                              <li>{e.config.ambientC}°C ambient · {e.config.heightM} m height · {e.config.durationDays}-day run</li>
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-[var(--text-faint)]">
            Page {page + 1} of {pageCount} · {rows.length} experiment{rows.length === 1 ? '' : 's'}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
