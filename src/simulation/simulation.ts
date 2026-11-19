/**
 * Core Neighborhood Wars simulation engine.
 * Pure TypeScript, zero React or Three.js imports, fixed-timestep (60 Hz),
 * deterministic seeded RNG, SpatialHashGrid collision acceleration,
 * analytic stair ramps, real ladder/shelter/tunnel shaft climbing, startup walkability verification,
 * Phase 2 underground tunnel digging & survival network, multiplayer-ready command queue & JSON save/load.
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
  Vec3,
} from './types';
import { generateStreetLayout, STREET_CONFIG } from '../world/streetLayout';
import { buildHouseBlueprint, HOUSE_CONSTANTS, localToWorld, worldToLocal } from '../world/houses';
import type { HouseBlueprint } from '../world/houses';
import { generateStreetProps, type StreetPropsBundle } from '../world/streetProps';
import {
  createEmptyTunnelNetwork,
  type SoilLayerType,
  type TunnelSegment,
} from '../tunnels/tunnelTypes';
import {
  buildSegmentMap,
  buildShelterPortals,
  buildTunnelCollisionData,
  canDigCellFrom,
  computeVentilationNetwork,
  drainFloodedPocket,
  evaluateTunnelStability,
  findTunnelActionTarget,
  floodWaterFromCell,
  gridToWorldCenter,
  parseTunnelCellKey,
  sampleSoilLayer,
  SOIL_STATS,
  TOOL_COSTS,
  TUNNEL_CONSTANTS,
  tunnelCellKey,
  worldToGrid,
  type ShelterTunnelPortal,
  type TunnelActionTarget,
  type TunnelAirInfo,
  type TunnelStabilityInfo,
} from '../tunnels/tunnelEngine';
import { createIdleNeighborBrain, updateIdleNeighborAI } from '../ai/neighborAI';
import type { IdleNeighborBrain } from '../ai/neighborAI';
import {
  createInitialPhase3State,
  createWelcomeSocialFeed,
  handleBuildDefense,
  handleBuyShopItem,
  handleCall911,
  handleClaimMission,
  handleEquipWeapon,
  handleFireWeapon,
  handlePostPhoto,
  hydratePhase3State,
  serializePhase3State,
  spawnNightRaid,
  stepPhase3,
  type Phase3ActionResult,
} from '../phase3/phase3Engine';
import { DEFENSE_SPECS, YARD_SLOT_TO_DEFENSE, type WeaponId } from '../phase3/phase3Types';

export const SAVE_VERSION = 4;
export const FIXED_DT = 1 / 60;

export interface SimSoundEvent {
  type:
    | 'footstep'
    | 'jump'
    | 'land'
    | 'door'
    | 'lock'
    | 'barricade'
    | 'climb'
    | 'dig_hit'
    | 'dig_complete'
    | 'timber'
    | 'lantern'
    | 'vent'
    | 'pump'
    | 'cave_in'
    | 'water_seep'
    | 'shot'
    | 'hit'
    | 'trap'
    | 'explosion'
    | 'bark'
    | 'siren'
    | 'cash'
    | 'phone'
    | 'alert';
  surface?: ActorEntity['currentSurface'];
  soil?: SoilLayerType;
}

export interface SimToastEvent {
  key: string;
  params?: Record<string, string | number>;
}

export interface SimParticleEvent {
  pos: Vec3;
  kind: 'dirt' | 'clay' | 'rock' | 'water' | 'dust';
  count: number;
}

export class GameSimulation {
  public state: GameState;
  public readonly rng: SeededRNG;
  public readonly houses: HouseBlueprint[] = [];
  public readonly houseById: Record<string, HouseBlueprint> = {};
  public readonly colliders: AABB[] = [];
  public readonly spatialGrid: SpatialHashGrid;
  public readonly stairRamps: StairRamp[] = [];
  public readonly baseLaddersById: Record<string, LadderSpec> = {};
  public laddersById: Record<string, LadderSpec> = {};
  public readonly streetProps: StreetPropsBundle;
  public readonly navNodes: NavNode[] = [];
  public readonly roadLength: number;
  public readonly walkabilityReport: WalkabilityReport;
  public readonly shelterPortals: ShelterTunnelPortal[] = [];

  public tunnelSegmentMap = new Map<string, TunnelSegment>();
  public tunnelStability: TunnelStabilityInfo = {
    unsupportedHopsByKey: new Map(),
    unstableKeys: new Set(),
    collapseCandidateKey: null,
  };
  public tunnelAir: TunnelAirInfo = { freshAirKeys: new Set() };
  public tunnelVersion = 0;

  private accumulator = 0;
  private latestInputs: Record<string, MoveInputPayload> = {};
  private aiBrains: Record<string, IdleNeighborBrain> = {};
  private pendingSounds: SimSoundEvent[] = [];
  private pendingParticles: SimParticleEvent[] = [];
  private pendingToasts: SimToastEvent[] = [];
  private stepMeters: Record<string, number> = {};
  private koRecoverTimers: Record<string, number> = {};

  constructor(seed: number = 202611, lotCount: number = 8) {
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
      for (const l of bp.ladders) {
        this.baseLaddersById[l.id] = l;
        this.laddersById[l.id] = l;
      }
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
          oxygen: 100,
          maxOxygen: 100,
          money: 250,
          animState: 'idle',
          animTime: 0,
          interactTimer: 0,
          digTimer: 0,
          walkDistance: 0,
          currentSurface: 'concrete',
          climbState: null,
          insideHouseId: null,
          currentFloor: 0,
          inShelter: false,
          inTunnel: false,
          inFloodedTunnel: false,
          activeTool: 'shovel',
          collapseWarningTimer: 0,
          caveInShakeTimer: 0,
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

      // Spawn Phase 1 Idle AI neighbor across the street
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
          oxygen: 100,
          maxOxygen: 100,
          money: 300,
          animState: 'idle',
          animTime: 0,
          interactTimer: 0,
          digTimer: 0,
          walkDistance: 0,
          currentSurface: 'grass',
          climbState: null,
          insideHouseId: null,
          currentFloor: 0,
          inShelter: false,
          inTunnel: false,
          inFloodedTunnel: false,
          activeTool: 'shovel',
          collapseWarningTimer: 0,
          caveInShakeTimer: 0,
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

    // Extract shelter bulkhead portals across all houses
    this.shelterPortals = buildShelterPortals(this.houses);

    // Generate all deterministic street & yard props + register their exact colliders
    this.streetProps = generateStreetProps(this.houses, this.roadLength, seed);
    for (const c of this.streetProps.colliders) {
      this.colliders.push(c);
    }

    // Index all static colliders in SpatialHashGrid for O(1) physics & raycast lookups
    this.spatialGrid.insertMany(this.colliders);

    // Run automatic startup walkability check before adding un-dug soil plugs (doors are openable later)
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
      socialFeed: createWelcomeSocialFeed(),
      phase3: createInitialPhase3State(this.houses),
    };

    this.rebuildTunnelWorldState();
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

  public drainParticleEvents(): SimParticleEvent[] {
    if (this.pendingParticles.length === 0) return [];
    const out = this.pendingParticles;
    this.pendingParticles = [];
    return out;
  }

  public drainToastEvents(): SimToastEvent[] {
    if (this.pendingToasts.length === 0) return [];
    const out = this.pendingToasts;
    this.pendingToasts = [];
    return out;
  }

  private ingestPhase3Result(res: Phase3ActionResult): void {
    for (const s of res.sounds) {
      this.pendingSounds.push({ type: s.type });
    }
    if (res.toastKey) {
      this.pendingToasts.push({ key: res.toastKey, params: res.toastParams });
    }
  }

  /** Rebuilds tunnel spatial colliders, ladders, stability spans, and airflow after any tunnel edit. */
  public rebuildTunnelWorldState(): void {
    const segments = this.state.tunnels.segments;
    this.tunnelSegmentMap = buildSegmentMap(segments);
    this.tunnelStability = evaluateTunnelStability(segments, this.shelterPortals);
    this.tunnelAir = computeVentilationNetwork(segments, this.shelterPortals);

    const { colliders, ladders } = buildTunnelCollisionData(
      this.state.tunnels,
      this.shelterPortals,
    );
    this.spatialGrid.replaceByPrefix('tunnel_', colliders);

    const mergedLadders: Record<string, LadderSpec> = { ...this.baseLaddersById };
    for (const l of ladders) {
      mergedLadders[l.id] = l;
    }
    this.laddersById = mergedLadders;
    this.tunnelVersion += 1;
  }

  public getActiveTunnelTarget(actor: ActorEntity): TunnelActionTarget | null {
    if (actor.climbState) return null;
    return findTunnelActionTarget(
      actor.position,
      actor.yaw,
      actor.pitch,
      actor.inShelter,
      actor.activeTool,
      this.state.tunnels,
      this.shelterPortals,
      this.state.doors,
      this.houses,
      this.colliders,
      this.state.seed,
    );
  }

  /** Starts a real, smooth ladder mount -> climb -> dismount sequence (zero teleporting!). */
  private mountLadder(actor: ActorEntity, ladder: LadderSpec, direction: 'up' | 'down'): void {
    const hatch = ladder.kind === 'shelter' ? this.state.shelterHatches[ladder.houseId] : null;
    const alreadyOpen = Boolean(hatch && hatch.isOpen && hatch.openProgress > 0.7);
    const startPhase = ladder.kind === 'shelter' && !alreadyOpen ? 'opening_hatch' : 'mount';
    const mountY = direction === 'up' ? ladder.bottomY + 0.15 : ladder.topY - 0.55;
    if (hatch) {
      hatch.isOpen = true;
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

  /** Executes a dig hit on grid coordinates `(gx, gy, gz)`. */
  private performDigCell(actor: ActorEntity, gx: number, gy: number, gz: number): void {
    const check = canDigCellFrom(
      gx,
      gy,
      gz,
      this.tunnelSegmentMap,
      this.shelterPortals,
      this.state.doors,
      this.houses,
      this.colliders,
    );
    if (!check.ok) {
      actor.digTimer = 0.16;
      this.pendingSounds.push({ type: 'lock' });
      return;
    }

    const soil = sampleSoilLayer(this.state.seed, gx, gy, gz);
    const stats = SOIL_STATS[soil];
    if (actor.stamina < Math.min(4, stats.staminaPerHit)) {
      this.pendingSounds.push({ type: 'lock' });
      return;
    }

    actor.stamina = Math.max(0, actor.stamina - stats.staminaPerHit);
    actor.digTimer = 0.28;

    const key = tunnelCellKey(gx, gy, gz);
    if (!this.state.tunnels.digProgress) this.state.tunnels.digProgress = {};
    const prev = this.state.tunnels.digProgress[key] ?? {
      hits: 0,
      maxHits: stats.hits,
      soil,
    };
    prev.hits += 1;

    const hitPos = gridToWorldCenter(gx, Math.min(0, gy), gz);
    hitPos.y += gy === 1 ? 2.5 : gy === -1 ? 0.2 : 1.3;
    const pKind: SimParticleEvent['kind'] =
      soil === 'rock' ? 'rock' : soil === 'clay' ? 'clay' : soil === 'water' ? 'water' : 'dirt';

    if (prev.hits < prev.maxHits) {
      this.state.tunnels.digProgress[key] = prev;
      this.pendingSounds.push({ type: 'dig_hit', soil });
      this.pendingParticles.push({ pos: hitPos, kind: pKind, count: 10 });
      return;
    }

    // Excavation breakthrough!
    delete this.state.tunnels.digProgress[key];
    const newSeg: TunnelSegment = {
      id: `tunnel_${gx}_${gy}_${gz}`,
      ownerId: actor.ownerId,
      gx,
      gy,
      gz,
      soil,
      supported: gy === 1, // surface shafts have timber collar framing
      ventilated: gy === 1,
      lit: false,
      flooded: false,
      isSurfaceExit: gy === 1,
    };
    this.state.tunnels.segments.push(newSeg);
    actor.money += stats.salvageCash;

    this.tunnelSegmentMap.set(key, newSeg);
    if (soil === 'water') {
      floodWaterFromCell(newSeg, this.tunnelSegmentMap);
      this.pendingSounds.push({ type: 'water_seep', soil });
      this.pendingParticles.push({ pos: hitPos, kind: 'water', count: 22 });
    } else {
      this.pendingSounds.push({ type: 'dig_complete', soil });
      this.pendingParticles.push({ pos: hitPos, kind: pKind, count: 22 });
    }

    this.rebuildTunnelWorldState();
  }

  /** Applies any tool action (`shovel`, `timber`, `lantern`, `vent`, `pump`) at the aimed target. */
  private performActiveTool(actor: ActorEntity): void {
    const target = this.getActiveTunnelTarget(actor);
    if (!target) return;

    if (target.actionKind === 'dig') {
      this.performDigCell(actor, target.gx, target.gy, target.gz);
      return;
    }

    const seg = this.tunnelSegmentMap.get(tunnelCellKey(target.gx, target.gy, target.gz));
    if (!seg || !target.valid) {
      this.pendingSounds.push({ type: 'lock' });
      return;
    }

    const cost = TOOL_COSTS[actor.activeTool];
    if (actor.money < cost) {
      this.pendingSounds.push({ type: 'lock' });
      return;
    }

    actor.money -= cost;
    actor.interactTimer = 0.28;

    if (actor.activeTool === 'timber') {
      seg.supported = true;
      this.pendingSounds.push({ type: 'timber' });
      this.pendingParticles.push({ pos: { ...target.worldCenter, y: target.worldCenter.y + 1.4 }, kind: 'dust', count: 8 });
      this.rebuildTunnelWorldState();
    } else if (actor.activeTool === 'lantern') {
      seg.lit = true;
      this.pendingSounds.push({ type: 'lantern' });
      this.tunnelVersion += 1;
    } else if (actor.activeTool === 'vent') {
      seg.ventilated = true;
      this.pendingSounds.push({ type: 'vent' });
      this.rebuildTunnelWorldState();
    } else if (actor.activeTool === 'pump') {
      drainFloodedPocket(seg, this.tunnelSegmentMap);
      this.pendingSounds.push({ type: 'pump' });
      this.pendingParticles.push({ pos: { ...target.worldCenter, y: target.worldCenter.y + 0.3 }, kind: 'water', count: 16 });
      this.rebuildTunnelWorldState();
    }
  }

  private triggerCaveIn(actor: ActorEntity): void {
    const collapseKey = this.tunnelStability.collapseCandidateKey;
    if (!collapseKey) return;
    const idx = this.state.tunnels.segments.findIndex(
      (s) => tunnelCellKey(s.gx, s.gy, s.gz) === collapseKey,
    );
    if (idx === -1) return;

    const collapsed = this.state.tunnels.segments[idx];
    const collapsedCenter = gridToWorldCenter(collapsed.gx, collapsed.gy, collapsed.gz);
    this.state.tunnels.segments.splice(idx, 1);

    // If the actor was standing inside the collapsed cell, shift them smoothly to the nearest safe cell/shelter
    const actorGrid = worldToGrid(actor.position.x, actor.position.y, actor.position.z);
    if (
      actorGrid.gx === collapsed.gx &&
      actorGrid.gy === collapsed.gy &&
      actorGrid.gz === collapsed.gz
    ) {
      let bestPos: Vec3 | null = null;
      let bestDist = Infinity;
      for (const s of this.state.tunnels.segments) {
        const sc = gridToWorldCenter(s.gx, s.gy, s.gz);
        const d = Math.hypot(sc.x - actor.position.x, sc.z - actor.position.z);
        if (d < bestDist) {
          bestDist = d;
          bestPos = sc;
        }
      }
      if (!bestPos) {
        const home = this.houseById[actor.houseId];
        const shFloor = home?.anchors.find((a) => a.kind === 'shelterFloor');
        bestPos = shFloor ? { ...shFloor.position } : { x: -11.2, y: HOUSE_CONSTANTS.SHELTER_Y, z: 36.2 };
      }
      actor.position = { ...bestPos };
      actor.velocity = { x: 0, y: 0, z: 0 };
    }

    actor.health = Math.max(0, actor.health - TUNNEL_CONSTANTS.CAVE_IN_DAMAGE);
    actor.hurtTimer = 0.55;
    actor.caveInShakeTimer = 0.65;
    actor.collapseWarningTimer = 0;

    this.pendingSounds.push({ type: 'cave_in' });
    this.pendingParticles.push({
      pos: { x: collapsedCenter.x, y: collapsedCenter.y + 1.8, z: collapsedCenter.z },
      kind: 'dust',
      count: 28,
    });
    this.rebuildTunnelWorldState();
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

      case 'TOGGLE_SHELTER_HATCH': {
        const actor = this.state.actors[cmd.actorId];
        const hatch = this.state.shelterHatches[cmd.houseId];
        if (!actor || !hatch || actor.climbState) return;
        actor.interactTimer = 0.28;
        hatch.isOpen = !hatch.isOpen;
        this.pendingSounds.push({ type: 'door' });
        break;
      }

      case 'USE_TUNNEL_SHAFT': {
        const actor = this.state.actors[cmd.actorId];
        const ladder = this.laddersById[cmd.ladderId];
        if (!actor || !ladder || actor.climbState) return;
        this.mountLadder(actor, ladder, cmd.direction);
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

      case 'SELECT_TOOL': {
        const actor = this.state.actors[cmd.actorId];
        if (actor) actor.activeTool = cmd.tool;
        break;
      }

      case 'USE_ACTIVE_TOOL': {
        const actor = this.state.actors[cmd.actorId];
        if (!actor || actor.climbState || actor.health <= 0) return;
        if (actor.inShelter || actor.inTunnel) {
          this.performActiveTool(actor);
        } else {
          // Above ground: fire equipped handheld weapon along player's aim vector!
          const cosP = Math.cos(actor.pitch);
          const aimTarget: Vec3 = {
            x: actor.position.x - Math.sin(actor.yaw) * cosP * 24,
            y: actor.position.y + 1.32 + Math.sin(actor.pitch) * 24,
            z: actor.position.z - Math.cos(actor.yaw) * cosP * 24,
          };
          this.ingestPhase3Result(
            handleFireWeapon(
              this.state.phase3,
              actor,
              this.state.phase3.activeWeapon,
              aimTarget,
              this.state.actors,
              this.state.socialFeed,
              this.state.day,
            ),
          );
        }
        break;
      }

      case 'DIG': {
        const actor = this.state.actors[cmd.actorId];
        if (!actor || actor.climbState || actor.health <= 0) return;
        this.performDigCell(actor, cmd.gx, cmd.gy, cmd.gz);
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

      case 'EQUIP_WEAPON': {
        handleEquipWeapon(this.state.phase3, cmd.weaponId);
        break;
      }

      case 'BUY': {
        const actor = this.state.actors[cmd.actorId];
        if (!actor) return;
        this.ingestPhase3Result(handleBuyShopItem(this.state.phase3, actor, cmd.itemId));
        break;
      }

      case 'BUILD': {
        const actor = this.state.actors[cmd.actorId];
        if (!actor) return;
        this.ingestPhase3Result(
          handleBuildDefense(
            this.state.phase3,
            actor,
            cmd.slotId,
            cmd.itemId,
            this.state.yardSlots,
          ),
        );
        break;
      }

      case 'FIRE': {
        const actor = this.state.actors[cmd.actorId];
        if (!actor || actor.climbState || actor.health <= 0) return;
        this.ingestPhase3Result(
          handleFireWeapon(
            this.state.phase3,
            actor,
            cmd.weaponId as WeaponId,
            cmd.target,
            this.state.actors,
            this.state.socialFeed,
            this.state.day,
          ),
        );
        break;
      }

      case 'CALL_911': {
        const actor = this.state.actors[cmd.actorId];
        if (!actor) return;
        this.ingestPhase3Result(
          handleCall911(
            this.state.phase3,
            actor,
            this.houses,
            this.state.socialFeed,
            this.state.day,
          ),
        );
        break;
      }

      case 'POST_PHOTO': {
        const actor = this.state.actors[cmd.actorId];
        if (!actor) return;
        this.ingestPhase3Result(
          handlePostPhoto(
            this.state.phase3,
            actor,
            cmd.captionKey,
            this.state.socialFeed,
            this.state.day,
          ),
        );
        break;
      }

      case 'CLAIM_MISSION': {
        const actor = this.state.actors[cmd.actorId];
        if (!actor) return;
        this.ingestPhase3Result(handleClaimMission(this.state.phase3, actor, cmd.missionId));
        break;
      }

      case 'TRIGGER_RAID': {
        const raidSounds = spawnNightRaid(
          this.state.phase3,
          this.houses,
          this.state.doors,
          this.rng,
          this.state.day,
          2,
        );
        for (const s of raidSounds) this.pendingSounds.push({ type: s.type });
        if (raidSounds.length > 0) {
          this.pendingToasts.push({ key: 'phase3.toast.raidStarted' });
        }
        break;
      }

      case 'CLEAR_FEED_UNREAD': {
        this.state.phase3.unreadFeedCount = 0;
        break;
      }
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

    // Smoothly animate dual-casement windows
    for (const win of Object.values(this.state.windows)) {
      const target = win.isOpen ? 1 : 0;
      win.openProgress += (target - win.openProgress) * Math.min(1, dt * 7.5);
      if (Math.abs(target - win.openProgress) < 0.005) win.openProgress = target;
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

    // Step physics & underground survival rules for all actors
    for (const actor of Object.values(this.state.actors)) {
      // Handle KO recovery cleanly (wake back up in home shelter so player never gets soft-locked)
      if (actor.health <= 0) {
        actor.animState = 'ko';
        this.koRecoverTimers[actor.id] = (this.koRecoverTimers[actor.id] ?? 0) + dt;
        if (this.koRecoverTimers[actor.id] >= 2.8) {
          this.koRecoverTimers[actor.id] = 0;
          actor.health = 55;
          actor.oxygen = 100;
          actor.stamina = 100;
          actor.collapseWarningTimer = 0;
          const home = this.houseById[actor.houseId];
          const shAnchor = home?.anchors.find((a) => a.kind === 'shelterFloor');
          if (shAnchor) {
            actor.position = { ...shAnchor.position };
            actor.inShelter = true;
            actor.inTunnel = false;
            actor.currentFloor = -1;
          }
          actor.velocity = { x: 0, y: 0, z: 0 };
        }
        continue;
      }

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
        const stride = actor.animState === 'run' ? 1.85 : 1.45;
        if (acc >= stride) {
          this.stepMeters[actor.id] = acc - stride;
          this.pendingSounds.push({
            type: actor.inFloodedTunnel ? 'water_seep' : 'footstep',
            surface: actor.currentSurface,
          });
        } else {
          this.stepMeters[actor.id] = acc;
        }
      }

      this.updateActorHouseZone(actor);
      this.stepActorUndergroundSurvival(actor, dt);
    }

    // Step Phase 3 combat, yard/roof defenses, guard dog, wildlife, robbers & 911 police
    const p3Sounds = stepPhase3(
      this.state.phase3,
      this.state.actors,
      this.state.doors,
      this.state.windows,
      this.houses,
      this.spatialGrid,
      this.state.socialFeed,
      this.state.timeOfDay,
      this.state.day,
      this.rng,
      dt,
    );
    for (let i = 0; i < p3Sounds.length; i++) {
      this.pendingSounds.push({ type: p3Sounds[i].type });
    }

    this.state.rngState = this.rng.getState();
  }

  private stepActorUndergroundSurvival(actor: ActorEntity, dt: number): void {
    if (actor.caveInShakeTimer > 0) {
      actor.caveInShakeTimer = Math.max(0, actor.caveInShakeTimer - dt);
    }

    if (actor.inTunnel) {
      const { gx, gy, gz } = worldToGrid(actor.position.x, actor.position.y, actor.position.z);
      const cellKey = tunnelCellKey(gx, Math.min(0, gy), gz);
      const seg = this.tunnelSegmentMap.get(cellKey);
      actor.inFloodedTunnel = Boolean(seg?.flooded);

      // Oxygen / Ventilation rule
      if (this.tunnelAir.freshAirKeys.has(cellKey)) {
        actor.oxygen = Math.min(actor.maxOxygen, actor.oxygen + 28 * dt);
      } else {
        actor.oxygen = Math.max(0, actor.oxygen - 7.5 * dt);
        if (actor.oxygen <= 0) {
          actor.health = Math.max(0, actor.health - 4.0 * dt);
        }
      }

      // Structural collapse instability rule
      if (this.tunnelStability.unstableKeys.has(cellKey) || this.tunnelStability.collapseCandidateKey) {
        actor.collapseWarningTimer += dt;
        if (this.tunnelStability.collapseCandidateKey && actor.collapseWarningTimer >= 2.6) {
          this.triggerCaveIn(actor);
        }
      } else {
        actor.collapseWarningTimer = Math.max(0, actor.collapseWarningTimer - dt * 2.5);
      }
    } else {
      actor.inFloodedTunnel = false;
      actor.oxygen = Math.min(actor.maxOxygen, actor.oxygen + 40 * dt);
      actor.collapseWarningTimer = 0;
    }
  }

  public updateActorHouseZone(actor: ActorEntity): void {
    actor.insideHouseId = null;
    actor.inTunnel = false;

    if (actor.position.y < -0.45) {
      // Distinguish inside concrete shelter vs inside dug tunnel grid
      const { gx, gy, gz } = worldToGrid(actor.position.x, actor.position.y, actor.position.z);
      const seg = this.tunnelSegmentMap.get(tunnelCellKey(gx, Math.min(0, gy), gz));

      // Check concrete shelter rooms first
      for (const h of this.houses) {
        const loc = worldToLocal(h.worldOrigin, h.rotationY, actor.position);
        const rSh = h.rooms.find((r) => r.floorLevel === -1);
        if (
          rSh &&
          loc.x >= rSh.minX - 0.15 &&
          loc.x <= rSh.maxX + 0.15 &&
          loc.z >= rSh.minZ - 0.15 &&
          loc.z <= rSh.maxZ + 0.15
        ) {
          actor.insideHouseId = h.houseId;
          actor.inShelter = true;
          actor.inTunnel = false;
          actor.currentFloor = -1;
          return;
        }
      }

      // Otherwise in tunnel (or climbing shaft)
      actor.inShelter = false;
      actor.inTunnel = Boolean(seg) || actor.position.y < -0.6;
      actor.currentFloor = actor.position.y < HOUSE_CONSTANTS.SHELTER_Y - 1.5 ? -2 : -1;
      return;
    }

    actor.inShelter = false;

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
    if (actor.inTunnel) {
      return actor.currentFloor === -2 ? 'zone.tunnelDeep' : 'zone.tunnel';
    }
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

    // Doors (includes Shelter Tunnel Bulkhead doors!)
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

    // Tunnel vertical shaft ladders (surface breakout & deep shaft)
    for (const l of Object.values(this.laddersById)) {
      if (l.kind !== 'tunnel_shaft') continue;
      const distBot = Math.hypot(
        l.climbX - actor.position.x,
        l.bottomY + 1.0 - eyeY,
        l.climbZ - actor.position.z,
      );
      if (distBot <= 2.1) {
        consider(
          {
            kind: 'shaft_up',
            id: l.id,
            houseId: l.houseId,
            labelKey: l.topY >= -0.2 ? 'zone.yard' : 'zone.tunnel',
            actionKey: l.topY >= -0.2 ? 'interact.climbSurfaceHatch' : 'interact.climbTunnelUp',
            secondaryHintKey: 'interact.climbHint',
            distance: distBot,
            position: { x: l.climbX, y: l.bottomY, z: l.climbZ },
          },
          2.1,
        );
      }
      const distTop = Math.hypot(
        l.climbX - actor.position.x,
        l.topY - actor.position.y,
        l.climbZ - actor.position.z,
      );
      if (distTop <= 2.2) {
        consider(
          {
            kind: 'shaft_down',
            id: l.id,
            houseId: l.houseId,
            labelKey: 'zone.tunnel',
            actionKey: 'interact.climbTunnelDown',
            secondaryHintKey: 'interact.climbHint',
            distance: distTop,
            position: { x: l.climbX, y: l.topY, z: l.climbZ },
          },
          2.2,
        );
      }
    }

    // Exterior roof ladders & underground shelter hatches
    for (const h of this.houses) {
      for (const a of h.anchors) {
        const dist = Math.hypot(
          a.position.x - actor.position.x,
          a.position.y + 0.8 - eyeY,
          a.position.z - actor.position.z,
        );
        if (a.kind === 'roofAccess' && !actor.inShelter && !actor.inTunnel && actor.position.y < 2.2) {
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
        } else if (a.kind === 'shelterEntry' && !actor.inShelter && !actor.inTunnel && actor.currentFloor === 0) {
          const hatchOpen = Boolean(this.state.shelterHatches[h.houseId]?.isOpen);
          consider(
            {
              kind: 'shelter_enter',
              id: a.id,
              houseId: h.houseId,
              labelKey: 'zone.shelter',
              actionKey: hatchOpen ? 'interact.climbShelterDown' : 'interact.enterShelter',
              secondaryHintKey: hatchOpen ? 'interact.closeHatchHint' : 'interact.openHatchHint',
              distance: dist,
              position: a.position,
            },
            2.4,
          );
        } else if (a.kind === 'shelterFloor' && actor.inShelter) {
          const hatchOpen = Boolean(this.state.shelterHatches[h.houseId]?.isOpen);
          consider(
            {
              kind: 'shelter_exit',
              id: a.id,
              houseId: h.houseId,
              labelKey: 'zone.garage',
              actionKey: hatchOpen ? 'interact.exitShelter' : 'interact.openAndExitShelter',
              secondaryHintKey: hatchOpen ? 'interact.closeHatchHint' : 'interact.openHatchHint',
              distance: dist,
              position: a.position,
            },
            2.8,
          );
        }
      }
    }

    // Named Yard Slots (Phase 3 buildable & re-armable yard defenses)
    if (!actor.insideHouseId && !actor.inShelter && !actor.inTunnel) {
      for (const s of Object.values(this.state.yardSlots)) {
        const dist = Math.hypot(
          s.position.x - actor.position.x,
          s.position.z - actor.position.z,
        );
        if (dist > 2.35) continue;
        const defId = YARD_SLOT_TO_DEFENSE[s.kind];
        const spec = DEFENSE_SPECS[defId];
        const existing = this.state.phase3.defenses[s.id];
        const hasKit = (this.state.phase3.defenseKits[defId] ?? 0) > 0;
        let actionKey = 'interact.buildSlot';
        let actionParams: Record<string, string | number> = { cost: spec.price };
        let stateBadgeKey: string | undefined;
        if (existing) {
          if (!existing.armed || existing.charges < spec.maxCharges) {
            actionKey = 'interact.rearmSlot';
            actionParams = { cost: spec.repairCost };
            stateBadgeKey = 'interact.state.spent';
          } else {
            actionKey = 'interact.slotActive';
            actionParams = {};
            stateBadgeKey = 'interact.state.armed';
          }
        } else if (hasKit) {
          actionKey = 'interact.placeKitSlot';
          actionParams = {};
        }
        consider(
          {
            kind: 'yard_slot',
            id: s.id,
            houseId: s.houseId,
            labelKey: spec.nameKey,
            actionKey,
            actionParams,
            secondaryHintKey: existing ? undefined : 'interact.phoneShopHint',
            stateBadgeKey,
            distance: dist,
            position: s.position,
          },
          2.35,
        );
      }
    }

    // Roof Equipment Staging Pads (Phase 3 roof defenses)
    if (actor.currentFloor === 2) {
      for (const pad of Object.values(this.state.phase3.roofPads)) {
        const dist = Math.hypot(
          pad.position.x - actor.position.x,
          pad.position.z - actor.position.z,
        );
        if (dist > 2.5) continue;
        const spec = DEFENSE_SPECS[pad.kind];
        const existing = this.state.phase3.defenses[pad.id];
        const hasKit = (this.state.phase3.defenseKits[pad.kind] ?? 0) > 0;
        consider(
          {
            kind: 'roof_pad',
            id: pad.id,
            houseId: pad.houseId,
            labelKey: spec.nameKey,
            actionKey: existing
              ? 'interact.slotActive'
              : hasKit
                ? 'interact.placeKitSlot'
                : 'interact.buildSlot',
            actionParams: existing || hasKit ? {} : { cost: spec.price },
            stateBadgeKey: existing ? 'interact.state.armed' : undefined,
            distance: dist,
            position: pad.position,
          },
          2.5,
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
        oxygen: a.oxygen,
        money: a.money,
        controller: a.controller,
        inShelter: a.inShelter,
        inTunnel: a.inTunnel,
        currentFloor: a.currentFloor,
        insideHouseId: a.insideHouseId,
        activeTool: a.activeTool,
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
      tunnels: {
        segments: this.state.tunnels.segments.map((s) => ({ ...s })),
        digProgress: { ...(this.state.tunnels.digProgress ?? {}) },
      },
      socialFeed: this.state.socialFeed,
      phase3: serializePhase3State(this.state.phase3),
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
    sim.state.tunnels = data.tunnels
      ? {
          segments: (data.tunnels.segments ?? []).map((s) => ({ ...s })),
          digProgress: { ...(data.tunnels.digProgress ?? {}) },
        }
      : createEmptyTunnelNetwork();
    sim.state.socialFeed = data.socialFeed ?? [];

    for (const [id, savedActor] of Object.entries(data.actors ?? {})) {
      const target = sim.state.actors[id];
      if (!target) continue;
      target.position = { ...savedActor.position };
      target.yaw = savedActor.yaw;
      target.pitch = savedActor.pitch;
      target.health = savedActor.health;
      target.stamina = savedActor.stamina;
      target.oxygen = savedActor.oxygen ?? 100;
      target.money = savedActor.money;
      target.controller = savedActor.controller;
      target.inShelter = savedActor.inShelter;
      target.inTunnel = savedActor.inTunnel ?? false;
      target.currentFloor = savedActor.currentFloor;
      target.insideHouseId = savedActor.insideHouseId;
      target.activeTool = savedActor.activeTool ?? 'shovel';
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
      target.openProgress = savedWin.isOpen ? 1 : 0;
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

    hydratePhase3State(sim.state.phase3, data.phase3, sim.state.yardSlots);
    sim.rebuildTunnelWorldState();
    return sim;
  }
}

export function formatGameClock(timeOfDay: number): string {
  const normalized = ((timeOfDay % 24) + 24) % 24;
  const hours = Math.floor(normalized);
  const mins = Math.floor((normalized - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
