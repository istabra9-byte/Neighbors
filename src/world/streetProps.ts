/**
 * Single source of truth for deterministic neighborhood street & yard props + their AABB colliders.
 * Pure TypeScript (zero Three.js / React imports) so GameSimulation registers exact collision boxes
 * for every car, fence, tree, bush, hydrant, pole, lamp, bench, trash bin, and mailbox,
 * while StreetEnvironment renders them at identical coordinates.
 */

import { SeededRNG } from '../simulation/rng';
import type { AABB } from '../simulation/types';
import { STREET_CONFIG } from './streetLayout';
import { localToWorld } from './houses';
import type { HouseBlueprint } from './houses';

export interface TreeProp {
  x: number;
  z: number;
  s: number;
  rot: number;
  tint: string;
}

export interface BushProp {
  x: number;
  z: number;
  s: number;
  tint: string;
}

export interface FencePostProp {
  x: number;
  z: number;
}

export interface FenceRailProp {
  x: number;
  z: number;
  len: number;
  rotY: number;
}

export interface ParkedCarProp {
  id: string;
  pos: [number, number, number];
  rotY: number;
  color: string;
}

export interface LampProp {
  pos: [number, number, number];
  rotY: number;
}

export interface LotStreetProps {
  houseId: string;
  rotationY: number;
  driveCenter: { x: number; y: number; z: number };
  driveWidth: number;
  driveLength: number;
  walkCenter: { x: number; y: number; z: number };
  walkLength: number;
  mailboxPos: { x: number; z: number };
  binPos: { x: number; z: number };
}

export interface StreetPropsBundle {
  trees: TreeProp[];
  bushes: BushProp[];
  fencePosts: FencePostProp[];
  fenceRails: FenceRailProp[];
  cars: ParkedCarProp[];
  lamps: LampProp[];
  poles: number[];
  hydrants: number[];
  benches: Array<{ x: number; z: number; rotY: number }>;
  lotProps: LotStreetProps[];
  colliders: AABB[];
}

