import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus, Trash } from '@phosphor-icons/react';
import { MATERIALS, cnRatio, mixtureMoisture, getMaterial, type RecipeItem, type MaterialCategory } from '@pilengine/simulation-engine';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fmtCn, fmtMass, fmtPct } from '@/lib/format';

const CATEGORY_LABEL: Record<MaterialCategory, string> = {
  carbon: 'Carbon (Brown)',
  nitrogen: 'Nitrogen (Green)',
  bulking: 'Bulking Agent',
  amendment: 'Amendment',
};

export function RecipeBuilder({
  recipe,
  onChange,
}: {
  recipe: RecipeItem[];
  onChange: (recipe: RecipeItem[]) => void;
}) {
  const [toAdd, setToAdd] = useState(MATERIALS[0]!.id);
  const reduceMotion = useReducedMotion();
  const available = MATERIALS.filter((m) => !recipe.some((r) => r.materialId === m.id));
  // `toAdd` can drift out of `available` (its initial value is already in the
  // default recipe, and a solver can also add whatever it's currently pointed
  // at). A <select> with no matching <option> falls back to displaying the
  // first option while its bound value stays stale, so "Add" would silently
  // no-op against a material the user can't see selected. Always resolve to
  // a material that's actually still addable.
  const effectiveToAdd = available.some((m) => m.id === toAdd) ? toAdd : (available[0]?.id ?? '');

  const cn = cnRatio(recipe);
  const moisture = mixtureMoisture(recipe);
  const totalMass = recipe.reduce((s, r) => s + r.massKg, 0);

  function setMass(materialId: string, massKg: number) {
    onChange(recipe.map((r) => (r.materialId === materialId ? { ...r, massKg } : r)));
  }
  function remove(materialId: string) {
    onChange(recipe.filter((r) => r.materialId !== materialId));
  }
  function add() {
    if (!effectiveToAdd) return;
    onChange([...recipe, { materialId: effectiveToAdd, massKg: 100 }]);
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-sm font-medium text-[var(--text-secondary)]">Recipe</h2>
        <div className="flex gap-4 font-mono text-xs text-[var(--text-faint)]">
          <span>
            C/N <span className="text-[var(--text-primary)]">{fmtCn(cn)}</span>
          </span>
          <span>
            Moisture <span className="text-[var(--text-primary)]">{fmtPct(moisture)}</span>
          </span>
          <span>
            Mass <span className="text-[var(--text-primary)]">{fmtMass(totalMass)}</span>
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {recipe.map((item) => {
            const m = getMaterial(item.materialId)!;
            return (
              <motion.div
                key={item.materialId}
                layout={!reduceMotion}
                initial={reduceMotion ? undefined : { opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 overflow-hidden rounded-lg border border-[var(--border)] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--text-primary)]">{m.name}</div>
                  <div className="text-xs text-[var(--text-faint)]">{CATEGORY_LABEL[m.category]}</div>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={item.massKg}
                  onChange={(e) => setMass(item.materialId, Math.max(0, Number(e.target.value)))}
                  className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg-well)] px-2 py-1.5 text-right font-mono text-sm text-[var(--text-primary)]"
                />
                <span className="w-6 text-xs text-[var(--text-faint)]">kg</span>
                <button
                  type="button"
                  onClick={() => remove(item.materialId)}
                  aria-label={`Remove ${m.name}`}
                  className="rounded-md p-1.5 text-[var(--text-faint)] transition-colors hover:text-[var(--status-critical-text)]"
                >
                  <Trash size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {recipe.length === 0 && (
          <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--text-faint)]">
            Empty pile. Add a feedstock to begin.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <select
          value={effectiveToAdd}
          onChange={(e) => setToAdd(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-well)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          {available.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({CATEGORY_LABEL[m.category]})
            </option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={add} disabled={available.length === 0}>
          <Plus size={15} weight="bold" /> Add
        </Button>
      </div>
    </Card>
  );
}
