/**
 * Core Neighborhood Wars simulation engine.
 * Pure TypeScript, zero React or Three.js imports, fixed-timestep (60 Hz),
 * deterministic seeded RNG, SpatialHashGrid collision acceleration,
 * analytic stair ramps, real ladder/shelter hatch climbing, startup walkability verification,
 * multiplayer-ready command queue & JSON serialization.
 */

import { SeededRNG } from './rng';
import { stepActorPhysics } from './physics';
import { SpatialHashGrid } from './spatialGrid';
import { runWalkabilityCheck, type WalkabilityReport } from './walkability';
import type {
  AABB,
  ActorEntity,
  GameCommand,
  GameState,
  InteractionTarget,
  LadderSpec,
  MoveInputPayload,
  NavNode,
  SerializedGameState,
  StairRamp,
} from './types';
import { generateStreetLayout, STREET_CONFIG } from '../world/streetLayout';
import { buildHouseBlueprint, HOUSE_CONSTANTS, localToWorld, worldToLocal } from '../world/houses';
import type { HouseBlueprint } from '../world/houses';
import { generateStreetProps, type StreetPropsBundle } from '../world/streetProps';
import { createEmptyTunnelNetwork } from '../tunnels/tunnelTypes';
import { createIdleNeighborBrain, updateIdleNeighborAI } from '../ai/neighborAI';
import type { IdleNeighborBrain } from '../ai/neighborAI';

export const SAVE_VERSION = 2;
export const FIXED_DT = 1 / 60;

export interface SimSoundEvent {
  type: 'footstep' | 'jump' | 'land' | 'door' | 'lock' | 'barricade' | 'climb';
  surface?: ActorEntity['currentSurface'];
}

export class GameSimulation {
  public state: GameState;
  public readonly rng: SeededRNG;
  public readonly houses: HouseBlueprint[] = [];
  public readonly houseById: Record<string, HouseBlueprint> = {};
  public readonly colliders: AABB[] = [];
  public readonly spatialGrid: SpatialHashGrid;
  public readonly stairRamps: StairRamp[] = [];
  public readonly laddersById: Record<string, LadderSpec> = {};
  public readonly streetProps: StreetPropsBundle;
  public readonly navNodes: NavNode[] = [];
  public readonly roadLength: number;
  public readonly walkabilityReport: WalkabilityReport;

  private accumulator = 0;
  private latestInputs: Record<string, MoveInputPayload> = {};
  private aiBrains: Record<string, IdleNeighborBrain> = {};
  private pendingSounds: SimSoundEvent[] = [];
  private stepMeters: Record<string, number> = {};

