/**
 * Pure TypeScript capsule vs AABB character controller physics + analytic stair ramps
 * + real ladder/shelter hatch climbing sequence.
 * Zero Three.js / React dependency.
 */

import type {
  AABB,
  ActorEntity,
  DoorEntity,
  LadderSpec,
  MoveInputPayload,
  StairRamp,
  SurfaceKind,
} from './types';
import { SpatialHashGrid } from './spatialGrid';
import { STREET_CONFIG } from '../world/streetLayout';
import { HOUSE_CONSTANTS } from '../world/houses';

export const PHYSICS = {
  CAPSULE_RADIUS: 0.35, // ~0.35m radius matching 1.65m redesigned character
  CAPSULE_HEIGHT: 1.65, // ~1.65m height
  WALK_SPEED: 3.9,
  RUN_SPEED: 6.5,
  CLIMB_SPEED: 2.35,
  GRAVITY: -21.0,
  JUMP_SPEED: 7.2,
  STEP_HEIGHT: 0.32, // Smoothly steps onto porch steps & curbs
  COYOTE_TIME: 0.11,
  JUMP_BUFFER: 0.12,
  GROUND_EPS: 0.05,
} as const;

const _nearScratch: AABB[] = [];

function circleIntersectsBoxXZ(
  cx: number,
  cz: number,
  r: number,
  box: AABB,
): boolean {
  const closestX = Math.max(box.minX, Math.min(cx, box.maxX));
  const closestZ = Math.max(box.minZ, Math.min(cz, box.maxZ));
  const dx = cx - closestX;
  const dz = cz - closestZ;
  return dx * dx + dz * dz < r * r;
}

function isBoxActive(
  box: AABB,
  doors: Record<string, DoorEntity>,
  shelterHatches: Record<string, { isOpen: boolean; openProgress: number }>,
  actor: ActorEntity,
): boolean {
  if (box.dynamicDoorId) {
    const door = doors[box.dynamicDoorId];
    if (door && door.isOpen) return false;
  }
  if (box.ladderId && actor.climbState && actor.climbState.ladderId === box.ladderId) {
    return false;
  }
  if (box.hatchHouseId) {
    const hatch = shelterHatches[box.hatchHouseId];
    if (hatch && (hatch.isOpen || hatch.openProgress > 0.25)) return false;
    if (actor.climbState && actor.climbState.kind === 'shelter' && actor.climbState.houseId === box.hatchHouseId) {
      return false;
    }
  }
  return true;
}

