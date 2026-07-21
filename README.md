# PILENGINE

**A scientific compost intelligence platform.** PILENGINE simulates the biology, chemistry and
physics of an aerobic compost pile from first principles, then predicts what it will do next.

It is not a calculator. A calculator tells you a C/N ratio. PILENGINE integrates a coupled
heat/mass/oxygen/microbial model forward through 12,000 steps and tells you that your pile will
peak at 63.5 °C on day 5, hold above 55 °C long enough to satisfy the EPA's pathogen-reduction
standard, mature around day 70, and finish at 18.7:1, and it tells you *which equation* is
responsible for each of those numbers.

---

## Quick start

```bash
npm install
npm run dev          # frontend  → http://localhost:5173
npm run dev:api      # API       → http://localhost:4000/api/health
npm run dev:all      # both at once
npm test             # 37 tests against the simulation engine
```

Node ≥ 20 required. The frontend runs the engine locally in the browser; **the API is optional**,
and nothing breaks if it is not running.

---

## Architecture

```
PILENGINE/
├── simulation-engine/     zero-dependency TypeScript. All the science.
│   ├── src/
│   │   ├── constants.ts        physical constants, each with its literature source
│   │   ├── materials.ts        24-feedstock database (Rynk 1992, Cornell CWMI)
│   │   ├── carbonNitrogen.ts   C/N relation + two-material solver
│   │   ├── moisture.ts         gravimetric moisture + 2- and 3-material solvers
│   │   ├── recipe.ts           the 3×3 balancer: hits C/N AND moisture AND mass
│   │   ├── oxygen.ts           diffusion, porosity, Millington–Quirk, penetration depth
│   │   ├── kinetics.ts         Q10, Haug thermal inactivation, Liebig's law
│   │   ├── microbial.ts        four guilds, Rosso cardinal-temperature model
│   │   ├── thermal.ts          the energy balance that makes the pile heat itself
│   │   ├── simulate.ts         the coupled integrator
│   │   ├── health.ts           the Compost Intelligence Score + advisories
│   │   └── predict.ts          forecasting, exponential fit, outcome
│   └── test/engine.test.ts     37 tests
│
├── backend/              Express API. A thin shell around the engine.
└── frontend/             React + TypeScript + Vite + Tailwind + Framer Motion + Recharts
```

**The engine is imported directly by both the frontend and the API.** There is one implementation
of the science, so a number on a chart and a number from `curl` cannot drift apart.

---

## The five surfaces

| Page | What it does |
|---|---|
| **Dashboard** | Six live tiles (score, temperature, moisture, C/N, microbial ecosystem, oxygen), all showing the pile *on the selected day*. Scrub the day control and the whole dashboard moves through time coherently. |
| **Reactor** | Build the feedstock mix. Three solvers: Auto-Balance (C/N + moisture + mass at once), a two-material C/N solver, and a moisture bench. |
| **Predictions** | 24-hour, 7-day and full-lifecycle forecasts. Completion date, final C/N, quality score, microbial diversity. |
| **Timeline** | All five curves on one time axis, plus the three canonical phases. |
| **Science** | The derivations, the material guide, and the sources. |

Two themes, a neon-green dark mode and a monochrome mode, swap instantly and persist. Both are
*selected*, not derived: in monochrome, series identity is carried by lightness **and dash pattern**,
which is the same redundant encoding a colourblind reader relies on in the green theme.

---

## What makes this scientifically honest

**Nothing schedules the three phases.** There is no `if (day < 3) return 'mesophilic'`. The pile
heats because respiration liberates ~21 MJ per kg of volatile solids destroyed; it accelerates
because Q10 ≈ 2.5; it peaks because proteins denature; it cools because it runs out of food. Feed it
a bad recipe and there simply are no phases; an all-browns pile at C/N 80 reaches 23 °C and loses
10% of its mass over four months, and the model says so.

**The failure modes are real, and they emerge:**