  constructor(seed: number = 202611, lotCount: number = 6) {
    this.rng = new SeededRNG(seed);
    this.spatialGrid = new SpatialHashGrid(4.0);
    const street = generateStreetLayout(seed, lotCount);
    this.roadLength = street.roadLength;

    const doors: GameState['doors'] = {};
    const windows: GameState['windows'] = {};
    const yardSlots: GameState['yardSlots'] = {};
    const shelterHatches: GameState['shelterHatches'] = {};
    const actors: GameState['actors'] = {};

    // Raised sidewalk slabs along Maple Crescent
    const halfRoadLen = this.roadLength / 2;
    this.colliders.push(
      {
        id: 'col_sidewalk_north',
        minX: -halfRoadLen,
        maxX: halfRoadLen,
        minY: 0,
        maxY: STREET_CONFIG.sidewalkHeight,
        minZ: -(STREET_CONFIG.roadWidth / 2 + STREET_CONFIG.sidewalkWidth),
        maxZ: -STREET_CONFIG.roadWidth / 2,
        surface: 'concrete',
        category: 'floor',
        blocksCamera: false,
      },
      {
        id: 'col_sidewalk_south',
        minX: -halfRoadLen,
        maxX: halfRoadLen,
        minY: 0,
        maxY: STREET_CONFIG.sidewalkHeight,
        minZ: STREET_CONFIG.roadWidth / 2,
        maxZ: STREET_CONFIG.roadWidth / 2 + STREET_CONFIG.sidewalkWidth,
        surface: 'concrete',
        category: 'floor',
        blocksCamera: false,
      },
    );

    // Build all modular houses from data-driven lots
    for (const lot of street.lots) {
      const bp = buildHouseBlueprint(lot);
      this.houses.push(bp);
      this.houseById[bp.houseId] = bp;
      shelterHatches[bp.houseId] = { isOpen: false, openProgress: 0 };

      for (const d of bp.doors) doors[d.id] = d;
      for (const w of bp.windows) windows[w.id] = w;
      for (const s of bp.yardSlots) yardSlots[s.id] = s;
      for (const c of bp.colliders) this.colliders.push(c);
      for (const sr of bp.stairRamps) this.stairRamps.push(sr);
      for (const l of bp.ladders) this.laddersById[l.id] = l;
      for (const n of bp.navNodes) this.navNodes.push(n);

      // Spawn local human player cleanly on their front walkway facing Maple Crescent & Gary
      if (lot.ownerSlotId === 'slot_player') {
        const spawnAnchor = bp.anchors.find((a) => a.kind === 'playerSpawn');
        const spawnPos = spawnAnchor
          ? { ...spawnAnchor.position }
          : localToWorld(bp.worldOrigin, bp.rotationY, {
              x: bp.frontDoorLocalX,
              y: 0,
              z: bp.depth / 2 + 11.2,
            });
        actors['actor_player'] = {
          id: 'actor_player',
          ownerId: 'slot_player',
          nameKey: 'actor.player',
          slotId: 'slot_player',
          controller: 'human',
          houseId: bp.houseId,
          position: spawnPos,
          velocity: { x: 0, y: 0, z: 0 },
          yaw: 0.22,
          pitch: -0.06,
          turnRate: 0,
          grounded: true,
          onStairs: false,
          stairSlope: 0,
          coyoteTimer: 0,
          jumpBufferTimer: 0,
          landTimer: 0,
          idleTime: 0,
          hurtTimer: 0,
          celebrateTimer: 0,
          health: 100,
          maxHealth: 100,
          stamina: 100,
          maxStamina: 100,
          money: 250,
          animState: 'idle',
          animTime: 0,
          interactTimer: 0,
          walkDistance: 0,
          currentSurface: 'concrete',
          climbState: null,
          insideHouseId: null,
          currentFloor: 0,
          inShelter: false,
          outfit: {
            jacket: '#4c5e4b',
            shirt: '#d7cfc0',
            pants: '#3a4654',
            boots: '#4a3628',
            gloves: '#3d342c',
            backpack: '#6c5840',
            hair: '#3b2c22',
            skin: '#d9b193',
            headwear: 'beanie',
            capColor: '#7a4734',
            heightScale: 1.0,
            shoulderScale: 1.0,
            headScale: 1.0,
          },
        };
      }

      // Spawn Phase 1 Idle AI neighbor across the street (reuses exact same rig with distinct outfit/proportions)
      if (lot.ownerSlotId === 'slot_neighbor_1') {
        const brain = createIdleNeighborBrain('actor_neighbor_1', bp);
        this.aiBrains['actor_neighbor_1'] = brain;
        actors['actor_neighbor_1'] = {
          id: 'actor_neighbor_1',
          ownerId: 'slot_neighbor_1',
          nameKey: 'actor.neighbor',
          slotId: 'slot_neighbor_1',
          controller: 'ai',
          houseId: bp.houseId,
          position: { ...brain.waypoints[0] },
          velocity: { x: 0, y: 0, z: 0 },
          yaw: brain.lookYaw,
          pitch: 0,
          turnRate: 0,
          grounded: true,
          onStairs: false,
          stairSlope: 0,
          coyoteTimer: 0,
          jumpBufferTimer: 0,
          landTimer: 0,
          idleTime: 0,
          hurtTimer: 0,
          celebrateTimer: 0,
          health: 100,
          maxHealth: 100,
          stamina: 100,
          maxStamina: 100,
          money: 300,
          animState: 'idle',
          animTime: 0,
          interactTimer: 0,
          walkDistance: 0,
          currentSurface: 'grass',
          climbState: null,
          insideHouseId: null,
          currentFloor: 0,
          inShelter: false,
          outfit: {
            jacket: '#7c553c',
            shirt: '#c7c1b4',
            pants: '#454340',
            boots: '#352a23',
            gloves: '#4b453e',
            backpack: '#4a5248',
            hair: '#5e5347',
            skin: '#d4a98c',
            headwear: 'cap',
            capColor: '#3d4c59',
            heightScale: 1.03,
            shoulderScale: 1.08,
            headScale: 0.98,
          },
        };
      }
    }

    // Generate all deterministic street & yard props + register their exact colliders
    this.streetProps = generateStreetProps(this.houses, this.roadLength, seed);
    for (const c of this.streetProps.colliders) {
      this.colliders.push(c);
    }

    // Index all colliders in SpatialHashGrid for O(1) physics & raycast lookups
    this.spatialGrid.insertMany(this.colliders);

    // Run automatic startup walkability check across all lots, rooms, stairs, roof doors & shelters
    this.walkabilityReport = runWalkabilityCheck(this.houses, this.spatialGrid);

    this.state = {
      version: SAVE_VERSION,
      seed,
      rngState: this.rng.getState(),
      tick: 0,
      day: 1,
      timeOfDay: 9.25,
      secondsPerGameHour: 24,
      localPlayerSlotId: 'slot_player',
      lots: street.lots,
      actors,
      doors,
      windows,
      yardSlots,
      shelterHatches,
      tunnels: createEmptyTunnelNetwork(),
      socialFeed: [],
    };
  }