export function generateStreetProps(
  houses: readonly HouseBlueprint[],
  roadLength: number,
  seed: number,
): StreetPropsBundle {
  const rng = new SeededRNG(seed ^ 0x77e3001);
  const trees: TreeProp[] = [];
  const bushes: BushProp[] = [];
  const fencePosts: FencePostProp[] = [];
  const fenceRails: FenceRailProp[] = [];
  const lotProps: LotStreetProps[] = [];
  const colliders: AABB[] = [];

  const treeTints = ['#4f6641', '#5a6e45', '#465c3b', '#626d43', '#49583e'];
  const bushTints = ['#4c613f', '#586944', '#415538'];

  for (const h of houses) {
    const lotW = STREET_CONFIG.lotWidth;
    const lotD = STREET_CONFIG.lotDepth;
    const cx = h.lot.position.x;
    const cz = h.lot.position.z;
    const hd = h.depth / 2;
    const sideSign = h.lot.garageSide === 'right' ? 1 : -1;

    // Concrete driveway aligned directly to the attached garage door X
    const garCenterX = h.garageCenterLocalX;
    const driveLen = 22.5;
    const driveCenter = localToWorld(h.worldOrigin, h.rotationY, {
      x: garCenterX,
      y: 0.025,
      z: hd + driveLen / 2 - 1.4,
    });
    const walkLen = 20.5;
    const walkCenter = localToWorld(h.worldOrigin, h.rotationY, {
      x: h.frontDoorLocalX,
      y: 0.028,
      z: hd + walkLen / 2 + 0.6,
    });
    // Mailbox cleanly beside front curb (away from walkway & driveway)
    const mailboxLocalX = h.frontDoorLocalX - sideSign * 3.0;
    const mailboxW = localToWorld(h.worldOrigin, h.rotationY, {
      x: mailboxLocalX,
      y: 0,
      z: hd + 19.6,
    });
    // Trash bin neatly beside outer garage wall
    const binLocalX = garCenterX + sideSign * (h.garageWidth / 2 + 1.0);
    const binW = localToWorld(h.worldOrigin, h.rotationY, {
      x: binLocalX,
      y: 0,
      z: hd - 1.2,
    });

    lotProps.push({
      houseId: h.houseId,
      rotationY: h.rotationY,
      driveCenter,
      driveWidth: 5.4,
      driveLength: driveLen,
      walkCenter,
      walkLength: walkLen,
      mailboxPos: { x: mailboxW.x, z: mailboxW.z },
      binPos: { x: binW.x, z: binW.z },
    });

    // Mailbox collider
    colliders.push({
      id: `col_mailbox_${h.houseId}`,
      minX: mailboxW.x - 0.24,
      maxX: mailboxW.x + 0.24,
      minY: 0,
      maxY: 1.32,
      minZ: mailboxW.z - 0.26,
      maxZ: mailboxW.z + 0.26,
      surface: 'wood',
      category: 'prop',
      blocksCamera: false,
    });

    // Trash bin collider
    colliders.push({
      id: `col_bin_${h.houseId}`,
      minX: binW.x - 0.34,
      maxX: binW.x + 0.34,
      minY: 0,
      maxY: 1.04,
      minZ: binW.z - 0.34,
      maxZ: binW.z + 0.34,
      surface: 'metal',
      category: 'prop',
      blocksCamera: false,
    });

    // Yard trees placed cleanly near outer lot corners (never blocking doors, ladders, or driveway)
    const tFront = localToWorld(h.worldOrigin, h.rotationY, {
      x: -sideSign * 18.2,
      y: 0,
      z: hd + 14.5,
    });
    const tBack = localToWorld(h.worldOrigin, h.rotationY, {
      x: sideSign * 18.5,
      y: 0,
      z: -hd - 11.2,
    });
    for (const tp of [tFront, tBack]) {
      const s = rng.range(0.95, 1.28);
      trees.push({
        x: tp.x,
        z: tp.z,
        s,
        rot: rng.range(0, Math.PI * 2),
        tint: rng.pick(treeTints),
      });
    }

    // Foundation shrubs along non-garage front facade (kept clear of porch steps & windows)
    const b1 = localToWorld(h.worldOrigin, h.rotationY, {
      x: -sideSign * 10.6,
      y: 0,
      z: hd + 2.2,
    });
    const b2 = localToWorld(h.worldOrigin, h.rotationY, {
      x: -sideSign * 8.8,
      y: 0,
      z: hd + 2.25,
    });
    for (const bp of [b1, b2]) {
      bushes.push({ x: bp.x, z: bp.z, s: rng.range(0.8, 1.08), tint: rng.pick(bushTints) });
    }

    // Backyard & side lot wooden privacy fences (open front lawn & driveway)
    const backZ = h.lot.side === 'north' ? cz - lotD / 2 + 0.5 : cz + lotD / 2 - 0.5;
    const sideStartZ = h.lot.side === 'north' ? cz - lotD / 2 + 0.5 : cz + 1.5;
    const sideEndZ = h.lot.side === 'north' ? cz - 1.5 : cz + lotD / 2 - 0.5;

    for (let fx = cx - lotW / 2; fx <= cx + lotW / 2; fx += 3.0) {
      fencePosts.push({ x: fx, z: backZ });
    }
    fenceRails.push({ x: cx, z: backZ, len: lotW, rotY: 0 });
    colliders.push({
      id: `col_fence_back_${h.houseId}`,
      minX: cx - lotW / 2,
      maxX: cx + lotW / 2,
      minY: 0,
      maxY: 1.56,
      minZ: backZ - 0.1,
      maxZ: backZ + 0.1,
      surface: 'wood',
      category: 'prop',
      blocksCamera: true,
    });

    for (const [idx, sideX] of [cx - lotW / 2, cx + lotW / 2].entries()) {
      const span = Math.abs(sideEndZ - sideStartZ);
      const midZ = (sideStartZ + sideEndZ) / 2;
      for (let fz = Math.min(sideStartZ, sideEndZ); fz <= Math.max(sideStartZ, sideEndZ); fz += 3.0) {
        fencePosts.push({ x: sideX, z: fz });
      }
      fenceRails.push({ x: sideX, z: midZ, len: span, rotY: Math.PI / 2 });
      colliders.push({
        id: `col_fence_side_${h.houseId}_${idx}`,
        minX: sideX - 0.1,
        maxX: sideX + 0.1,
        minY: 0,
        maxY: 1.56,
        minZ: Math.min(sideStartZ, sideEndZ),
        maxZ: Math.max(sideStartZ, sideEndZ),
        surface: 'wood',
        category: 'prop',
        blocksCamera: true,
      });
    }
  }

  // Natural perimeter tree groves bounding the neighborhood horizon
  for (let x = -148; x <= 148; x += 13) {
    for (const zBand of [-74, -86, 74, 86]) {
      trees.push({
        x: x + rng.range(-3.5, 3.5),
        z: zBand + rng.range(-3.5, 3.5),
        s: rng.range(1.1, 1.75),
        rot: rng.range(0, Math.PI * 2),
        tint: rng.pick(treeTints),
      });
    }
  }
  for (let z = -58; z <= 58; z += 12) {
    if (Math.abs(z) < 9.5) continue;
    for (const xBand of [-96, -108, 96, 108]) {
      trees.push({
        x: xBand + rng.range(-3.5, 3.5),
        z: z + rng.range(-3.5, 3.5),
        s: rng.range(1.05, 1.65),
        rot: rng.range(0, Math.PI * 2),
        tint: rng.pick(treeTints),
      });
    }
  }

  // Tree trunk colliders (every tree has solid collision!)
  trees.forEach((t, i) => {
    const r = 0.34 * t.s;
    colliders.push({
      id: `col_tree_${i}`,
      minX: t.x - r,
      maxX: t.x + r,
      minY: 0,
      maxY: 3.4 * t.s,
      minZ: t.z - r,
      maxZ: t.z + r,
      surface: 'wood',
      category: 'prop',
      blocksCamera: true,
    });
  });

  // Bush colliders
  bushes.forEach((b, i) => {
    const r = 0.55 * b.s;
    colliders.push({
      id: `col_bush_${i}`,
      minX: b.x - r,
      maxX: b.x + r,
      minY: 0,
      maxY: 0.9 * b.s,
      minZ: b.z - r,
      maxZ: b.z + r,
      surface: 'grass',
      category: 'prop',
      blocksCamera: false,
    });
  });

  // Parked cars along curbs & outer lot driveways (never blocking player's driveway or walkway)
  const carColors = ['#53606b', '#76433a', '#4f5d4e', '#8b8374', '#3f454c'];
  const cars: ParkedCarProp[] = [
    { id: 'car_curb_nw', pos: [-26, 0, -3.7], rotY: Math.PI / 2, color: carColors[0] },
    { id: 'car_curb_se', pos: [24, 0, 3.7], rotY: -Math.PI / 2, color: carColors[1] },
    { id: 'car_curb_ne', pos: [30, 0, -3.7], rotY: Math.PI / 2, color: carColors[2] },
    { id: 'car_curb_sw', pos: [-30, 0, 3.7], rotY: -Math.PI / 2, color: carColors[3] },
  ];
  for (const c of cars) {
    const isAlongX = Math.abs(Math.sin(c.rotY)) > 0.5;
    const hx = isAlongX ? 2.25 : 0.98;
    const hz = isAlongX ? 0.98 : 2.25;
    colliders.push({
      id: `col_${c.id}`,
      minX: c.pos[0] - hx,
      maxX: c.pos[0] + hx,
      minY: 0,
      maxY: 1.48,
      minZ: c.pos[2] - hz,
      maxZ: c.pos[2] + hz,
      surface: 'metal',
      category: 'prop',
      blocksCamera: true,
    });
  }

  // Street lamps along sidewalks
  const lamps: LampProp[] = [];
  const halfRoad = Math.min(80, roadLength / 2 - 20);
  for (let x = -halfRoad; x <= halfRoad; x += 34) {
    lamps.push({ pos: [x, 0.14, -6.9], rotY: 0 });
    lamps.push({ pos: [x + 17, 0.14, 6.9], rotY: Math.PI });
  }
  lamps.forEach((l, i) => {
    colliders.push({
      id: `col_lamp_${i}`,
      minX: l.pos[0] - 0.18,
      maxX: l.pos[0] + 0.18,
      minY: 0,
      maxY: 5.9,
      minZ: l.pos[2] - 0.18,
      maxZ: l.pos[2] + 0.18,
      surface: 'metal',
      category: 'prop',
      blocksCamera: false,
    });
  });

  // Wooden power poles along north boulevard
  const poles = [-84, -42, 0, 42, 84];
  poles.forEach((px, i) => {
    colliders.push({
      id: `col_pole_${i}`,
      minX: px - 0.2,
      maxX: px + 0.2,
      minY: 0,
      maxY: 8.8,
      minZ: -8.3 - 0.2,
      maxZ: -8.3 + 0.2,
      surface: 'wood',
      category: 'prop',
      blocksCamera: false,
    });
  });

  // Fire hydrants along south curb
  const hydrants = [-22, 24];
  hydrants.forEach((hx, i) => {
    colliders.push({
      id: `col_hydrant_${i}`,
      minX: hx - 0.22,
      maxX: hx + 0.22,
      minY: 0.14,
      maxY: 0.96,
      minZ: 5.55 - 0.22,
      maxZ: 5.55 + 0.22,
      surface: 'metal',
      category: 'prop',
      blocksCamera: false,
    });
  });

  // Street park benches
  const benches = [
    { x: -18, z: -6.9, rotY: 0 },
    { x: 20, z: -6.9, rotY: 0 },
  ];
  benches.forEach((b, i) => {
    colliders.push({
      id: `col_bench_${i}`,
      minX: b.x - 0.95,
      maxX: b.x + 0.95,
      minY: 0.14,
      maxY: 1.0,
      minZ: b.z - 0.34,
      maxZ: b.z + 0.34,
      surface: 'wood',
      category: 'prop',
      blocksCamera: false,
    });
  });

  return {
    trees,
    bushes,
    fencePosts,
    fenceRails,
    cars,
    lamps,
    poles,
    hydrants,
    benches,
    lotProps,
    colliders,
  };
}
