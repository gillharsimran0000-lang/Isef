import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  MATERIALS,
  getMaterial,
  balanceRecipe,
  solveTwoMaterial,
  solveMoistureTwoMaterial,
  solveMoistureThreeMaterial,
  type RecipeItem,
} from '@pilengine/simulation-engine';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fmtCn, fmtMass, fmtPct } from '@/lib/format';

const TABS = ['Auto-Balance', 'C/N Solver', 'Moisture Solver'] as const;
type Tab = (typeof TABS)[number];

const selectClass = 'rounded-md border border-[var(--border)] bg-[var(--bg-well)] px-2.5 py-1.5 text-sm text-[var(--text-primary)]';
const numClass = 'w-24 rounded-md border border-[var(--border)] bg-[var(--bg-well)] px-2.5 py-1.5 text-sm text-[var(--text-primary)]';

function MaterialSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
      {MATERIALS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

export function RecipeSolvers({ recipe, onApply }: { recipe: RecipeItem[]; onApply: (recipe: RecipeItem[]) => void }) {
  const [tab, setTab] = useState<Tab>('Auto-Balance');
  const reduceMotion = useReducedMotion();

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap gap-1 border-b border-[var(--border)] pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-faint)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="pt-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === 'Auto-Balance' && <AutoBalance recipe={recipe} onApply={onApply} />}
            {tab === 'C/N Solver' && <CnSolver recipe={recipe} onApply={onApply} />}
            {tab === 'Moisture Solver' && <MoistureSolver recipe={recipe} onApply={onApply} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}

function AutoBalance({ recipe, onApply }: { recipe: RecipeItem[]; onApply: (recipe: RecipeItem[]) => void }) {
  const [solveFor, setSolveFor] = useState<[string, string, string]>(['food-scraps', 'dry-leaves', 'alfalfa']);
  const [targetCn, setTargetCn] = useState(30);
  const [targetMoisturePct, setTargetMoisturePct] = useState(55);
  const [targetMassKg, setTargetMassKg] = useState(1000);

  const fixed = recipe.filter((r) => !solveFor.includes(r.materialId));
  const result = balanceRecipe({ fixed, solveFor, targetCn, targetMoisturePct, targetMassKg });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Solves three unknowns against three constraints at once: C/N, moisture and batch mass. Materials already in
        the recipe (other than the three below) stay fixed as bulking agents.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([0, 1, 2] as const).map((i) => (
          <MaterialSelect
            key={i}
            value={solveFor[i]}
            onChange={(id) => setSolveFor((s) => s.map((v, j) => (j === i ? id : v)) as [string, string, string])}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-xs text-[var(--text-faint)]">
          Target C/N
          <input type="number" value={targetCn} onChange={(e) => setTargetCn(Number(e.target.value))} className={numClass + ' w-full'} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-faint)]">
          Target Moisture %
          <input
            type="number"
            value={targetMoisturePct}
            onChange={(e) => setTargetMoisturePct(Number(e.target.value))}
            className={numClass + ' w-full'}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-faint)]">
          Target Mass kg
          <input type="number" value={targetMassKg} onChange={(e) => setTargetMassKg(Number(e.target.value))} className={numClass + ' w-full'} />
        </label>
      </div>

      {result.feasible ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-well)] p-3 text-sm">
          <p className="text-[var(--status-nominal-text)]">
            Solved: {fmtCn(result.achievedCn)} at {fmtPct(result.achievedMoisturePct)}, {fmtMass(result.achievedMassKg)}.
          </p>
          <Button size="sm" className="mt-2" onClick={() => onApply(result.recipe)}>
            Apply to Recipe
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--pastel-red-bg)] p-3 text-sm text-[var(--pastel-red-text)]">
          {result.reason}
        </p>
      )}
    </div>
  );
}

