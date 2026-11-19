/**
 * Pure TypeScript Phase 2 Underground Tunnel Engine.
 * Zero React or Three.js dependencies so every rule is deterministically unit-testable.
 *
 * Grid alignment:
 * - CELL_W = 2.40 m (X & Z width of each tunnel cell)
 * - CELL_H = 2.95 m clear ceiling height
 * - ORIGIN_X = -11.20 (matches player & Gary shelter tunnel bulkhead centerline X!)
 * - ORIGIN_Z = +33.56 (cell gz=0 spans z=[32.36..34.76] flush outside player shelter ws_front at z=34.76;
 *   cell gz=-28 spans z=[-34.84..-32.44] flush at Gary's shelter ws_front at z=-34.76!)
 * - gy = 0 -> floor Y = -4.05 (SHELTER_Y), gy = -1 -> floor Y = -7.25, gy = +1 -> surface exit shaft to Y = 0.0
 */

import type { AABB, DoorEntity, LadderSpec, Vec3 } from '../simulation/types';
import type { HouseBlueprint } from '../world/houses';
import { HOUSE_CONSTANTS, localToWorld } from '../world/houses';
import { STREET_CONFIG } from '../world/streetLayout';
import type {
  PartialDigState,
  SoilLayerType,
  TunnelNetworkState,
  TunnelSegment,
  TunnelToolId,
} from './tunnelTypes';

export const TUNNEL_CONSTANTS = {
  CELL_W: 2.4,
  CELL_H: 2.95,
  LEVEL_STEP_Y: 3.2,
  BASE_FLOOR_Y: HOUSE_CONSTANTS.SHELTER_Y, // -4.05
  ORIGIN_X: -11.2,
  ORIGIN_Z: 33.56,
  MIN_GX: -44,
  MAX_GX: 44,
  MIN_GZ: -38,
  MAX_GZ: 12,
  MIN_GY: -1,
  MAX_GY: 1,
  MAX_UNSUPPORTED_HOPS: 2, // > 2 consecutive unsupported hops triggers warning; >= 4 triggers cave-in
  COLLAPSE_HOPS_LIMIT: 4,
  MAX_NATURAL_AIR_HOPS: 4, // O2 drops beyond 4 hops from shelter/surface unless ventilated
  VENT_EXTENSION_HOPS: 2,
  FLOODED_SPEED_MULT: 0.56,
  CAVE_IN_DAMAGE: 18,
} as const;

export const TOOL_ORDER: readonly TunnelToolId[] = [
  'shovel',
  'timber',
  'lantern',
  'vent',
  'pump',
];

export const TOOL_COSTS: Record<TunnelToolId, number> = {
  shovel: 0,
  timber: 10,
  lantern: 6,
  vent: 10,
  pump: 10,
};

export const SOIL_STATS: Record<
  SoilLayerType,
  { hits: number; staminaPerHit: number; salvageCash: number }
> = {
  topsoil: { hits: 2, staminaPerHit: 5, salvageCash: 2 },
  clay: { hits: 3, staminaPerHit: 8, salvageCash: 4 },
  rock: { hits: 5, staminaPerHit: 12, salvageCash: 9 },
  water: { hits: 3, staminaPerHit: 9, salvageCash: 3 },
};

export interface ShelterTunnelPortal {
  houseId: string;
  doorId: string;
  /** World-space position of the shelter's tunnel bulkhead door */
  doorWorldPos: Vec3;
  /** Outward direction unit vector from shelter into soil */
  outX: number;
  outZ: number;
  /** Adjacent tunnel grid cell just outside this shelter's bulkhead */
  entryGx: number;
  entryGz: number;
  /** World-space shelter bounding rectangle (concrete bunker, never dug as earth) */
  shelterMinX: number;
  shelterMaxX: number;
  shelterMinZ: number;
  shelterMaxZ: number;
}

export interface TunnelActionTarget {
  tool: TunnelToolId;
  actionKind: 'dig' | 'support' | 'light' | 'vent' | 'drain';
  gx: number;
  gy: number;
  gz: number;
  worldCenter: Vec3;
  soil: SoilLayerType;
  valid: boolean;
  reasonKey?: string;
  progress: number; // 0..1 for partial digging
  hitsDone: number;
  hitsMax: number;
  cost: number;
}

export interface TunnelStabilityInfo {
  /** Map from segment key to hop distance from nearest shelter portal or supported beam */
  unsupportedHopsByKey: Map<string, number>;
  /** Keys of cells that are at warning depth (>= 3 hops) or collapse depth (>= 4 hops) */
  unstableKeys: Set<string>;
  collapseCandidateKey: string | null;
}

export interface TunnelAirInfo {
  freshAirKeys: Set<string>;
}