| Scenario | What PILENGINE predicts | Why |
|---|---|---|
| 100 kg heap | never exceeds 27 °C | surface area scales as V^(2/3); a small pile loses heat faster than it makes it |
| Waterlogged | stalls, goes anaerobic | Millington–Quirk: halving air-filled porosity cuts O₂ transport **tenfold** |
| C/N 80:1 | 10% mass loss in 120 days | nitrogen-starved; microbes cannot build protein |
| Forced aeration | pinned at 63 °C, 0 days above 65 | thermostatic blower strips heat as latent water vapour |
| Moisture unmanaged | desiccates and stalls | an active pile evaporates 20–100 kg water/tonne/day at peak |

**The rate factors multiply, they do not average.** `k_eff = k_ref · f(T) · f(M) · f(O₂) · f(C/N) ·
f(FAS)`: Liebig's law of the minimum. A pile that is perfect in every respect but bone dry does not
run at 80% speed; it does not run at all.

### Two corrections to the original specification

The brief supplied two formulae that PILENGINE deliberately does not implement as written:

1. **The two-material C/N solver.** The brief gives
   `Q₂ = [Q₁(G−M₁) − Q₁(C₁−R·N₁)(100−M₁)] / [R·N₂(100−M₂) − C₂(100−M₂)]`.
   The leading `Q₁(G−M₁)` term belongs to the *moisture* solver; `G` is a moisture goal and cannot
   appear in a carbon/nitrogen mass balance, where it is dimensionally inconsistent with the
   `(C − R·N)` terms it is added to. PILENGINE derives and implements the correct solution,
   `Q₂ = Q₁(C₁ − R·N₁)(100 − M₁) / [(R·N₂ − C₂)(100 − M₂)]`, and tests verify it lands exactly on
   the target ratio. See `carbonNitrogen.ts`.

2. **The gas-diffusion collision integral.** The brief writes `D₁₂ = D₀ · (P₀/P) · (T/T₀)^1.75 ·
   (Ω/Ω₀)`. Chapman–Enskog theory has D ∝ T^(3/2)/(P·Ω); a larger collision integral means more
   scattering and therefore *slower* diffusion, so the ratio must be `(Ω₀/Ω)`. See `oxygen.ts`.

Both are documented at the point of implementation, with the derivation.

---

## API

```bash
curl localhost:4000/api/health
curl -X POST localhost:4000/api/state    -H 'content-type: application/json' -d '{"day":8}'
curl -X POST localhost:4000/api/simulate -H 'content-type: application/json' -d '{}'
curl -X POST localhost:4000/api/predict  -H 'content-type: application/json' -d '{}'

# Solve a recipe that hits 30:1 AND 55% moisture AND a 1-tonne batch, at once:
curl -X POST localhost:4000/api/solve/balance -H 'content-type: application/json' -d '{
  "fixed": [{"materialId":"wood-chips","massKg":120}],
  "solveFor": ["food-scraps","dry-leaves","alfalfa"],
  "targetCn": 30, "targetMoisturePct": 55, "targetMassKg": 1000
}'
```

Also: `/api/materials`, `/api/analyse/recipe`, `/api/solve/cn`, `/api/solve/moisture`,
`/api/lab/moisture`, `/api/oxygen`.

---

## Sources

- Rynk, R. (ed.), *On-Farm Composting Handbook*, NRAES-54 (1992): feedstock data, C/N targets
- Haug, R.T., *The Practical Handbook of Compost Engineering* (1993): energy balance, temperature
  and moisture response functions, O₂ stoichiometry
- Cornell Waste Management Institute: compost chemistry, recipe algebra
- Millington, R.J. & Quirk, J.P. (1961): effective diffusivity in porous media
- Rosso, L. et al. (1993): cardinal temperature model with inflection
- US EPA 40 CFR 503: Process to Further Reduce Pathogens (55 °C × 3 days)
