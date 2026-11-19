/**
 * Phase 1 Idle AI Neighbor controller ("Gary").
 * Uses the exact same serializable GameCommand system (`MOVE_INPUT`) as the human player.
 * Strolls around his own front yard, pauses to inspect the street/player suspiciously,
 * and idles with comedic body language.
 */

import type { ActorEntity, GameCommand, Vec3 } from '../simulation/types';
import type { SeededRNG } from '../simulation/rng';
import type { HouseBlueprint } from '../world/houses';
import { localToWorld } from '../world/houses';

export interface IdleNeighborBrain {
  actorId: string;
  waypoints: Vec3[];
  currentWaypointIdx: number;
  pauseTimer: number;
  lookYaw: number;
}

export function createIdleNeighborBrain(
  actorId: string,
  house: HouseBlueprint,
): IdleNeighborBrain {
  const hd = house.depth / 2;
  // Clear open front lawn waypoints (well in front of the 18x14m house, porch, and foundation shrubs)
  const pts: Vec3[] = [
    localToWorld(house.worldOrigin, house.rotationY, { x: -3.0, y: 0, z: hd + 7.2 }),
    localToWorld(house.worldOrigin, house.rotationY, { x: 2.8, y: 0, z: hd + 8.6 }),
    localToWorld(house.worldOrigin, house.rotationY, { x: 0.2, y: 0, z: hd + 12.2 }),
    localToWorld(house.worldOrigin, house.rotationY, { x: -6.2, y: 0, z: hd + 10.4 }),
  ];
  return {
    actorId,
    waypoints: pts,
    currentWaypointIdx: 1,
    pauseTimer: 1.8,
    lookYaw: house.rotationY + Math.PI,
  };
}

export function updateIdleNeighborAI(
  brain: IdleNeighborBrain,
  actor: ActorEntity,
  playerPos: Vec3 | null,
  rng: SeededRNG,
  dt: number,
): GameCommand {
  if (brain.pauseTimer > 0) {
    brain.pauseTimer -= dt;
    if (playerPos) {
      const dx = playerPos.x - actor.position.x;
      const dz = playerPos.z - actor.position.z;
      const targetYaw = Math.atan2(-dx, -dz);
      let diff = targetYaw - brain.lookYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      brain.lookYaw += diff * Math.min(1, dt * 2.0);
    }
    return {
      type: 'MOVE_INPUT',
      actorId: actor.id,
      input: {
        forward: 0,
        right: 0,
        yaw: brain.lookYaw,
        pitch: 0,
        sprint: false,
        jumpPressed: false,
        jumpHeld: false,
      },
    };
  }

  const target = brain.waypoints[brain.currentWaypointIdx];
  const dx = target.x - actor.position.x;
  const dz = target.z - actor.position.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.7) {
    brain.currentWaypointIdx = (brain.currentWaypointIdx + 1) % brain.waypoints.length;
    brain.pauseTimer = rng.range(3.2, 6.8);
    return {
      type: 'MOVE_INPUT',
      actorId: actor.id,
      input: {
        forward: 0,
        right: 0,
        yaw: brain.lookYaw,
        pitch: 0,
        sprint: false,
        jumpPressed: false,
        jumpHeld: false,
      },
    };
  }

  const moveYaw = Math.atan2(-dx, -dz);
  let diff = moveYaw - brain.lookYaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  brain.lookYaw += diff * Math.min(1, dt * 5.0);

  return {
    type: 'MOVE_INPUT',
    actorId: actor.id,
    input: {
      forward: 0.44,
      right: 0,
      yaw: brain.lookYaw,
      pitch: 0,
      sprint: false,
      jumpPressed: false,
      jumpHeld: false,
    },
  };
}
