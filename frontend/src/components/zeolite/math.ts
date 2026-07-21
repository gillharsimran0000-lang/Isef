export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Total number of narrative beats the scroll track is divided into. */
export const STAGE_COUNT = 8;

export function stageRange(index: number): [number, number] {
  return [index / STAGE_COUNT, (index + 1) / STAGE_COUNT];
}
