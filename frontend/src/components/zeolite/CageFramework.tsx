import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildSodaliteCage, MOLECULES, ZEOLITE_COLORS } from './chemistry';
import { easeOutCubic, smoothstep, stageRange } from './math';
import { createOutlineMaterial, getToonGradient } from './toon';

export interface ProgressRef {
  p: number;
}

const sphereGeo = new THREE.SphereGeometry(1, 10, 8);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
const UP = new THREE.Vector3(0, 1, 0);

// How much bigger the backface outline shell is than the fill mesh it wraps —
// tuned per shape family so the black rim reads at that object's own scale.
const SPHERE_OUTLINE_SCALE = 1.28;
const BOND_OUTLINE_SCALE: [number, number, number] = [1.7, 1.04, 1.7];

function toonMat(color: string) {
  return new THREE.MeshToonMaterial({ color, gradientMap: getToonGradient(), transparent: true, opacity: 0 });
}

function bondTransform(a: THREE.Vector3, b: THREE.Vector3) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const length = dir.length();
  const position = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  return { position, quaternion, length };
}

/**
 * The "cut open" view: one sodalite cage (framework T-atoms + bridging
 * oxygens), a handful of docked Na+ cations, and three guest-molecule
 * clusters that travel inward to illustrate adsorption. Stage 2 fades this
 * group in; stage 4 docks the cations; stage 5 pulls the molecules in.
 *
 * Every piece is toon-shaded with a paired backface outline shell for the
 * flat-cel-shaded look — see toon.ts.
 */
