/**
 * Single source of truth for deterministic neighborhood street & yard props + their AABB colliders.
 * Pure TypeScript (zero Three.js / React imports) so GameSimulation registers exact collision boxes
 * for every car, fence, tree, bush, hydrant, pole, lamp, bench, trash bin, mailbox, patio, grill,
 * garden shed, planter, birdbath, and street sign, while StreetEnvironment renders them identically.
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
  kind: 'oak' | 'pine';
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

export type VehicleVariant = 'sedan' | 'pickup' | 'suv';

export interface ParkedCarProp {
  id: string;
  pos: [number, number, number];
  rotY: number;
  color: string;
  variant: VehicleVariant;
}

export interface LampProp {
  pos: [number, number, number];
  rotY: number;
}

export interface FlowerBedProp {
  id: string;
  x: number;
  z: number;
  rotY: number;
  width: number;
  colorIndex: number;
}

export type YardPropKind =
  | 'patio_set'
  | 'bbq_grill'
  | 'garden_shed'
  | 'raised_planter'
  | 'birdbath';

export interface YardPropSpec {
  id: string;
  kind: YardPropKind;
  x: number;
  z: number;
  rotY: number;
  color?: string;
}

export interface StreetSignProp {
  id: string;
  kind: 'street_name' | 'stop';
  x: number;
  z: number;
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
  flowerBeds: FlowerBedProp[];
  yardProps: YardPropSpec[];
  streetSigns: StreetSignProp[];
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
  const flowerBeds: FlowerBedProp[] = [];
  const yardProps: YardPropSpec[] = [];
  const lotProps: LotStreetProps[] = [];
  const colliders: AABB[] = [];

  const treeTints = ['#4f6641', '#5a6e45', '#465c3b', '#626d43', '#49583e'];
  const pineTints = ['#38523d', '#3e5a44', '#314937'];
  const bushTints = ['#4c613f', '#586944', '#415538'];
  const umbrellaColors = ['#8c4b3c', '#3e5e68', '#68734d', '#9e7a44', '#5c4b68'];
  const shedColors = ['#78634e', '#636e66', '#7d5646', '#69645c'];

  const houseIndexMap = new Map<string, number>();
  houses.forEach((h, idx) => houseIndexMap.set(h.houseId, idx));

  for (const h of houses) {
    const hIdx = houseIndexMap.get(h.houseId) ?? 0;
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
    // Trash + recycling bin pair neatly beside outer garage wall
    const binLocalX = garCenterX + sideSign * (h.garageWidth / 2 + 1.05);
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

    // Trash & recycling bin collider
    colliders.push({
      id: `col_bin_${h.houseId}`,
      minX: binW.x - 0.36,
      maxX: binW.x + 0.36,
      minY: 0,
      maxY: 1.04,
      minZ: binW.z - 0.72,
      maxZ: binW.z + 0.38,
      surface: 'metal',
      category: 'prop',
      blocksCamera: false,
    });

    // Front timber flower bed opposite driveway (clear of walkway and porch steps)
    const bedW = localToWorld(h.worldOrigin, h.rotationY, {
      x: -sideSign * 10.2,
      y: 0,
      z: hd + 4.4,
    });
    flowerBeds.push({
      id: `fbed_${h.houseId}`,
      x: bedW.x,
      z: bedW.z,
      rotY: h.rotationY,
      width: 3.4,
      colorIndex: hIdx,
    });

    // Backyard Patio Set + Market Umbrella (placed clear of back door & exterior roof ladder)
    const patioW = localToWorld(h.worldOrigin, h.rotationY, {
      x: -sideSign * 8.6,
      y: 0,
      z: -hd - 7.8,
    });
    yardProps.push({
      id: `patio_${h.houseId}`,
      kind: 'patio_set',
      x: patioW.x,
      z: patioW.z,
      rotY: h.rotationY + hIdx * 0.4,
      color: umbrellaColors[hIdx % umbrellaColors.length],
    });
    colliders.push({
      id: `col_patio_${h.houseId}`,
      minX: patioW.x - 0.78,
      maxX: patioW.x + 0.78,
      minY: 0,
      maxY: 0.9,
      minZ: patioW.z - 0.78,
      maxZ: patioW.z + 0.78,
      surface: 'wood',
      category: 'prop',
      blocksCamera: false,
    });

    // Backyard Charcoal BBQ Grill beside patio
    const grillW = localToWorld(h.worldOrigin, h.rotationY, {
      x: -sideSign * 4.4,
      y: 0,
      z: -hd - 9.2,
    });
    yardProps.push({
      id: `grill_${h.houseId}`,
      kind: 'bbq_grill',
      x: grillW.x,
      z: grillW.z,
      rotY: h.rotationY,
    });
    colliders.push({
      id: `col_grill_${h.houseId}`,
      minX: grillW.x - 0.78,
      maxX: grillW.x + 0.78,
      minY: 0,
      maxY: 1.2,
      minZ: grillW.z - 0.34,
      maxZ: grillW.z + 0.34,
      surface: 'metal',
      category: 'prop',
      blocksCamera: false,
    });

    // Backyard Wooden Garden Shed tucked neatly in garage-side rear corner
    const shedW = localToWorld(h.worldOrigin, h.rotationY, {
      x: sideSign * 14.2,
      y: 0,
      z: -hd - 9.6,
    });
    yardProps.push({
      id: `shed_${h.houseId}`,
      kind: 'garden_shed',
      x: shedW.x,
      z: shedW.z,
      rotY: h.rotationY,
      color: shedColors[hIdx % shedColors.length],
    });
    colliders.push({
      id: `col_shed_${h.houseId}`,
      minX: shedW.x - 1.62,
      maxX: shedW.x + 1.62,
      minY: 0,
      maxY: 2.75,
      minZ: shedW.z - 1.28,
      maxZ: shedW.z + 1.28,
      surface: 'wood',
      category: 'prop',
      blocksCamera: true,
    });

    // Raised veggie planter OR stone birdbath in front/side yard for livelier suburban variation
    if (hIdx % 2 === 0) {
      const planterW = localToWorld(h.worldOrigin, h.rotationY, {
        x: sideSign * 7.4,
        y: 0,
        z: -hd - 11.4,
      });
      yardProps.push({
        id: `planter_${h.houseId}`,
        kind: 'raised_planter',
        x: planterW.x,
        z: planterW.z,
        rotY: h.rotationY,
      });
      colliders.push({
        id: `col_planter_${h.houseId}`,
        minX: planterW.x - 1.08,
        maxX: planterW.x + 1.08,
        minY: 0,
        maxY: 0.6,
        minZ: planterW.z - 0.48,
        maxZ: planterW.z + 0.48,
        surface: 'wood',
        category: 'prop',
        blocksCamera: false,
      });
    } else {
      const bathW = localToWorld(h.worldOrigin, h.rotationY, {
        x: -sideSign * 14.5,
        y: 0,
        z: hd + 10.2,
      });
      yardProps.push({
        id: `birdbath_${h.houseId}`,
        kind: 'birdbath',
        x: bathW.x,
        z: bathW.z,
        rotY: 0,
      });
      colliders.push({
        id: `col_birdbath_${h.houseId}`,
        minX: bathW.x - 0.36,
        maxX: bathW.x + 0.36,
        minY: 0,
        maxY: 0.96,
        minZ: bathW.z - 0.36,
        maxZ: bathW.z + 0.36,
        surface: 'concrete',
        category: 'prop',
        blocksCamera: false,
      });
    }

    // Yard trees (mix of broadleaf oaks & evergreen pines) near outer lot corners
    const tFront = localToWorld(h.worldOrigin, h.rotationY, {
      x: -sideSign * 18.6,
      y: 0,
      z: hd + 14.5,
    });
    const tBack = localToWorld(h.worldOrigin, h.rotationY, {
      x: sideSign * 19.6,
      y: 0,
      z: -hd - 11.6,
    });
    const tSide = localToWorld(h.worldOrigin, h.rotationY, {
      x: -sideSign * 19.8,
      y: 0,
      z: -hd - 3.5,
    });
    for (const [ti, tp] of [tFront, tBack, tSide].entries()) {
      const kind: 'oak' | 'pine' = (hIdx + ti) % 3 === 1 ? 'pine' : 'oak';
      const s = rng.range(0.95, 1.32);
      trees.push({
        x: tp.x,
        z: tp.z,
        s,
        rot: rng.range(0, Math.PI * 2),
        tint: kind === 'pine' ? rng.pick(pineTints) : rng.pick(treeTints),
        kind,
      });
    }

    // Foundation shrubs along non-garage front facade & rear yard border
    const b1 = localToWorld(h.worldOrigin, h.rotationY, {
      x: -sideSign * 11.6,
      y: 0,
      z: hd + 2.3,
    });
    const b2 = localToWorld(h.worldOrigin, h.rotationY, {
      x: -sideSign * 8.4,
      y: 0,
      z: hd + 2.35,
    });
    const b3 = localToWorld(h.worldOrigin, h.rotationY, {
      x: sideSign * 18.2,
      y: 0,
      z: hd + 6.4,
    });
    for (const bp of [b1, b2, b3]) {
      bushes.push({ x: bp.x, z: bp.z, s: rng.range(0.78, 1.08), tint: rng.pick(bushTints) });
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

  // Natural perimeter tree groves bounding the 8-lot neighborhood horizon
  const groveHalfX = Math.max(150, Math.round(roadLength / 2 + 12));
  for (let x = -groveHalfX; x <= groveHalfX; x += 14) {
    for (const zBand of [-74, -88, 74, 88]) {
      const kind: 'oak' | 'pine' = rng.next() < 0.42 ? 'pine' : 'oak';
      trees.push({
        x: x + rng.range(-3.5, 3.5),
        z: zBand + rng.range(-3.5, 3.5),
        s: rng.range(1.1, 1.8),
        rot: rng.range(0, Math.PI * 2),
        tint: kind === 'pine' ? rng.pick(pineTints) : rng.pick(treeTints),
        kind,
      });
    }
  }
  const sideBandStart = Math.max(122, Math.round(roadLength / 2 - 18));
  for (let z = -58; z <= 58; z += 12) {
    if (Math.abs(z) < 9.5) continue;
    for (const xBand of [-sideBandStart, -(sideBandStart + 14), sideBandStart, sideBandStart + 14]) {
      const kind: 'oak' | 'pine' = rng.next() < 0.45 ? 'pine' : 'oak';
      trees.push({
        x: xBand + rng.range(-3.5, 3.5),
        z: z + rng.range(-3.5, 3.5),
        s: rng.range(1.05, 1.7),
        rot: rng.range(0, Math.PI * 2),
        tint: kind === 'pine' ? rng.pick(pineTints) : rng.pick(treeTints),
        kind,
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

  // Varied parked vehicles along Maple Crescent curbs (sedans, pickups, SUVs — clear of driveways)
  const cars: ParkedCarProp[] = [
    { id: 'car_curb_nw', pos: [-26, 0, -3.7], rotY: Math.PI / 2, color: '#53606b', variant: 'sedan' },
    { id: 'car_curb_se', pos: [26, 0, 3.7], rotY: -Math.PI / 2, color: '#78443a', variant: 'pickup' },
    { id: 'car_curb_ne', pos: [34, 0, -3.7], rotY: Math.PI / 2, color: '#4d5d4e', variant: 'suv' },
    { id: 'car_curb_sw', pos: [-32, 0, 3.7], rotY: -Math.PI / 2, color: '#8a8272', variant: 'sedan' },
    { id: 'car_curb_far_w', pos: [-84, 0, -3.7], rotY: Math.PI / 2, color: '#455466', variant: 'pickup' },
    { id: 'car_curb_far_e', pos: [82, 0, 3.7], rotY: -Math.PI / 2, color: '#6b4f41', variant: 'suv' },
  ];
  for (const c of cars) {
    const isAlongX = Math.abs(Math.sin(c.rotY)) > 0.5;
    const halfLen = c.variant === 'pickup' ? 2.48 : 2.3;
    const hx = isAlongX ? halfLen : 1.02;
    const hz = isAlongX ? 1.02 : halfLen;
    colliders.push({
      id: `col_${c.id}`,
      minX: c.pos[0] - hx,
      maxX: c.pos[0] + hx,
      minY: 0,
      maxY: c.variant === 'sedan' ? 1.5 : 1.72,
      minZ: c.pos[2] - hz,
      maxZ: c.pos[2] + hz,
      surface: 'metal',
      category: 'prop',
      blocksCamera: true,
    });
  }

  // Street lamps along full 8-lot sidewalks
  const lamps: LampProp[] = [];
  const halfLampSpan = Math.min(130, roadLength / 2 - 18);
  for (let x = -halfLampSpan; x <= halfLampSpan; x += 34) {
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
  const poles = [-126, -84, -42, 0, 42, 84, 126];
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
  const hydrants = [-78, -22, 24, 80];
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
    { x: -74, z: -6.9, rotY: 0 },
    { x: -18, z: -6.9, rotY: 0 },
    { x: 20, z: -6.9, rotY: 0 },
    { x: 76, z: -6.9, rotY: 0 },
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

  // Neighborhood street signs & stop signs
  const streetSigns: StreetSignProp[] = [
    { id: 'sign_maple_w', kind: 'street_name', x: -15.5, z: 5.65, rotY: 0 },
    { id: 'sign_stop_e', kind: 'stop', x: 15.5, z: -5.65, rotY: Math.PI },
    { id: 'sign_maple_far_e', kind: 'street_name', x: 64, z: 5.65, rotY: 0 },
  ];
  streetSigns.forEach((s) => {
    colliders.push({
      id: `col_${s.id}`,
      minX: s.x - 0.14,
      maxX: s.x + 0.14,
      minY: 0.14,
      maxY: 3.1,
      minZ: s.z - 0.14,
      maxZ: s.z + 0.14,
      surface: 'metal',
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
    flowerBeds,
    yardProps,
    streetSigns,
    lotProps,
    colliders,
  };
}