export function tunnelCellKey(gx: number, gy: number, gz: number): string {
  return `${gx},${gy},${gz}`;
}

export function parseTunnelCellKey(key: string): { gx: number; gy: number; gz: number } {
  const [gx, gy, gz] = key.split(',').map(Number);
  return { gx, gy, gz };
}

export function gridFloorY(gy: number): number {
  if (gy >= 1) return 0.0;
  return TUNNEL_CONSTANTS.BASE_FLOOR_Y + gy * TUNNEL_CONSTANTS.LEVEL_STEP_Y;
}

export function gridToWorldCenter(gx: number, gy: number, gz: number): Vec3 {
  return {
    x: TUNNEL_CONSTANTS.ORIGIN_X + gx * TUNNEL_CONSTANTS.CELL_W,
    y: gridFloorY(gy),
    z: TUNNEL_CONSTANTS.ORIGIN_Z + gz * TUNNEL_CONSTANTS.CELL_W,
  };
}

export function worldToGrid(x: number, y: number, z: number): { gx: number; gy: number; gz: number } {
  const gx = Math.round((x - TUNNEL_CONSTANTS.ORIGIN_X) / TUNNEL_CONSTANTS.CELL_W);
  const gz = Math.round((z - TUNNEL_CONSTANTS.ORIGIN_Z) / TUNNEL_CONSTANTS.CELL_W);
  let gy = 0;
  if (y < TUNNEL_CONSTANTS.BASE_FLOOR_Y - 1.4) {
    gy = -1;
  } else if (y > -1.2) {
    gy = 1;
  }
  return { gx, gy, gz };
}

export function buildSegmentMap(segments: readonly TunnelSegment[]): Map<string, TunnelSegment> {
  const map = new Map<string, TunnelSegment>();
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    map.set(tunnelCellKey(s.gx, s.gy, s.gz), s);
  }
  return map;
}

/** Extracts shelter bulkhead portals & concrete bunker bounds from all house blueprints. */
export function buildShelterPortals(houses: readonly HouseBlueprint[]): ShelterTunnelPortal[] {
  const portals: ShelterTunnelPortal[] = [];
  for (const h of houses) {
    const tunnelDoor = h.doors.find((d) => d.kind === 'tunnel');
    if (!tunnelDoor) continue;

    // House local +Z transformed by rotationY points outward from ws_front into yard/street
    const outX = Math.sin(h.rotationY);
    const outZ = Math.cos(h.rotationY);
    const probeX = tunnelDoor.position.x + outX * (TUNNEL_CONSTANTS.CELL_W * 0.52);
    const probeZ = tunnelDoor.position.z + outZ * (TUNNEL_CONSTANTS.CELL_W * 0.52);
    const { gx, gz } = worldToGrid(probeX, HOUSE_CONSTANTS.SHELTER_Y, probeZ);

    const mirror = h.lot.garageSide === 'left' ? -1 : 1;
    const garMinX = 12.0;
    const shCX = mirror * (garMinX - 0.8);
    const shCZ = -1.2;
    const shW = 9.6;
    const shD = 7.6;
    const c1 = localToWorld(h.worldOrigin, h.rotationY, {
      x: shCX - shW / 2,
      y: HOUSE_CONSTANTS.SHELTER_Y,
      z: shCZ - shD / 2,
    });
    const c2 = localToWorld(h.worldOrigin, h.rotationY, {
      x: shCX + shW / 2,
      y: HOUSE_CONSTANTS.SHELTER_Y,
      z: shCZ + shD / 2,
    });

    portals.push({
      houseId: h.houseId,
      doorId: tunnelDoor.id,
      doorWorldPos: { ...tunnelDoor.position },
      outX,
      outZ,
      entryGx: gx,
      entryGz: gz,
      shelterMinX: Math.min(c1.x, c2.x),
      shelterMaxX: Math.max(c1.x, c2.x),
      shelterMinZ: Math.min(c1.z, c2.z),
      shelterMaxZ: Math.max(c1.z, c2.z),
    });
  }
  return portals;
}

