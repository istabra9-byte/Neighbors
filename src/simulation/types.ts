/**
 * Pure simulation types for Neighborhood Wars.
 * Zero React or Three.js dependencies so the simulation is multiplayer-ready
 * and testable in headless Node.js.
 */

import type { TunnelNetworkState, TunnelToolId } from '../tunnels/tunnelTypes';
import type { SocialPost } from '../events/eventTypes';
import type {
  Phase3State,
  SerializedPhase3State,
  WeaponId,
} from '../phase3/phase3Types';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type SurfaceKind = 'grass' | 'asphalt' | 'concrete' | 'wood' | 'tile' | 'roof' | 'metal';

export type ColliderCategory =
  | 'wall'
  | 'floor'
  | 'ceiling'
  | 'door'
  | 'window'
  | 'stair'
  | 'railing'
  | 'furniture'
  | 'ladder'
  | 'prop';

export interface AABB {
  id: string;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  /** Optional tag so cameras & audio know surface material or floor layer */
  surface?: SurfaceKind;
  category?: ColliderCategory;
  /** Floor index for 3rd-person interior ceiling/upper-floor hiding */
  houseId?: string;
  floorLevel?: number; // -1 shelter, 0 ground, 1 second, 2 roof
  /** Dynamic collider id linked to a door */
  dynamicDoorId?: string;
  /** Dynamic collider id linked to a ladder (disabled for actor currently climbing that ladder) */
  ladderId?: string;
  /** Dynamic collider id linked to a shelter hatch (passable while opening/climbing) */
  hatchHouseId?: string;
  /** Whether camera pull-in raycasts collide with this box */
  blocksCamera?: boolean;
}

/**
 * Analytic walkable ramp for staircases so walking and running up/down stairs
 * follows the exact stair slope smoothly with zero vertical snapping or bounce.
 */
export interface StairRamp {
  id: string;
  houseId: string;
  floorLevel: number;
  /** World-space bounds of the stair flight */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Axis along which the stair climbs ('x' or 'z') */
  axis: 'x' | 'z';
  /** Coordinate along `axis` at bottom of stair (y = yStart) */
  startCoord: number;
  /** Coordinate along `axis` at top of stair (y = yEnd) */
  endCoord: number;
  yStart: number;
  yEnd: number;
  surface: SurfaceKind;
}

/** Climbable ladder definition (exterior roof ladder or shelter hatch ladder). */
export interface LadderSpec {
  id: string;
  houseId: string;
  kind: 'roof' | 'shelter' | 'tunnel_shaft';
  /** World X/Z centerline where the climbing character locks onto the rungs */
  climbX: number;
  climbZ: number;
  /** Yaw the character faces while gripping the ladder */
  faceYaw: number;
  /** Bottom and top standing/feet Y along the ladder */
  bottomY: number;
  topY: number;
  /** Clean standing positions after dismounting at bottom or top */
  bottomExit: Vec3;
  topExit: Vec3;
  bottomFloor: number;
  topFloor: number;
  bottomInShelter: boolean;
  topInShelter: boolean;
}

/** Headroom verification volume above a stair flight (for F3 debug & walkability check). */
export interface HeadroomVolume {
  id: string;
  houseId: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  minClearance: number;
  passed: boolean;
}

export type HouseArchetypeId =
  | 'brick_colonial'
  | 'craftsman_clapboard'
  | 'stucco_modern'
  | 'tudor_manor'
  | 'farmhouse_wrap'
  | 'mediterranean_villa'
  | 'nordic_gable'
  | 'industrial_loft';
export type RoofAccessMethod = 'exterior_ladder' | 'fire_escape';
export type StreetSide = 'north' | 'south';
export type GarageSide = 'left' | 'right';

export interface LotConfig {
  id: string;
  side: StreetSide;
  /** World center of the lot (36m wide along X, 46m deep along Z) */
  position: Vec3;
  /** Facing angle in radians (north houses face +Z toward street, south houses face -Z) */
  rotationY: number;
  houseType: HouseArchetypeId;
  roofAccess: RoofAccessMethod;
  /** Which side (in house-local space before world rotation) the attached garage sits on */
  garageSide: GarageSide;
  /** Muted grounded exterior color variant index (0..2) */
  paletteVariant: number;
  ownerSlotId: string | null;
}

export type DamageState = 'intact' | 'cracked' | 'broken';

