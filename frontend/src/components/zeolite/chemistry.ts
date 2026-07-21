import * as THREE from 'three';

/**
 * A simplified but geometrically real model of the sodalite (beta) cage that
 * links up to build the FAU / faujasite framework that gives 13X its pores.
 * Cartesian coordinates for a truncated octahedron are all permutations of
 * (0, ±1, ±2) — 24 vertices, each one a T-atom (Si or Al) site. Edges are the
 * closest pairs (distance √2 · scale) and stand in for the T–O–T bridge; the
 * midpoint of each edge is where the bridging oxygen actually sits.
 *
 * This is a teaching diagram, not a crystallographic export: real FAU links
 * these cages through double six-rings into a diamond-like supercage lattice.
 * One cage, correctly shaped and correctly 3-colourable, is enough to show
 * why the pores are the size they are without rendering the full unit cell.
 */
export interface CageGeometry {
  /** T-atom sites, alternating Si / Al by bipartite graph colour. */
  siSites: THREE.Vector3[];
  alSites: THREE.Vector3[];
  /** Bridging-oxygen sites, one per edge midpoint. */
  oxygenSites: THREE.Vector3[];
  /** Edge endpoints, for drawing the T–O–T bond cylinders. */
  edges: [THREE.Vector3, THREE.Vector3][];
  /** Centers of the 6-membered rings (hexagonal faces) — the cage "windows". */
  windowCenters: THREE.Vector3[];
}

export function buildSodaliteCage(scale: number): CageGeometry {
  const raw: [number, number, number][] = [];
  const base = [0, 1, 2];
  const perms: [number, number, number][] = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
  ];
  for (const [pa, pb, pc] of perms) {
    const vals = [base[pa]!, base[pb]!, base[pc]!] as [number, number, number];
    const signs = vals.map((v) => (v === 0 ? [1] : [1, -1]));
    for (const sx of signs[0]!) {
      for (const sy of signs[1]!) {
        for (const sz of signs[2]!) {
          raw.push([vals[0]! * sx, vals[1]! * sy, vals[2]! * sz]);
        }
      }
    }
  }
  // De-duplicate (zero entries produce repeats across sign loops).
  const seen = new Set<string>();
  const points: THREE.Vector3[] = [];
  for (const p of raw) {
    const key = p.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    points.push(new THREE.Vector3(p[0], p[1], p[2]).multiplyScalar(scale));
  }

  // Edges: connect each vertex to its 3 nearest neighbours (truncated
  // octahedron is 3-regular), which also fixes the minimum-distance edge set.
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];
  const dist = (a: THREE.Vector3, b: THREE.Vector3) => a.distanceTo(b);
  for (let i = 0; i < points.length; i++) {
    const ds = points
      .map((p, j) => ({ j, d: i === j ? Infinity : dist(points[i]!, p) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { j } of ds) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push([i, j]);
    }
  }

  // Bipartite 2-colouring by BFS — every face is even-sided (4 or 6), so the
  // graph is bipartite and this always succeeds. Colour A -> Si, colour B -> Al.
  const colour = new Array<number>(points.length).fill(-1);
  const adjacency: number[][] = points.map(() => []);
  for (const [a, b] of edges) {
    adjacency[a]!.push(b);
    adjacency[b]!.push(a);
  }
  colour[0] = 0;
  const queue = [0];
  while (queue.length) {
    const v = queue.shift()!;
    for (const n of adjacency[v]!) {
      if (colour[n] === -1) {
        colour[n] = 1 - colour[v]!;
        queue.push(n);
      }
    }
  }

  const siSites = points.filter((_, i) => colour[i] === 0);
  const alSites = points.filter((_, i) => colour[i] === 1);
  const oxygenSites = edges.map(([a, b]) => points[a]!.clone().add(points[b]!).multiplyScalar(0.5));
  const edgeVectors: [THREE.Vector3, THREE.Vector3][] = edges.map(([a, b]) => [points[a]!, points[b]!]);

  // Hexagonal window centers: the 8 faces whose vertices average to a point
  // at ~ the same radius pattern as a {111}-type face of the truncated
  // octahedron. Approximate by clustering vertices sharing similar
  // normalized-direction "octant" — good enough for placing decorative
  // cations/guest molecules near a pore mouth, not for exact face detection.
  const octants = new Map<string, THREE.Vector3[]>();
  for (const p of points) {
    const key = [p.x, p.y, p.z].map((v) => (v > 0.01 ? '+' : v < -0.01 ? '-' : '0')).join('');
    if (!octants.has(key)) octants.set(key, []);
    octants.get(key)!.push(p);
  }
  const windowCenters: THREE.Vector3[] = [];
  for (const group of octants.values()) {
    const c = group.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(group.length);
    windowCenters.push(c);
  }

  return { siSites, alSites, oxygenSites, edges: edgeVectors, windowCenters };
}

/** A small guest molecule built from CPK-ish coloured spheres at fixed offsets. */
export interface MoleculeTemplate {
  label: string;
  atoms: { color: string; radius: number; offset: THREE.Vector3 }[];
}

const A = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const MOLECULES: Record<'water' | 'ammonia' | 'co2', MoleculeTemplate> = {
  water: {
    label: 'H₂O',
    atoms: [
      { color: '#f0685c', radius: 0.16, offset: A(0, 0, 0) },
      { color: '#eceee7', radius: 0.09, offset: A(0.15, 0.12, 0) },
      { color: '#eceee7', radius: 0.09, offset: A(-0.15, 0.12, 0) },
    ],
  },
  ammonia: {
    label: 'NH₃',
    atoms: [
      { color: '#7cb8ea', radius: 0.17, offset: A(0, 0.05, 0) },
      { color: '#eceee7', radius: 0.09, offset: A(0.16, -0.08, 0.05) },
      { color: '#eceee7', radius: 0.09, offset: A(-0.16, -0.08, 0.05) },
      { color: '#eceee7', radius: 0.09, offset: A(0, -0.08, -0.17) },
    ],
  },
  co2: {
    label: 'CO₂',
    atoms: [
      { color: '#9ba393', radius: 0.15, offset: A(0, 0, 0) },
      { color: '#f0685c', radius: 0.13, offset: A(0.22, 0, 0) },
      { color: '#f0685c', radius: 0.13, offset: A(-0.22, 0, 0) },
    ],
  },
};

export const ZEOLITE_COLORS = {
  crystal: '#a3c088',
  si: '#7cb8ea',
  al: '#eec06a',
  oxygen: '#8a6f66',
  bond: '#4a5245',
  cation: '#a3c088',
};
