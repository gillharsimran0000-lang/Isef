import { Canvas } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { ZeoliteScene } from './ZeoliteScene';
import type { ProgressRef } from './CageFramework';
import type { SpinState } from './useDragSpin';

/**
 * `progressRef` is written directly by the page (from framer-motion's
 * scrollYProgress) rather than read as a MotionValue inside the r3f tree —
 * that keeps every animated value here a plain mutable-ref read inside
 * useFrame, so scrolling never triggers a React re-render of the scene.
 * `spinRef` is the same pattern for the grab-and-spin interaction.
 */
export function ZeoliteCanvas({
  progressRef,
  spinRef,
}: {
  progressRef: MutableRefObject<ProgressRef>;
  spinRef: MutableRefObject<SpinState>;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ fov: 42, position: [0, 0, 4.2], near: 0.1, far: 20 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
    >
      <ZeoliteScene progressRef={progressRef} spinRef={spinRef} />
    </Canvas>
  );
}
