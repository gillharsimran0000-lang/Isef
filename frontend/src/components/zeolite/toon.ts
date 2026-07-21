import * as THREE from 'three';

let gradientCache: THREE.DataTexture | null = null;

/**
 * A hard 3-band gradient for MeshToonMaterial — nearest-filtered, so shading
 * snaps between flat bands instead of blending smoothly. This is the whole
 * trick behind the "flat but 3D" cel-shaded look: faces read as solid color
 * regions, not soft PBR gradients.
 */
export function getToonGradient(): THREE.DataTexture {
  if (gradientCache) return gradientCache;
  const data = new Uint8Array([70, 150, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  gradientCache = tex;
  return tex;
}

/** Shared inverted-hull outline material: backface-only, drawn behind the model at a larger scale. */
export function createOutlineMaterial(opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: OUTLINE_COLOR,
    side: THREE.BackSide,
    transparent: true,
    opacity,
  });
}

export const OUTLINE_COLOR = '#0a0b07';
