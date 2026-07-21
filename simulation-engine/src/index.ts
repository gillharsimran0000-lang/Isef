/**
 * PILENGINE Simulation Engine
 * ───────────────────────────
 * A zero-dependency scientific model of aerobic composting.
 *
 * The engine is deliberately isolated from any UI or transport concern: it is
 * pure TypeScript that takes a pile and returns physics. The React frontend
 * imports it directly, and the Express API wraps it; both run the same code, so
 * a chart in the browser and a curl against /api/simulate can never disagree.
 *
 * See SCIENCE.md for the derivations and the literature behind every constant.
 */

export * from './types.js';
export * from './constants.js';
export * from './materials.js';
export * from './moisture.js';
export * from './carbonNitrogen.js';
export * from './oxygen.js';
export * from './kinetics.js';
export * from './microbial.js';
export * from './thermal.js';
export * from './simulate.js';
export * from './health.js';
export * from './predict.js';
export * from './recipe.js';
