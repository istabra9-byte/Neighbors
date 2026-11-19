/**
 * Procedural modular house blueprints (pure data, zero Three.js / React deps).
 * Supports 8 genuinely distinct house architectures with varied silhouettes, roof/facade accents,
 * porches, balconies, floor plans, room placements, stair directions, and 38+ composite furniture types.
 * Engineered on a structural grid at full suburban scale (24 x 18 m main + 8.0 x 9.6 m attached garage,
 * 3.80 m clear ceilings, 1.36 x 2.42 m doors, 1.60 m stairs with >= 2.40 m headroom).
 */

import type {
  AABB,
  DoorEntity,
  HeadroomVolume,
  HouseAnchor,
  LadderSpec,
  LotConfig,
  NavNode,
  StairRamp,
  Vec3,
  WindowEntity,
  YardSlotEntity,
  YardSlotKind,
} from '../simulation/types';
import { STREET_CONFIG } from './streetLayout';
import {
  HOUSE_ARCHETYPES,
  type ArchetypeSpec,
  type HousePalette,
} from './houseArchetypes';

export type { ArchetypeSpec, HousePalette };

export interface WallSegmentSpec {
  id: string;
  /** Center in house-local space (already mirrored if garageSide === 'left') */
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  material: 'exterior' | 'interior' | 'trim' | 'concrete' | 'roof' | 'garage' | 'shelter' | 'accent';
  floorLevel: number; // -1 shelter, 0 ground, 1 second, 2 roof
  blocksCamera?: boolean;
}

export interface FloorSlabSpec {
  id: string;
  x: number;
  y: number; // top surface Y
  z: number;
  sx: number;
  thickness: number;
  sz: number;
  surface: 'wood' | 'tile' | 'concrete' | 'roof';
  floorLevel: number;
}

export interface RailingSpec {
  id: string;
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
  height: number;
  floorLevel: number;
  style: 'wood' | 'metal' | 'glass';
}

export interface StairSpec {
  id: string;
  x: number;
  zStart: number;
  zEnd: number;
  yStart: number;
  yEnd: number;
  width: number;
  steps: number;
  floorLevel: number;
  railLeft: boolean;
  railRight: boolean;
}

export type FurnitureKind =
  | 'sofa'
  | 'sectional_sofa'
  | 'armchair'
  | 'coffee_table'
  | 'tv_stand'
  | 'fireplace'
  | 'rug'
  | 'floor_lamp'
  | 'ceiling_lamp'
  | 'kitchen_counter'
  | 'kitchen_island'
  | 'upper_cabinets'
  | 'fridge'
  | 'stove'
  | 'dining_table'
  | 'dining_set'
  | 'sideboard'
  | 'bed_double'
  | 'bed_single'
  | 'nightstand'
  | 'wardrobe'
  | 'dresser'
  | 'desk'
  | 'computer_desk'
  | 'easel'
  | 'piano'
  | 'bathtub'
  | 'toilet'
  | 'vanity'
  | 'hamper'
  | 'workbench'
  | 'shelf'
  | 'tool_chest'
  | 'tires_stack'
  | 'bicycle'
  | 'safe'
  | 'generator'
  | 'crate'
  | 'bunker_cot'
  | 'supply_locker'
  | 'radio_desk'
  | 'water_barrel'
  | 'tunnel_hatch'
  | 'shelter_hatch'
  | 'picture'
  | 'bookshelf'
  | 'washer'
  | 'potted_plant'
  | 'porch_chair'
  | 'welcome_mat';

export interface FurnitureSpec {
  id: string;
  kind: FurnitureKind;
  x: number;
  y: number; // bottom-center flush with floor
  z: number;
  rotationY: number;
  floorLevel: number;
  collider?: { sx: number; sy: number; sz: number };
}

