import { useEffect, useRef, type RefObject } from 'react';

export interface SpinState {
  /** Accumulated free-spin rotation (radians), added on top of the scroll-driven turn. */
  offX: number;
  offY: number;
  /** Current angular velocity — the model's own momentum once you let go. */
  velX: number;
  velY: number;
  dragging: boolean;
}

const SENSITIVITY = 0.008;
const DAMPING = 0.94;

/**
 * Grab-and-spin: touching/clicking the model and dragging rotates it directly
 * (1:1 with pointer movement); releasing lets it keep turning on its own
 * momentum, decaying slowly — a "free float" rather than snapping back to
 * the scroll-driven rotation. The scroll narrative still drives its own
 * rotation independently; this is an offset added on top of that in
 * ZeoliteScene's useFrame, read from the same ref each frame.
 *
 * Listens on the raw DOM element (not r3f's raycaster-based pointer events)
 * so a drag registers anywhere over the canvas, not just over model geometry.
 * `touch-action: pan-y` on the element lets vertical touch-scroll (the page's
 * primary interaction) keep working — pointer events still fire alongside it.
 */
export function useDragSpin(targetRef: RefObject<HTMLElement>) {
  const spin = useRef<SpinState>({ offX: 0, offY: 0, velX: 0, velY: 0, dragging: false });

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let lastX = 0;
    let lastY = 0;

    function onPointerDown(e: PointerEvent) {
      spin.current.dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el!.setPointerCapture(e.pointerId);
      el!.style.cursor = 'grabbing';
    }

    function onPointerMove(e: PointerEvent) {
      if (!spin.current.dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const velY = dx * SENSITIVITY;
      const velX = dy * SENSITIVITY;
      spin.current.offY += velY;
      spin.current.offX += velX;
      // Remembered as release momentum — see the decay loop in ZeoliteScene.
      spin.current.velX = velX;
      spin.current.velY = velY;
    }

    function onPointerUp(e: PointerEvent) {
      spin.current.dragging = false;
      el!.style.cursor = 'grab';
      try {
        el!.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already be gone (e.g. pointercancel) — fine to ignore.
      }
    }

    el.style.cursor = 'grab';
    el.style.touchAction = 'pan-y';
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [targetRef]);

  return spin;
}

/** Call once per frame from inside the Canvas — integrates momentum while not dragging. */
export function stepSpin(spin: SpinState) {
  if (!spin.dragging) {
    spin.offX += spin.velX;
    spin.offY += spin.velY;
    spin.velX *= DAMPING;
    spin.velY *= DAMPING;
  }
}