  public getLocalPlayer(): ActorEntity {
    return this.state.actors['actor_player'];
  }

  public drainSoundEvents(): SimSoundEvent[] {
    if (this.pendingSounds.length === 0) return [];
    const out = this.pendingSounds;
    this.pendingSounds = [];
    return out;
  }

  /** Starts a real, smooth ladder mount -> climb -> dismount sequence (zero teleporting!). */
  private mountLadder(actor: ActorEntity, ladder: LadderSpec, direction: 'up' | 'down'): void {
    const startPhase = ladder.kind === 'shelter' ? 'opening_hatch' : 'mount';
    const mountY = direction === 'up' ? ladder.bottomY + 0.15 : ladder.topY - 0.55;
    if (ladder.kind === 'shelter') {
      const hatch = this.state.shelterHatches[ladder.houseId];
      if (hatch) hatch.isOpen = true;
    }
    actor.climbState = {
      ladderId: ladder.id,
      houseId: ladder.houseId,
      kind: ladder.kind,
      phase: startPhase,
      phaseProgress: 0,
      fromPos: { ...actor.position },
      toPos: { x: ladder.climbX, y: mountY, z: ladder.climbZ },
      entryDirection: direction,
      climbMeters: 0,
      climbVelY: direction === 'up' ? 1 : -1,
    };
    actor.velocity = { x: 0, y: 0, z: 0 };
    this.pendingSounds.push({ type: 'climb' });
  }