function hash3i(seed: number, x: number, y: number, z: number): number {
  let h = seed ^ (x * 374761393) ^ (y * 668265263) ^ (z * 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

/** Deterministic soil layer sampling across topsoil, clay, rock, and water pockets. */
export function sampleSoilLayer(seed: number, gx: number, gy: number, gz: number): SoilLayerType {
  // Starter corridor outside player's shelter is inviting topsoil / soft clay
  if (gy === 0 && Math.abs(gx) <= 1 && gz >= -2 && gz <= 1) {
    return gz === -2 ? 'clay' : 'topsoil';
  }
  if (gy >= 1) {
    return 'topsoil';
  }

  // Coarse cluster check for organic groundwater pockets & stone veins
  const pocketHash = hash3i(seed ^ 0x9e3779b9, Math.floor(gx / 2), gy, Math.floor(gz / 2));
  const fineHash = hash3i(seed, gx, gy, gz);

  if (gy === -1) {
    // Deep stratum: mostly hard rock with groundwater seams and dense clay
    if (pocketHash < 0.22 && fineHash < 0.72) return 'water';
    if (fineHash < 0.58) return 'rock';
    return 'clay';
  }

  // Standard tunnel depth (gy = 0)
  if (pocketHash < 0.14 && fineHash < 0.65) return 'water';
  if (fineHash < 0.36) return 'topsoil';
  if (fineHash < 0.72) return 'clay';
  return 'rock';
}

export function isWithinTunnelBounds(gx: number, gy: number, gz: number): boolean {
  return (
    gx >= TUNNEL_CONSTANTS.MIN_GX &&
    gx <= TUNNEL_CONSTANTS.MAX_GX &&
    gy >= TUNNEL_CONSTANTS.MIN_GY &&
    gy <= TUNNEL_CONSTANTS.MAX_GY &&
    gz >= TUNNEL_CONSTANTS.MIN_GZ &&
    gz <= TUNNEL_CONSTANTS.MAX_GZ
  );
}

export function isCellInsideAnyShelter(
  gx: number,
  gy: number,
  gz: number,
  portals: readonly ShelterTunnelPortal[],
): boolean {
  if (gy > 0) return false;
  const center = gridToWorldCenter(gx, gy, gz);
  const half = TUNNEL_CONSTANTS.CELL_W * 0.44;
  for (const p of portals) {
    if (
      center.x + half > p.shelterMinX &&
      center.x - half < p.shelterMaxX &&
      center.z + half > p.shelterMinZ &&
      center.z - half < p.shelterMaxZ
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Verifies whether breaking upward (`gy === 1`) at `(gx, gz)` hits open yard lawn
 * rather than paved Maple Crescent road, sidewalks, or inside house footprints.
 */
export function canBreakSurfaceAtCell(
  gx: number,
  gz: number,
  houses: readonly HouseBlueprint[],
  staticColliders: readonly AABB[],
): boolean {
  const c = gridToWorldCenter(gx, 1, gz);
  const half = 0.85;
  // Never break through paved road or concrete sidewalks
  const roadAndWalkHalf = STREET_CONFIG.roadWidth / 2 + STREET_CONFIG.sidewalkWidth + 0.8;
  if (Math.abs(c.z) < roadAndWalkHalf) return false;

  // Never break through inside any house, porch, or garage footprint
  for (const h of houses) {
    const dx = Math.abs(c.x - h.worldOrigin.x);
    const dz = Math.abs(c.z - h.worldOrigin.z);
    if (dx < h.width / 2 + 1.2 && dz < h.depth / 2 + 3.5) {
      return false;
    }
    const gdx = Math.abs(c.x - (h.worldOrigin.x + (h.rotationY === 0 ? h.garageCenterLocalX : -h.garageCenterLocalX)));
    if (gdx < h.garageWidth / 2 + 1.2 && dz < h.garageDepth / 2 + 1.4) {
      return false;
    }
  }

  // Keep clear of driveways, parked cars, trees, and fences on the surface
  for (let i = 0; i < staticColliders.length; i++) {
    const b = staticColliders[i];
    if (b.id.startsWith('tunnel_')) continue;
    if (b.minY > 2.2 || b.maxY < 0.05) continue;
    if (
      c.x + half > b.minX &&
      c.x - half < b.maxX &&
      c.z + half > b.minZ &&
      c.z - half < b.maxZ
    ) {
      return false;
    }
  }
  return true;
}

const NEIGHBOR_DIRS: ReadonlyArray<[number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 0, 1],
  [0, 0, -1],
  [0, 1, 0],
  [0, -1, 0],
];

export function canDigCellFrom(
  gx: number,
  gy: number,
  gz: number,
  segMap: Map<string, TunnelSegment>,
  portals: readonly ShelterTunnelPortal[],
  doors: Record<string, DoorEntity>,
  houses: readonly HouseBlueprint[],
  staticColliders: readonly AABB[],
): { ok: boolean; reasonKey?: string } {
  if (!isWithinTunnelBounds(gx, gy, gz)) {
    return { ok: false, reasonKey: 'tunnel.err.boundary' };
  }
  if (segMap.has(tunnelCellKey(gx, gy, gz))) {
    return { ok: false };
  }
  if (isCellInsideAnyShelter(gx, gy, gz, portals)) {
    return { ok: false, reasonKey: 'tunnel.err.concrete' };
  }

  // Surface breakout shaft requires clear grass/yard above and dug gy=0 directly underneath
  if (gy === 1) {
    if (!segMap.has(tunnelCellKey(gx, 0, gz))) {
      return { ok: false };
    }
    if (!canBreakSurfaceAtCell(gx, gz, houses, staticColliders)) {
      return { ok: false, reasonKey: 'tunnel.err.blockedAbove' };
    }
    return { ok: true };
  }

  // Deep stratum requires dug gy=0 directly above or horizontal neighbor at gy=-1
  let touchesOpenSpace = false;
  for (const [dx, dy, dz] of NEIGHBOR_DIRS) {
    if (segMap.has(tunnelCellKey(gx + dx, gy + dy, gz + dz))) {
      touchesOpenSpace = true;
      break;
    }
  }

  if (!touchesOpenSpace && gy === 0) {
    for (const p of portals) {
      if (p.entryGx === gx && p.entryGz === gz) {
        const door = doors[p.doorId];
        if (door && door.isOpen) {
          touchesOpenSpace = true;
        } else {
          return { ok: false, reasonKey: 'tunnel.err.openBulkhead' };
        }
        break;
      }
    }
  }

  return touchesOpenSpace ? { ok: true } : { ok: false };
}

/** Computes BFS structural span from nearest shelter portal or supported beam. */
export function evaluateTunnelStability(
  segments: readonly TunnelSegment[],
  portals: readonly ShelterTunnelPortal[],
): TunnelStabilityInfo {
  const segMap = buildSegmentMap(segments);
  const hops = new Map<string, number>();
  const queue: string[] = [];

  for (const seg of segments) {
    const k = tunnelCellKey(seg.gx, seg.gy, seg.gz);
    const isPortalEntry =
      seg.gy === 0 && portals.some((p) => p.entryGx === seg.gx && p.entryGz === seg.gz);
    if (seg.supported || seg.gy === 1 || isPortalEntry) {
      hops.set(k, 0);
      queue.push(k);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const k = queue[head++];
    const curHop = hops.get(k) ?? 0;
    const seg = segMap.get(k);
    if (!seg) continue;

    for (const [dx, dy, dz] of NEIGHBOR_DIRS) {
      const nk = tunnelCellKey(seg.gx + dx, seg.gy + dy, seg.gz + dz);
      if (!segMap.has(nk)) continue;
      const nextHop = curHop + 1;
      const prev = hops.get(nk);
      if (prev === undefined || nextHop < prev) {
        hops.set(nk, nextHop);
        queue.push(nk);
      }
    }
  }

  const unstableKeys = new Set<string>();
  let collapseCandidateKey: string | null = null;
  let maxHop = 0;

  for (const seg of segments) {
    const k = tunnelCellKey(seg.gx, seg.gy, seg.gz);
    const h = hops.get(k) ?? 99;
    if (h > TUNNEL_CONSTANTS.MAX_UNSUPPORTED_HOPS) {
      unstableKeys.add(k);
      if (h >= TUNNEL_CONSTANTS.COLLAPSE_HOPS_LIMIT && h >= maxHop) {
        maxHop = h;
        collapseCandidateKey = k;
      }
    }
  }

  return {
    unsupportedHopsByKey: hops,
    unstableKeys,
    collapseCandidateKey,
  };
}

/**
 * Computes which excavated cells receive breathable air:
 * - Natural draft reaches `MAX_NATURAL_AIR_HOPS` from any shelter portal or `gy=1` surface hatch.
 * - Any segment with `ventilated: true` extends full fresh-air duct pressure + 2 extra hops!
 */
export function computeVentilationNetwork(
  segments: readonly TunnelSegment[],
  portals: readonly ShelterTunnelPortal[],
): TunnelAirInfo {
  const segMap = buildSegmentMap(segments);
  const freshAirKeys = new Set<string>();
  // Store best remaining breath reach at each cell
  const bestReach = new Map<string, number>();
  const queue: Array<{ key: string; reach: number }> = [];

  for (const seg of segments) {
    const k = tunnelCellKey(seg.gx, seg.gy, seg.gz);
    const isPortal =
      seg.gy === 0 && portals.some((p) => p.entryGx === seg.gx && p.entryGz === seg.gz);
    if (isPortal || seg.gy === 1) {
      const reach = TUNNEL_CONSTANTS.MAX_NATURAL_AIR_HOPS;
      bestReach.set(k, reach);
      freshAirKeys.add(k);
      queue.push({ key: k, reach });
    }
  }

  let head = 0;
  while (head < queue.length) {
    const item = queue[head++];
    const seg = segMap.get(item.key);
    if (!seg) continue;

    // A ventilated duct carries fresh air indefinitely across connected ventilated ducts
    // and pushes air 2 hops past the last vent!
    const effectiveReach = seg.ventilated
      ? Math.max(item.reach, TUNNEL_CONSTANTS.VENT_EXTENSION_HOPS)
      : item.reach;

    if (effectiveReach <= 0) continue;

    for (const [dx, dy, dz] of NEIGHBOR_DIRS) {
      const nk = tunnelCellKey(seg.gx + dx, seg.gy + dy, seg.gz + dz);
      const nSeg = segMap.get(nk);
      if (!nSeg) continue;
      const nextReach = nSeg.ventilated
        ? Math.max(effectiveReach, TUNNEL_CONSTANTS.VENT_EXTENSION_HOPS)
        : effectiveReach - 1;
      const prev = bestReach.get(nk);
      if (prev === undefined || nextReach > prev) {
        bestReach.set(nk, nextReach);
        freshAirKeys.add(nk);
        queue.push({ key: nk, reach: nextReach });
      }
    }
  }

  return { freshAirKeys };
}

/** Finds the contextual dig / timber / lantern / vent / pump target for an actor. */
export function findTunnelActionTarget(
  actorPos: Vec3,
  actorYaw: number,
  actorPitch: number,
  inShelter: boolean,
  activeTool: TunnelToolId,
  network: TunnelNetworkState,
  portals: readonly ShelterTunnelPortal[],
  doors: Record<string, DoorEntity>,
  houses: readonly HouseBlueprint[],
  staticColliders: readonly AABB[],
  seed: number,
): TunnelActionTarget | null {
  // Tunnel actions only trigger while underground (shelter or tunnel)
  if (!inShelter && actorPos.y > -0.6) {
    return null;
  }

  const segMap = buildSegmentMap(network.segments);
  const { gx: curGx, gy: curGy, gz: curGz } = worldToGrid(actorPos.x, actorPos.y, actorPos.z);
  const fwdX = -Math.sin(actorYaw);
  const fwdZ = -Math.cos(actorYaw);

  if (activeTool === 'shovel') {
    // Looking steeply UP inside a dug gy=0 cell targets a Surface Breakout Shaft
    if (!inShelter && curGy === 0 && actorPitch > 0.45 && segMap.has(tunnelCellKey(curGx, 0, curGz))) {
      const check = canDigCellFrom(
        curGx,
        1,
        curGz,
        segMap,
        portals,
        doors,
        houses,
        staticColliders,
      );
      const key = tunnelCellKey(curGx, 1, curGz);
      const prog = network.digProgress?.[key];
      const maxHits = SOIL_STATS.topsoil.hits;
      return {
        tool: 'shovel',
        actionKind: 'dig',
        gx: curGx,
        gy: 1,
        gz: curGz,
        worldCenter: gridToWorldCenter(curGx, 0, curGz),
        soil: 'topsoil',
        valid: check.ok,
        reasonKey: check.reasonKey,
        progress: prog ? prog.hits / maxHits : 0,
        hitsDone: prog?.hits ?? 0,
        hitsMax: maxHits,
        cost: 0,
      };
    }

    // Looking steeply DOWN inside a dug gy=0 cell targets a Deep Shaft (gy = -1)
    if (!inShelter && curGy === 0 && actorPitch < -0.52 && segMap.has(tunnelCellKey(curGx, 0, curGz))) {
      const check = canDigCellFrom(
        curGx,
        -1,
        curGz,
        segMap,
        portals,
        doors,
        houses,
        staticColliders,
      );
      const soil = sampleSoilLayer(seed, curGx, -1, curGz);
      const maxHits = SOIL_STATS[soil].hits;
      const key = tunnelCellKey(curGx, -1, curGz);
      const prog = network.digProgress?.[key];
      return {
        tool: 'shovel',
        actionKind: 'dig',
        gx: curGx,
        gy: -1,
        gz: curGz,
        worldCenter: gridToWorldCenter(curGx, 0, curGz),
        soil,
        valid: check.ok,
        reasonKey: check.reasonKey,
        progress: prog ? prog.hits / maxHits : 0,
        hitsDone: prog?.hits ?? 0,
        hitsMax: maxHits,
        cost: 0,
      };
    }

    // Horizontal step probe along aim vector (works seamlessly in both 1P and 3P!)
    const targetGy = Math.max(-1, Math.min(0, curGy));
    for (let dist = 0.6; dist <= 2.9; dist += 0.35) {
      const px = actorPos.x + fwdX * dist;
      const pz = actorPos.z + fwdZ * dist;
      const { gx, gz } = worldToGrid(px, actorPos.y, pz);
      const k = tunnelCellKey(gx, targetGy, gz);
      if (segMap.has(k)) continue;
      if (isCellInsideAnyShelter(gx, targetGy, gz, portals)) continue;

      const check = canDigCellFrom(
        gx,
        targetGy,
        gz,
        segMap,
        portals,
        doors,
        houses,
        staticColliders,
      );
      if (check.ok || check.reasonKey) {
        const soil = sampleSoilLayer(seed, gx, targetGy, gz);
        const maxHits = SOIL_STATS[soil].hits;
        const prog = network.digProgress?.[k];
        return {
          tool: 'shovel',
          actionKind: 'dig',
          gx,
          gy: targetGy,
          gz,
          worldCenter: gridToWorldCenter(gx, targetGy, gz),
          soil,
          valid: check.ok,
          reasonKey: check.reasonKey,
          progress: prog ? prog.hits / maxHits : 0,
          hitsDone: prog?.hits ?? 0,
          hitsMax: maxHits,
          cost: 0,
        };
      }
    }
    return null;
  }

  // Equipment tools (`timber`, `lantern`, `vent`, `pump`): target aimed or standing segment
  const candidates: TunnelSegment[] = [];
  for (let dist = 0.0; dist <= 2.4; dist += 0.8) {
    const px = actorPos.x + fwdX * dist;
    const pz = actorPos.z + fwdZ * dist;
    const { gx, gy, gz } = worldToGrid(px, actorPos.y, pz);
    const seg = segMap.get(tunnelCellKey(gx, Math.min(0, gy), gz));
    if (seg && !candidates.includes(seg)) {
      candidates.push(seg);
    }
  }

  const needsTool = (seg: TunnelSegment): boolean => {
    switch (activeTool) {
      case 'timber':
        return !seg.supported;
      case 'lantern':
        return !seg.lit;
      case 'vent':
        return !seg.ventilated;
      case 'pump':
        return seg.flooded;
      default:
        return false;
    }
  };

  const chosen = candidates.find(needsTool) ?? candidates[0];
  if (!chosen) return null;

  const actionKind: TunnelActionTarget['actionKind'] =
    activeTool === 'timber'
      ? 'support'
      : activeTool === 'lantern'
        ? 'light'
        : activeTool === 'vent'
          ? 'vent'
          : 'drain';

  const valid = needsTool(chosen);
  return {
    tool: activeTool,
    actionKind,
    gx: chosen.gx,
    gy: chosen.gy,
    gz: chosen.gz,
    worldCenter: gridToWorldCenter(chosen.gx, chosen.gy, chosen.gz),
    soil: chosen.soil,
    valid,
    reasonKey: valid ? undefined : 'tunnel.err.alreadyInstalled',
    progress: 0,
    hitsDone: 0,
    hitsMax: 1,
    cost: TOOL_COSTS[activeTool],
  };
}

/**
 * Generates exact AABBs (floor slabs, ceiling slabs, perimeter earth walls, un-dug bulkhead plugs)
 * and climbable shaft ladders for the current TunnelNetworkState.
 */
export function buildTunnelCollisionData(
  network: TunnelNetworkState,
  portals: readonly ShelterTunnelPortal[],
): { colliders: AABB[]; ladders: LadderSpec[] } {
  const colliders: AABB[] = [];
  const ladders: LadderSpec[] = [];
  const segMap = buildSegmentMap(network.segments);
  const halfW = TUNNEL_CONSTANTS.CELL_W / 2;
  const h = TUNNEL_CONSTANTS.CELL_H;
  const wallT = 0.36;

  // 1. Plug every shelter's portal entry cell if it hasn't been excavated yet
  //    so opening the steel bulkhead reveals solid soil until dug!
  for (const p of portals) {
    const entryKey = tunnelCellKey(p.entryGx, 0, p.entryGz);
    if (!segMap.has(entryKey)) {
      const c = gridToWorldCenter(p.entryGx, 0, p.entryGz);
      colliders.push({
        id: `tunnel_plug_${p.houseId}`,
        minX: c.x - halfW,
        maxX: c.x + halfW,
        minY: c.y,
        maxY: c.y + h + 0.3,
        minZ: c.z - halfW,
        maxZ: c.z + halfW,
        surface: 'grass',
        category: 'wall',
        floorLevel: -1,
        blocksCamera: true,
      });
    }
  }

  // 2. Build hollow room floor/ceiling/wall bounds for every excavated TunnelSegment
  for (const seg of network.segments) {
    const c = gridToWorldCenter(seg.gx, seg.gy, seg.gz);
    const idPrefix = `tunnel_c_${seg.gx}_${seg.gy}_${seg.gz}`;

    if (seg.gy === 1) {
      // Surface breakout shaft collar walls from gy=0 ceiling up to ground level (y=0)
      const shaftBot = TUNNEL_CONSTANTS.BASE_FLOOR_Y + h;
      const shaftTop = 0.02;
      const collarW = 0.56;
      const gap = 0.62;
      colliders.push(
        {
          id: `${idPrefix}_shaft_N`,
          minX: c.x - halfW,
          maxX: c.x + halfW,
          minY: shaftBot,
          maxY: shaftTop,
          minZ: c.z - halfW,
          maxZ: c.z - gap,
          surface: 'wood',
          category: 'wall',
          floorLevel: -1,
          blocksCamera: true,
        },
        {
          id: `${idPrefix}_shaft_S`,
          minX: c.x - halfW,
          maxX: c.x + halfW,
          minY: shaftBot,
          maxY: shaftTop,
          minZ: c.z + gap,
          maxZ: c.z + halfW,
          surface: 'wood',
          category: 'wall',
          floorLevel: -1,
          blocksCamera: true,
        },
        {
          id: `${idPrefix}_shaft_W`,
          minX: c.x - halfW,
          maxX: c.x - gap,
          minY: shaftBot,
          maxY: shaftTop,
          minZ: c.z - gap,
          maxZ: c.z + gap,
          surface: 'wood',
          category: 'wall',
          floorLevel: -1,
          blocksCamera: true,
        },
        {
          id: `${idPrefix}_shaft_E`,
          minX: c.x + gap,
          maxX: c.x + halfW,
          minY: shaftBot,
          maxY: shaftTop,
          minZ: c.z - gap,
          maxZ: c.z + gap,
          surface: 'wood',
          category: 'wall',
          floorLevel: -1,
          blocksCamera: true,
        },
      );
      void collarW;

      // Climbable shaft ladder connecting gy=0 floor (-4.05) to yard surface (0.0)
      ladders.push({
        id: `tunnel_ladder_surf_${seg.gx}_${seg.gz}`,
        houseId: 'tunnel',
        kind: 'tunnel_shaft',
        climbX: c.x,
        climbZ: c.z,
        faceYaw: 0,
        bottomY: TUNNEL_CONSTANTS.BASE_FLOOR_Y,
        topY: 0.0,
        bottomExit: { x: c.x, y: TUNNEL_CONSTANTS.BASE_FLOOR_Y, z: c.z + 0.85 },
        topExit: { x: c.x, y: 0.0, z: c.z + 1.05 },
        bottomFloor: -1,
        topFloor: 0,
        bottomInShelter: false,
        topInShelter: false,
      });
      continue;
    }

    const hasAbove = segMap.has(tunnelCellKey(seg.gx, seg.gy + 1, seg.gz));
    const hasBelow = segMap.has(tunnelCellKey(seg.gx, seg.gy - 1, seg.gz));

    // Floor slab (skipped only if there is a vertical drop shaft below; instead provide rim collar)
    if (!hasBelow) {
      colliders.push({
        id: `${idPrefix}_floor`,
        minX: c.x - halfW,
        maxX: c.x + halfW,
        minY: c.y - 0.32,
        maxY: c.y,
        minZ: c.z - halfW,
        maxZ: c.z + halfW,
        surface: seg.supported ? 'wood' : 'grass',
        category: 'floor',
        floorLevel: seg.gy === -1 ? -2 : -1,
        blocksCamera: true,
      });
    } else {
      // Partial floor rim leaving 1.2m center shaft opening down to gy=-1
      const gap = 0.6;
      colliders.push(
        {
          id: `${idPrefix}_rimN`,
          minX: c.x - halfW,
          maxX: c.x + halfW,
          minY: c.y - 0.28,
          maxY: c.y,
          minZ: c.z - halfW,
          maxZ: c.z - gap,
          surface: 'wood',
          category: 'floor',
          floorLevel: -1,
          blocksCamera: true,
        },
        {
          id: `${idPrefix}_rimS`,
          minX: c.x - halfW,
          maxX: c.x + halfW,
          minY: c.y - 0.28,
          maxY: c.y,
          minZ: c.z + gap,
          maxZ: c.z + halfW,
          surface: 'wood',
          category: 'floor',
          floorLevel: -1,
          blocksCamera: true,
        },
      );
      // Shaft ladder between gy=-1 and gy=0
      ladders.push({
        id: `tunnel_ladder_deep_${seg.gx}_${seg.gz}`,
        houseId: 'tunnel',
        kind: 'tunnel_shaft',
        climbX: c.x,
        climbZ: c.z,
        faceYaw: 0,
        bottomY: gridFloorY(-1),
        topY: gridFloorY(0),
        bottomExit: { x: c.x, y: gridFloorY(-1), z: c.z + 0.85 },
        topExit: { x: c.x, y: gridFloorY(0), z: c.z + 0.85 },
        bottomFloor: -2,
        topFloor: -1,
        bottomInShelter: false,
        topInShelter: false,
      });
    }

    // Ceiling slab (skipped where an open shaft connects directly above)
    if (!hasAbove) {
      colliders.push({
        id: `${idPrefix}_ceil`,
        minX: c.x - halfW,
        maxX: c.x + halfW,
        minY: c.y + h,
        maxY: c.y + h + 0.34,
        minZ: c.z - halfW,
        maxZ: c.z + halfW,
        surface: 'grass',
        category: 'ceiling',
        floorLevel: seg.gy === -1 ? -2 : -1,
        blocksCamera: true,
      });
    }

    // Perimeter solid earth walls on un-dug faces (unless connecting directly into a shelter portal)
    const isPortalCell =
      seg.gy === 0 && portals.find((p) => p.entryGx === seg.gx && p.entryGz === seg.gz);

    const hasPosX = segMap.has(tunnelCellKey(seg.gx + 1, seg.gy, seg.gz));
    const hasNegX = segMap.has(tunnelCellKey(seg.gx - 1, seg.gy, seg.gz));
    const hasPosZ = segMap.has(tunnelCellKey(seg.gx, seg.gy, seg.gz + 1));
    const hasNegZ = segMap.has(tunnelCellKey(seg.gx, seg.gy, seg.gz - 1));

    const openPosZByPortal = Boolean(isPortalCell && isPortalCell.outZ < -0.5);
    const openNegZByPortal = Boolean(isPortalCell && isPortalCell.outZ > 0.5);

    if (!hasPosX) {
      colliders.push({
        id: `${idPrefix}_wPX`,
        minX: c.x + halfW - 0.02,
        maxX: c.x + halfW + wallT,
        minY: c.y,
        maxY: c.y + h,
        minZ: c.z - halfW,
        maxZ: c.z + halfW,
        surface: 'grass',
        category: 'wall',
        floorLevel: seg.gy === -1 ? -2 : -1,
        blocksCamera: true,
      });
    }
    if (!hasNegX) {
      colliders.push({
        id: `${idPrefix}_wNX`,
        minX: c.x - halfW - wallT,
        maxX: c.x - halfW + 0.02,
        minY: c.y,
        maxY: c.y + h,
        minZ: c.z - halfW,
        maxZ: c.z + halfW,
        surface: 'grass',
        category: 'wall',
        floorLevel: seg.gy === -1 ? -2 : -1,
        blocksCamera: true,
      });
    }
    if (!hasPosZ && !openPosZByPortal) {
      colliders.push({
        id: `${idPrefix}_wPZ`,
        minX: c.x - halfW,
        maxX: c.x + halfW,
        minY: c.y,
        maxY: c.y + h,
        minZ: c.z + halfW - 0.02,
        maxZ: c.z + halfW + wallT,
        surface: 'grass',
        category: 'wall',
        floorLevel: seg.gy === -1 ? -2 : -1,
        blocksCamera: true,
      });
    }
    if (!hasNegZ && !openNegZByPortal) {
      colliders.push({
        id: `${idPrefix}_wNZ`,
        minX: c.x - halfW,
        maxX: c.x + halfW,
        minY: c.y,
        maxY: c.y + h,
        minZ: c.z - halfW - wallT,
        maxZ: c.z - halfW + 0.02,
        surface: 'grass',
        category: 'wall',
        floorLevel: seg.gy === -1 ? -2 : -1,
        blocksCamera: true,
      });
    }
  }

  return { colliders, ladders };
}

/**
 * Flood-fills groundwater seepage when breaking into a `'water'` pocket
 * and provides pocket-wide drainage when using the sump pump.
 */
export function floodWaterFromCell(
  origin: TunnelSegment,
  segMap: Map<string, TunnelSegment>,
): number {
  let floodedCount = 0;
  origin.flooded = true;
  floodedCount++;

  for (const [dx, , dz] of [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]) {
    const n = segMap.get(tunnelCellKey(origin.gx + dx, origin.gy, origin.gz + dz));
    if (n && !n.flooded && !n.drained) {
      n.flooded = true;
      floodedCount++;
    }
  }
  return floodedCount;
}

export function drainFloodedPocket(
  start: TunnelSegment,
  segMap: Map<string, TunnelSegment>,
): number {
  const queue: TunnelSegment[] = [start];
  const visited = new Set<string>([tunnelCellKey(start.gx, start.gy, start.gz)]);
  let drainedCount = 0;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.flooded) {
      cur.flooded = false;
      cur.drained = true;
      drainedCount++;
    }
    for (const [dx, dy, dz] of NEIGHBOR_DIRS) {
      const nk = tunnelCellKey(cur.gx + dx, cur.gy + dy, cur.gz + dz);
      if (visited.has(nk)) continue;
      visited.add(nk);
      const n = segMap.get(nk);
      if (n && n.flooded) {
        queue.push(n);
      }
    }
  }
  return drainedCount;
}
