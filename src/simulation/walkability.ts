/**
 * Startup Walkability & Structural Clearance Checker (pure TypeScript).
 * Verifies every house in the neighborhood at startup:
 * 1. Every NavNode (living room, kitchen, hallway, den, utility, garage, bedrooms, bathroom,
 *    balcony, stairs, roof door, roof deck, shelter) is unobstructed for the 0.35 m x 1.65 m capsule
 *    when doors are open.
 * 2. Every room, staircase, roof door, and shelter is reachable via graph traversal from spawn.
 * 3. Every stair flight has >= 2.40 m vertical headroom above every step.
 */

import type { AABB, Vec3 } from './types';
import type { HouseBlueprint } from '../world/houses';
import { HOUSE_CONSTANTS } from '../world/houses';
import { SpatialHashGrid } from './spatialGrid';
import { PHYSICS } from './physics';

export interface HouseWalkabilityResult {
  houseId: string;
  houseType: string;
  passed: boolean;
  reachableCount: number;
  totalNodes: number;
  unreachableNodes: string[];
  blockedNodes: string[];
  headroomIssues: string[];
}

export interface WalkabilityReport {
  passed: boolean;
  totalHouses: number;
  totalColliders: number;
  houses: HouseWalkabilityResult[];
  issues: string[];
}

function isCapsuleClearAt(pos: Vec3, grid: SpatialHashGrid): string | null {
  const R = PHYSICS.CAPSULE_RADIUS - 0.03; // slight tolerance for nav waypoints
  const H = PHYSICS.CAPSULE_HEIGHT;
  const near = grid.queryXZ(pos.x - R - 0.1, pos.x + R + 0.1, pos.z - R - 0.1, pos.z + R + 0.1);

  for (let i = 0; i < near.length; i++) {
    const b: AABB = near[i];
    // Open doors and hatches do not block walkability
    if (b.dynamicDoorId || b.hatchHouseId || b.ladderId) continue;
    // Ignore floor slabs beneath feet and ceilings above head
    if (b.maxY <= pos.y + 0.08 || b.minY >= pos.y + H - 0.05) continue;

    const closestX = Math.max(b.minX, Math.min(pos.x, b.maxX));
    const closestZ = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    if (dx * dx + dz * dz < R * R) {
      return b.id;
    }
  }
  return null;
}

export function runWalkabilityCheck(
  houses: readonly HouseBlueprint[],
  grid: SpatialHashGrid,
): WalkabilityReport {
  const results: HouseWalkabilityResult[] = [];
  const allIssues: string[] = [];

  for (const h of houses) {
    const nodeById = new Map(h.navNodes.map((n) => [n.id, n]));
    const spawnNodeId = `${h.houseId}_nav_spawn`;
    const blockedNodes: string[] = [];
    const headroomIssues: string[] = [];

    // 1. Check every NavNode for capsule clearance against solid walls/furniture/props
    for (const n of h.navNodes) {
      const blocker = isCapsuleClearAt(n.position, grid);
      if (blocker) {
        blockedNodes.push(`${n.id} blocked by ${blocker}`);
      }
    }

    // 2. BFS reachability from spawn to every room, stairs, roof door, and shelter
    const visited = new Set<string>();
    const queue: string[] = [];
    if (nodeById.has(spawnNodeId)) {
      visited.add(spawnNodeId);
      queue.push(spawnNodeId);
    }
    while (queue.length > 0) {
      const curId = queue.shift()!;
      const cur = nodeById.get(curId);
      if (!cur) continue;
      for (const nextId of cur.neighbors) {
        if (!visited.has(nextId) && nodeById.has(nextId)) {
          visited.add(nextId);
          queue.push(nextId);
        }
      }
    }

    const unreachableNodes: string[] = [];
    for (const n of h.navNodes) {
      if (!visited.has(n.id)) {
        unreachableNodes.push(n.id);
      }
    }

    // 3. Verify >= 2.40m stair headroom along every stair ramp
    for (const hr of h.headroomVolumes) {
      const ramp = h.stairRamps.find((r) => hr.id.endsWith(r.id.replace(`${h.houseId}_`, '')));
      let minClearance = hr.minClearance;
      if (ramp) {
        const cx = (ramp.minX + ramp.maxX) / 2;
        const near = grid.queryXZ(ramp.minX, ramp.maxX, ramp.minZ, ramp.maxZ);
        for (let s = 0; s <= 10; s++) {
          const t = s / 10;
          const sz = ramp.startCoord + (ramp.endCoord - ramp.startCoord) * t;
          const sy = ramp.yStart + (ramp.yEnd - ramp.yStart) * t;
          for (let i = 0; i < near.length; i++) {
            const b = near[i];
            if (b.dynamicDoorId || b.category === 'railing') continue;
            if (cx >= b.minX && cx <= b.maxX && sz >= b.minZ && sz <= b.maxZ) {
              if (b.minY > sy + 0.4) {
                const clearance = b.minY - sy;
                if (clearance < minClearance) minClearance = clearance;
              }
            }
          }
        }
      }
      hr.minClearance = minClearance;
      hr.passed = minClearance >= HOUSE_CONSTANTS.MIN_STAIR_HEADROOM;
      if (!hr.passed) {
        headroomIssues.push(
          `${hr.id} headroom ${minClearance.toFixed(2)}m < ${HOUSE_CONSTANTS.MIN_STAIR_HEADROOM}m`,
        );
      }
    }

    const passed =
      blockedNodes.length === 0 &&
      unreachableNodes.length === 0 &&
      headroomIssues.length === 0;

    if (!passed) {
      for (const b of blockedNodes) allIssues.push(`[${h.houseId}] ${b}`);
      for (const u of unreachableNodes) allIssues.push(`[${h.houseId}] Unreachable: ${u}`);
      for (const hr of headroomIssues) allIssues.push(`[${h.houseId}] ${hr}`);
    }

    results.push({
      houseId: h.houseId,
      houseType: h.lot.houseType,
      passed,
      reachableCount: visited.size,
      totalNodes: h.navNodes.length,
      unreachableNodes,
      blockedNodes,
      headroomIssues,
    });
  }

  return {
    passed: allIssues.length === 0,
    totalHouses: houses.length,
    totalColliders: grid.count,
    houses: results,
    issues: allIssues,
  };
}