  /**
   * Applies any serializable command from a human player or AI neighbor.
   */
  public applyCommand(cmd: GameCommand): void {
    switch (cmd.type) {
      case 'MOVE_INPUT': {
        const prev = this.latestInputs[cmd.actorId];
        this.latestInputs[cmd.actorId] = {
          ...cmd.input,
          jumpPressed: Boolean(cmd.input.jumpPressed || prev?.jumpPressed),
        };
        break;
      }

      case 'INTERACT_DOOR': {
        const door = this.state.doors[cmd.doorId];
        const actor = this.state.actors[cmd.actorId];
        if (!door || !actor) return;
        actor.interactTimer = 0.28;
        if (door.isBarricaded) {
          this.pendingSounds.push({ type: 'lock' });
          return;
        }
        if (door.isLocked) {
          door.isLocked = false;
          this.pendingSounds.push({ type: 'lock' });
          return;
        }
        door.isOpen = !door.isOpen;
        this.pendingSounds.push({ type: 'door' });
        break;
      }

      case 'TOGGLE_LOCK_DOOR': {
        const door = this.state.doors[cmd.doorId];
        const actor = this.state.actors[cmd.actorId];
        if (!door || !actor) return;
        actor.interactTimer = 0.25;
        if (door.isOpen) door.isOpen = false;
        door.isLocked = !door.isLocked;
        this.pendingSounds.push({ type: 'lock' });
        break;
      }

      case 'INTERACT_WINDOW': {
        const win = this.state.windows[cmd.windowId];
        const actor = this.state.actors[cmd.actorId];
        if (!win || !actor) return;
        actor.interactTimer = 0.28;
        if (win.isBarricaded) {
          this.pendingSounds.push({ type: 'lock' });
          return;
        }
        win.isOpen = !win.isOpen;
        this.pendingSounds.push({ type: 'door' });
        break;
      }

      case 'TOGGLE_BARRICADE_WINDOW': {
        const win = this.state.windows[cmd.windowId];
        const actor = this.state.actors[cmd.actorId];
        if (!win || !actor) return;
        actor.interactTimer = 0.32;
        win.isBarricaded = !win.isBarricaded;
        if (win.isBarricaded) win.isOpen = false;
        this.pendingSounds.push({ type: 'barricade' });
        break;
      }

      case 'USE_ROOF_ACCESS': {
        const actor = this.state.actors[cmd.actorId];
        const house = this.houseById[cmd.houseId];
        if (!actor || !house || actor.climbState) return;
        const ladder = house.ladders.find((l) => l.kind === 'roof');
        if (!ladder) return;
        this.mountLadder(actor, ladder, cmd.direction);
        break;
      }

      case 'USE_SHELTER_ACCESS': {
        const actor = this.state.actors[cmd.actorId];
        const house = this.houseById[cmd.houseId];
        if (!actor || !house || actor.climbState) return;
        const ladder = house.ladders.find((l) => l.kind === 'shelter');
        if (!ladder) return;
        this.mountLadder(actor, ladder, cmd.direction === 'enter' ? 'down' : 'up');
        break;
      }

      case 'DISMOUNT_LADDER': {
        const actor = this.state.actors[cmd.actorId];
        if (!actor || !actor.climbState) return;
        const ladder = this.laddersById[actor.climbState.ladderId];
        if (!ladder) {
          actor.climbState = null;
          return;
        }
        const nearTop =
          Math.abs(actor.position.y - ladder.topY) < Math.abs(actor.position.y - ladder.bottomY);
        actor.climbState.phase = 'dismount';
        actor.climbState.phaseProgress = 0;
        actor.climbState.fromPos = { ...actor.position };
        actor.climbState.toPos = nearTop ? { ...ladder.topExit } : { ...ladder.bottomExit };
        actor.inShelter = nearTop ? ladder.topInShelter : ladder.bottomInShelter;
        break;
      }

      case 'SET_SLOT_CONTROLLER': {
        for (const actor of Object.values(this.state.actors)) {
          if (actor.slotId === cmd.slotId) {
            actor.controller = cmd.controller;
          }
        }
        break;
      }

      case 'ADVANCE_TIME': {
        this.advanceClock(cmd.hours);
        break;
      }

      case 'DIG':
      case 'BUILD':
      case 'BUY':
      case 'FIRE':
      case 'CALL_911':
      case 'POST_PHOTO':
        break;
    }
  }

  private advanceClock(deltaHours: number): void {
    this.state.timeOfDay += deltaHours;
    while (this.state.timeOfDay >= 24) {
      this.state.timeOfDay -= 24;
      this.state.day += 1;
    }
    while (this.state.timeOfDay < 0) {
      this.state.timeOfDay += 24;
    }
  }