export interface DoorEntity {
  id: string;
  ownerId: string;
  houseId: string;
  labelKey: string;
  kind: 'front' | 'back' | 'garage' | 'roof' | 'interior' | 'tunnel';
  /** World-space center position at floor level */
  position: Vec3;
  /** Facing yaw in radians */
  rotationY: number;
  width: number;
  height: number;
  floorLevel: number;
  isOpen: boolean;
  isLocked: boolean;
  isBarricaded: boolean;
  damageState: DamageState;
  /** Smoothly interpolated 0..1 open progress */
  openProgress: number;
}

export interface WindowEntity {
  id: string;
  ownerId: string;
  houseId: string;
  labelKey: string;
  position: Vec3;
  rotationY: number;
  width: number;
  height: number;
  floorLevel: number;
  isOpen: boolean;
  isBarricaded: boolean;
  damageState: DamageState;
  /** Smoothly interpolated 0..1 casement swing open progress */
  openProgress: number;
}

export type YardSlotKind =
  | 'trap_front'
  | 'mine_driveway'
  | 'doghouse'
  | 'gnome'
  | 'fence'
  | 'gate';

export interface YardSlotEntity {
  id: string;
  ownerId: string;
  houseId: string;
  kind: YardSlotKind;
  labelKey: string;
  position: Vec3;
  rotationY: number;
  occupiedItemId: string | null;
}

export interface HouseAnchor {
  id: string;
  kind:
    | 'playerSpawn'
    | 'roofAccess'
    | 'roofTop'
    | 'shelterEntry'
    | 'shelterFloor'
    | 'tunnelEntry'
    | 'roofVent';
  position: Vec3;
  rotationY: number;
}

export interface NavNode {
  id: string;
  houseId: string | null;
  roomKey?: string;
  floorLevel: number;
  position: Vec3;
  neighbors: string[];
}

export type ControllerType = 'human' | 'ai';

export type ActorAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'land'
  | 'turn'
  | 'climb'
  | 'interact'
  | 'dig'
  | 'hurt'
  | 'ko'
  | 'celebrate';

export type ClimbPhase = 'opening_hatch' | 'mount' | 'climbing' | 'dismount';

export interface ActorClimbState {
  ladderId: string;
  houseId: string;
  kind: 'roof' | 'shelter' | 'tunnel_shaft';
  phase: ClimbPhase;
  /** 0..1 progress within mount, opening_hatch, or dismount sub-phase */
  phaseProgress: number;
  /** World origin when entering mount/dismount for smooth interpolation */
  fromPos: Vec3;
  toPos: Vec3;
  /** Target climbing direction ('up' or 'down') when entering via interact */
  entryDirection: 'up' | 'down';
  /** Cumulative meters climbed (drives hand-over-hand alternating animation & rung audio) */
  climbMeters: number;
  /** Current signed climbing velocity along Y */
  climbVelY: number;
}

export interface CharacterOutfit {
  jacket: string;
  shirt: string;
  pants: string;
  boots: string;
  gloves: string;
  backpack: string;
  hair: string;
  skin: string;
  headwear: 'cap' | 'beanie' | 'none';
  capColor: string;
  /** Subtle per-character proportion multipliers so NPCs reuse the exact same rig */
  heightScale?: number;
  shoulderScale?: number;
  headScale?: number;
}

export interface ActorEntity {
  id: string;
  ownerId: string;
  nameKey: string;
  slotId: string;
  controller: ControllerType;
  houseId: string;
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  pitch: number;
  turnRate: number;
  grounded: boolean;
  onStairs: boolean;
  stairSlope: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  landTimer: number;
  idleTime: number;
  hurtTimer: number;
  celebrateTimer: number;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  oxygen: number;
  maxOxygen: number;
  money: number;
  animState: ActorAnimState;
  animTime: number;
  interactTimer: number;
  digTimer: number;
  walkDistance: number;
  currentSurface: SurfaceKind;
  /** Active ladder / shelter hatch climbing state (null when walking freely) */
  climbState: ActorClimbState | null;
  /** Current house & floor for interior culling & 3P ceiling fade */
  insideHouseId: string | null;
  currentFloor: number; // -2 deep tunnel, -1 shelter/tunnel, 0 ground/outdoor, 1 second, 2 roof
  inShelter: boolean;
  inTunnel: boolean;
  inFloodedTunnel: boolean;
  activeTool: TunnelToolId;
  collapseWarningTimer: number;
  caveInShakeTimer: number;
  /** Visual outfit & proportion theme */
  outfit: CharacterOutfit;
}

export interface MoveInputPayload {
  forward: number; // -1..1
  right: number; // -1..1
  yaw: number;
  pitch: number;
  sprint: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
}

/**
 * Serializable command union — every human and AI action flows through this.
 * Future phase commands are typed cleanly here for forward compatibility.
 */
