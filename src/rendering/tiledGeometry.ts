/**
 * World-space UV-tiled BoxGeometry cache for architectural walls and floor slabs.
 * Eliminates texture stretching on narrow headers, jamb pillars, and wide facades
 * by assigning exact physical UVs (`faceWidth / tileMeters`, `faceHeight / tileMeters`)
 * on all 6 faces of every BoxGeometry.
 */

import * as THREE from 'three';

const geoCache = new Map<string, THREE.BoxGeometry>();

/**
 * Returns a cached BoxGeometry of size `(sx, sy, sz)` with world-scaled UVs
 * so 1.0 UV unit equals `tileMeters` real-world meters on every face.
 */
export function getTiledBoxGeometry(
  sx: number,
  sy: number,
  sz: number,
  tileMeters: number = 2.4,
): THREE.BoxGeometry {
  const qx = Math.round(sx * 100) / 100;
  const qy = Math.round(sy * 100) / 100;
  const qz = Math.round(sz * 100) / 100;
  const qt = Math.round(tileMeters * 100) / 100;
  const key = `${qx}_${qy}_${qz}_${qt}`;

  const existing = geoCache.get(key);
  if (existing) return existing;

  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const uv = geo.attributes.uv as THREE.BufferAttribute;

  // BoxGeometry face order: +X (0..3), -X (4..7), +Y (8..11), -Y (12..15), +Z (16..19), -Z (20..23)
  const faceDims: Array<[number, number]> = [
    [sz / tileMeters, sy / tileMeters], // +X
    [sz / tileMeters, sy / tileMeters], // -X
    [sx / tileMeters, sz / tileMeters], // +Y
    [sx / tileMeters, sz / tileMeters], // -Y
    [sx / tileMeters, sy / tileMeters], // +Z
    [sx / tileMeters, sy / tileMeters], // -Z
  ];

  for (let face = 0; face < 6; face++) {
    const [uScale, vScale] = faceDims[face];
    const base = face * 4;
    for (let v = 0; v < 4; v++) {
      const i = base + v;
      uv.setXY(i, uv.getX(i) * uScale, uv.getY(i) * vScale);
    }
  }
  uv.needsUpdate = true;

  geoCache.set(key, geo);
  return geo;
}