  public step(rawDt: number): void {
    const dt = Math.min(Math.max(rawDt, 0), 0.05);
    this.accumulator += dt;
    while (this.accumulator >= FIXED_DT) {
      this.fixedTick(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
  }

  private fixedTick(dt: number): void {
    this.state.tick += 1;
    this.advanceClock(dt / this.state.secondsPerGameHour);

    // Smoothly animate doors
    for (const door of Object.values(this.state.doors)) {
      const target = door.isOpen ? 1 : 0;
      door.openProgress += (target - door.openProgress) * Math.min(1, dt * 8.5);
      if (Math.abs(target - door.openProgress) < 0.005) door.openProgress = target;
    }

    // Smoothly animate shelter hatch trapdoors
    for (const hatch of Object.values(this.state.shelterHatches)) {
      const target = hatch.isOpen ? 1 : 0;
      hatch.openProgress += (target - hatch.openProgress) * Math.min(1, dt * 7.0);
      if (Math.abs(target - hatch.openProgress) < 0.005) hatch.openProgress = target;
    }

    const player = this.getLocalPlayer();

    // Update AI brains via command queue
    for (const actor of Object.values(this.state.actors)) {
      if (actor.controller === 'ai') {
        const brain = this.aiBrains[actor.id];
        if (brain) {
          const cmd = updateIdleNeighborAI(brain, actor, player?.position ?? null, this.rng, dt);
          this.applyCommand(cmd);
        }
      }
    }

    // Step physics for all actors
    for (const actor of Object.values(this.state.actors)) {
      const input: MoveInputPayload = this.latestInputs[actor.id] ?? {
        forward: 0,
        right: 0,
        yaw: actor.yaw,
        pitch: actor.pitch,
        sprint: false,
        jumpPressed: false,
        jumpHeld: false,
      };
      const res = stepActorPhysics(
        actor,
        input,
        this.spatialGrid,
        this.stairRamps,
        this.laddersById,
        this.state.doors,
        this.state.shelterHatches,
        dt,
      );
      if (this.latestInputs[actor.id]) {
        this.latestInputs[actor.id].jumpPressed = false;
      }

      if (actor.id === 'actor_player') {
        if (res.rungStep) this.pendingSounds.push({ type: 'climb' });
        if (res.jumped) this.pendingSounds.push({ type: 'jump', surface: actor.currentSurface });
        if (res.landed) this.pendingSounds.push({ type: 'land', surface: actor.currentSurface });
        const acc = (this.stepMeters[actor.id] ?? 0) + (actor.grounded ? res.stepDistance : 0);
        // Sync footsteps tightly with walk/run foot-contact phase!
        const stride = actor.animState === 'run' ? 1.85 : 1.45;
        if (acc >= stride) {
          this.stepMeters[actor.id] = acc - stride;
          this.pendingSounds.push({ type: 'footstep', surface: actor.currentSurface });
        } else {
          this.stepMeters[actor.id] = acc;
        }
      }

      this.updateActorHouseZone(actor);
    }

    this.state.rngState = this.rng.getState();
  }

  public updateActorHouseZone(actor: ActorEntity): void {
    actor.insideHouseId = null;
    if (actor.inShelter || actor.position.y < -0.45) {
      actor.currentFloor = -1;
      for (const h of this.houses) {
        const loc = worldToLocal(h.worldOrigin, h.rotationY, actor.position);
        if (loc.x >= h.totalMinX - 1 && loc.x <= h.totalMaxX + 1 && loc.z >= h.totalMinZ - 1 && loc.z <= h.totalMaxZ + 1) {
          actor.insideHouseId = h.houseId;
          break;
        }
      }
      return;
    }

    for (const h of this.houses) {
      const loc = worldToLocal(h.worldOrigin, h.rotationY, actor.position);
      const inMain =
        loc.x >= -h.width / 2 - 0.15 &&
        loc.x <= h.width / 2 + 0.15 &&
        loc.z >= h.totalMinZ - 0.15 &&
        loc.z <= h.totalMaxZ + 0.15;
      const inGarage =
        loc.x >= h.garageCenterLocalX - h.garageWidth / 2 - 0.15 &&
        loc.x <= h.garageCenterLocalX + h.garageWidth / 2 + 0.15 &&
        loc.z >= h.garageMinZ - 0.15 &&
        loc.z <= h.garageMaxZ + 0.15;

      if (inMain || inGarage) {
        actor.insideHouseId = h.houseId;
        if (actor.position.y >= HOUSE_CONSTANTS.ROOF_Y - 0.45) {
          actor.currentFloor = 2;
        } else if (actor.position.y >= HOUSE_CONSTANTS.SECOND_Y - 0.45) {
          actor.currentFloor = 1;
        } else {
          actor.currentFloor = 0;
        }
        return;
      }
    }
    actor.currentFloor = 0;
  }

  public getActorLocationKey(actor: ActorEntity): string {
    if (actor.inShelter || actor.currentFloor === -1) return 'zone.shelter';
    if (actor.insideHouseId) {
      if (actor.currentFloor === 2) return 'zone.roofDeck';
      const h = this.houseById[actor.insideHouseId];
      if (h) {
        const loc = worldToLocal(h.worldOrigin, h.rotationY, actor.position);
        for (const r of h.rooms) {
          if (
            r.floorLevel === actor.currentFloor &&
            loc.x >= r.minX &&
            loc.x <= r.maxX &&
            loc.z >= r.minZ &&
            loc.z <= r.maxZ
          ) {
            return r.roomKey;
          }
        }
      }
      return actor.currentFloor === 1 ? 'zone.secondFloor' : 'zone.groundFloor';
    }
    if (Math.abs(actor.position.z) <= STREET_CONFIG.roadWidth / 2 + STREET_CONFIG.sidewalkWidth) {
      return 'zone.street';
    }
    const playerHouse = this.houseById[actor.houseId];
    if (playerHouse) {
      const dx = Math.abs(actor.position.x - playerHouse.lot.position.x);
      const dz = Math.abs(actor.position.z - playerHouse.lot.position.z);
      if (dx <= STREET_CONFIG.lotWidth / 2 && dz <= STREET_CONFIG.lotDepth / 2) {
        return 'zone.yard';
      }
    }
    return 'zone.neighborYard';
  }

  public findInteractionTarget(actor: ActorEntity): InteractionTarget | null {
    if (actor.climbState) return null;

    const eyeY = actor.position.y + 1.32;
    const fwdX = -Math.sin(actor.yaw);
    const fwdZ = -Math.cos(actor.yaw);
    let best: InteractionTarget | null = null;
    let bestScore = Infinity;

    const consider = (target: InteractionTarget, maxDist: number) => {
      if (target.distance > maxDist) return;
      const dx = target.position.x - actor.position.x;
      const dz = target.position.z - actor.position.z;
      const horiz = Math.hypot(dx, dz);
      const dot = horiz > 0.05 ? (dx / horiz) * fwdX + (dz / horiz) * fwdZ : 1;
      if (dot < -0.15 && horiz > 1.0) return;
      const score = target.distance - dot * 0.7;
      if (score < bestScore) {
        bestScore = score;
        best = target;
      }
    };

    // Doors
    for (const d of Object.values(this.state.doors)) {
      const dist = Math.hypot(
        d.position.x - actor.position.x,
        d.position.y + 1.05 - eyeY,
        d.position.z - actor.position.z,
      );
      const maxD = d.kind === 'garage' ? 3.2 : 2.7;
      if (dist > maxD) continue;
      consider(
        {
          kind: 'door',
          id: d.id,
          houseId: d.houseId,
          labelKey: d.labelKey,
          actionKey: d.isLocked
            ? 'interact.unlockDoor'
            : d.isOpen
              ? 'interact.closeDoor'
              : 'interact.openDoor',
          secondaryHintKey: 'interact.lockHint',
          stateBadgeKey: d.isLocked ? 'interact.state.locked' : undefined,
          distance: dist,
          position: d.position,
        },
        maxD,
      );
    }

    // Windows
    for (const w of Object.values(this.state.windows)) {
      const dist = Math.hypot(
        w.position.x - actor.position.x,
        w.position.y - eyeY,
        w.position.z - actor.position.z,
      );
      if (dist > 2.6) continue;
      consider(
        {
          kind: 'window',
          id: w.id,
          houseId: w.houseId,
          labelKey: w.labelKey,
          actionKey: w.isOpen ? 'interact.closeWindow' : 'interact.openWindow',
          secondaryHintKey: w.isBarricaded
            ? 'interact.unbarricadeHint'
            : 'interact.barricadeHint',
          stateBadgeKey: w.isBarricaded ? 'interact.state.barricaded' : undefined,
          distance: dist,
          position: w.position,
        },
        2.6,
      );
    }

    // Exterior roof ladders & underground shelter hatches
    for (const h of this.houses) {
      for (const a of h.anchors) {
        const dist = Math.hypot(
          a.position.x - actor.position.x,
          a.position.y + 0.8 - eyeY,
          a.position.z - actor.position.z,
        );
        if (a.kind === 'roofAccess' && !actor.inShelter && actor.position.y < 2.2) {
          consider(
            {
              kind: 'roof_up',
              id: a.id,
              houseId: h.houseId,
              labelKey: 'zone.roofDeck',
              actionKey: 'interact.climbRoof',
              secondaryHintKey: 'interact.climbHint',
              distance: dist,
              position: a.position,
            },
            2.6,
          );
        } else if (a.kind === 'roofTop' && actor.currentFloor === 2) {
          consider(
            {
              kind: 'roof_down',
              id: a.id,
              houseId: h.houseId,
              labelKey: 'zone.yard',
              actionKey: 'interact.descendYard',
              secondaryHintKey: 'interact.climbHint',
              distance: dist,
              position: a.position,
            },
            2.6,
          );
        } else if (a.kind === 'shelterEntry' && !actor.inShelter && actor.currentFloor === 0) {
          consider(
            {
              kind: 'shelter_enter',
              id: a.id,
              houseId: h.houseId,
              labelKey: 'zone.shelter',
              actionKey: 'interact.enterShelter',
              secondaryHintKey: 'interact.climbHint',
              distance: dist,
              position: a.position,
            },
            2.4,
          );
        } else if (a.kind === 'shelterFloor' && actor.inShelter) {
          consider(
            {
              kind: 'shelter_exit',
              id: a.id,
              houseId: h.houseId,
              labelKey: 'zone.garage',
              actionKey: 'interact.exitShelter',
              secondaryHintKey: 'interact.climbHint',
              distance: dist,
              position: a.position,
            },
            2.8,
          );
        } else if (a.kind === 'tunnelEntry' && actor.inShelter) {
          consider(
            {
              kind: 'tunnel_entry',
              id: a.id,
              houseId: h.houseId,
              labelKey: 'interact.inspectTunnel',
              actionKey: 'interact.inspectTunnel',
              distance: dist,
              position: a.position,
            },
            2.4,
          );
        }
      }
    }

    // Named Yard Slots
    if (!actor.insideHouseId && !actor.inShelter) {
      for (const s of Object.values(this.state.yardSlots)) {
        const dist = Math.hypot(
          s.position.x - actor.position.x,
          s.position.z - actor.position.z,
        );
        if (dist > 2.0) continue;
        consider(
          {
            kind: 'yard_slot',
            id: s.id,
            houseId: s.houseId,
            labelKey: s.labelKey,
            actionKey: 'interact.inspectSlot',
            distance: dist,
            position: s.position,
          },
          2.0,
        );
      }
    }

    return best;
  }

  public serialize(): SerializedGameState {
    const actors: SerializedGameState['actors'] = {};
    for (const [id, a] of Object.entries(this.state.actors)) {
      actors[id] = {
        id: a.id,
        position: { ...a.position },
        yaw: a.yaw,
        pitch: a.pitch,
        health: a.health,
        stamina: a.stamina,
        money: a.money,
        controller: a.controller,
        inShelter: a.inShelter,
        currentFloor: a.currentFloor,
        insideHouseId: a.insideHouseId,
      };
    }

    const doors: SerializedGameState['doors'] = {};
    for (const [id, d] of Object.entries(this.state.doors)) {
      doors[id] = {
        isOpen: d.isOpen,
        isLocked: d.isLocked,
        isBarricaded: d.isBarricaded,
        damageState: d.damageState,
      };
    }

    const windows: SerializedGameState['windows'] = {};
    for (const [id, w] of Object.entries(this.state.windows)) {
      windows[id] = {
        isOpen: w.isOpen,
        isBarricaded: w.isBarricaded,
        damageState: w.damageState,
      };
    }

    const yardSlots: SerializedGameState['yardSlots'] = {};
    for (const [id, s] of Object.entries(this.state.yardSlots)) {
      yardSlots[id] = { occupiedItemId: s.occupiedItemId };
    }

    const shelterHatches: Record<string, { isOpen: boolean }> = {};
    for (const [id, sh] of Object.entries(this.state.shelterHatches)) {
      shelterHatches[id] = { isOpen: sh.isOpen };
    }

    return {
      version: SAVE_VERSION,
      seed: this.state.seed,
      rngState: this.rng.getState(),
      tick: this.state.tick,
      day: this.state.day,
      timeOfDay: this.state.timeOfDay,
      localPlayerSlotId: this.state.localPlayerSlotId,
      actors,
      doors,
      windows,
      yardSlots,
      shelterHatches,
      tunnels: this.state.tunnels,
      socialFeed: this.state.socialFeed,
    };
  }

  public static deserialize(data: SerializedGameState): GameSimulation {
    const sim = new GameSimulation(data.seed);
    sim.rng.setState(data.rngState);
    sim.state.rngState = data.rngState;
    sim.state.tick = data.tick;
    sim.state.day = data.day;
    sim.state.timeOfDay = data.timeOfDay;
    sim.state.localPlayerSlotId = data.localPlayerSlotId;
    sim.state.tunnels = data.tunnels ?? createEmptyTunnelNetwork();
    sim.state.socialFeed = data.socialFeed ?? [];

    for (const [id, savedActor] of Object.entries(data.actors ?? {})) {
      const target = sim.state.actors[id];
      if (!target) continue;
      target.position = { ...savedActor.position };
      target.yaw = savedActor.yaw;
      target.pitch = savedActor.pitch;
      target.health = savedActor.health;
      target.stamina = savedActor.stamina;
      target.money = savedActor.money;
      target.controller = savedActor.controller;
      target.inShelter = savedActor.inShelter;
      target.currentFloor = savedActor.currentFloor;
      target.insideHouseId = savedActor.insideHouseId;
      target.climbState = null;
      target.velocity = { x: 0, y: 0, z: 0 };
    }

    for (const [id, savedDoor] of Object.entries(data.doors ?? {})) {
      const target = sim.state.doors[id];
      if (!target) continue;
      target.isOpen = savedDoor.isOpen;
      target.isLocked = savedDoor.isLocked;
      target.isBarricaded = savedDoor.isBarricaded;
      target.damageState = savedDoor.damageState;
      target.openProgress = savedDoor.isOpen ? 1 : 0;
    }

    for (const [id, savedWin] of Object.entries(data.windows ?? {})) {
      const target = sim.state.windows[id];
      if (!target) continue;
      target.isOpen = savedWin.isOpen;
      target.isBarricaded = savedWin.isBarricaded;
      target.damageState = savedWin.damageState;
    }

    for (const [id, savedSlot] of Object.entries(data.yardSlots ?? {})) {
      const target = sim.state.yardSlots[id];
      if (!target) continue;
      target.occupiedItemId = savedSlot.occupiedItemId;
    }

    for (const [id, savedHatch] of Object.entries(data.shelterHatches ?? {})) {
      const target = sim.state.shelterHatches[id];
      if (!target) continue;
      target.isOpen = savedHatch.isOpen;
      target.openProgress = savedHatch.isOpen ? 1 : 0;
    }

    return sim;
  }
}

export function formatGameClock(timeOfDay: number): string {
  const normalized = ((timeOfDay % 24) + 24) % 24;
  const hours = Math.floor(normalized);
  const mins = Math.floor((normalized - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
