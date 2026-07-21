import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import {
  balanceRecipe,
  cnRatio,
  defaultConfig,
  forecast,
  healthScore,
  getMaterial,
  initialState,
  interpolate,
  MATERIALS,
  materialCn,
  mixtureMoisture,
  moistureFromSample,
  oxygenBalance,
  simulate,
  solveMoistureThreeMaterial,
  solveMoistureTwoMaterial,
  solveTwoMaterial,
  type PileConfig,
} from '@pilengine/simulation-engine';

/**
 * PILENGINE API.
 *
 * A thin transport shell around the simulation engine; deliberately thin. Every
 * endpoint below calls the *same* functions the React frontend imports directly,
 * so a number on a chart and a number from `curl` are computed by one
 * implementation and cannot drift apart. The science lives in the engine; this
 * file only speaks HTTP.
 */

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '256kb' }));

// ── Health ─────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'pilengine-simulation-engine', version: '1.0.0' });
});

// ── Materials ──────────────────────────────────────────────────────────────

app.get('/api/materials', (_req, res) => {
  res.json(
    MATERIALS.map((m) => ({
      ...m,
      cn: Number.isFinite(materialCn(m)) ? materialCn(m) : null,
    })),
  );
});

app.get('/api/materials/:id', (req, res) => {
  const m = getMaterial(req.params.id);
  if (!m) return res.status(404).json({ error: `No material with id "${req.params.id}".` });
  res.json({ ...m, cn: Number.isFinite(materialCn(m)) ? materialCn(m) : null });
});

// ── Simulation ─────────────────────────────────────────────────────────────

app.get('/api/config/default', (_req, res) => res.json(defaultConfig()));

app.post('/api/simulate', (req, res) => {
  const config = readConfig(req);
  const result = simulate(config);
  res.json(result);
});

/** The pile's state; and its scorecard; on a given day. */
app.post('/api/state', (req, res) => {
  const config = readConfig(req);
  const day = Number(req.body?.day ?? 0);
  const result = simulate(config);
  if (result.steps.length === 0) {
    return res.status(422).json({ error: 'This recipe is empty; nothing to simulate.' });
  }
  const step = interpolate(result.steps, day);
  res.json({ step, health: healthScore(step), initial: result.initial });
});

app.post('/api/predict', (req, res) => {
  const config = readConfig(req);
  res.json(forecast(config));
});

// ── Solvers ────────────────────────────────────────────────────────────────

app.post('/api/analyse/recipe', (req, res) => {
  const recipe = req.body?.recipe ?? [];
  const config = { ...defaultConfig(), recipe };
  res.json({
    cnRatio: finite(cnRatio(recipe)),
    moisturePct: mixtureMoisture(recipe),
    initial: initialState(config),
  });
});

app.post('/api/solve/cn', (req, res) => {
  const { material1, massKg, material2, targetRatio } = req.body ?? {};
  const m1 = getMaterial(String(material1));
  const m2 = getMaterial(String(material2));
  if (!m1 || !m2) return res.status(400).json({ error: 'Unknown material id.' });
  res.json(solveTwoMaterial(m1, Number(massKg), m2, Number(targetRatio)));
});

app.post('/api/solve/moisture', (req, res) => {
  const { material1, massKg, material2, mass2Kg, material3, goalPct } = req.body ?? {};
  const m1 = getMaterial(String(material1));
  const m2 = getMaterial(String(material2));
  if (!m1 || !m2) return res.status(400).json({ error: 'Unknown material id.' });

  // Three materials if a third is supplied; two otherwise.
  if (material3) {
    const m3 = getMaterial(String(material3));
    if (!m3) return res.status(400).json({ error: 'Unknown material id.' });
    return res.json(
      solveMoistureThreeMaterial(m1, Number(massKg), m2, Number(mass2Kg), m3, Number(goalPct)),
    );
  }
  res.json(solveMoistureTwoMaterial(m1, Number(massKg), m2, Number(goalPct)));
});

app.post('/api/solve/balance', (req, res) => {
  const { fixed = [], solveFor, targetCn, targetMoisturePct, targetMassKg } = req.body ?? {};
  if (!Array.isArray(solveFor) || solveFor.length !== 3) {
    return res.status(400).json({
      error:
        'solveFor must be exactly three material ids. Three unknowns for three constraints (C/N, moisture, batch mass) makes the system square and exactly solvable.',
    });
  }
  res.json(
    balanceRecipe({
      fixed,
      solveFor: solveFor as [string, string, string],
      targetCn: Number(targetCn ?? 30),
      targetMoisturePct: Number(targetMoisturePct ?? 55),
      targetMassKg: Number(targetMassKg ?? 1000),
    }),
  );
});

app.post('/api/lab/moisture', (req, res) => {
  const wet = Number(req.body?.wetWeight);
  const dry = Number(req.body?.dryWeight);
  try {
    res.json({ moisturePct: moistureFromSample(wet, dry) });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/oxygen', (req, res) => {
  const {
    vsRateKgPerM3PerDay = 0,
    bulkDensity = 520,
    moisturePct = 55,
    tempC = 55,
    halfHeightM = 0.75,
    aeration = 'turned',
  } = req.body ?? {};
  res.json(
    oxygenBalance(
      Number(vsRateKgPerM3PerDay),
      Number(bulkDensity),
      Number(moisturePct),
      Number(tempC),
      Number(halfHeightM),
      aeration,
    ),
  );
});

// ── Errors ─────────────────────────────────────────────────────────────────

app.use((_req, res) => res.status(404).json({ error: 'No such endpoint.' }));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // A bad recipe is a client error, not a server crash; say which.
  const isValidation = err instanceof RangeError || err instanceof TypeError;
  res.status(isValidation ? 400 : 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`PILENGINE simulation API → http://localhost:${PORT}/api/health`);
});

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Merge a request body over the default configuration.
 *
 * Callers may send a partial config; anything they omit falls back to a known-good
 * default rather than to `undefined`, which would propagate NaN silently through
 * 12,000 integration steps and emerge as a plausible-looking but meaningless curve.
 */
function readConfig(req: Request): PileConfig {
  const body = (req.body ?? {}) as Partial<PileConfig>;
  const base = defaultConfig();
  return {
    ...base,
    ...body,
    recipe: Array.isArray(body.recipe) ? body.recipe : base.recipe,
  };
}

/** JSON has no Infinity. A pile with no nitrogen has a genuinely infinite C/N. */
function finite(v: number): number | null {
  return Number.isFinite(v) ? v : null;
}
