/**
 * Pure TypeScript 2D Spatial Hash Grid for fast AABB broadphase queries and sphere-swept raycasts.
 * Keeps physics and camera raycasts O(1) even with 1,500+ house, furniture, and street prop colliders.
 */

import type { AABB } from './types';

export interface RaycastHit {
  t: number;
  box: AABB;
  hitX: number;
  hitY: number;
  hitZ: number;
}

/** Exact ray vs inflated AABB slab intersection (supports sphere-swept camera radius `pad`). */
export function rayIntersectExpandedAABB(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  box: AABB,
  pad: number = 0,
): number | null {
  const minX = box.minX - pad;
  const maxX = box.maxX + pad;
  const minY = box.minY - pad;
  const maxY = box.maxY + pad;
  const minZ = box.minZ - pad;
  const maxZ = box.maxZ + pad;

  let tmin = 0;
  let tmax = maxDist;

  if (Math.abs(dx) < 1e-7) {
    if (ox < minX || ox > maxX) return null;
  } else {
    const inv = 1 / dx;
    let t1 = (minX - ox) * inv;
    let t2 = (maxX - ox) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (Math.abs(dy) < 1e-7) {
    if (oy < minY || oy > maxY) return null;
  } else {
    const inv = 1 / dy;
    let t1 = (minY - oy) * inv;
    let t2 = (maxY - oy) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (Math.abs(dz) < 1e-7) {
    if (oz < minZ || oz > maxZ) return null;
  } else {
    const inv = 1 / dz;
    let t1 = (minZ - oz) * inv;
    let t2 = (maxZ - oz) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  return tmin >= 0 && tmin <= maxDist ? tmin : null;
}

export class SpatialHashGrid {
  private readonly cellSize: number;
  private readonly invCellSize: number;
  private readonly cells = new Map<string, AABB[]>();
  private readonly allBoxes: AABB[] = [];
  private readonly stampMap = new WeakMap<AABB, number>();
  private queryStamp = 0;

  constructor(cellSize: number = 4.0) {
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
  }

  private key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public insert(box: AABB): void {
    this.allBoxes.push(box);
    const minCx = Math.floor(box.minX * this.invCellSize);
    const maxCx = Math.floor(box.maxX * this.invCellSize);
    const minCz = Math.floor(box.minZ * this.invCellSize);
    const maxCz = Math.floor(box.maxZ * this.invCellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const k = this.key(cx, cz);
        let list = this.cells.get(k);
        if (!list) {
          list = [];
          this.cells.set(k, list);
        }
        list.push(box);
      }
    }
  }

  public insertMany(boxes: readonly AABB[]): void {
    for (let i = 0; i < boxes.length; i++) {
      this.insert(boxes[i]);
    }
  }

  public get count(): number {
    return this.allBoxes.length;
  }

  /** Returns all colliders whose XZ footprint intersects [minX..maxX, minZ..maxZ]. */
  public queryXZ(minX: number, maxX: number, minZ: number, maxZ: number, out: AABB[] = []): AABB[] {
    out.length = 0;
    const stamp = ++this.queryStamp;
    const minCx = Math.floor(minX * this.invCellSize);
    const maxCx = Math.floor(maxX * this.invCellSize);
    const minCz = Math.floor(minZ * this.invCellSize);
    const maxCz = Math.floor(maxZ * this.invCellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const list = this.cells.get(this.key(cx, cz));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const b = list[i];
          if (this.stampMap.get(b) === stamp) continue;
          this.stampMap.set(b, stamp);
          if (b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ) {
            out.push(b);
          }
        }
      }
    }
    return out;
  }

  /**
   * Fast sphere-swept raycast against indexed colliders.
   * Uses the ray segment's bounding box padded by `radius` to gather candidate cells in O(k).
   */
  public raycast(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    radius: number = 0,
    filter?: (box: AABB) => boolean,
  ): RaycastHit | null {
    const ex = ox + dx * maxDist;
    const ey = oy + dy * maxDist;
    const ez = oz + dz * maxDist;

    const qMinX = Math.min(ox, ex) - radius - 0.1;
    const qMaxX = Math.max(ox, ex) + radius + 0.1;
    const qMinZ = Math.min(oz, ez) - radius - 0.1;
    const qMaxZ = Math.max(oz, ez) + radius + 0.1;
    const qMinY = Math.min(oy, ey) - radius - 0.1;
    const qMaxY = Math.max(oy, ey) + radius + 0.1;

    const stamp = ++this.queryStamp;
    const minCx = Math.floor(qMinX * this.invCellSize);
    const maxCx = Math.floor(qMaxX * this.invCellSize);
    const minCz = Math.floor(qMinZ * this.invCellSize);
    const maxCz = Math.floor(qMaxZ * this.invCellSize);

    let bestT = maxDist;
    let bestBox: AABB | null = null;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const list = this.cells.get(this.key(cx, cz));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const b = list[i];
          if (this.stampMap.get(b) === stamp) continue;
          this.stampMap.set(b, stamp);

          if (b.maxY < qMinY || b.minY > qMaxY) continue;
          if (filter && !filter(b)) continue;

          const t = rayIntersectExpandedAABB(ox, oy, oz, dx, dy, dz, bestT, b, radius);
          if (t !== null && t < bestT) {
            bestT = t;
            bestBox = b;
          }
        }
      }
    }

    if (!bestBox) return null;
    return {
      t: bestT,
      box: bestBox,
      hitX: ox + dx * bestT,
      hitY: oy + dy * bestT,
      hitZ: oz + dz * bestT,
    };
  }
}