/** Evaluates analytic stair ramp elevation at (x, z) if the actor is horizontally within the stair flight. */
function sampleStairRamp(
  x: number,
  y: number,
  z: number,
  ramps: readonly StairRamp[],
): { y: number; slope: number; surface: SurfaceKind; ramp: StairRamp } | null {
  let best: { y: number; slope: number; surface: SurfaceKind; ramp: StairRamp } | null = null;
  const margin = 0.08;

  for (let i = 0; i < ramps.length; i++) {
    const r = ramps[i];
    if (x < r.minX - margin || x > r.maxX + margin || z < r.minZ - margin || z > r.maxZ + margin) {
      continue;
    }
    const coord = r.axis === 'z' ? z : x;
    const span = r.endCoord - r.startCoord;
    if (Math.abs(span) < 1e-4) continue;
    const t = Math.max(0, Math.min(1, (coord - r.startCoord) / span));
    const rampY = r.yStart + t * (r.yEnd - r.yStart);

    // Only snap onto a stair ramp that is reasonably close to the actor's current elevation
    if (y >= rampY - 0.55 && y <= rampY + 0.65) {
      if (!best || Math.abs(rampY - y) < Math.abs(best.y - y)) {
        const slope = Math.atan2(r.yEnd - r.yStart, Math.abs(span));
        best = { y: rampY, slope, surface: r.surface, ramp: r };
      }
    }
  }
  return best;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Steps an actor who is currently in a real ladder or shelter-hatch climb sequence.
 * Handles: opening_hatch -> mount -> climbing (hand-over-hand with W/S) -> dismount.
 * Zero teleporting!
 */
function stepLadderClimb(
  actor: ActorEntity,
  input: MoveInputPayload,
  laddersById: Record<string, LadderSpec>,
  shelterHatches: Record<string, { isOpen: boolean; openProgress: number }>,
  dt: number,
): { jumped: boolean; landed: boolean; stepDistance: number; rungStep: boolean } {
  const cs = actor.climbState!;
  const ladder = laddersById[cs.ladderId];
  if (!ladder) {
    actor.climbState = null;
    return { jumped: false, landed: false, stepDistance: 0, rungStep: false };
  }

  actor.velocity.x = 0;
  actor.velocity.y = 0;
  actor.velocity.z = 0;
  actor.grounded = false;
  actor.onStairs = false;
  actor.stairSlope = 0;
  actor.animTime += dt;
  actor.pitch = Math.max(-1.25, Math.min(1.25, input.pitch));

  let rungStep = false;

  if (cs.phase === 'opening_hatch') {
    // Open the hinged metal trapdoor smoothly before mounting the shelter ladder
    const hatch = shelterHatches[cs.houseId];
    if (hatch) hatch.isOpen = true;
    cs.phaseProgress += dt * 2.4;
    actor.animState = 'interact';
    actor.interactTimer = 0.15;
    if (cs.phaseProgress >= 1) {
      cs.phase = 'mount';
      cs.phaseProgress = 0;
      cs.fromPos = { ...actor.position };
      cs.toPos = {
        x: ladder.climbX,
        y: cs.entryDirection === 'up' ? ladder.bottomY + 0.15 : ladder.topY - 0.55,
        z: ladder.climbZ,
      };
    }
    return { jumped: false, landed: false, stepDistance: 0, rungStep: false };
  }

  if (cs.phase === 'mount') {
    cs.phaseProgress += dt * 3.0;
    const s = smoothstep(cs.phaseProgress);
    actor.position.x = lerp(cs.fromPos.x, cs.toPos.x, s);
    actor.position.y = lerp(cs.fromPos.y, cs.toPos.y, s);
    actor.position.z = lerp(cs.fromPos.z, cs.toPos.z, s);
    actor.yaw = ladder.faceYaw;
    actor.animState = 'climb';
    cs.climbVelY = cs.entryDirection === 'up' ? 1 : -1;

    if (cs.phaseProgress >= 1) {
      cs.phase = 'climbing';
      cs.phaseProgress = 0;
      actor.inShelter = ladder.kind === 'shelter' ? actor.position.y < -0.5 : false;
    }
    return { jumped: false, landed: false, stepDistance: 0, rungStep: false };
  }

  if (cs.phase === 'climbing') {
    actor.position.x = ladder.climbX;
    actor.position.z = ladder.climbZ;
    actor.yaw = ladder.faceYaw;
    actor.animState = 'climb';

    // W/Forward climbs UP, S/Back climbs DOWN (works seamlessly on desktop & mobile joystick)
    const dir = Math.abs(input.forward) > 0.08 ? Math.sign(input.forward) : 0;
    const speed = input.sprint ? PHYSICS.CLIMB_SPEED * 1.3 : PHYSICS.CLIMB_SPEED;
    const dy = dir * speed * dt;
    cs.climbVelY = dir * speed;

    const prevRung = Math.floor(cs.climbMeters / 0.36);
    actor.position.y += dy;
    cs.climbMeters += Math.abs(dy);
    const nextRung = Math.floor(cs.climbMeters / 0.36);
    if (nextRung !== prevRung) rungStep = true;

    actor.inShelter = ladder.kind === 'shelter' && actor.position.y < -0.35;
    actor.currentSurface = 'metal';

    // Reached top -> smooth dismount onto roof deck or garage floor
    if (actor.position.y >= ladder.topY - 0.08 && dir > 0) {
      cs.phase = 'dismount';
      cs.phaseProgress = 0;
      cs.fromPos = { ...actor.position };
      cs.toPos = { ...ladder.topExit };
      actor.inShelter = ladder.topInShelter;
    } else if (actor.position.y <= ladder.bottomY + 0.08 && dir < 0) {
      // Reached bottom -> smooth dismount onto ground or shelter floor
      cs.phase = 'dismount';
      cs.phaseProgress = 0;
      cs.fromPos = { ...actor.position };
      cs.toPos = { ...ladder.bottomExit };
      actor.inShelter = ladder.bottomInShelter;
    } else if (input.jumpPressed) {
      // Allow clean jump/dismount near bottom or top
      const nearTop = Math.abs(actor.position.y - ladder.topY) < 1.4;
      cs.phase = 'dismount';
      cs.phaseProgress = 0;
      cs.fromPos = { ...actor.position };
      cs.toPos = nearTop ? { ...ladder.topExit } : { ...ladder.bottomExit };
      actor.inShelter = nearTop ? ladder.topInShelter : ladder.bottomInShelter;
    }
    return { jumped: false, landed: false, stepDistance: Math.abs(dy), rungStep };
  }

  // Dismount phase: step cleanly off ladder onto standing destination
  cs.phaseProgress += dt * 3.0;
  const s = smoothstep(cs.phaseProgress);
  actor.position.x = lerp(cs.fromPos.x, cs.toPos.x, s);
  actor.position.y = lerp(cs.fromPos.y, cs.toPos.y, s);
  actor.position.z = lerp(cs.fromPos.z, cs.toPos.z, s);
  actor.animState = 'climb';
  cs.climbVelY = 0;

  if (cs.phaseProgress >= 1) {
    actor.position = { ...cs.toPos };
    actor.grounded = true;
    actor.climbState = null;
    actor.animState = 'idle';
    return { jumped: false, landed: true, stepDistance: 0, rungStep: false };
  }

  return { jumped: false, landed: false, stepDistance: 0, rungStep: false };
}

/**
 * Steps a single actor's capsule physics for one fixed timestep `dt`.
 */
export function stepActorPhysics(
  actor: ActorEntity,
  input: MoveInputPayload,
  grid: SpatialHashGrid,
  stairRamps: readonly StairRamp[],
  laddersById: Record<string, LadderSpec>,
  doors: Record<string, DoorEntity>,
  shelterHatches: Record<string, { isOpen: boolean; openProgress: number }>,
  dt: number,
): { jumped: boolean; landed: boolean; stepDistance: number; rungStep: boolean } {
  // Active ladder / shelter hatch climb takes full smooth control (no teleporting!)
  if (actor.climbState) {
    return stepLadderClimb(actor, input, laddersById, shelterHatches, dt);
  }

  const R = PHYSICS.CAPSULE_RADIUS;
  const H = PHYSICS.CAPSULE_HEIGHT;
  const wasGrounded = actor.grounded;

  // Compute yaw turn rate for expressive turning animations
  let dyaw = input.yaw - actor.yaw;
  while (dyaw > Math.PI) dyaw -= Math.PI * 2;
  while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  actor.turnRate = dyaw / Math.max(dt, 1e-4);
  actor.yaw = input.yaw;
  actor.pitch = Math.max(-1.32, Math.min(1.32, input.pitch));

  // Stamina & movement speed
  const wantsMove = Math.abs(input.forward) > 0.01 || Math.abs(input.right) > 0.01;
  const canSprint = input.sprint && wantsMove && actor.stamina > 2;
  if (canSprint) {
    actor.stamina = Math.max(0, actor.stamina - 16 * dt);
  } else {
    actor.stamina = Math.min(actor.maxStamina, actor.stamina + 22 * dt);
  }
  const speed = canSprint ? PHYSICS.RUN_SPEED : PHYSICS.WALK_SPEED;

  // Desired horizontal velocity in world space (Three.js convention: yaw=0 faces -Z)
  const fwdX = -Math.sin(actor.yaw);
  const fwdZ = -Math.cos(actor.yaw);
  const rightX = Math.cos(actor.yaw);
  const rightZ = -Math.sin(actor.yaw);

  let wishX = fwdX * input.forward + rightX * input.right;
  let wishZ = fwdZ * input.forward + rightZ * input.right;
  const wishLen = Math.hypot(wishX, wishZ);
  if (wishLen > 1) {
    wishX /= wishLen;
    wishZ /= wishLen;
  }

  const targetVx = wishX * speed;
  const targetVz = wishZ * speed;
  const accel = actor.grounded ? 17 : 6;
  const blend = 1 - Math.exp(-accel * dt);
  actor.velocity.x += (targetVx - actor.velocity.x) * blend;
  actor.velocity.z += (targetVz - actor.velocity.z) * blend;

  // Jump buffering & coyote time
  if (actor.grounded) {
    actor.coyoteTimer = PHYSICS.COYOTE_TIME;
  } else {
    actor.coyoteTimer = Math.max(0, actor.coyoteTimer - dt);
  }

  if (input.jumpPressed) {
    actor.jumpBufferTimer = PHYSICS.JUMP_BUFFER;
  } else {
    actor.jumpBufferTimer = Math.max(0, actor.jumpBufferTimer - dt);
  }

  let jumped = false;
  if (actor.jumpBufferTimer > 0 && actor.coyoteTimer > 0) {
    actor.velocity.y = PHYSICS.JUMP_SPEED;
    actor.grounded = false;
    actor.onStairs = false;
    actor.coyoteTimer = 0;
    actor.jumpBufferTimer = 0;
    jumped = true;
  }

  if (!input.jumpHeld && actor.velocity.y > 2.2) {
    actor.velocity.y *= 0.85;
  }

  // Gravity
  actor.velocity.y += PHYSICS.GRAVITY * dt;
  if (actor.velocity.y < -28) actor.velocity.y = -28;

  // Fast SpatialHashGrid broadphase query around actor
  const px0 = actor.position.x;
  const pz0 = actor.position.z;
  const rawNear = grid.queryXZ(px0 - 2.6, px0 + 2.6, pz0 - 2.6, pz0 + 2.6, _nearScratch);
  const near: AABB[] = [];
  for (let i = 0; i < rawNear.length; i++) {
    if (isBoxActive(rawNear[i], doors, shelterHatches, actor)) {
      near.push(rawNear[i]);
    }
  }

  let nextX = actor.position.x + actor.velocity.x * dt;
  let nextZ = actor.position.z + actor.velocity.z * dt;
  let nextY = actor.position.y;

  // Check if moving onto or along an analytic stair ramp FIRST so horizontal wall slide knows our elevated Y
  const rampAhead = !jumped ? sampleStairRamp(nextX, nextY, nextZ, stairRamps) : null;
  if (rampAhead && actor.velocity.y <= 1.2) {
    // Allow smooth upward/downward slope following on stairs
    nextY = Math.max(nextY, rampAhead.y);
  }

  // Horizontal capsule vs AABB sliding collision (4 iterations prevents corner snagging!)
  let highestStepCandidate = -Infinity;
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < near.length; i++) {
      const b = near[i];
      if (b.maxY <= nextY + 0.03 || b.minY >= nextY + H - 0.05) continue;
      if (!circleIntersectsBoxXZ(nextX, nextZ, R, b)) continue;

      const climbDelta = b.maxY - nextY;
      if (climbDelta > 0 && climbDelta <= PHYSICS.STEP_HEIGHT && actor.velocity.y <= 1.2) {
        if (b.maxY > highestStepCandidate) highestStepCandidate = b.maxY;
        continue;
      }

      const closestX = Math.max(b.minX, Math.min(nextX, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(nextZ, b.maxZ));
      const dx = nextX - closestX;
      const dz = nextZ - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const push = R - dist;
        nextX += (dx / dist) * push;
        nextZ += (dz / dist) * push;
      } else {
        const penLeft = Math.abs(nextX - b.minX);
        const penRight = Math.abs(b.maxX - nextX);
        const penFront = Math.abs(nextZ - b.minZ);
        const penBack = Math.abs(b.maxZ - nextZ);
        const minPen = Math.min(penLeft, penRight, penFront, penBack);
        if (minPen === penLeft) nextX = b.minX - R;
        else if (minPen === penRight) nextX = b.maxX + R;
        else if (minPen === penFront) nextZ = b.minZ - R;
        else nextZ = b.maxZ + R;
      }
    }
  }

  // Smooth step-up for curbs & porch steps if clear headroom exists
  if (highestStepCandidate > nextY && highestStepCandidate - nextY <= PHYSICS.STEP_HEIGHT) {
    let blockedAbove = false;
    for (let i = 0; i < near.length; i++) {
      const b = near[i];
      if (b.minY >= highestStepCandidate + 0.05 && b.minY < highestStepCandidate + H) {
        if (circleIntersectsBoxXZ(nextX, nextZ, R * 0.85, b)) {
          blockedAbove = true;
          break;
        }
      }
    }
    if (!blockedAbove) {
      nextY = highestStepCandidate;
      if (actor.velocity.y < 0) actor.velocity.y = 0;
    }
  }

  // Vertical integration & ground/stair/ceiling support
  const prevY = nextY;
  nextY += actor.velocity.y * dt;

  let supportY = actor.inShelter ? HOUSE_CONSTANTS.SHELTER_Y : 0.0;
  let supportSurface: SurfaceKind =
    actor.inShelter
      ? 'concrete'
      : Math.abs(nextZ) < STREET_CONFIG.roadWidth / 2
        ? 'asphalt'
        : Math.abs(nextZ) < STREET_CONFIG.roadWidth / 2 + STREET_CONFIG.sidewalkWidth
          ? 'concrete'
          : 'grass';
  let onStairNow = false;
  let activeStairSlope = 0;

  // Evaluate analytic stair ramp support (sticks smoothly when walking/running both UP and DOWN!)
  const rampNow = !jumped ? sampleStairRamp(nextX, prevY, nextZ, stairRamps) : null;
  if (rampNow && actor.velocity.y <= 0.5) {
    if (rampNow.y >= supportY && nextY <= rampNow.y + 0.28) {
      supportY = rampNow.y;
      supportSurface = rampNow.surface;
      onStairNow = true;
      activeStairSlope = rampNow.slope;
      // Smooth downward slope sticking so descending stairs never bounces!
      if (wasGrounded && nextY > rampNow.y && nextY - rampNow.y < 0.28) {
        nextY = rampNow.y;
      }
    }
  }

  for (let i = 0; i < near.length; i++) {
    const b = near[i];
    if (!circleIntersectsBoxXZ(nextX, nextZ, R * 0.85, b)) continue;

    // Floor support check
    if (
      actor.velocity.y <= 0 &&
      b.maxY <= prevY + PHYSICS.STEP_HEIGHT &&
      b.maxY >= nextY - PHYSICS.GROUND_EPS
    ) {
      if (b.maxY >= supportY + 0.005) {
        supportY = b.maxY;
        supportSurface = b.surface ?? 'concrete';
        onStairNow = false;
        activeStairSlope = 0;
      }
    }

    // Ceiling bump check
    if (
      actor.velocity.y > 0 &&
      b.minY >= prevY + H - 0.12 &&
      b.minY <= nextY + H
    ) {
      nextY = b.minY - H;
      actor.velocity.y = 0;
    }
  }

  if (nextY <= supportY + PHYSICS.GROUND_EPS && actor.velocity.y <= 0) {
    nextY = supportY;
    actor.velocity.y = 0;
    actor.grounded = true;
    actor.currentSurface = supportSurface;
    actor.onStairs = onStairNow;
    actor.stairSlope = activeStairSlope;
  } else {
    actor.grounded = false;
    actor.onStairs = false;
    actor.stairSlope = 0;
  }

  // Clamp playable outdoor perimeter
  const maxW = STREET_CONFIG.worldHalfWidth - 6;
  const maxD = STREET_CONFIG.worldHalfDepth - 6;
  nextX = Math.max(-maxW, Math.min(maxW, nextX));
  nextZ = Math.max(-maxD, Math.min(maxD, nextZ));

  const movedDist = Math.hypot(nextX - actor.position.x, nextZ - actor.position.z);
  const moved3D = Math.hypot(nextX - actor.position.x, nextY - actor.position.y, nextZ - actor.position.z);
  actor.position.x = nextX;
  actor.position.y = nextY;
  actor.position.z = nextZ;

  if (actor.grounded) {
    actor.walkDistance += moved3D;
  }

  const landed = !wasGrounded && actor.grounded;
  if (landed) {
    actor.landTimer = 0.20;
  } else if (actor.landTimer > 0) {
    actor.landTimer = Math.max(0, actor.landTimer - dt);
  }

  if (actor.hurtTimer > 0) actor.hurtTimer = Math.max(0, actor.hurtTimer - dt);
  if (actor.celebrateTimer > 0) actor.celebrateTimer = Math.max(0, actor.celebrateTimer - dt);
  if (actor.interactTimer > 0) actor.interactTimer = Math.max(0, actor.interactTimer - dt);

  // Determine procedural animation state (smoothly crossfaded inside CharacterMesh)
  const horizSpeed = movedDist / Math.max(dt, 1e-4);
  if (actor.health <= 0) {
    actor.animState = 'ko';
    actor.idleTime = 0;
  } else if (actor.hurtTimer > 0) {
    actor.animState = 'hurt';
    actor.idleTime = 0;
  } else if (actor.celebrateTimer > 0) {
    actor.animState = 'celebrate';
    actor.idleTime = 0;
  } else if (actor.interactTimer > 0) {
    actor.animState = 'interact';
    actor.idleTime = 0;
  } else if (!actor.grounded) {
    actor.animState = 'jump';
    actor.idleTime = 0;
  } else if (actor.landTimer > 0.04 && horizSpeed < 0.8) {
    actor.animState = 'land';
    actor.idleTime = 0;
  } else if (horizSpeed > 4.9) {
    actor.animState = 'run';
    actor.idleTime = 0;
  } else if (horizSpeed > 0.30) {
    actor.animState = 'walk';
    actor.idleTime = 0;
  } else if (Math.abs(actor.turnRate) > 1.25) {
    actor.animState = 'turn';
    actor.idleTime = 0;
  } else {
    actor.animState = 'idle';
    actor.idleTime += dt;
  }
  actor.animTime += dt;

  return {
    jumped,
    landed,
    stepDistance: moved3D,
    rungStep: false,
  };
}