export interface RoomBoundsSpec {
  roomKey: string;
  floorLevel: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PorchVisualSpec {
  x: number;
  z: number;
  width: number;
  depth: number;
  roofY: number;
  hasStoneBases: boolean;
  columnLocalXs: number[];
  style: ArchetypeSpec['porchStyle'];
}

export interface BalconyVisualSpec {
  x: number;
  z: number;
  width: number;
  depth: number;
  floorY: number;
}

export interface HouseBlueprint {
  houseId: string;
  lot: LotConfig;
  archetype: ArchetypeSpec;
  worldOrigin: Vec3;
  rotationY: number;
  width: number;
  depth: number;
  garageCenterLocalX: number;
  garageWidth: number;
  garageDepth: number;
  garageMinZ: number;
  garageMaxZ: number;
  frontDoorLocalX: number;
  frontDoorLocalZ: number;
  hatchLocalX: number;
  hatchLocalZ: number;
  totalMinX: number;
  totalMaxX: number;
  totalMinZ: number;
  totalMaxZ: number;
  groundFloorY: number;
  secondFloorY: number;
  roofDeckY: number;
  shelterFloorY: number;
  ceilingHeight: number;
  palette: HousePalette;
  porch: PorchVisualSpec;
  balcony: BalconyVisualSpec | null;
  walls: WallSegmentSpec[];
  slabs: FloorSlabSpec[];
  stairs: StairSpec[];
  stairRamps: StairRamp[];
  railings: RailingSpec[];
  ladders: LadderSpec[];
  headroomVolumes: HeadroomVolume[];
  rooms: RoomBoundsSpec[];
  furniture: FurnitureSpec[];
  doors: DoorEntity[];
  windows: WindowEntity[];
  yardSlots: YardSlotEntity[];
  anchors: HouseAnchor[];
  colliders: AABB[];
  navNodes: NavNode[];
}

export const HOUSE_CONSTANTS = {
  GROUND_Y: 0.30,
  SLAB_T: 0.25,
  CEILING_H: 3.80,
  SECOND_Y: 4.35,
  ROOF_Y: 8.40,
  SHELTER_Y: -4.05,
  WALL_T: 0.24,
  INT_T: 0.16,
  DOOR_W: 1.36,
  DOOR_H: 2.42,
  GARAGE_DOOR_W: 4.40,
  GARAGE_DOOR_H: 2.75,
  WIN_W: 2.15,
  WIN_H: 1.65,
  WIN_SILL: 0.95,
  STAIR_W: 1.60,
  STAIR_STEPS: 22,
  STAIR_RUN: 0.30,
  MIN_STAIR_HEADROOM: 2.40,
} as const;

/** Converts house-local point to world-space point using house origin and yaw. */
export function localToWorld(origin: Vec3, rotationY: number, local: Vec3): Vec3 {
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  return {
    x: origin.x + local.x * c + local.z * s,
    y: origin.y + local.y,
    z: origin.z - local.x * s + local.z * c,
  };
}

/** Converts world-space point into house-local coordinates. */
export function worldToLocal(origin: Vec3, rotationY: number, world: Vec3): Vec3 {
  const dx = world.x - origin.x;
  const dz = world.z - origin.z;
  const c = Math.cos(-rotationY);
  const s = Math.sin(-rotationY);
  return {
    x: dx * c + dz * s,
    y: world.y - origin.y,
    z: -dx * s + dz * c,
  };
}

/** Converts a house-local AABB into a world-space AABB (works cleanly for 0 and PI rotations). */
function localBoxToWorldAABB(
  id: string,
  origin: Vec3,
  rotationY: number,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  extra?: Partial<AABB>,
): AABB {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const p1 = localToWorld(origin, rotationY, { x: cx - hx, y: cy - hy, z: cz - hz });
  const p2 = localToWorld(origin, rotationY, { x: cx + hx, y: cy + hy, z: cz + hz });
  return {
    id,
    minX: Math.min(p1.x, p2.x),
    maxX: Math.max(p1.x, p2.x),
    minY: Math.min(p1.y, p2.y),
    maxY: Math.max(p1.y, p2.y),
    minZ: Math.min(p1.z, p2.z),
    maxZ: Math.max(p1.z, p2.z),
    blocksCamera: true,
    ...extra,
  };
}

/** Slices a wall along X into solid segments around door/window openings. */
function pushWallAlongX(
  walls: WallSegmentSpec[],
  prefix: string,
  xMin: number,
  xMax: number,
  z: number,
  yBottom: number,
  height: number,
  thickness: number,
  material: WallSegmentSpec['material'],
  floorLevel: number,
  openings: Array<{ cx: number; w: number; bottomOffset: number; h: number }> = [],
): void {
  const aMin = Math.min(xMin, xMax);
  const aMax = Math.max(xMin, xMax);
  const sorted = [...openings].sort((a, b) => a.cx - b.cx);
  let cursor = aMin;
  let seg = 0;

  for (const op of sorted) {
    const oMin = op.cx - op.w / 2;
    const oMax = op.cx + op.w / 2;
    if (oMin > cursor + 0.02) {
      const len = oMin - cursor;
      walls.push({
        id: `${prefix}_s${seg++}`,
        x: cursor + len / 2,
        y: yBottom + height / 2,
        z,
        sx: len,
        sy: height,
        sz: thickness,
        material,
        floorLevel,
      });
    }
    if (op.bottomOffset > 0.02) {
      walls.push({
        id: `${prefix}_sill${seg++}`,
        x: op.cx,
        y: yBottom + op.bottomOffset / 2,
        z,
        sx: op.w,
        sy: op.bottomOffset,
        sz: thickness,
        material,
        floorLevel,
      });
    }
    const topGap = height - (op.bottomOffset + op.h);
    if (topGap > 0.02) {
      walls.push({
        id: `${prefix}_hdr${seg++}`,
        x: op.cx,
        y: yBottom + op.bottomOffset + op.h + topGap / 2,
        z,
        sx: op.w,
        sy: topGap,
        sz: thickness,
        material,
        floorLevel,
      });
    }
    cursor = oMax;
  }

  if (aMax > cursor + 0.02) {
    const len = aMax - cursor;
    walls.push({
      id: `${prefix}_s${seg++}`,
      x: cursor + len / 2,
      y: yBottom + height / 2,
      z,
      sx: len,
      sy: height,
      sz: thickness,
      material,
      floorLevel,
    });
  }
}

/** Slices a wall along Z into solid segments around door/window openings. */
function pushWallAlongZ(
  walls: WallSegmentSpec[],
  prefix: string,
  zMin: number,
  zMax: number,
  x: number,
  yBottom: number,
  height: number,
  thickness: number,
  material: WallSegmentSpec['material'],
  floorLevel: number,
  openings: Array<{ cz: number; w: number; bottomOffset: number; h: number }> = [],
): void {
  const aMin = Math.min(zMin, zMax);
  const aMax = Math.max(zMin, zMax);
  const sorted = [...openings].sort((a, b) => a.cz - b.cz);
  let cursor = aMin;
  let seg = 0;

  for (const op of sorted) {
    const oMin = op.cz - op.w / 2;
    const oMax = op.cz + op.w / 2;
    if (oMin > cursor + 0.02) {
      const len = oMin - cursor;
      walls.push({
        id: `${prefix}_s${seg++}`,
        x,
        y: yBottom + height / 2,
        z: cursor + len / 2,
        sx: thickness,
        sy: height,
        sz: len,
        material,
        floorLevel,
      });
    }
    if (op.bottomOffset > 0.02) {
      walls.push({
        id: `${prefix}_sill${seg++}`,
        x,
        y: yBottom + op.bottomOffset / 2,
        z: op.cz,
        sx: thickness,
        sy: op.bottomOffset,
        sz: op.w,
        material,
        floorLevel,
      });
    }
    const topGap = height - (op.bottomOffset + op.h);
    if (topGap > 0.02) {
      walls.push({
        id: `${prefix}_hdr${seg++}`,
        x,
        y: yBottom + op.bottomOffset + op.h + topGap / 2,
        z: op.cz,
        sx: thickness,
        sy: topGap,
        sz: op.w,
        material,
        floorLevel,
      });
    }
    cursor = oMax;
  }

  if (aMax > cursor + 0.02) {
    const len = aMax - cursor;
    walls.push({
      id: `${prefix}_s${seg++}`,
      x,
      y: yBottom + height / 2,
      z: cursor + len / 2,
      sx: thickness,
      sy: height,
      sz: len,
      material,
      floorLevel,
    });
  }
}

/** Helper to add a 2D floor slab minus one rectangular cutout (for stairwells or shelter hatches). */
function pushSlabWithCutout(
  slabs: FloorSlabSpec[],
  prefix: string,
  xMin: number,
  xMax: number,
  zMin: number,
  zMax: number,
  y: number,
  thickness: number,
  surface: FloorSlabSpec['surface'],
  floorLevel: number,
  cut: { minX: number; maxX: number; minZ: number; maxZ: number },
): void {
  const cMinX = Math.max(xMin, cut.minX);
  const cMaxX = Math.min(xMax, cut.maxX);
  const cMinZ = Math.max(zMin, cut.minZ);
  const cMaxZ = Math.min(zMax, cut.maxZ);

  if (cMinX > xMin + 0.05) {
    slabs.push({
      id: `${prefix}_L`,
      x: (xMin + cMinX) / 2,
      y,
      z: (zMin + zMax) / 2,
      sx: cMinX - xMin,
      thickness,
      sz: zMax - zMin,
      surface,
      floorLevel,
    });
  }
  if (xMax > cMaxX + 0.05) {
    slabs.push({
      id: `${prefix}_R`,
      x: (cMaxX + xMax) / 2,
      y,
      z: (zMin + zMax) / 2,
      sx: xMax - cMaxX,
      thickness,
      sz: zMax - zMin,
      surface,
      floorLevel,
    });
  }
  if (cMinZ > zMin + 0.05) {
    slabs.push({
      id: `${prefix}_B`,
      x: (cMinX + cMaxX) / 2,
      y,
      z: (zMin + cMinZ) / 2,
      sx: cMaxX - cMinX,
      thickness,
      sz: cMinZ - zMin,
      surface,
      floorLevel,
    });
  }
  if (zMax > cMaxZ + 0.05) {
    slabs.push({
      id: `${prefix}_F`,
      x: (cMinX + cMaxX) / 2,
      y,
      z: (cMaxZ + zMax) / 2,
      sx: cMaxX - cMinX,
      thickness,
      sz: zMax - cMaxZ,
      surface,
      floorLevel,
    });
  }
}

/**
 * Builds the complete walkable, structurally engineered blueprint for a single lot's house.
 * Supports all 8 distinct house architectures, mirroring cleanly along X when `garageSide === 'left'`.
 */
export function buildHouseBlueprint(lot: LotConfig): HouseBlueprint {
  const houseId = `house_${lot.id}`;
  const ownerId = lot.ownerSlotId ?? `npc_${lot.id}`;
  const rotationY = lot.rotationY;
  const mirror = lot.garageSide === 'left' ? -1 : 1;
  const worldOrigin = localToWorld(lot.position, rotationY, {
    x: 0,
    y: 0,
    z: STREET_CONFIG.houseLocalOffsetZ,
  });

  const mx = (x: number) => x * mirror;
  const mRot = (r: number) => (mirror === 1 ? r : -r);

  const T = HOUSE_CONSTANTS.WALL_T;
  const IT = HOUSE_CONSTANTS.INT_T;
  const Y0 = HOUSE_CONSTANTS.GROUND_Y;
  const Y1 = HOUSE_CONSTANTS.SECOND_Y;
  const Y2 = HOUSE_CONSTANTS.ROOF_Y;
  const YS = HOUSE_CONSTANTS.SHELTER_Y;
  const H = HOUSE_CONSTANTS.CEILING_H;
  const ST = HOUSE_CONSTANTS.SLAB_T;
  const DW = HOUSE_CONSTANTS.DOOR_W;
  const DH = HOUSE_CONSTANTS.DOOR_H;
  const GDW = HOUSE_CONSTANTS.GARAGE_DOOR_W;
  const GDH = HOUSE_CONSTANTS.GARAGE_DOOR_H;
  const WW = HOUSE_CONSTANTS.WIN_W;
  const WH = HOUSE_CONSTANTS.WIN_H;
  const WS = HOUSE_CONSTANTS.WIN_SILL;
  const STAIR_W = HOUSE_CONSTANTS.STAIR_W;
  const STAIR_STEPS = HOUSE_CONSTANTS.STAIR_STEPS;
  const STAIR_LEN = STAIR_STEPS * HOUSE_CONSTANTS.STAIR_RUN;

  const arch = HOUSE_ARCHETYPES[lot.houseType] ?? HOUSE_ARCHETYPES.brick_colonial;
  const palette = arch.palettes[lot.paletteVariant % arch.palettes.length];

  const isWestWing = arch.westFrontZ > arch.eastFrontZ; // Craftsman L-wing
  const isEastWing = arch.eastFrontZ > arch.westFrontZ; // Nordic east-wing L-shape
  const isModernWide = arch.balconySide === 'west'; // Stucco Modern & Industrial Loft
  const hasEastBalcony = arch.balconySide === 'east'; // Mediterranean Villa

  const W = 24.0;
  const D = 18.0;
  const hw = W / 2; // 12.0
  const hd = D / 2; // 9.0
  const garW = 8.0;
  const garD = 9.6;
  const garMinX = hw; // +12.0
  const garMaxX = hw + garW; // +20.0
  const garMinZ = -3.0;
  const garMaxZ = garMinZ + garD; // +6.6
  const garCenterX = (garMinX + garMaxX) / 2; // +16.0

  const westFrontZ = arch.westFrontZ;
  const eastFrontZ = arch.eastFrontZ;
  const hallLeftX = arch.hallLeftX;
  const hallRightX = arch.hallRightX;
  const hallFrontZ = isEastWing ? westFrontZ : eastFrontZ;
  const frontDoorX = arch.frontDoorX;
  const frontDoorZ = hallFrontZ;
  const backDoorX = frontDoorX;

  const s1X = arch.s1X;
  const s1ZStart = arch.s1Reverse ? -4.2 : 3.2;
  const s1ZEnd = arch.s1Reverse ? -4.2 + STAIR_LEN : 3.2 - STAIR_LEN;

  const s2X = arch.s2X;
  const s2ZStart = arch.s2ZStart;
  const s2ZEnd = s2ZStart + STAIR_LEN;
  const roofDoorZ = s2ZEnd + 1.05;

  // Garage shelter hatch position (aligned cleanly under garage, matching tunnel meridian!)
  const hatchX = garMinX + 1.8; // +13.8
  const hatchZ = garMinZ + 1.8; // -1.2

  // Exterior roof ladder on outer non-garage wall
  const ladderWallX = -hw;
  const ladderZ = -2.0;
  const ladderClimbX = -hw - 0.38;

  const walls: WallSegmentSpec[] = [];
  const slabs: FloorSlabSpec[] = [];
  const stairs: StairSpec[] = [];
  const stairRamps: StairRamp[] = [];
  const railings: RailingSpec[] = [];
  const ladders: LadderSpec[] = [];
  const headroomVolumes: HeadroomVolume[] = [];
  const rooms: RoomBoundsSpec[] = [];
  const furniture: FurnitureSpec[] = [];
  const doors: DoorEntity[] = [];
  const windows: WindowEntity[] = [];
  const yardSlots: YardSlotEntity[] = [];
  const anchors: HouseAnchor[] = [];
  const colliders: AABB[] = [];
  const navNodes: NavNode[] = [];

  const addWallX = (
    prefix: string,
    x1: number,
    x2: number,
    z: number,
    yBottom: number,
    height: number,
    thickness: number,
    material: WallSegmentSpec['material'],
    floorLevel: number,
    openings: Array<{ cx: number; w: number; bottomOffset: number; h: number }> = [],
  ) => {
    pushWallAlongX(
      walls,
      prefix,
      mx(x1),
      mx(x2),
      z,
      yBottom,
      height,
      thickness,
      material,
      floorLevel,
      openings.map((o) => ({ ...o, cx: mx(o.cx) })),
    );
  };

  const addWallZ = (
    prefix: string,
    z1: number,
    z2: number,
    x: number,
    yBottom: number,
    height: number,
    thickness: number,
    material: WallSegmentSpec['material'],
    floorLevel: number,
    openings: Array<{ cz: number; w: number; bottomOffset: number; h: number }> = [],
  ) => {
    pushWallAlongZ(
      walls,
      prefix,
      z1,
      z2,
      mx(x),
      yBottom,
      height,
      thickness,
      material,
      floorLevel,
      openings,
    );
  };

  const addSlab = (
    id: string,
    x1: number,
    x2: number,
    z1: number,
    z2: number,
    y: number,
    thickness: number,
    surface: FloorSlabSpec['surface'],
    floorLevel: number,
  ) => {
    const aMinX = Math.min(mx(x1), mx(x2));
    const aMaxX = Math.max(mx(x1), mx(x2));
    const aMinZ = Math.min(z1, z2);
    const aMaxZ = Math.max(z1, z2);
    slabs.push({
      id,
      x: (aMinX + aMaxX) / 2,
      y,
      z: (aMinZ + aMaxZ) / 2,
      sx: aMaxX - aMinX,
      thickness,
      sz: aMaxZ - aMinZ,
      surface,
      floorLevel,
    });
  };

  const addSlabCut = (
    prefix: string,
    x1: number,
    x2: number,
    z1: number,
    z2: number,
    y: number,
    thickness: number,
    surface: FloorSlabSpec['surface'],
    floorLevel: number,
    cut: { minX: number; maxX: number; minZ: number; maxZ: number },
  ) => {
    const aMinX = Math.min(mx(x1), mx(x2));
    const aMaxX = Math.max(mx(x1), mx(x2));
    const cMinX = Math.min(mx(cut.minX), mx(cut.maxX));
    const cMaxX = Math.max(mx(cut.minX), mx(cut.maxX));
    pushSlabWithCutout(slabs, prefix, aMinX, aMaxX, z1, z2, y, thickness, surface, floorLevel, {
      minX: cMinX,
      maxX: cMaxX,
      minZ: Math.min(cut.minZ, cut.maxZ),
      maxZ: Math.max(cut.minZ, cut.maxZ),
    });
  };

  const addRailing = (
    id: string,
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    floorLevel: number,
    style: RailingSpec['style'] = arch.railingStyle,
    height: number = 1.0,
  ) => {
    railings.push({
      id,
      x1: mx(x1),
      y1,
      z1,
      x2: mx(x2),
      y2,
      z2,
      height,
      floorLevel,
      style,
    });
  };

  const addRoom = (
    roomKey: string,
    floorLevel: number,
    x1: number,
    x2: number,
    z1: number,
    z2: number,
  ) => {
    rooms.push({
      roomKey,
      floorLevel,
      minX: Math.min(mx(x1), mx(x2)),
      maxX: Math.max(mx(x1), mx(x2)),
      minZ: Math.min(z1, z2),
      maxZ: Math.max(z1, z2),
    });
  };

  const addFurn = (
    id: string,
    kind: FurnitureKind,
    x: number,
    y: number,
    z: number,
    rotY: number,
    floorLevel: number,
    collider?: { sx: number; sy: number; sz: number },
  ) => {
    furniture.push({
      id,
      kind,
      x: mx(x),
      y,
      z,
      rotationY: mRot(rotY),
      floorLevel,
      collider,
    });
  };

  const addDoor = (
    suffix: string,
    kind: DoorEntity['kind'],
    labelKey: string,
    lx: number,
    ly: number,
    lz: number,
    localRot: number,
    width: number,
    height: number,
    floorLevel: number,
  ) => {
    const mlX = mx(lx);
    const mlRot = mRot(localRot);
    const wp = localToWorld(worldOrigin, rotationY, { x: mlX, y: ly, z: lz });
    const id = `${houseId}_door_${suffix}`;
    doors.push({
      id,
      ownerId,
      houseId,
      labelKey,
      kind,
      position: wp,
      rotationY: rotationY + mlRot,
      width,
      height,
      floorLevel,
      isOpen: false,
      isLocked: false,
      isBarricaded: false,
      damageState: 'intact',
      openProgress: 0,
    });
    const cosR = Math.abs(Math.cos(mlRot));
    const sx = cosR > 0.5 ? width : 0.18;
    const sz = cosR > 0.5 ? 0.18 : width;
    colliders.push(
      localBoxToWorldAABB(`col_${id}`, worldOrigin, rotationY, mlX, ly + height / 2, lz, sx, height, sz, {
        dynamicDoorId: id,
        houseId,
        floorLevel,
        surface: kind === 'garage' ? 'metal' : 'wood',
        category: 'door',
        blocksCamera: true,
      }),
    );
  };

  const addWindow = (
    suffix: string,
    labelKey: string,
    lx: number,
    ly: number,
    lz: number,
    localRot: number,
    width: number,
    height: number,
    floorLevel: number,
  ) => {
    const mlX = mx(lx);
    const mlRot = mRot(localRot);
    const wp = localToWorld(worldOrigin, rotationY, { x: mlX, y: ly, z: lz });
    const id = `${houseId}_win_${suffix}`;
    windows.push({
      id,
      ownerId,
      houseId,
      labelKey,
      position: wp,
      rotationY: rotationY + mlRot,
      width,
      height,
      floorLevel,
      isOpen: false,
      isBarricaded: false,
      damageState: 'intact',
      openProgress: 0,
    });
    const cosR = Math.abs(Math.cos(mlRot));
    const sx = cosR > 0.5 ? width : 0.22;
    const sz = cosR > 0.5 ? 0.22 : width;
    colliders.push(
      localBoxToWorldAABB(`col_${id}`, worldOrigin, rotationY, mlX, ly, lz, sx, height, sz, {
        houseId,
        floorLevel,
        surface: 'metal',
        category: 'window',
        blocksCamera: true,
      }),
    );
  };

  // =========================================================================
  // 1. FLOOR SLABS (1F, Porch, Garage w/ Hatch Cutout, 2F, Balcony, Roof, Shelter)
  // =========================================================================
  const floorMat1F: FloorSlabSpec['surface'] =
    arch.id === 'mediterranean_villa' || arch.id === 'industrial_loft' ? 'tile' : 'wood';

  if (isWestWing) {
    addSlab('slab_1f_west', -hw, hallLeftX, -hd, westFrontZ, Y0, Y0, floorMat1F, 0);
    addSlab('slab_1f_east', hallLeftX, hw, -hd, eastFrontZ, Y0, Y0, floorMat1F, 0);
  } else if (isEastWing) {
    addSlab('slab_1f_west', -hw, hallRightX, -hd, westFrontZ, Y0, Y0, floorMat1F, 0);
    addSlab('slab_1f_east', hallRightX, hw, -hd, eastFrontZ, Y0, Y0, floorMat1F, 0);
  } else {
    addSlab('slab_1f_main', -hw, hw, -hd, hd, Y0, Y0, floorMat1F, 0);
  }

  // Attached garage ground slab WITH cutout for shelter hatch ladder shaft!
  const hatchCut = {
    minX: hatchX - 0.65,
    maxX: hatchX + 0.65,
    minZ: hatchZ - 0.65,
    maxZ: hatchZ + 0.65,
  };
  addSlabCut('slab_1f_garage', garMinX, garMaxX, garMinZ, garMaxZ, Y0, Y0, 'concrete', 0, hatchCut);
  colliders.push(
    localBoxToWorldAABB(
      `col_${houseId}_shelter_hatch`,
      worldOrigin,
      rotationY,
      mx(hatchX),
      Y0 - 0.06,
      hatchZ,
      1.36,
      0.16,
      1.36,
      {
        houseId,
        floorLevel: 0,
        surface: 'metal',
        category: 'floor',
        hatchHouseId: houseId,
        blocksCamera: false,
      },
    ),
  );

  addSlab('slab_garage_roof', garMinX, garMaxX, garMinZ, garMaxZ, Y1, ST, 'roof', 1);

  // Front Porch & Optional Walkable 2nd-Floor Balcony (Distinct for all 8 architectures!)
  let porch: PorchVisualSpec;
  let balcony: BalconyVisualSpec | null = null;

  if (arch.porchStyle === 'craftsman_alcove') {
    addSlab('slab_porch', hallLeftX, hw, eastFrontZ, westFrontZ, Y0, Y0, 'wood', 0);
    addSlab('slab_porch_step', frontDoorX - 1.7, frontDoorX + 1.7, westFrontZ, westFrontZ + 0.85, Y0 * 0.5, Y0 * 0.5, 'concrete', 0);
    porch = {
      x: mx((hallLeftX + hw) / 2),
      z: (eastFrontZ + westFrontZ) / 2,
      width: hw - hallLeftX,
      depth: westFrontZ - eastFrontZ,
      roofY: Y0 + H + 0.05,
      hasStoneBases: true,
      columnLocalXs: [mx(hallLeftX + 0.45), mx(frontDoorX - 2.0), mx(frontDoorX + 2.0), mx(hw - 0.45)],
      style: arch.porchStyle,
    };
  } else if (arch.porchStyle === 'nordic_deck') {
    // Timber deck tucked cleanly in front of the recessed west+hall side beside the protruding east studio wing
    addSlab('slab_porch', -hw, hallRightX, westFrontZ, eastFrontZ, Y0, Y0, 'wood', 0);
    addSlab('slab_porch_step', frontDoorX - 1.8, frontDoorX + 1.8, eastFrontZ, eastFrontZ + 0.85, Y0 * 0.5, Y0 * 0.5, 'concrete', 0);
    porch = {
      x: mx((-hw + hallRightX) / 2),
      z: (westFrontZ + eastFrontZ) / 2,
      width: hallRightX + hw,
      depth: eastFrontZ - westFrontZ,
      roofY: Y0 + H + 0.05,
      hasStoneBases: false,
      columnLocalXs: [mx(-hw + 0.45), mx(-5.2), mx(frontDoorX + 2.0)],
      style: arch.porchStyle,
    };
  } else if (arch.porchStyle === 'modern_patio' || arch.porchStyle === 'industrial_canopy') {
    addSlab('slab_porch', -7.6, 7.6, hd, hd + 3.2, Y0, Y0, 'concrete', 0);
    addSlab('slab_porch_step', frontDoorX - 1.8, frontDoorX + 1.8, hd + 3.2, hd + 4.0, Y0 * 0.5, Y0 * 0.5, 'concrete', 0);
    porch = {
      x: mx(0),
      z: hd + 1.6,
      width: 15.2,
      depth: 3.2,
      roofY: Y1 - ST,
      hasStoneBases: false,
      columnLocalXs: [mx(-7.0), mx(-0.2), mx(7.0)],
      style: arch.porchStyle,
    };
    // Walkable 2nd-Floor Front Balcony on West Side
    addSlab('slab_2f_balcony', -11.4, 0.2, hd, hd + 3.2, Y1, ST, 'tile', 1);
    balcony = {
      x: mx(-5.6),
      z: hd + 1.6,
      width: 11.6,
      depth: 3.2,
      floorY: Y1,
    };
    addRailing('rail_balc_front', -11.35, Y1, hd + 3.12, 0.15, Y1, hd + 3.12, 1, arch.railingStyle, 1.05);
    addRailing('rail_balc_west', -11.35, Y1, hd + 0.05, -11.35, Y1, hd + 3.12, 1, arch.railingStyle, 1.05);
    addRailing('rail_balc_east', 0.15, Y1, hd + 0.05, 0.15, Y1, hd + 3.12, 1, arch.railingStyle, 1.05);
  } else if (arch.porchStyle === 'farmhouse_wrap') {
    // Full-width grand Modern Farmhouse Veranda!
    addSlab('slab_porch', -11.6, 11.6, hd, hd + 3.4, Y0, Y0, 'wood', 0);
    addSlab('slab_porch_step', frontDoorX - 2.0, frontDoorX + 2.0, hd + 3.4, hd + 4.2, Y0 * 0.5, Y0 * 0.5, 'concrete', 0);
    porch = {
      x: mx(0),
      z: hd + 1.7,
      width: 23.2,
      depth: 3.4,
      roofY: Y0 + H + 0.05,
      hasStoneBases: true,
      columnLocalXs: [mx(-11.2), mx(-6.8), mx(-2.4), mx(3.2), mx(7.4), mx(11.2)],
      style: arch.porchStyle,
    };
  } else if (arch.porchStyle === 'villa_loggia') {
    // Mediterranean Arched Front Loggia + East 2nd-Floor Terrace Balcony!
    addSlab('slab_porch', -8.6, 11.4, hd, hd + 3.2, Y0, Y0, 'tile', 0);
    addSlab('slab_porch_step', frontDoorX - 1.8, frontDoorX + 1.8, hd + 3.2, hd + 4.0, Y0 * 0.5, Y0 * 0.5, 'concrete', 0);
    porch = {
      x: mx(1.4),
      z: hd + 1.6,
      width: 20.0,
      depth: 3.2,
      roofY: Y1 - ST,
      hasStoneBases: true,
      columnLocalXs: [mx(-8.2), mx(-3.6), mx(2.8), mx(7.2), mx(11.0)],
      style: arch.porchStyle,
    };
    // Walkable 2nd-Floor East Terrace Balcony
    addSlab('slab_2f_balcony', 2.8, 11.4, hd, hd + 3.2, Y1, ST, 'tile', 1);
    balcony = {
      x: mx(7.1),
      z: hd + 1.6,
      width: 8.6,
      depth: 3.2,
      floorY: Y1,
    };
    addRailing('rail_balc_front', 2.85, Y1, hd + 3.12, 11.35, Y1, hd + 3.12, 1, 'metal', 1.05);
    addRailing('rail_balc_west', 2.85, Y1, hd + 0.05, 2.85, Y1, hd + 3.12, 1, 'metal', 1.05);
    addRailing('rail_balc_east', 11.35, Y1, hd + 0.05, 11.35, Y1, hd + 3.12, 1, 'metal', 1.05);
  } else if (arch.porchStyle === 'tudor_portico') {
    // Stone-base Tudor Timber Entry Portico
    addSlab('slab_porch', -5.4, 4.4, hd, hd + 3.2, Y0, Y0, 'concrete', 0);
    addSlab('slab_porch_step', frontDoorX - 1.8, frontDoorX + 1.8, hd + 3.2, hd + 4.0, Y0 * 0.5, Y0 * 0.5, 'concrete', 0);
    porch = {
      x: mx(-0.5),
      z: hd + 1.6,
      width: 9.8,
      depth: 3.2,
      roofY: Y0 + H + 0.05,
      hasStoneBases: true,
      columnLocalXs: [mx(-5.0), mx(-2.8), mx(0.6), mx(4.0)],
      style: arch.porchStyle,
    };
  } else {
    // Classic Brick Colonial symmetrical covered porch
    addSlab('slab_porch', -6.8, 6.8, hd, hd + 3.2, Y0, Y0, 'wood', 0);
    addSlab('slab_porch_step', frontDoorX - 1.8, frontDoorX + 1.8, hd + 3.2, hd + 4.0, Y0 * 0.5, Y0 * 0.5, 'concrete', 0);
    porch = {
      x: mx(0),
      z: hd + 1.6,
      width: 13.6,
      depth: 3.2,
      roofY: Y0 + H + 0.05,
      hasStoneBases: false,
      columnLocalXs: [mx(-6.4), mx(-2.5), mx(1.8), mx(6.4)],
      style: arch.porchStyle,
    };
  }

  addSlab('slab_back_step', backDoorX - 1.5, backDoorX + 1.5, -hd - 1.0, -hd, Y0 * 0.5, Y0 * 0.5, 'concrete', 0);
  addSlab('slab_garage_apron', garCenterX - 2.5, garCenterX + 2.5, garMaxZ, garMaxZ + 1.2, Y0 * 0.5, Y0 * 0.5, 'concrete', 0);

  // Second Floor Slabs with full-length 1F->2F stairwell cutout
  const s1Cut = {
    minX: s1X - STAIR_W / 2 - 0.06,
    maxX: s1X + STAIR_W / 2 + 0.06,
    minZ: Math.min(s1ZStart, s1ZEnd) - 0.15,
    maxZ: Math.max(s1ZStart, s1ZEnd) + 0.15,
  };
  if (isWestWing) {
    addSlab('slab_2f_west_wing', -hw, hallLeftX, -hd, westFrontZ, Y1, ST, 'wood', 1);
    addSlabCut('slab_2f_main', hallLeftX, hw, -hd, eastFrontZ, Y1, ST, 'wood', 1, s1Cut);
  } else if (isEastWing) {
    addSlabCut('slab_2f_main', -hw, hallRightX, -hd, westFrontZ, Y1, ST, 'wood', 1, s1Cut);
    addSlab('slab_2f_east_wing', hallRightX, hw, -hd, eastFrontZ, Y1, ST, 'wood', 1);
  } else {
    addSlabCut('slab_2f_main', -hw, hw, -hd, hd, Y1, ST, 'wood', 1, s1Cut);
  }

  // Roof Deck Slabs with full-length 2F->Roof stairwell cutout
  const s2Cut = {
    minX: s2X - STAIR_W / 2 - 0.08,
    maxX: s2X + STAIR_W / 2 + 0.08,
    minZ: Math.min(s2ZStart, s2ZEnd) - 0.15,
    maxZ: Math.max(s2ZStart, s2ZEnd) + 0.15,
  };
  if (isWestWing) {
    addSlab('slab_roof_west_wing', -hw, hallLeftX, -hd, westFrontZ, Y2, ST, 'roof', 2);
    addSlabCut('slab_roof_main', hallLeftX, hw, -hd, eastFrontZ, Y2, ST, 'roof', 2, s2Cut);
  } else if (isEastWing) {
    addSlab('slab_roof_west_wing', -hw, hallRightX, -hd, westFrontZ, Y2, ST, 'roof', 2);
    addSlabCut('slab_roof_main', hallRightX, hw, -hd, eastFrontZ, Y2, ST, 'roof', 2, s2Cut);
  } else {
    addSlabCut('slab_roof_main', -hw, hw, -hd, hd, Y2, ST, 'roof', 2, s2Cut);
  }

  // Underground Shelter Slabs (9.6 x 7.6 m concrete bunker aligned directly under garage hatch!)
  const shCX = garMinX - 0.8; // +11.2
  const shCZ = hatchZ; // -1.2
  const shW = 9.6;
  const shD = 7.6;
  addSlab('slab_shelter_floor', shCX - shW / 2, shCX + shW / 2, shCZ - shD / 2, shCZ + shD / 2, YS, 0.30, 'concrete', -1);
  addSlabCut(
    'slab_shelter_ceil',
    shCX - shW / 2,
    shCX + shW / 2,
    shCZ - shD / 2,
    shCZ + shD / 2,
    YS + H + ST,
    ST,
    'concrete',
    -1,
    hatchCut,
  );

  // =========================================================================
  // 2. GROUND FLOOR EXTERIOR & INTERIOR WALLS (3.80 m tall)
  // =========================================================================
  if (isWestWing) {
    addWallX('w1_front_west', -hw, hallLeftX, westFrontZ, Y0, H, T, 'exterior', 0, [
      { cx: -7.4, w: 3.0, bottomOffset: WS, h: WH },
    ]);
    addWallZ('w1_front_return', eastFrontZ, westFrontZ, hallLeftX, Y0, H, T, 'exterior', 0, [
      { cz: 9.1, w: 1.6, bottomOffset: WS, h: WH },
    ]);
    addWallX('w1_front_east', hallLeftX, hw, eastFrontZ, Y0, H, T, 'exterior', 0, [
      { cx: frontDoorX, w: DW, bottomOffset: 0, h: DH },
      { cx: 7.6, w: WW, bottomOffset: WS, h: WH },
    ]);
  } else if (isEastWing) {
    // Nordic East-Wing L-Shape: West + Hall at z = 7.8, East Studio protrudes to z = 10.4!
    addWallX('w1_front_west', -hw, hallRightX, westFrontZ, Y0, H, T, 'exterior', 0, [
      { cx: -7.6, w: 3.2, bottomOffset: 0.78, h: 1.95 },
      { cx: frontDoorX, w: DW, bottomOffset: 0, h: DH },
    ]);
    addWallZ('w1_front_return', westFrontZ, eastFrontZ, hallRightX, Y0, H, T, 'exterior', 0, [
      { cz: 9.1, w: 1.5, bottomOffset: WS, h: WH },
    ]);
    addWallX('w1_front_east', hallRightX, hw, eastFrontZ, Y0, H, T, 'exterior', 0, [
      { cx: 7.4, w: 3.4, bottomOffset: 0.74, h: 2.0 },
    ]);
  } else if (isModernWide) {
    addWallX('w1_front', -hw, hw, hd, Y0, H, T, 'exterior', 0, [
      { cx: -7.8, w: 3.6, bottomOffset: 0.72, h: 2.05 },
      { cx: -3.0, w: 2.8, bottomOffset: 0.72, h: 2.05 },
      { cx: frontDoorX, w: DW, bottomOffset: 0, h: DH },
      { cx: 8.6, w: 2.6, bottomOffset: 0.80, h: 1.85 },
    ]);
  } else {
    addWallX('w1_front', -hw, hw, hd, Y0, H, T, 'exterior', 0, [
      { cx: -7.6, w: WW, bottomOffset: WS, h: WH },
      { cx: frontDoorX, w: DW, bottomOffset: 0, h: DH },
      { cx: 7.6, w: WW, bottomOffset: WS, h: WH },
    ]);
  }

  addWallX('w1_back', -hw, hw, -hd, Y0, H, T, 'exterior', 0, [
    { cx: -7.4, w: WW, bottomOffset: WS, h: WH },
    { cx: backDoorX, w: DW, bottomOffset: 0, h: DH },
    { cx: 8.2, w: 1.9, bottomOffset: WS, h: WH },
  ]);

  addWallZ('w1_west', -hd, westFrontZ, -hw, Y0, H, T, 'exterior', 0, [
    { cz: -6.0, w: 2.0, bottomOffset: WS, h: WH },
    { cz: 4.4, w: WW, bottomOffset: WS, h: WH },
  ]);

  addWallZ('w1_east', -hd, eastFrontZ, hw, Y0, H, T, 'exterior', 0, [
    { cz: -6.2, w: 1.8, bottomOffset: WS, h: WH },
    { cz: -1.2, w: DW, bottomOffset: 0, h: DH },
  ]);

  // Attached Two-Car Garage Exterior Walls
  addWallX('w1_gar_front', garMinX, garMaxX, garMaxZ, Y0, H, T, 'exterior', 0, [
    { cx: garCenterX, w: GDW, bottomOffset: 0, h: GDH },
  ]);
  addWallX('w1_gar_back', garMinX, garMaxX, garMinZ, Y0, H, T, 'exterior', 0, [
    { cx: garCenterX + 1.0, w: 1.8, bottomOffset: 1.25, h: 1.15 },
  ]);
  addWallZ('w1_gar_outer', garMinZ, garMaxZ, garMaxX, Y0, H, T, 'exterior', 0, [
    { cz: 2.0, w: 2.0, bottomOffset: 1.25, h: 1.15 },
  ]);

  // Ground Floor Load-Bearing Partitions with Wide Archways
  addWallZ('w1_int_hall_L', -hd + T, hallFrontZ - T, hallLeftX, Y0, H, IT, 'interior', 0, [
    { cz: -5.4, w: 3.4, bottomOffset: 0, h: 2.95 },
    { cz: 4.2, w: 3.4, bottomOffset: 0, h: 2.95 },
  ]);
  addWallZ('w1_int_hall_R', -hd + T, hallFrontZ - T, hallRightX, Y0, H, IT, 'interior', 0, [
    { cz: -5.8, w: 2.6, bottomOffset: 0, h: 2.85 },
    { cz: 4.6, w: 2.6, bottomOffset: 0, h: 2.85 },
  ]);
  addWallX('w1_int_liv_kit', -hw + T, hallLeftX, 0.0, Y0, H, IT, 'interior', 0, [
    { cx: (-hw + hallLeftX) / 2, w: 3.8, bottomOffset: 0, h: 2.95 },
  ]);
  addWallX('w1_int_util_den', hallRightX, hw - T, 1.0, Y0, H, IT, 'interior', 0, [
    { cx: (hallRightX + hw) / 2, w: 2.2, bottomOffset: 0, h: 2.75 },
  ]);

  // =========================================================================
  // 3. SECOND FLOOR WALLS (3.80 m tall)
  // =========================================================================
  if (isWestWing) {
    addWallX('w2_front_west', -hw, hallLeftX, westFrontZ, Y1, H, T, 'exterior', 1, [
      { cx: -7.4, w: 2.8, bottomOffset: WS, h: WH },
    ]);
    addWallZ('w2_front_return', eastFrontZ, westFrontZ, hallLeftX, Y1, H, T, 'exterior', 1, [
      { cz: 9.1, w: 1.5, bottomOffset: WS, h: WH },
    ]);
    addWallX('w2_front_east', hallLeftX, hw, eastFrontZ, Y1, H, T, 'exterior', 1, [
      { cx: frontDoorX, w: 1.8, bottomOffset: WS, h: WH },
      { cx: 7.6, w: WW, bottomOffset: WS, h: WH },
    ]);
  } else if (isEastWing) {
    addWallX('w2_front_west', -hw, hallRightX, westFrontZ, Y1, H, T, 'exterior', 1, [
      { cx: -7.6, w: 3.0, bottomOffset: 0.80, h: 1.90 },
      { cx: frontDoorX, w: 1.8, bottomOffset: WS, h: WH },
    ]);
    addWallZ('w2_front_return', westFrontZ, eastFrontZ, hallRightX, Y1, H, T, 'exterior', 1, [
      { cz: 9.1, w: 1.5, bottomOffset: WS, h: WH },
    ]);
    addWallX('w2_front_east', hallRightX, hw, eastFrontZ, Y1, H, T, 'exterior', 1, [
      { cx: 7.4, w: 3.2, bottomOffset: 0.78, h: 1.92 },
    ]);
  } else if (isModernWide) {
    addWallX('w2_front', -hw, hw, hd, Y1, H, T, 'exterior', 1, [
      { cx: -7.8, w: 3.6, bottomOffset: 0.72, h: 2.05 },
      { cx: -2.8, w: DW, bottomOffset: 0, h: DH },
      { cx: frontDoorX, w: 2.2, bottomOffset: 0.80, h: 1.85 },
      { cx: 8.6, w: 2.6, bottomOffset: 0.80, h: 1.85 },
    ]);
  } else if (hasEastBalcony) {
    // Mediterranean Villa: 2F front wall has working Balcony Door at x = 5.4 leading onto East Terrace!
    addWallX('w2_front', -hw, hw, hd, Y1, H, T, 'exterior', 1, [
      { cx: -7.6, w: WW, bottomOffset: WS, h: WH },
      { cx: frontDoorX, w: 1.8, bottomOffset: WS, h: WH },
      { cx: 5.4, w: DW, bottomOffset: 0, h: DH },
      { cx: 9.2, w: 2.2, bottomOffset: WS, h: WH },
    ]);
  } else {
    addWallX('w2_front', -hw, hw, hd, Y1, H, T, 'exterior', 1, [
      { cx: -7.6, w: WW, bottomOffset: WS, h: WH },
      { cx: frontDoorX, w: 1.8, bottomOffset: WS, h: WH },
      { cx: 7.6, w: WW, bottomOffset: WS, h: WH },
    ]);
  }

  addWallX('w2_back', -hw, hw, -hd, Y1, H, T, 'exterior', 1, [
    { cx: -7.4, w: WW, bottomOffset: WS, h: WH },
    { cx: 9.2, w: 1.6, bottomOffset: 1.25, h: 1.2 },
  ]);
  addWallZ('w2_west', -hd, westFrontZ, -hw, Y1, H, T, 'exterior', 1, [
    { cz: -6.0, w: 2.0, bottomOffset: WS, h: WH },
    { cz: 4.4, w: WW, bottomOffset: WS, h: WH },
  ]);
  addWallZ('w2_east', -hd, eastFrontZ, hw, Y1, H, T, 'exterior', 1, [
    { cz: -6.2, w: 1.4, bottomOffset: 1.25, h: 1.15 },
    { cz: 4.4, w: 2.0, bottomOffset: WS, h: WH },
  ]);

  // 2F Interior Partitions
  addWallZ('w2_int_hall_L', -hd + T, hallFrontZ - T, hallLeftX, Y1, H, IT, 'interior', 1, [
    { cz: -5.8, w: DW, bottomOffset: 0, h: DH },
    { cz: 4.6, w: DW, bottomOffset: 0, h: DH },
  ]);
  addWallX('w2_int_bed_div', -hw + T, hallLeftX, 0.0, Y1, H, IT, 'interior', 1, []);

  if (isModernWide) {
    addWallZ('w2_int_hall_R', -hd + T, hd - T, hallRightX, Y1, H, IT, 'interior', 1, [
      { cz: -6.4, w: 2.8, bottomOffset: 0, h: 2.85 },
      { cz: 6.4, w: DW, bottomOffset: 0, h: DH },
    ]);
    addWallX('w2_int_bath_div', hallRightX, hw - T, 4.2, Y1, H, IT, 'interior', 1, []);
  } else {
    addWallZ('w2_int_hall_R', -hd + T, hallFrontZ - T, hallRightX, Y1, H, IT, 'interior', 1, [
      { cz: -6.8, w: 2.8, bottomOffset: 0, h: 2.85 },
      { cz: isWestWing ? 4.8 : 6.0, w: DW, bottomOffset: 0, h: DH },
    ]);
    addWallZ('w2_int_bath_W', -hd + T, -3.6, 7.0, Y1, H, IT, 'interior', 1, [
      { cz: -6.4, w: DW, bottomOffset: 0, h: DH },
    ]);
    addWallX('w2_int_bath_N', 7.0, hw - T, -3.6, Y1, H, IT, 'interior', 1, []);
    addWallX('w2_int_east_front', hallRightX, hw - T, isWestWing ? 2.4 : 3.4, Y1, H, IT, 'interior', 1, []);
  }

  // 2F Stairwell Guardrails
  const s1NearHallLeft = Math.abs(s1X - hallLeftX) < Math.abs(s1X - hallRightX);
  const openSideX = s1NearHallLeft ? s1X + STAIR_W / 2 + 0.05 : s1X - STAIR_W / 2 - 0.05;
  addRailing(
    'rail_2f_well_side',
    openSideX,
    Y1,
    Math.min(s1ZStart, s1ZEnd),
    openSideX,
    Y1,
    Math.max(s1ZStart, s1ZEnd),
    1,
  );
  addRailing(
    'rail_2f_well_end',
    s1X - STAIR_W / 2 - 0.05,
    Y1,
    s1ZStart,
    s1X + STAIR_W / 2 + 0.05,
    Y1,
    s1ZStart,
    1,
  );

  // Garage Roof Parapets
  const garParaH = 0.60;
  addWallX('w2_gar_para_F', garMinX, garMaxX, garMaxZ, Y1, garParaH, T, 'exterior', 1, []);
  addWallX('w2_gar_para_B', garMinX, garMaxX, garMinZ, Y1, garParaH, T, 'exterior', 1, []);
  addWallZ('w2_gar_para_E', garMinZ, garMaxZ, garMaxX, Y1, garParaH, T, 'exterior', 1, []);

  // =========================================================================
  // 4. ROOF DECK PARAPETS & STAIR BULKHEAD
  // =========================================================================
  const paraH = 1.02;
  if (isWestWing) {
    addWallX('w3_para_FW', -hw, hallLeftX, westFrontZ, Y2, paraH, T, 'exterior', 2, []);
    addWallZ('w3_para_FR', eastFrontZ, westFrontZ, hallLeftX, Y2, paraH, T, 'exterior', 2, []);
    addWallX('w3_para_FE', hallLeftX, hw, eastFrontZ, Y2, paraH, T, 'exterior', 2, []);
  } else if (isEastWing) {
    addWallX('w3_para_FW', -hw, hallRightX, westFrontZ, Y2, paraH, T, 'exterior', 2, []);
    addWallZ('w3_para_FR', westFrontZ, eastFrontZ, hallRightX, Y2, paraH, T, 'exterior', 2, []);
    addWallX('w3_para_FE', hallRightX, hw, eastFrontZ, Y2, paraH, T, 'exterior', 2, []);
  } else {
    addWallX('w3_para_F', -hw, hw, hd, Y2, paraH, T, 'exterior', 2, []);
  }
  addWallX('w3_para_B', -hw, hw, -hd, Y2, paraH, T, 'exterior', 2, []);
  addWallZ('w3_para_E', -hd, eastFrontZ, hw, Y2, paraH, T, 'exterior', 2, []);
  addWallZ('w3_para_W', -hd, westFrontZ, -hw, Y2, paraH, T, 'exterior', 2, [
    { cz: ladderZ, w: 1.25, bottomOffset: 0, h: paraH },
  ]);

  const bhH = 3.35;
  const bhMinX = s2X - STAIR_W / 2 - 0.22;
  const bhMaxX = s2X + STAIR_W / 2 + 0.22;
  const bhMinZ = s2ZStart - 0.35;
  const bhMaxZ = roofDoorZ;
  addWallZ('w3_bh_W', bhMinZ, bhMaxZ, bhMinX, Y2, bhH, 0.20, 'exterior', 2, []);
  addWallZ('w3_bh_E', bhMinZ, bhMaxZ, bhMaxX, Y2, bhH, 0.20, 'exterior', 2, []);
  addWallX('w3_bh_B', bhMinX, bhMaxX, bhMinZ, Y2, bhH, 0.20, 'exterior', 2, []);
  addWallX('w3_bh_F', bhMinX, bhMaxX, bhMaxZ, Y2, bhH, 0.20, 'exterior', 2, [
    { cx: s2X, w: DW, bottomOffset: 0, h: DH },
  ]);
  addSlab('slab_bh_cap', bhMinX - 0.14, bhMaxX + 0.14, bhMinZ - 0.14, bhMaxZ + 0.14, Y2 + bhH + 0.18, 0.20, 'roof', 2);

  // =========================================================================
  // 5. UNDERGROUND SHELTER WALLS (9.6 x 7.6 m)
  // =========================================================================
  addWallX('ws_front', shCX - shW / 2, shCX + shW / 2, shCZ + shD / 2, YS, H, 0.28, 'shelter', -1, [
    { cx: shCX, w: 1.60, bottomOffset: 0, h: 2.45 },
  ]);
  addWallX('ws_back', shCX - shW / 2, shCX + shW / 2, shCZ - shD / 2, YS, H, 0.28, 'shelter', -1, []);
  addWallZ('ws_west', shCZ - shD / 2, shCZ + shD / 2, shCX - shW / 2, YS, H, 0.28, 'shelter', -1, []);
  addWallZ('ws_east', shCZ - shD / 2, shCZ + shD / 2, shCX + shW / 2, YS, H, 0.28, 'shelter', -1, []);

  // =========================================================================
  // 6. STAIRS + ANALYTIC RAMPS + RAILINGS + HEADROOM
  // =========================================================================
  const registerStair = (
    id: string,
    cx: number,
    zStart: number,
    zEnd: number,
    yStart: number,
    yEnd: number,
    floorLevel: number,
    railLeft: boolean,
    railRight: boolean,
  ) => {
    const mlX = mx(cx);
    stairs.push({
      id,
      x: mlX,
      zStart,
      zEnd,
      yStart,
      yEnd,
      width: STAIR_W,
      steps: STAIR_STEPS,
      floorLevel,
      railLeft: mirror === 1 ? railLeft : railRight,
      railRight: mirror === 1 ? railRight : railLeft,
    });

    const pStart = localToWorld(worldOrigin, rotationY, { x: mlX - STAIR_W / 2, y: yStart, z: zStart });
    const pEnd = localToWorld(worldOrigin, rotationY, { x: mlX + STAIR_W / 2, y: yEnd, z: zEnd });
    const pBottomCenter = localToWorld(worldOrigin, rotationY, { x: mlX, y: yStart, z: zStart });
    const pTopCenter = localToWorld(worldOrigin, rotationY, { x: mlX, y: yEnd, z: zEnd });

    stairRamps.push({
      id: `${houseId}_${id}`,
      houseId,
      floorLevel,
      minX: Math.min(pStart.x, pEnd.x),
      maxX: Math.max(pStart.x, pEnd.x),
      minZ: Math.min(pStart.z, pEnd.z),
      maxZ: Math.max(pStart.z, pEnd.z),
      axis: 'z',
      startCoord: pBottomCenter.z,
      endCoord: pTopCenter.z,
      yStart,
      yEnd,
      surface: 'wood',
    });

    const halfW = STAIR_W / 2 - 0.04;
    if (railLeft) {
      addRailing(`rail_${id}_L`, cx - halfW, yStart, zStart, cx - halfW, yEnd, zEnd, floorLevel);
    }
    if (railRight) {
      addRailing(`rail_${id}_R`, cx + halfW, yStart, zStart, cx + halfW, yEnd, zEnd, floorLevel);
    }

    const hrMin = localToWorld(worldOrigin, rotationY, { x: mlX - STAIR_W / 2 + 0.08, y: yStart + 0.4, z: Math.min(zStart, zEnd) });
    const hrMax = localToWorld(worldOrigin, rotationY, { x: mlX + STAIR_W / 2 - 0.08, y: yEnd + HOUSE_CONSTANTS.MIN_STAIR_HEADROOM, z: Math.max(zStart, zEnd) });
    headroomVolumes.push({
      id: `${houseId}_hr_${id}`,
      houseId,
      minX: Math.min(hrMin.x, hrMax.x),
      maxX: Math.max(hrMin.x, hrMax.x),
      minY: yStart + 0.25,
      maxY: yEnd + HOUSE_CONSTANTS.MIN_STAIR_HEADROOM,
      minZ: Math.min(hrMin.z, hrMax.z),
      maxZ: Math.max(hrMin.z, hrMax.z),
      minClearance: floorLevel === 0 ? H : bhH,
      passed: (floorLevel === 0 ? H : bhH) >= HOUSE_CONSTANTS.MIN_STAIR_HEADROOM,
    });
  };

  registerStair('stairs_1f_2f', s1X, s1ZStart, s1ZEnd, Y0, Y1, 0, !s1NearHallLeft, s1NearHallLeft);
  registerStair('stairs_2f_roof', s2X, s2ZStart, s2ZEnd, Y1, Y2, 1, true, true);

  // =========================================================================
  // 7. INTERACTIVE DOORS & EXTERIOR WINDOWS (100% matched to wall openings!)
  // =========================================================================
  addDoor('front', 'front', 'door.front', frontDoorX, Y0, frontDoorZ, 0, DW, DH, 0);
  addDoor('back', 'back', 'door.back', backDoorX, Y0, -hd, Math.PI, DW, DH, 0);
  addDoor('garage_ext', 'garage', 'door.garage', garCenterX, Y0, garMaxZ, 0, GDW, GDH, 0);
  addDoor('garage_int', 'interior', 'door.garageInt', hw, Y0, -1.2, Math.PI / 2, DW, DH, 0);
  addDoor('roof', 'roof', 'door.roof', s2X, Y2, roofDoorZ, 0, DW, DH, 2);
  addDoor('tunnel', 'tunnel', 'door.tunnelBulkhead', shCX, YS, shCZ + shD / 2, Math.PI, 1.60, 2.45, -1);

  addDoor('master', 'interior', 'door.bedroom', hallLeftX, Y1, 4.6, -Math.PI / 2, DW, DH, 1);
  addDoor('bed2', 'interior', 'door.bedroom', hallLeftX, Y1, -5.8, -Math.PI / 2, DW, DH, 1);
  if (isModernWide) {
    addDoor('balcony', 'back', 'door.balcony', -2.8, Y1, hd, 0, DW, DH, 1);
    addDoor('bath', 'interior', 'door.bathroom', hallRightX, Y1, 6.4, Math.PI / 2, DW, DH, 1);
  } else {
    if (hasEastBalcony) {
      addDoor('balcony', 'back', 'door.balcony', 5.4, Y1, hd, 0, DW, DH, 1);
    }
    addDoor('bath', 'interior', 'door.bathroom', 7.0, Y1, -6.4, Math.PI / 2, DW, DH, 1);
    addDoor('bed3', 'interior', 'door.bedroom', hallRightX, Y1, isWestWing ? 4.8 : 6.0, Math.PI / 2, DW, DH, 1);
  }

  // Front Exterior Windows
  if (isWestWing) {
    addWindow('liv_front', 'window.living', -7.4, Y0 + WS + WH / 2, westFrontZ, 0, 3.0, WH, 0);
    addWindow('liv_ret', 'window.living', hallLeftX, Y0 + WS + WH / 2, 9.1, Math.PI / 2, 1.6, WH, 0);
    addWindow('den_front', 'window.side', 7.6, Y0 + WS + WH / 2, eastFrontZ, 0, WW, WH, 0);
    addWindow('bed_front', 'window.bedroom', -7.4, Y1 + WS + WH / 2, westFrontZ, 0, 2.8, WH, 1);
    addWindow('bed_ret', 'window.bedroom', hallLeftX, Y1 + WS + WH / 2, 9.1, Math.PI / 2, 1.5, WH, 1);
    addWindow('hall_front', 'window.side', frontDoorX, Y1 + WS + WH / 2, eastFrontZ, 0, 1.8, WH, 1);
    addWindow('bed3_front', 'window.bedroom', 7.6, Y1 + WS + WH / 2, eastFrontZ, 0, WW, WH, 1);
  } else if (isEastWing) {
    addWindow('liv_front', 'window.living', -7.6, Y0 + 0.78 + 1.95 / 2, westFrontZ, 0, 3.2, 1.95, 0);
    addWindow('den_ret', 'window.side', hallRightX, Y0 + WS + WH / 2, 9.1, -Math.PI / 2, 1.5, WH, 0);
    addWindow('den_front', 'window.side', 7.4, Y0 + 0.74 + 2.0 / 2, eastFrontZ, 0, 3.4, 2.0, 0);
    addWindow('bed_front', 'window.bedroom', -7.6, Y1 + 0.80 + 1.90 / 2, westFrontZ, 0, 3.0, 1.90, 1);
    addWindow('hall_front', 'window.side', frontDoorX, Y1 + WS + WH / 2, westFrontZ, 0, 1.8, WH, 1);
    addWindow('bed3_ret', 'window.bedroom', hallRightX, Y1 + WS + WH / 2, 9.1, -Math.PI / 2, 1.5, WH, 1);
    addWindow('bed3_front', 'window.bedroom', 7.4, Y1 + 0.78 + 1.92 / 2, eastFrontZ, 0, 3.2, 1.92, 1);
  } else if (isModernWide) {
    addWindow('liv_front_a', 'window.living', -7.8, Y0 + 0.72 + 2.05 / 2, hd, 0, 3.6, 2.05, 0);
    addWindow('liv_front_b', 'window.living', -3.0, Y0 + 0.72 + 2.05 / 2, hd, 0, 2.8, 2.05, 0);
    addWindow('den_front', 'window.side', 8.6, Y0 + 0.80 + 1.85 / 2, hd, 0, 2.6, 1.85, 0);
    addWindow('bed_front', 'window.bedroom', -7.8, Y1 + 0.72 + 2.05 / 2, hd, 0, 3.6, 2.05, 1);
    addWindow('hall_front', 'window.side', frontDoorX, Y1 + 0.80 + 1.85 / 2, hd, 0, 2.2, 1.85, 1);
    addWindow('bath_front', 'window.side', 8.6, Y1 + 0.80 + 1.85 / 2, hd, 0, 2.6, 1.85, 1);
  } else if (hasEastBalcony) {
    addWindow('liv_front', 'window.living', -7.6, Y0 + WS + WH / 2, hd, 0, WW, WH, 0);
    addWindow('den_front', 'window.side', 7.6, Y0 + WS + WH / 2, hd, 0, WW, WH, 0);
    addWindow('bed_front', 'window.bedroom', -7.6, Y1 + WS + WH / 2, hd, 0, WW, WH, 1);
    addWindow('hall_front', 'window.side', frontDoorX, Y1 + WS + WH / 2, hd, 0, 1.8, WH, 1);
    addWindow('bed3_front', 'window.bedroom', 9.2, Y1 + WS + WH / 2, hd, 0, 2.2, WH, 1);
  } else {
    addWindow('liv_front', 'window.living', -7.6, Y0 + WS + WH / 2, hd, 0, WW, WH, 0);
    addWindow('den_front', 'window.side', 7.6, Y0 + WS + WH / 2, hd, 0, WW, WH, 0);
    addWindow('bed_front', 'window.bedroom', -7.6, Y1 + WS + WH / 2, hd, 0, WW, WH, 1);
    addWindow('hall_front', 'window.side', frontDoorX, Y1 + WS + WH / 2, hd, 0, 1.8, WH, 1);
    addWindow('bed3_front', 'window.bedroom', 7.6, Y1 + WS + WH / 2, hd, 0, WW, WH, 1);
  }

  // Rear, Side & Garage Exterior Windows
  addWindow('kit_back', 'window.kitchen', -7.4, Y0 + WS + WH / 2, -hd, Math.PI, WW, WH, 0);
  addWindow('util_back', 'window.side', 8.2, Y0 + WS + WH / 2, -hd, Math.PI, 1.9, WH, 0);
  addWindow('kit_west', 'window.kitchen', -hw, Y0 + WS + WH / 2, -6.0, -Math.PI / 2, 2.0, WH, 0);
  addWindow('liv_west', 'window.living', -hw, Y0 + WS + WH / 2, 4.4, -Math.PI / 2, WW, WH, 0);
  addWindow('util_east', 'window.side', hw, Y0 + WS + WH / 2, -6.2, Math.PI / 2, 1.8, WH, 0);
  addWindow('gar_back', 'window.side', garCenterX + 1.0, Y0 + 1.25 + 1.15 / 2, garMinZ, Math.PI, 1.8, 1.15, 0);
  addWindow('gar_outer', 'window.side', garMaxX, Y0 + 1.25 + 1.15 / 2, 2.0, Math.PI / 2, 2.0, 1.15, 0);
  addWindow('bed2_back', 'window.bedroom', -7.4, Y1 + WS + WH / 2, -hd, Math.PI, WW, WH, 1);
  addWindow('bath_back', 'window.side', 9.2, Y1 + 1.25 + 1.2 / 2, -hd, Math.PI, 1.6, 1.2, 1);
  addWindow('bed2_west', 'window.bedroom', -hw, Y1 + WS + WH / 2, -6.0, -Math.PI / 2, 2.0, WH, 1);
  addWindow('bed1_west', 'window.bedroom', -hw, Y1 + WS + WH / 2, 4.4, -Math.PI / 2, WW, WH, 1);
  addWindow('bath_east', 'window.side', hw, Y1 + 1.25 + 1.15 / 2, -6.2, Math.PI / 2, 1.4, 1.15, 1);
  addWindow('east2_side', 'window.side', hw, Y1 + WS + WH / 2, 4.4, Math.PI / 2, 2.0, WH, 1);

  // =========================================================================
  // 8. ROOM BOUNDS (Distinct room placement per architecture planVariant!)
  // =========================================================================
  const roomWF =
    arch.planVariant === 'flipped_east_living' ||
    arch.planVariant === 'front_kitchen_farmhouse' ||
    arch.planVariant === 'nordic_east_studio'
      ? 'zone.kitchen'
      : arch.planVariant === 'courtyard_villa'
        ? 'zone.diningRoom'
        : 'zone.livingRoom';
  const roomWB =
    arch.planVariant === 'front_kitchen_farmhouse' ||
    arch.planVariant === 'courtyard_villa' ||
    arch.planVariant === 'nordic_east_studio'
      ? 'zone.livingRoom'
      : arch.planVariant === 'flipped_east_living'
        ? 'zone.sunroom'
        : 'zone.kitchen';
  const roomEF =
    arch.planVariant === 'flipped_east_living'
      ? 'zone.livingRoom'
      : arch.planVariant === 'courtyard_villa'
        ? 'zone.kitchen'
        : arch.planVariant === 'front_kitchen_farmhouse'
          ? 'zone.diningRoom'
          : arch.planVariant === 'nordic_east_studio' || arch.planVariant === 'industrial_loft_plan'
            ? 'zone.studio'
            : 'zone.den';

  addRoom(roomWF, 0, -hw, hallLeftX, 0.0, westFrontZ);
  addRoom(roomWB, 0, -hw, hallLeftX, -hd, 0.0);
  addRoom('zone.hallway', 0, hallLeftX, hallRightX, -hd, hallFrontZ);
  addRoom(roomEF, 0, hallRightX, hw, 1.0, eastFrontZ);
  addRoom('zone.utility', 0, hallRightX, hw, -hd, 1.0);
  addRoom('zone.garage', 0, garMinX, garMaxX, garMinZ, garMaxZ);
  addRoom('zone.bedroom', 1, -hw, hallLeftX, 0.0, westFrontZ);
  addRoom('zone.bedroom2', 1, -hw, hallLeftX, -hd, 0.0);
  addRoom('zone.hallway', 1, hallLeftX, hallRightX, -hd, hallFrontZ);
  if (isModernWide) {
    addRoom('zone.bathroom', 1, hallRightX, hw, 4.2, hd);
    addRoom('zone.balcony', 1, -11.4, 0.2, hd, hd + 3.2);
  } else {
    addRoom('zone.bathroom', 1, 7.0, hw, -hd, -3.6);
    addRoom('zone.bedroom3', 1, hallRightX, hw, isWestWing ? 2.4 : 3.4, eastFrontZ);
    if (hasEastBalcony) {
      addRoom('zone.balcony', 1, 2.8, 11.4, hd, hd + 3.2);
    }
  }
  addRoom('zone.roofDeck', 2, -hw, hw, -hd, Math.max(westFrontZ, eastFrontZ));
  addRoom('zone.shelter', -1, shCX - shW / 2, shCX + shW / 2, shCZ - shD / 2, shCZ + shD / 2);

  // =========================================================================
  // 9. RICH COMPOSITE INTERIOR & PORCH FURNITURE (Distinct by Plan Variant!)
  // =========================================================================
  // NOTE: Keep clear walking corridors around nav nodes:
  //   WF nav: (-5.4, 4.4), WB nav: (-5.8, -5.8), EF nav: (7.4, 4.6), EB nav: (8.2, -2.8)
  const wfCX = (-hw + hallLeftX) / 2;

  // Porch decor (welcome mat + side porch chairs + potted planters)
  addFurn('f_welcome_mat', 'welcome_mat', frontDoorX, Y0 + 0.012, frontDoorZ + 0.85, 0, 0);
  addFurn('f_porch_plant', 'potted_plant', frontDoorX - 1.65, Y0, frontDoorZ + 0.72, 0, 0, { sx: 0.48, sy: 1.05, sz: 0.48 });
  if (arch.porchStyle === 'farmhouse_wrap' || arch.porchStyle === 'colonial' || arch.porchStyle === 'villa_loggia') {
    addFurn('f_porch_chair_1', 'porch_chair', -4.8, Y0, frontDoorZ + 1.55, 0.25, 0, { sx: 0.72, sy: 0.88, sz: 0.74 });
    addFurn('f_porch_chair_2', 'porch_chair', 4.8, Y0, frontDoorZ + 1.55, -0.25, 0, { sx: 0.72, sy: 0.88, sz: 0.74 });
  } else if (arch.porchStyle === 'craftsman_alcove' || arch.porchStyle === 'nordic_deck') {
    const chairX = arch.porchStyle === 'craftsman_alcove' ? 7.8 : -7.8;
    addFurn('f_porch_chair_1', 'porch_chair', chairX, Y0, frontDoorZ + 1.35, -0.2, 0, { sx: 0.72, sy: 0.88, sz: 0.74 });
  }

  // Ceiling light fixtures in main rooms (no colliders)
  addFurn('f_ceil_wf', 'ceiling_lamp', wfCX, Y0 + H - 0.14, 4.4, 0, 0);
  addFurn('f_ceil_wb', 'ceiling_lamp', wfCX, Y0 + H - 0.14, -4.6, 0, 0);
  addFurn('f_ceil_ef', 'ceiling_lamp', (hallRightX + hw) / 2, Y0 + H - 0.14, 4.6, 0, 0);
  addFurn('f_ceil_hall', 'ceiling_lamp', (hallLeftX + hallRightX) / 2, Y0 + H - 0.14, 1.5, 0, 0);

  // ---- WEST FRONT ROOM (Living Room OR Front Kitchen OR Courtyard Dining Salon) ----
  if (roomWF === 'zone.livingRoom') {
    addFurn('f_rug_wf', 'rug', -7.8, Y0 + 0.015, 4.4, 0, 0);
    addFurn('f_sofa_wf', 'sectional_sofa', -10.1, Y0, 4.4, Math.PI / 2, 0, { sx: 1.5, sy: 0.86, sz: 2.6 });
    addFurn('f_coffee_wf', 'coffee_table', -7.5, Y0, 4.4, 0, 0, { sx: 0.74, sy: 0.45, sz: 1.25 });
    addFurn('f_tv_wf', 'tv_stand', -4.4, Y0, 0.65, 0, 0, { sx: 1.6, sy: 1.2, sz: 0.52 });
    addFurn('f_fireplace_wf', 'fireplace', -11.35, Y0, 1.4, Math.PI / 2, 0, { sx: 0.76, sy: 1.45, sz: 1.65 });
    addFurn('f_armchair_wf', 'armchair', -7.4, Y0, 7.2, Math.PI, 0, { sx: 0.88, sy: 0.86, sz: 0.86 });
    addFurn('f_lamp_wf', 'floor_lamp', -10.8, Y0, 7.6, 0, 0, { sx: 0.42, sy: 1.75, sz: 0.42 });
    addFurn('f_plant_wf', 'potted_plant', -4.2, Y0, 7.6, 0, 0, { sx: 0.5, sy: 1.2, sz: 0.5 });
    addFurn('f_pic_wf', 'picture', -11.82, Y0 + 2.05, 4.4, Math.PI / 2, 0);
  } else if (roomWF === 'zone.kitchen') {
    addFurn('f_counter_wf', 'kitchen_counter', -9.2, Y0, 0.65, 0, 0, { sx: 2.6, sy: 0.9, sz: 0.72 });
    addFurn('f_upcab_wf', 'upper_cabinets', -9.2, Y0 + 1.92, 0.44, 0, 0);
    addFurn('f_stove_wf', 'stove', -11.3, Y0, 3.0, Math.PI / 2, 0, { sx: 0.76, sy: 0.92, sz: 0.82 });
    addFurn('f_fridge_wf', 'fridge', -11.3, Y0, 6.2, Math.PI / 2, 0, { sx: 0.78, sy: 1.92, sz: 0.82 });
    addFurn('f_island_wf', 'kitchen_island', -8.0, Y0, 4.4, 0, 0, { sx: 1.85, sy: 0.92, sz: 1.05 });
    addFurn('f_plant_wf', 'potted_plant', -4.5, Y0, 7.0, 0, 0, { sx: 0.5, sy: 1.2, sz: 0.5 });
  } else {
    // Formal Courtyard Dining Salon & Upright Piano
    addFurn('f_rug_wf', 'rug', -7.8, Y0 + 0.015, 4.5, 0, 0);
    addFurn('f_dining_wf', 'dining_set', -8.0, Y0, 4.6, 0, 0, { sx: 1.9, sy: 0.88, sz: 1.65 });
    addFurn('f_piano_wf', 'piano', -10.8, Y0, 1.3, Math.PI / 2, 0, { sx: 0.72, sy: 1.22, sz: 1.5 });
    addFurn('f_sideboard_wf', 'sideboard', -5.2, Y0, 0.55, 0, 0, { sx: 1.65, sy: 0.88, sz: 0.5 });
    addFurn('f_plant_wf', 'potted_plant', -10.8, Y0, 7.8, 0, 0, { sx: 0.5, sy: 1.25, sz: 0.5 });
    addFurn('f_pic_wf', 'picture', -11.82, Y0 + 2.05, 4.4, Math.PI / 2, 0);
  }

  // ---- WEST BACK ROOM (Kitchen & Dining OR Backyard Hearth Living OR Sunroom) ----
  if (roomWB === 'zone.kitchen') {
    addFurn('f_counter_wb', 'kitchen_counter', -8.8, Y0, -8.35, 0, 0, { sx: 2.6, sy: 0.9, sz: 0.72 });
    addFurn('f_upcab_wb', 'upper_cabinets', -8.8, Y0 + 1.92, -8.62, 0, 0);
    addFurn('f_stove_wb', 'stove', -11.3, Y0, -6.0, Math.PI / 2, 0, { sx: 0.76, sy: 0.92, sz: 0.82 });
    addFurn('f_fridge_wb', 'fridge', -11.3, Y0, -3.4, Math.PI / 2, 0, { sx: 0.78, sy: 1.92, sz: 0.82 });
    addFurn('f_island_wb', 'kitchen_island', -8.2, Y0, -4.4, 0, 0, { sx: 1.85, sy: 0.92, sz: 1.05 });
    addFurn('f_dining_wb', 'dining_set', -4.8, Y0, -2.2, 0, 0, { sx: 1.8, sy: 0.86, sz: 1.55 });
  } else if (roomWB === 'zone.livingRoom') {
    addFurn('f_rug_wb', 'rug', -8.2, Y0 + 0.015, -4.4, 0, 0);
    addFurn('f_sofa_wb', 'sectional_sofa', -10.2, Y0, -4.4, Math.PI / 2, 0, { sx: 1.5, sy: 0.86, sz: 2.5 });
    addFurn('f_coffee_wb', 'coffee_table', -7.8, Y0, -4.4, 0, 0, { sx: 0.72, sy: 0.45, sz: 1.25 });
    addFurn('f_fireplace_wb', 'fireplace', -11.35, Y0, -7.8, Math.PI / 2, 0, { sx: 0.76, sy: 1.45, sz: 1.65 });
    addFurn('f_tv_wb', 'tv_stand', -4.8, Y0, -0.65, Math.PI, 0, { sx: 1.55, sy: 1.18, sz: 0.52 });
    addFurn('f_lamp_wb', 'floor_lamp', -10.8, Y0, -1.2, 0, 0, { sx: 0.42, sy: 1.75, sz: 0.42 });
    addFurn('f_plant_wb', 'potted_plant', -4.2, Y0, -8.1, 0, 0, { sx: 0.5, sy: 1.2, sz: 0.5 });
  } else {
    // Tudor Sunroom / Library Dining
    addFurn('f_rug_wb', 'rug', -8.4, Y0 + 0.015, -4.4, 0, 0);
    addFurn('f_dining_wb', 'dining_set', -8.6, Y0, -4.4, 0, 0, { sx: 1.85, sy: 0.88, sz: 1.6 });
    addFurn('f_bookshelf_wb', 'bookshelf', -11.3, Y0, -2.0, Math.PI / 2, 0, { sx: 0.46, sy: 1.9, sz: 1.4 });
    addFurn('f_sideboard_wb', 'sideboard', -8.4, Y0, -8.35, 0, 0, { sx: 1.65, sy: 0.88, sz: 0.5 });
    addFurn('f_plant_wb', 'potted_plant', -11.0, Y0, -8.0, 0, 0, { sx: 0.5, sy: 1.25, sz: 0.5 });
  }

  // ---- EAST FRONT ROOM (Den OR Grand East Living OR Villa Kitchen OR Creative Studio) ----
  if (roomEF === 'zone.livingRoom') {
    addFurn('f_rug_ef', 'rug', 8.4, Y0 + 0.015, 5.4, 0, 0);
    addFurn('f_sofa_ef', 'sofa', 10.6, Y0, 5.4, -Math.PI / 2, 0, { sx: 0.95, sy: 0.85, sz: 2.2 });
    addFurn('f_fireplace_ef', 'fireplace', 11.35, Y0, 2.2, -Math.PI / 2, 0, { sx: 0.76, sy: 1.45, sz: 1.65 });
    addFurn('f_armchair_ef', 'armchair', 6.4, Y0, 7.6, Math.PI, 0, { sx: 0.86, sy: 0.86, sz: 0.86 });
    addFurn('f_lamp_ef', 'floor_lamp', 10.9, Y0, 8.1, 0, 0, { sx: 0.42, sy: 1.75, sz: 0.42 });
  } else if (roomEF === 'zone.kitchen') {
    addFurn('f_counter_ef', 'kitchen_counter', 8.6, Y0, 1.55, 0, 0, { sx: 2.5, sy: 0.9, sz: 0.72 });
    addFurn('f_stove_ef', 'stove', 11.3, Y0, 3.8, -Math.PI / 2, 0, { sx: 0.76, sy: 0.92, sz: 0.82 });
    addFurn('f_fridge_ef', 'fridge', 11.3, Y0, 6.2, -Math.PI / 2, 0, { sx: 0.78, sy: 1.92, sz: 0.82 });
    addFurn('f_sideboard_ef', 'sideboard', 6.2, Y0, 8.3, Math.PI, 0, { sx: 1.6, sy: 0.88, sz: 0.5 });
  } else if (roomEF === 'zone.studio') {
    addFurn('f_comp_ef', 'computer_desk', 10.4, Y0, 5.2, -Math.PI / 2, 0, { sx: 0.78, sy: 1.15, sz: 1.4 });
    addFurn('f_easel_ef', 'easel', 9.8, Y0, 2.4, -Math.PI / 4, 0, { sx: 0.75, sy: 1.65, sz: 0.75 });
    addFurn('f_shelf_ef', 'bookshelf', 7.2, Y0, 1.45, 0, 0, { sx: 1.4, sy: 1.9, sz: 0.46 });
    addFurn('f_plant_ef', 'potted_plant', 10.8, Y0, eastFrontZ - 1.0, 0, 0, { sx: 0.5, sy: 1.25, sz: 0.5 });
  } else if (roomEF === 'zone.diningRoom') {
    addFurn('f_dining_ef', 'dining_set', 9.6, Y0, 5.4, 0, 0, { sx: 1.8, sy: 0.88, sz: 1.55 });
    addFurn('f_sideboard_ef', 'sideboard', 11.3, Y0, 2.5, -Math.PI / 2, 0, { sx: 0.52, sy: 0.88, sz: 1.6 });
    addFurn('f_plant_ef', 'potted_plant', 10.9, Y0, 8.1, 0, 0, { sx: 0.5, sy: 1.2, sz: 0.5 });
  } else {
    addFurn('f_desk_den', 'computer_desk', 10.4, Y0, 4.6, -Math.PI / 2, 0, { sx: 0.78, sy: 1.15, sz: 1.4 });
    addFurn('f_shelf_den', 'bookshelf', 11.2, Y0, 2.1, -Math.PI / 2, 0, { sx: 0.46, sy: 1.9, sz: 1.4 });
    addFurn('f_armchair_den', 'armchair', 6.4, Y0, 2.2, 0.4, 0, { sx: 0.86, sy: 0.86, sz: 0.86 });
    addFurn('f_plant_den', 'potted_plant', 10.9, Y0, eastFrontZ - 0.9, 0, 0, { sx: 0.5, sy: 1.2, sz: 0.5 });
  }

  // ---- UTILITY / MUDROOM (1F East Back) ----
  addFurn('f_washer', 'washer', 10.4, Y0, -8.1, 0, 0, { sx: 0.76, sy: 0.95, sz: 0.72 });
  addFurn('f_shelf_util', 'shelf', 7.2, Y0, -8.25, 0, 0, { sx: 1.5, sy: 1.85, sz: 0.55 });
  addFurn('f_hamper_util', 'hamper', 11.2, Y0, -5.2, 0, 0, { sx: 0.52, sy: 0.65, sz: 0.46 });

  // ---- ATTACHED TWO-CAR GARAGE ----
  addFurn('f_workbench', 'workbench', garMaxX - 0.55, Y0, 0.8, -Math.PI / 2, 0, { sx: 0.76, sy: 0.9, sz: 2.1 });
  addFurn('f_tool_chest', 'tool_chest', garMaxX - 0.55, Y0, 3.6, -Math.PI / 2, 0, { sx: 0.62, sy: 1.05, sz: 1.15 });
  addFurn('f_shelf_gar', 'shelf', garCenterX + 1.4, Y0, garMinZ + 0.52, 0, 0, { sx: 1.5, sy: 1.85, sz: 0.55 });
  addFurn('f_tires_gar', 'tires_stack', garMaxX - 0.68, Y0, 5.4, 0, 0, { sx: 0.76, sy: 0.95, sz: 0.76 });
  addFurn('f_bike_gar', 'bicycle', garMinX + 0.65, Y0, 4.4, Math.PI / 2 - 0.1, 0, { sx: 0.62, sy: 1.1, sz: 1.65 });
  addFurn('f_shelter_hatch', 'shelter_hatch', hatchX, Y0 + 0.02, hatchZ, 0, 0);

  // ---- SECOND FLOOR BEDROOMS & BATHROOM ----
  // Master Bedroom (2F West Front)
  addFurn('f_bed_master', 'bed_double', -9.8, Y1, 4.8, Math.PI / 2, 1, { sx: 2.1, sy: 0.68, sz: 1.8 });
  addFurn('f_ns_m1', 'nightstand', -10.9, Y1, 3.2, Math.PI / 2, 1, { sx: 0.54, sy: 0.58, sz: 0.54 });
  addFurn('f_ns_m2', 'nightstand', -10.9, Y1, 6.4, Math.PI / 2, 1, { sx: 0.54, sy: 0.58, sz: 0.54 });
  addFurn('f_dresser', 'dresser', -7.2, Y1, 0.7, 0, 1, { sx: 1.32, sy: 1.0, sz: 0.56 });
  addFurn('f_wardrobe_m', 'wardrobe', -10.6, Y1, 0.85, 0, 1, { sx: 1.45, sy: 2.1, sz: 0.62 });
  addFurn('f_rug_bed', 'rug', -7.2, Y1 + 0.015, 4.8, 0, 1);
  addFurn('f_plant_bed', 'potted_plant', -4.2, Y1, westFrontZ - 1.0, 0, 1, { sx: 0.48, sy: 1.15, sz: 0.48 });
  addFurn('f_pic_bed', 'picture', -11.82, Y1 + 2.05, 4.8, Math.PI / 2, 1);

  // Bedroom 2 (2F West Back)
  addFurn('f_bed_single', 'bed_single', -9.8, Y1, -6.2, 0, 1, { sx: 1.24, sy: 0.64, sz: 2.08 });
  addFurn('f_ns_b2', 'nightstand', -8.4, Y1, -7.2, 0, 1, { sx: 0.54, sy: 0.58, sz: 0.54 });
  addFurn('f_desk_bed2', 'computer_desk', -6.4, Y1, -8.1, 0, 1, { sx: 1.38, sy: 1.15, sz: 0.74 });
  addFurn('f_wardrobe_b2', 'wardrobe', -10.8, Y1, -1.0, Math.PI, 1, { sx: 1.4, sy: 2.1, sz: 0.62 });
  addFurn('f_rug_b2', 'rug', -7.6, Y1 + 0.015, -4.6, 0, 1);

  // 2F Bathroom (and Bedroom 3 where applicable)
  if (isModernWide) {
    addFurn('f_tub', 'bathtub', 10.9, Y1, 6.6, 0, 1, { sx: 0.9, sy: 0.62, sz: 1.8 });
    addFurn('f_vanity', 'vanity', 8.4, Y1, 8.25, Math.PI, 1, { sx: 1.12, sy: 0.86, sz: 0.56 });
    addFurn('f_toilet', 'toilet', 8.0, Y1, 4.95, 0, 1, { sx: 0.55, sy: 0.78, sz: 0.56 });
    addFurn('f_hamper_bath', 'hamper', 10.8, Y1, 4.8, 0, 1, { sx: 0.5, sy: 0.64, sz: 0.44 });
  } else {
    addFurn('f_tub', 'bathtub', 11.1, Y1, -6.4, 0, 1, { sx: 0.9, sy: 0.62, sz: 1.8 });
    addFurn('f_vanity', 'vanity', 9.0, Y1, -8.25, 0, 1, { sx: 1.12, sy: 0.86, sz: 0.56 });
    addFurn('f_toilet', 'toilet', 9.6, Y1, -4.3, Math.PI, 1, { sx: 0.55, sy: 0.78, sz: 0.56 });
    addFurn('f_hamper_bath', 'hamper', 7.6, Y1, -4.3, 0, 1, { sx: 0.5, sy: 0.64, sz: 0.44 });
    addFurn('f_bed3', 'bed_single', 10.2, Y1, 5.2, -Math.PI / 2, 1, { sx: 2.08, sy: 0.64, sz: 1.24 });
    addFurn('f_dresser_b3', 'dresser', 8.2, Y1, isWestWing ? 3.05 : 4.05, 0, 1, { sx: 1.32, sy: 1.0, sz: 0.56 });
  }

  // ---- UNDERGROUND SHELTER (-1) ----
  addFurn('f_safe', 'safe', shCX - 3.8, YS, shCZ - 2.6, Math.PI / 4, -1, { sx: 0.88, sy: 1.12, sz: 0.88 });
  addFurn('f_generator', 'generator', shCX + 3.4, YS, shCZ - 2.5, -Math.PI / 2, -1, { sx: 0.95, sy: 0.88, sz: 1.32 });
  addFurn('f_crate_1', 'crate', shCX - 3.6, YS, shCZ + 2.2, 0.1, -1, { sx: 0.82, sy: 0.76, sz: 0.82 });
  addFurn('f_crate_2', 'crate', shCX - 2.3, YS, shCZ + 2.5, -0.2, -1, { sx: 0.74, sy: 0.68, sz: 0.74 });
  addFurn('f_shelf_sh', 'shelf', shCX - 0.3, YS, shCZ - 3.1, 0, -1, { sx: 1.5, sy: 1.85, sz: 0.55 });
  addFurn('f_cot_sh', 'bunker_cot', shCX - 3.7, YS, shCZ - 0.1, Math.PI / 2, -1, { sx: 0.86, sy: 0.52, sz: 1.92 });
  addFurn('f_locker_sh', 'supply_locker', shCX + 1.4, YS, shCZ - 3.1, 0, -1, { sx: 0.95, sy: 1.95, sz: 0.55 });
  addFurn('f_radio_sh', 'radio_desk', shCX - 1.9, YS, shCZ - 3.0, 0, -1, { sx: 1.3, sy: 1.1, sz: 0.64 });
  addFurn('f_barrel_sh', 'water_barrel', shCX + 3.8, YS, shCZ + 2.3, 0, -1, { sx: 0.66, sy: 0.96, sz: 0.66 });

  // =========================================================================
  // 10. REAL CLIMBABLE LADDERS (Exterior Roof Ladder + Shelter Hatch Ladder)
  // =========================================================================
  const extLadderId = `${houseId}_ladder_roof`;
  const extLadderPos = localToWorld(worldOrigin, rotationY, { x: mx(ladderClimbX), y: 0, z: ladderZ });
  const extBottomExit = localToWorld(worldOrigin, rotationY, { x: mx(ladderClimbX - 0.85), y: 0, z: ladderZ });
  const extTopExit = localToWorld(worldOrigin, rotationY, { x: mx(-hw + 1.05), y: Y2, z: ladderZ });
  const extFaceYaw = rotationY + mRot(-Math.PI / 2);

  ladders.push({
    id: extLadderId,
    houseId,
    kind: 'roof',
    climbX: extLadderPos.x,
    climbZ: extLadderPos.z,
    faceYaw: extFaceYaw,
    bottomY: 0.0,
    topY: Y2,
    bottomExit: extBottomExit,
    topExit: extTopExit,
    bottomFloor: 0,
    topFloor: 2,
    bottomInShelter: false,
    topInShelter: false,
  });

  colliders.push(
    localBoxToWorldAABB(
      `col_${extLadderId}`,
      worldOrigin,
      rotationY,
      mx(ladderWallX - 0.22),
      Y2 / 2,
      ladderZ,
      0.34,
      Y2 + 0.3,
      0.66,
      {
        houseId,
        floorLevel: 0,
        surface: 'metal',
        category: 'ladder',
        ladderId: extLadderId,
        blocksCamera: false,
      },
    ),
  );

  const shLadderId = `${houseId}_ladder_shelter`;
  const shLadderPos = localToWorld(worldOrigin, rotationY, { x: mx(hatchX), y: YS, z: hatchZ });
  const shTopExit = localToWorld(worldOrigin, rotationY, { x: mx(hatchX), y: Y0, z: hatchZ + 1.25 });
  const shBottomExit = localToWorld(worldOrigin, rotationY, { x: mx(hatchX - 1.15), y: YS, z: hatchZ + 0.95 });
  ladders.push({
    id: shLadderId,
    houseId,
    kind: 'shelter',
    climbX: shLadderPos.x,
    climbZ: shLadderPos.z,
    faceYaw: rotationY,
    bottomY: YS,
    topY: Y0,
    bottomExit: shBottomExit,
    topExit: shTopExit,
    bottomFloor: -1,
    topFloor: 0,
    bottomInShelter: true,
    topInShelter: false,
  });

  // =========================================================================
  // 11. NAMED YARD SLOTS (6 per house)
  // =========================================================================
  const yardSlotDefs: Array<{ kind: YardSlotKind; labelKey: string; lx: number; lz: number }> = [
    { kind: 'trap_front', labelKey: 'slot.trap_front', lx: -8.0, lz: hd + 8.5 },
    { kind: 'mine_driveway', labelKey: 'slot.mine_driveway', lx: garCenterX, lz: hd + 9.2 },
    { kind: 'doghouse', labelKey: 'slot.doghouse', lx: -16.2, lz: 2.0 },
    { kind: 'gnome', labelKey: 'slot.gnome', lx: -4.2, lz: hd + 6.0 },
    { kind: 'fence', labelKey: 'slot.fence', lx: -17.8, lz: hd + 15.5 },
    { kind: 'gate', labelKey: 'slot.gate', lx: frontDoorX, lz: hd + 16.5 },
  ];
  for (const s of yardSlotDefs) {
    yardSlots.push({
      id: `${houseId}_slot_${s.kind}`,
      ownerId,
      houseId,
      kind: s.kind,
      labelKey: s.labelKey,
      position: localToWorld(worldOrigin, rotationY, { x: mx(s.lx), y: 0, z: s.lz }),
      rotationY,
      occupiedItemId: null,
    });
  }

  // =========================================================================
  // 12. NAMED GAMEPLAY ANCHORS
  // =========================================================================
  anchors.push(
    {
      id: `${houseId}_anchor_spawn`,
      kind: 'playerSpawn',
      position: localToWorld(worldOrigin, rotationY, { x: mx(frontDoorX), y: 0, z: hd + 11.2 }),
      rotationY: rotationY + 0.22,
    },
    {
      id: `${houseId}_anchor_roof_access`,
      kind: 'roofAccess',
      position: extBottomExit,
      rotationY: extFaceYaw,
    },
    {
      id: `${houseId}_anchor_roof_top`,
      kind: 'roofTop',
      position: extTopExit,
      rotationY: extFaceYaw,
    },
    {
      id: `${houseId}_anchor_shelter_entry`,
      kind: 'shelterEntry',
      position: localToWorld(worldOrigin, rotationY, { x: mx(hatchX), y: Y0, z: hatchZ }),
      rotationY,
    },
    {
      id: `${houseId}_anchor_shelter_floor`,
      kind: 'shelterFloor',
      position: shBottomExit,
      rotationY,
    },
    {
      id: `${houseId}_anchor_tunnel_entry`,
      kind: 'tunnelEntry',
      position: localToWorld(worldOrigin, rotationY, { x: mx(shCX), y: YS, z: shCZ + shD / 2 - 0.7 }),
      rotationY,
    },
    {
      id: `${houseId}_anchor_roof_vent`,
      kind: 'roofVent',
      position: localToWorld(worldOrigin, rotationY, { x: mx(-4.5), y: Y2, z: -2.2 }),
      rotationY,
    },
  );

  // =========================================================================
  // 13. BUILD WORLD-SPACE AABB COLLIDERS
  // =========================================================================
  for (const w of walls) {
    colliders.push(
      localBoxToWorldAABB(`col_${houseId}_${w.id}`, worldOrigin, rotationY, w.x, w.y, w.z, w.sx, w.sy, w.sz, {
        houseId,
        floorLevel: w.floorLevel,
        surface: w.material === 'concrete' || w.material === 'shelter' ? 'concrete' : 'wood',
        category: 'wall',
        blocksCamera: w.blocksCamera ?? true,
      }),
    );
  }
  for (const sl of slabs) {
    colliders.push(
      localBoxToWorldAABB(
        `col_${houseId}_${sl.id}`,
        worldOrigin,
        rotationY,
        sl.x,
        sl.y - sl.thickness / 2,
        sl.z,
        sl.sx,
        sl.thickness,
        sl.sz,
        {
          houseId,
          floorLevel: sl.floorLevel,
          surface: sl.surface,
          category: sl.floorLevel >= 1 ? 'ceiling' : 'floor',
          blocksCamera: true,
        },
      ),
    );
  }
  for (const r of railings) {
    const cx = (r.x1 + r.x2) / 2;
    const cz = (r.z1 + r.z2) / 2;
    const minY = Math.min(r.y1, r.y2);
    const maxY = Math.max(r.y1, r.y2) + r.height;
    const sx = Math.max(0.14, Math.abs(r.x2 - r.x1));
    const sz = Math.max(0.14, Math.abs(r.z2 - r.z1));
    colliders.push(
      localBoxToWorldAABB(
        `col_${houseId}_${r.id}`,
        worldOrigin,
        rotationY,
        cx,
        (minY + maxY) / 2,
        cz,
        sx,
        maxY - minY,
        sz,
        {
          houseId,
          floorLevel: r.floorLevel,
          surface: r.style === 'wood' ? 'wood' : 'metal',
          category: 'railing',
          blocksCamera: false,
        },
      ),
    );
  }
  for (const f of furniture) {
    if (!f.collider) continue;
    colliders.push(
      localBoxToWorldAABB(
        `col_${houseId}_${f.id}`,
        worldOrigin,
        rotationY,
        f.x,
        f.y + f.collider.sy / 2,
        f.z,
        f.collider.sx,
        f.collider.sy,
        f.collider.sz,
        {
          houseId,
          floorLevel: f.floorLevel,
          surface: 'wood',
          category: 'furniture',
          blocksCamera: false,
        },
      ),
    );
  }

  // =========================================================================
  // 14. WALKABLE NAVIGATION GRAPH (NavNodes — verified clear on all 8 houses!)
  // =========================================================================
  const clearHallX = s1NearHallLeft ? hallRightX - 1.35 : hallLeftX + 1.35;
  const rawNav: Array<{ key: string; roomKey: string; lx: number; ly: number; lz: number; floor: number; links: string[] }> = [
    { key: 'spawn', roomKey: 'zone.yard', lx: frontDoorX, ly: 0, lz: hd + 11.2, floor: 0, links: ['yard_front', 'yard_west', 'yard_east'] },
    { key: 'yard_west', roomKey: 'zone.yard', lx: -9.5, ly: 0, lz: hd + 11.0, floor: 0, links: ['spawn', 'yard_front', 'roof_ladder_bot'] },
    { key: 'yard_east', roomKey: 'zone.yard', lx: garCenterX, ly: 0, lz: hd + 10.2, floor: 0, links: ['spawn', 'yard_front', 'garage'] },
    { key: 'yard_front', roomKey: 'zone.yard', lx: frontDoorX, ly: 0, lz: Math.max(westFrontZ, eastFrontZ) + 4.8, floor: 0, links: ['spawn', 'yard_west', 'yard_east', 'porch'] },
    { key: 'porch', roomKey: 'zone.yard', lx: frontDoorX, ly: Y0, lz: frontDoorZ + 1.5, floor: 0, links: ['yard_front', 'hall_1f_front'] },
    { key: 'hall_1f_front', roomKey: 'zone.hallway', lx: clearHallX, ly: Y0, lz: 4.8, floor: 0, links: ['porch', 'living', 'den', 'hall_1f_mid', 'stairs_1f_bot'] },
    { key: 'hall_1f_mid', roomKey: 'zone.hallway', lx: clearHallX, ly: Y0, lz: -1.0, floor: 0, links: ['hall_1f_front', 'hall_1f_back'] },
    { key: 'hall_1f_back', roomKey: 'zone.hallway', lx: clearHallX, ly: Y0, lz: -6.0, floor: 0, links: ['hall_1f_mid', 'kitchen', 'utility', 'stairs_1f_bot'] },
    { key: 'living', roomKey: roomWF, lx: -5.4, ly: Y0, lz: 4.4, floor: 0, links: ['hall_1f_front', 'kitchen'] },
    { key: 'kitchen', roomKey: roomWB, lx: -5.8, ly: Y0, lz: -5.8, floor: 0, links: ['hall_1f_back', 'living'] },
    { key: 'den', roomKey: roomEF, lx: 7.4, ly: Y0, lz: 4.6, floor: 0, links: ['hall_1f_front', 'utility'] },
    { key: 'utility', roomKey: 'zone.utility', lx: 8.2, ly: Y0, lz: -2.8, floor: 0, links: ['hall_1f_back', 'den', 'garage'] },
    { key: 'garage', roomKey: 'zone.garage', lx: garCenterX, ly: Y0, lz: 1.6, floor: 0, links: ['utility', 'yard_east', 'shelter'] },
    { key: 'stairs_1f_bot', roomKey: 'zone.hallway', lx: s1X, ly: Y0, lz: s1ZStart + (arch.s1Reverse ? -1.0 : 1.0), floor: 0, links: ['hall_1f_front', 'hall_1f_back', 'hall_2f_land'] },
    { key: 'hall_2f_land', roomKey: 'zone.hallway', lx: clearHallX, ly: Y1, lz: arch.s1Reverse ? 4.8 : -6.0, floor: 1, links: ['stairs_1f_bot', 'hall_2f_other', 'master', 'bed2', 'stairs_2f_bot'] },
    { key: 'hall_2f_other', roomKey: 'zone.hallway', lx: clearHallX, ly: Y1, lz: arch.s1Reverse ? -6.0 : 4.8, floor: 1, links: ['hall_2f_land', 'master', 'bed2', isModernWide ? 'bath' : 'bed3'] },
    { key: 'master', roomKey: 'zone.bedroom', lx: -5.6, ly: Y1, lz: 4.6, floor: 1, links: isModernWide ? ['hall_2f_other', 'hall_2f_land', 'balcony'] : ['hall_2f_other', 'hall_2f_land'] },
    { key: 'bed2', roomKey: 'zone.bedroom2', lx: -5.8, ly: Y1, lz: -5.8, floor: 1, links: ['hall_2f_land', 'hall_2f_other'] },
    ...(isModernWide
      ? [
          { key: 'bath', roomKey: 'zone.bathroom', lx: 7.6, ly: Y1, lz: 6.4, floor: 1, links: ['hall_2f_other'] },
          { key: 'balcony', roomKey: 'zone.balcony', lx: -2.8, ly: Y1, lz: hd + 1.6, floor: 1, links: ['master'] },
        ]
      : [
          { key: 'bath', roomKey: 'zone.bathroom', lx: 8.8, ly: Y1, lz: -6.4, floor: 1, links: ['stairs_2f_bot'] },
          {
            key: 'bed3',
            roomKey: 'zone.bedroom3',
            lx: 6.4,
            ly: Y1,
            lz: isWestWing ? 4.8 : 6.0,
            floor: 1,
            links: hasEastBalcony ? ['hall_2f_other', 'balcony'] : ['hall_2f_other'],
          },
          ...(hasEastBalcony
            ? [{ key: 'balcony', roomKey: 'zone.balcony', lx: 5.4, ly: Y1, lz: hd + 1.6, floor: 1, links: ['bed3'] }]
            : []),
        ]),
    { key: 'stairs_2f_bot', roomKey: 'zone.hallway', lx: s2X, ly: Y1, lz: -6.8, floor: 1, links: isModernWide ? ['hall_2f_land', 'roof_door'] : ['hall_2f_land', 'bath', 'roof_door'] },
    { key: 'roof_door', roomKey: 'zone.roofDeck', lx: s2X, ly: Y2, lz: roofDoorZ + 1.1, floor: 2, links: ['stairs_2f_bot', 'roof_deck'] },
    { key: 'roof_deck', roomKey: 'zone.roofDeck', lx: -2.5, ly: Y2, lz: 0.0, floor: 2, links: ['roof_door', 'roof_ladder_bot'] },
    { key: 'roof_ladder_bot', roomKey: 'zone.yard', lx: ladderClimbX - 0.85, ly: 0, lz: ladderZ, floor: 0, links: ['yard_west', 'roof_deck'] },
    { key: 'shelter', roomKey: 'zone.shelter', lx: shCX, ly: YS, lz: shCZ + 1.0, floor: -1, links: ['garage'] },
  ];

  for (const n of rawNav) {
    navNodes.push({
      id: `${houseId}_nav_${n.key}`,
      houseId,
      roomKey: n.roomKey,
      floorLevel: n.floor,
      position: localToWorld(worldOrigin, rotationY, { x: mx(n.lx), y: n.ly, z: n.lz }),
      neighbors: n.links.map((l) => `${houseId}_nav_${l}`),
    });
  }

  const totalMinX = Math.min(mx(-hw), mx(garMaxX));
  const totalMaxX = Math.max(mx(-hw), mx(garMaxX));
  const totalMinZ = -hd;
  const totalMaxZ = Math.max(westFrontZ, eastFrontZ, balcony ? hd + 3.2 : hd);

  return {
    houseId,
    lot,
    archetype: arch,
    worldOrigin,
    rotationY,
    width: W,
    depth: D,
    garageCenterLocalX: mx(garCenterX),
    garageWidth: garW,
    garageDepth: garD,
    garageMinZ: garMinZ,
    garageMaxZ: garMaxZ,
    frontDoorLocalX: mx(frontDoorX),
    frontDoorLocalZ: frontDoorZ,
    hatchLocalX: mx(hatchX),
    hatchLocalZ: hatchZ,
    totalMinX,
    totalMaxX,
    totalMinZ,
    totalMaxZ,
    groundFloorY: Y0,
    secondFloorY: Y1,
    roofDeckY: Y2,
    shelterFloorY: YS,
    ceilingHeight: H,
    palette,
    porch,
    balcony,
    walls,
    slabs,
    stairs,
    stairRamps,
    railings,
    ladders,
    headroomVolumes,
    rooms,
    furniture,
    doors,
    windows,
    yardSlots,
    anchors,
    colliders,
    navNodes,
  };
}
