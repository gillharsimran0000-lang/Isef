import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CrystalMesh } from './CrystalMesh';
import { CageFramework, type ProgressRef } from './CageFramework';
import { STAGE_COUNT, smoothstep } from './math';
import { stepSpin, type SpinState } from './useDragSpin';

// Camera waypoints, one per stage boundary (STAGE_COUNT + 1 of them): hero ->
// zoom into the cut-open crystal -> orbit the framework as cations and guest
// molecules dock -> pull back out to a resting wide shot.
const CAMERA_KEYFRAMES: [number, number, number][] = [
  [0, 0, 4.2],
  [0.3, 0.35, 3.6],
  [0.65, 0.45, 2.6],
  [0.9, 0.3, 1.85],
  [0.7, 0.5, 1.7],
  [-0.6, 0.35, 1.75],
  [-1.0, 0.85, 3.2],
  [0, 1.05, 4.0],
  [0, 0.55, 4.4],
];

function CameraRig({ progressRef }: { progressRef: MutableRefObject<ProgressRef> }) {
  const keyframes = useMemo(() => CAMERA_KEYFRAMES.map((p) => new THREE.Vector3(...p)), []);
  const desired = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    const p = progressRef.current.p;
    const scaled = Math.min(p, 0.9999) * STAGE_COUNT;
    const idx = Math.floor(scaled);
    const localT = smoothstep(0, 1, scaled - idx);
    const a = keyframes[idx] ?? keyframes[keyframes.length - 1]!;
    const b = keyframes[idx + 1] ?? keyframes[keyframes.length - 1]!;
    desired.current.lerpVectors(a, b, localT);
    camera.position.lerp(desired.current, 0.06);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function CompostGlow({ progressRef }: { progressRef: MutableRefObject<ProgressRef> }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (!light.current) return;
    const p = progressRef.current.p;
    light.current.intensity = smoothstep(6 / STAGE_COUNT, 7 / STAGE_COUNT, p) * 1.4;
  });
  return <pointLight ref={light} position={[0, -1.5, 1]} color="#6fd88a" intensity={0} distance={6} />;
}

export function ZeoliteScene({
  progressRef,
  spinRef,
}: {
  progressRef: MutableRefObject<ProgressRef>;
  spinRef: MutableRefObject<SpinState>;
}) {
  const crystalOpacity = useRef(1);
  const rootGroup = useRef<THREE.Group>(null);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useFrame((state) => {
    const p = progressRef.current.p;
    const fadeStart = 2 / STAGE_COUNT;
    const fadeEnd = 3 / STAGE_COUNT;
    const solid = 1 - smoothstep(fadeStart, fadeEnd, p);
    crystalOpacity.current = Math.max(solid, 0.12);

    stepSpin(spinRef.current);

    if (rootGroup.current) {
      // Scroll-driven turn and idle drift are the base motion; the free-spin
      // offset from grabbing the model (see useDragSpin) rides on top of it
      // and keeps drifting on its own momentum after release.
      rootGroup.current.rotation.y =
        p * 1.2 + (reducedMotion ? 0 : state.clock.elapsedTime * 0.04) + spinRef.current.offY;
      rootGroup.current.rotation.x = spinRef.current.offX;
    }
  });

  return (
    <>
      {/* No fog, no scene background color — the canvas is alpha:true (see
          ZeoliteCanvas) so the page's own dark background shows through. */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 4, 2]} intensity={1.4} />
      <directionalLight position={[-2, -1, -3]} intensity={0.35} color="#7cb8ea" />
      <CompostGlow progressRef={progressRef} />
      <CameraRig progressRef={progressRef} />
      <group ref={rootGroup}>
        <CrystalMesh opacityRef={crystalOpacity} />
        <CageFramework progressRef={progressRef} />
      </group>
    </>
  );
}
