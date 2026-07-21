import { useEffect, useMemo, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import { ZEOLITE_COLORS } from './chemistry';
import { createOutlineMaterial, getToonGradient } from './toon';

const loader = new STLLoader();
const OUTLINE_SCALE = 1.035;

/**
 * The scanned crystal habit (exported STL) — the "outer shell" view of the
 * mineral before the parallax sequence cuts inside it. Normalized to a fixed
 * radius at runtime since the source export uses arbitrary Blender units
 * (roughly ±50-60 across).
 *
 * Loaded through a plain effect rather than `useLoader`'s Suspense cache: the
 * Suspense-thrown-promise pattern doesn't survive React 18 StrictMode's dev-time
 * double-mount cleanly with this three.js version, which was intermittently
 * leaving the canvas in a dead "context lost" state on first load in dev. A
 * manual load with a mount-guard sidesteps it and only costs a one-frame delay.
 *
 * Toon-shaded with an inverted-hull outline (a second, backface-only copy of
 * the same geometry at a slightly larger scale) — the two together give the
 * flat-cel-shaded-but-still-3D look: hard light/dark bands, no PBR gradient,
 * a solid black rim wherever the surface turns away from camera.
 */
export function CrystalMesh({ opacityRef }: { opacityRef: MutableRefObject<number> }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    loader.load('/models/zeolite-13x.stl', (raw) => {
      if (cancelled) return;
      const g = raw.clone();
      g.center();
      g.computeBoundingSphere();
      const radius = g.boundingSphere?.radius ?? 1;
      const scale = 1.7 / radius;
      g.scale(scale, scale, scale);
      g.computeVertexNormals();
      setGeometry(g);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const material = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: ZEOLITE_COLORS.crystal,
        gradientMap: getToonGradient(),
        transparent: true,
        opacity: 1,
      }),
    [],
  );
  const outlineMaterial = useMemo(() => createOutlineMaterial(1), []);

  useFrame(() => {
    material.opacity = opacityRef.current;
    // Only touch `wireframe` on an actual crossing — it's a shader-program
    // key, and reassigning the same value every frame forces needless
    // program lookups on weaker GPUs.
    const nextWireframe = opacityRef.current < 0.4;
    if (material.wireframe !== nextWireframe) material.wireframe = nextWireframe;
    // The outline shell reads as a solid black blob once the crystal itself
    // has gone to wireframe, so it fades out faster than the crystal does.
    outlineMaterial.opacity = nextWireframe ? 0 : opacityRef.current;
  });

  if (!geometry) return null;

  return (
    <>
      <mesh geometry={geometry} material={material} />
      <mesh geometry={geometry} material={outlineMaterial} scale={OUTLINE_SCALE} />
    </>
  );
}