export type GameCommand =
  | { type: 'MOVE_INPUT'; actorId: string; input: MoveInputPayload }
  | { type: 'INTERACT_DOOR'; actorId: string; doorId: string }
  | { type: 'TOGGLE_LOCK_DOOR'; actorId: string; doorId: string }
  | { type: 'INTERACT_WINDOW'; actorId: string; windowId: string }
  | { type: 'TOGGLE_BARRICADE_WINDOW'; actorId: string; windowId: string }
  | { type: 'USE_ROOF_ACCESS'; actorId: string; houseId: string; direction: 'up' | 'down' }
  | { type: 'USE_SHELTER_ACCESS'; actorId: string; houseId: string; direction: 'enter' | 'exit' }
  | { type: 'TOGGLE_SHELTER_HATCH'; actorId: string; houseId: string }
  | { type: 'USE_TUNNEL_SHAFT'; actorId: string; ladderId: string; direction: 'up' | 'down' }
  | { type: 'DISMOUNT_LADDER'; actorId: string }
  | { type: 'SELECT_TOOL'; actorId: string; tool: TunnelToolId }
  | { type: 'USE_ACTIVE_TOOL'; actorId: string }
  | { type: 'SET_SLOT_CONTROLLER'; slotId: string; controller: ControllerType }
  | { type: 'ADVANCE_TIME'; hours: number }
  | { type: 'DIG'; actorId: string; gx: number; gy: number; gz: number }
  | { type: 'BUILD'; actorId: string; itemId: string; slotId: string }
  | { type: 'BUY'; actorId: string; itemId: string }
  | { type: 'FIRE'; actorId: string; weaponId: string; target: Vec3 }
  | { type: 'EQUIP_WEAPON'; actorId: string; weaponId: WeaponId }
  | { type: 'CALL_911'; actorId: string }
  | { type: 'POST_PHOTO'; actorId: string; captionKey: string }
  | { type: 'CLAIM_MISSION'; actorId: string; missionId: string }
  | { type: 'TRIGGER_RAID'; actorId: string }
  | { type: 'CLEAR_FEED_UNREAD'; actorId: string };

export interface InteractionTarget {
  kind:
    | 'door'
    | 'window'
    | 'roof_up'
    | 'roof_down'
    | 'shelter_enter'
    | 'shelter_exit'
    | 'shaft_up'
    | 'shaft_down'
    | 'yard_slot'
    | 'roof_pad'
    | 'tunnel_entry';
  id: string;
  houseId: string;
  labelKey: string;
  actionKey: string;
  actionParams?: Record<string, string | number>;
  secondaryHintKey?: string;
  stateBadgeKey?: string;
  distance: number;
  position: Vec3;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  tick: number;
  day: number;
  /** Time of day in hours [0, 24). Starts at 09:15 (9.25). */
  timeOfDay: number;
  /** Real seconds per 1 in-game hour */
  secondsPerGameHour: number;
  localPlayerSlotId: string;
  lots: LotConfig[];
  actors: Record<string, ActorEntity>;
  doors: Record<string, DoorEntity>;
  windows: Record<string, WindowEntity>;
  yardSlots: Record<string, YardSlotEntity>;
  /** Shelter trapdoor open progress (0 closed .. 1 open) per houseId */
  shelterHatches: Record<string, { isOpen: boolean; openProgress: number }>;
  tunnels: TunnelNetworkState;
  socialFeed: SocialPost[];
  phase3: Phase3State;
}

/** Compact JSON save payload */
export interface SerializedGameState {
  version: number;
  seed: number;
  rngState: number;
  tick: number;
  day: number;
  timeOfDay: number;
  localPlayerSlotId: string;
  actors: Record<
    string,
    Pick<
      ActorEntity,
      | 'id'
      | 'position'
      | 'yaw'
      | 'pitch'
      | 'health'
      | 'stamina'
      | 'money'
      | 'controller'
      | 'inShelter'
      | 'currentFloor'
      | 'insideHouseId'
    > & {
      oxygen?: number;
      inTunnel?: boolean;
      activeTool?: TunnelToolId;
    }
  >;
  doors: Record<string, Pick<DoorEntity, 'isOpen' | 'isLocked' | 'isBarricaded' | 'damageState'>>;
  windows: Record<string, Pick<WindowEntity, 'isOpen' | 'isBarricaded' | 'damageState'>>;
  yardSlots: Record<string, { occupiedItemId: string | null }>;
  shelterHatches?: Record<string, { isOpen: boolean }>;
  tunnels: TunnelNetworkState;
  socialFeed: SocialPost[];
  phase3?: SerializedPhase3State;
}