function CnSolver({ recipe, onApply }: { recipe: RecipeItem[]; onApply: (recipe: RecipeItem[]) => void }) {
  const [id1, setId1] = useState(recipe[0]?.materialId ?? 'dry-leaves');
  const [mass1, setMass1] = useState(recipe[0]?.massKg ?? 200);
  const [id2, setId2] = useState(recipe.find((r) => r.materialId !== id1)?.materialId ?? 'food-scraps');
  const [targetRatio, setTargetRatio] = useState(30);

  const m1 = getMaterial(id1)!;
  const m2 = getMaterial(id2)!;
  const result = solveTwoMaterial(m1, mass1, m2, targetRatio);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Given a fixed mass of one material, solves the mass of a second material needed to hit a target C/N ratio.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <MaterialSelect value={id1} onChange={setId1} />
          <input type="number" value={mass1} onChange={(e) => setMass1(Number(e.target.value))} className={numClass} />
          <span className="text-xs text-[var(--text-faint)]">kg</span>
        </div>
        <div className="flex items-center gap-2">
          <MaterialSelect value={id2} onChange={setId2} />
          <span className="text-xs text-[var(--text-faint)]">solve mass</span>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        Target ratio
        <input type="number" value={targetRatio} onChange={(e) => setTargetRatio(Number(e.target.value))} className={numClass} />
        : 1
      </label>

      {result.feasible ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-well)] p-3 text-sm">
          <p className="text-[var(--status-nominal-text)]">
            {fmtMass(result.massKg)} of {m2.name} achieves {fmtCn(result.achievedRatio)}.
          </p>
          <Button
            size="sm"
            className="mt-2"
            onClick={() => {
              const next = recipe.filter((r) => r.materialId !== id1 && r.materialId !== id2);
              onApply([...next, { materialId: id1, massKg: mass1 }, { materialId: id2, massKg: result.massKg }]);
            }}
          >
            Apply to Recipe
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--pastel-red-bg)] p-3 text-sm text-[var(--pastel-red-text)]">
          {result.reason}
        </p>
      )}
    </div>
  );
}

function MoistureSolver({ recipe, onApply }: { recipe: RecipeItem[]; onApply: (recipe: RecipeItem[]) => void }) {
  const [useThird, setUseThird] = useState(false);
  const [id1, setId1] = useState(recipe[0]?.materialId ?? 'dry-leaves');
  const [mass1, setMass1] = useState(recipe[0]?.massKg ?? 200);
  const [id2, setId2] = useState(recipe[1]?.materialId ?? 'food-scraps');
  const [mass2, setMass2] = useState(recipe[1]?.massKg ?? 200);
  const [id3, setId3] = useState('water');
  const [goalPct, setGoalPct] = useState(55);

  const m1 = getMaterial(id1)!;
  const m2 = getMaterial(id2)!;
  const m3 = getMaterial(id3);

  const result = useThird && m3 ? solveMoistureThreeMaterial(m1, mass1, m2, mass2, m3, goalPct) : solveMoistureTwoMaterial(m1, mass1, m2, goalPct);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Solves the mass of one material needed to bring a blend to a target moisture percentage.
      </p>
      <div className="flex items-center gap-2">
        <MaterialSelect value={id1} onChange={setId1} />
        <input type="number" value={mass1} onChange={(e) => setMass1(Number(e.target.value))} className={numClass} />
        <span className="text-xs text-[var(--text-faint)]">kg fixed</span>
      </div>
      {useThird && (
        <div className="flex items-center gap-2">
          <MaterialSelect value={id2} onChange={setId2} />
          <input type="number" value={mass2} onChange={(e) => setMass2(Number(e.target.value))} className={numClass} />
          <span className="text-xs text-[var(--text-faint)]">kg fixed</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <MaterialSelect value={useThird ? id3 : id2} onChange={useThird ? setId3 : setId2} />
        <span className="text-xs text-[var(--text-faint)]">solve mass</span>
      </div>
      <label className="flex items-center gap-3 text-xs text-[var(--text-faint)]">
        <input type="checkbox" checked={useThird} onChange={(e) => setUseThird(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
        Blend a third material (two fixed, solve the third)
      </label>
      <label className="flex items-center gap-2 text-sm">
        Goal moisture
        <input type="number" value={goalPct} onChange={(e) => setGoalPct(Number(e.target.value))} className={numClass} />
        %
      </label>

      {result.feasible ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-well)] p-3 text-sm">
          <p className="text-[var(--status-nominal-text)]">
            {fmtMass(result.massKg)} of {(useThird ? m3! : m2).name} reaches {goalPct}% moisture.
          </p>
          <Button
            size="sm"
            className="mt-2"
            onClick={() => {
              const solvedId = useThird ? id3 : id2;
              const keep = useThird ? [id1, id2] : [id1];
              const next = recipe.filter((r) => !keep.includes(r.materialId) && r.materialId !== solvedId);
              const applied: RecipeItem[] = [
                ...next,
                { materialId: id1, massKg: mass1 },
                ...(useThird ? [{ materialId: id2, massKg: mass2 }] : []),
                { materialId: solvedId, massKg: result.massKg },
              ];
              onApply(applied);
            }}
          >
            Apply to Recipe
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--pastel-red-bg)] p-3 text-sm text-[var(--pastel-red-text)]">
          {result.reason}
        </p>
      )}
    </div>
  );
}