export function CageFramework({ progressRef }: { progressRef: MutableRefObject<ProgressRef> }) {
  const cage = useMemo(() => buildSodaliteCage(1.05), []);
  const bonds = useMemo(() => cage.edges.map(([a, b]) => bondTransform(a, b)), [cage]);

  const siMat = useMemo(() => toonMat(ZEOLITE_COLORS.si), []);
  const alMat = useMemo(() => toonMat(ZEOLITE_COLORS.al), []);
  const oxMat = useMemo(() => toonMat(ZEOLITE_COLORS.oxygen), []);
  const bondMat = useMemo(() => toonMat(ZEOLITE_COLORS.bond), []);
  const cationMat = useMemo(() => {
    const m = toonMat(ZEOLITE_COLORS.cation);
    m.emissive = new THREE.Color(ZEOLITE_COLORS.cation);
    m.emissiveIntensity = 0.25;
    return m;
  }, []);
  const outlineMat = useMemo(() => createOutlineMaterial(0), []);
  const cationOutlineMat = useMemo(() => createOutlineMaterial(0), []);

  const cationSites = useMemo(() => cage.windowCenters.slice(0, 6), [cage]);
  const moleculeSites = useMemo(() => {
    const keys = Object.keys(MOLECULES) as (keyof typeof MOLECULES)[];
    return keys.map((key, i) => ({ key, site: cage.windowCenters[(i + 6) % cage.windowCenters.length]! }));
  }, [cage]);

  const cationGroup = useRef<THREE.Group>(null);
  const moleculeGroup = useRef<THREE.Group>(null);
  const cageGroup = useRef<THREE.Group>(null);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useFrame((state) => {
    const p = progressRef.current.p;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;

    const [s2Start, s2End] = stageRange(2);
    const cageOpacity = smoothstep(s2Start, s2End, p);
    siMat.opacity = cageOpacity;
    alMat.opacity = cageOpacity;
    oxMat.opacity = cageOpacity * 0.85;
    bondMat.opacity = cageOpacity * 0.7;
    outlineMat.opacity = cageOpacity;

    if (cageGroup.current) {
      cageGroup.current.rotation.y = t * 0.05 + p * 1.4;
    }

    const [s4Start, s4End] = stageRange(4);
    const cationT = easeOutCubic(smoothstep(s4Start, s4End, p));
    if (cationGroup.current) {
      cationGroup.current.children.forEach((child, i) => {
        const site = cationSites[i];
        if (!site) return;
        const from = site.clone().multiplyScalar(2.4);
        const to = site.clone().multiplyScalar(0.6);
        child.position.lerpVectors(from, to, cationT);
        child.scale.setScalar(0.16 * cationT + 0.02);
      });
    }
    cationMat.opacity = cationT;
    cationOutlineMat.opacity = cationT;

    const [s5Start, s5End] = stageRange(5);
    const molT = easeOutCubic(smoothstep(s5Start, s5End, p));
    if (moleculeGroup.current) {
      moleculeGroup.current.children.forEach((child, i) => {
        const entry = moleculeSites[i];
        if (!entry) return;
        const from = entry.site.clone().normalize().multiplyScalar(4.5);
        const to = entry.site.clone().multiplyScalar(0.85);
        child.position.lerpVectors(from, to, molT);
        child.scale.setScalar(molT);
        child.rotation.y = t * 0.3 + i;
      });
    }
  });

  return (
    <group ref={cageGroup}>
      {cage.siSites.map((v, i) => (
        <group key={`si${i}`} position={v} scale={0.11}>
          <mesh geometry={sphereGeo} material={siMat} />
          <mesh geometry={sphereGeo} material={outlineMat} scale={SPHERE_OUTLINE_SCALE} />
        </group>
      ))}
      {cage.alSites.map((v, i) => (
        <group key={`al${i}`} position={v} scale={0.11}>
          <mesh geometry={sphereGeo} material={alMat} />
          <mesh geometry={sphereGeo} material={outlineMat} scale={SPHERE_OUTLINE_SCALE} />
        </group>
      ))}
      {cage.oxygenSites.map((v, i) => (
        <group key={`ox${i}`} position={v} scale={0.055}>
          <mesh geometry={sphereGeo} material={oxMat} />
          <mesh geometry={sphereGeo} material={outlineMat} scale={SPHERE_OUTLINE_SCALE} />
        </group>
      ))}
      {bonds.map((b, i) => (
        <group key={`bond${i}`} position={b.position} quaternion={b.quaternion}>
          <mesh geometry={cylinderGeo} material={bondMat} scale={[0.028, b.length, 0.028]} />
          <mesh
            geometry={cylinderGeo}
            material={outlineMat}
            scale={[0.028 * BOND_OUTLINE_SCALE[0], b.length * BOND_OUTLINE_SCALE[1], 0.028 * BOND_OUTLINE_SCALE[2]]}
          />
        </group>
      ))}

      <group ref={cationGroup}>
        {cationSites.map((_, i) => (
          <group key={`cation${i}`} scale={0.001}>
            <mesh geometry={sphereGeo} material={cationMat} />
            <mesh geometry={sphereGeo} material={cationOutlineMat} scale={SPHERE_OUTLINE_SCALE} />
          </group>
        ))}
      </group>

      <group ref={moleculeGroup}>
        {moleculeSites.map(({ key }, i) => (
          <MoleculeCluster key={`${key}-${i}`} kind={key} />
        ))}
      </group>
    </group>
  );
}

function MoleculeCluster({ kind }: { kind: keyof typeof MOLECULES }) {
  const template = MOLECULES[kind];
  const materials = useMemo(
    () =>
      template.atoms.map(
        (a) => new THREE.MeshToonMaterial({ color: a.color, gradientMap: getToonGradient(), transparent: true, opacity: 0.95 }),
      ),
    [template],
  );
  // A single opaque black outline shared across every atom in every molecule
  // cluster — the whole cluster's visibility is handled by its parent group's
  // scale (see CageFramework), so the outline never needs its own fade.
  const outlineMaterial = useMemo(() => createOutlineMaterial(1), []);
  return (
    <group scale={0.001}>
      {template.atoms.map((a, i) => (
        <group key={i} position={a.offset} scale={a.radius}>
          <mesh geometry={sphereGeo} material={materials[i]} />
          <mesh geometry={sphereGeo} material={outlineMaterial} scale={SPHERE_OUTLINE_SCALE} />
        </group>
      ))}
    </group>
  );
}
