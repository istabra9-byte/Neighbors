/**
 * Phase 3 pure TypeScript types & catalogs for Neighborhood Wars:
 * Handheld weapons, projectiles, yard & roof defenses, guard dog & wildlife,
 * nighttime robbers, 911 police dispatch, hardware shop, missions, and FX events.
 * Zero React or Three.js dependencies.
 */

import type { Vec3, YardSlotKind } from '../simulation/types';

export type WeaponId = 'wrench' | 'slingshot' | 'paintball' | 'water_blaster' | 'stink_bomb';

export const WEAPON_ORDER: WeaponId[] = [
  'wrench',
  'slingshot',
  'paintball',
  'water_blaster',
  'stink_bomb',
];

export interface WeaponSpec {
  id: WeaponId;
  nameKey: string;
  descKey: string;
  price: number;
  ammoPackPrice: number;
  ammoPackSize: number;
  damage: number;
  speed: number; // 0 for melee
  gravity: number;
  range: number;
  cooldown: number;
  splashRadius: number;
  color: string;
  infiniteAmmo?: boolean;
}

export const WEAPON_SPECS: Record<WeaponId, WeaponSpec> = {
  wrench: {
    id: 'wrench',
    nameKey: 'weapon.wrench',
    descKey: 'weapon.wrench.desc',
    price: 0,
    ammoPackPrice: 0,
    ammoPackSize: 0,
    damage: 34,
    speed: 0,
    gravity: 0,
    range: 2.35,
    cooldown: 0.45,
    splashRadius: 0,
    color: '#9aa3ad',
    infiniteAmmo: true,
  },
  slingshot: {
    id: 'slingshot',
    nameKey: 'weapon.slingshot',
    descKey: 'weapon.slingshot.desc',
    price: 0,
    ammoPackPrice: 20,
    ammoPackSize: 18,
    damage: 24,
    speed: 28,
    gravity: 9.2,
    range: 42,
    cooldown: 0.36,
    splashRadius: 0.35,
    color: '#c79a56',
  },
  paintball: {
    id: 'paintball',
    nameKey: 'weapon.paintball',
    descKey: 'weapon.paintball.desc',
    price: 110,
    ammoPackPrice: 30,
    ammoPackSize: 24,
    damage: 32,
    speed: 36,
    gravity: 5.5,
    range: 56,
    cooldown: 0.24,
    splashRadius: 0.65,
    color: '#e85d3f',
  },
  water_blaster: {
    id: 'water_blaster',
    nameKey: 'weapon.water_blaster',
    descKey: 'weapon.water_blaster.desc',
    price: 90,
    ammoPackPrice: 18,
    ammoPackSize: 30,
    damage: 18,
    speed: 26,
    gravity: 7.4,
    range: 34,
    cooldown: 0.16,
    splashRadius: 0.9,
    color: '#4ea8de',
  },
  stink_bomb: {
    id: 'stink_bomb',
    nameKey: 'weapon.stink_bomb',
    descKey: 'weapon.stink_bomb.desc',
    price: 85,
    ammoPackPrice: 35,
    ammoPackSize: 6,
    damage: 52,
    speed: 17,
    gravity: 13.5,
    range: 32,
    cooldown: 0.72,
    splashRadius: 3.4,
    color: '#7da842',
  },
};

export type DefenseItemId =
  | 'def_trap_front'
  | 'def_mine_driveway'
  | 'def_doghouse'
  | 'def_gnome'
  | 'def_fence'
  | 'def_gate'
  | 'roof_cannon'
  | 'roof_radar'
  | 'roof_launcher';

export type RoofPadKind = 'roof_cannon' | 'roof_radar' | 'roof_launcher';

export interface DefenseSpec {
  id: DefenseItemId;
  slotKind: YardSlotKind | RoofPadKind;
  isRoof: boolean;
  nameKey: string;
  descKey: string;
  price: number;
  repairCost: number;
  maxCharges: number;
  triggerRadius: number;
  damage: number;
  cooldown: number;
}

export const DEFENSE_SPECS: Record<DefenseItemId, DefenseSpec> = {
  def_trap_front: {
    id: 'def_trap_front',
    slotKind: 'trap_front',
    isRoof: false,
    nameKey: 'defense.trap_front',
    descKey: 'defense.trap_front.desc',
    price: 55,
    repairCost: 20,
    maxCharges: 2,
    triggerRadius: 2.4,
    damage: 45,
    cooldown: 3.5,
  },
  def_mine_driveway: {
    id: 'def_mine_driveway',
    slotKind: 'mine_driveway',
    isRoof: false,
    nameKey: 'defense.mine_driveway',
    descKey: 'defense.mine_driveway.desc',
    price: 75,
    repairCost: 25,
    maxCharges: 1,
    triggerRadius: 2.8,
    damage: 70,
    cooldown: 4.0,
  },
  def_doghouse: {
    id: 'def_doghouse',
    slotKind: 'doghouse',
    isRoof: false,
    nameKey: 'defense.doghouse',
    descKey: 'defense.doghouse.desc',
    price: 120,
    repairCost: 30,
    maxCharges: 99,
    triggerRadius: 16.0,
    damage: 26,
    cooldown: 1.1,
  },
  def_gnome: {
    id: 'def_gnome',
    slotKind: 'gnome',
    isRoof: false,
    nameKey: 'defense.gnome',
    descKey: 'defense.gnome.desc',
    price: 65,
    repairCost: 20,
    maxCharges: 99,
    triggerRadius: 12.0,
    damage: 14,
    cooldown: 1.8,
  },
  def_fence: {
    id: 'def_fence',
    slotKind: 'fence',
    isRoof: false,
    nameKey: 'defense.fence',
    descKey: 'defense.fence.desc',
    price: 95,
    repairCost: 25,
    maxCharges: 99,
    triggerRadius: 3.2,
    damage: 20,
    cooldown: 2.0,
  },
  def_gate: {
    id: 'def_gate',
    slotKind: 'gate',
    isRoof: false,
    nameKey: 'defense.gate',
    descKey: 'defense.gate.desc',
    price: 110,
    repairCost: 30,
    maxCharges: 99,
    triggerRadius: 3.5,
    damage: 15,
    cooldown: 2.2,
  },
  roof_cannon: {
    id: 'roof_cannon',
    slotKind: 'roof_cannon',
    isRoof: true,
    nameKey: 'defense.roof_cannon',
    descKey: 'defense.roof_cannon.desc',
    price: 160,
    repairCost: 35,
    maxCharges: 99,
    triggerRadius: 28.0,
    damage: 34,
    cooldown: 2.1,
  },
  roof_radar: {
    id: 'roof_radar',
    slotKind: 'roof_radar',
    isRoof: true,
    nameKey: 'defense.roof_radar',
    descKey: 'defense.roof_radar.desc',
    price: 130,
    repairCost: 30,
    maxCharges: 99,
    triggerRadius: 42.0,
    damage: 0,
    cooldown: 4.0,
  },
  roof_launcher: {
    id: 'roof_launcher',
    slotKind: 'roof_launcher',
    isRoof: true,
    nameKey: 'defense.roof_launcher',
    descKey: 'defense.roof_launcher.desc',
    price: 195,
    repairCost: 45,
    maxCharges: 99,
    triggerRadius: 34.0,
    damage: 55,
    cooldown: 3.4,
  },
};

export const YARD_SLOT_TO_DEFENSE: Record<YardSlotKind, DefenseItemId> = {
  trap_front: 'def_trap_front',
  mine_driveway: 'def_mine_driveway',
  doghouse: 'def_doghouse',
  gnome: 'def_gnome',
  fence: 'def_fence',
  gate: 'def_gate',
};

export interface RoofPadEntity {
  id: string;
  houseId: string;
  ownerId: string;
  kind: RoofPadKind;
  labelKey: string;
  position: Vec3;
  rotationY: number;
  occupiedItemId: DefenseItemId | null;
}

export interface DefenseBuildState {
  slotId: string;
  houseId: string;
  itemId: DefenseItemId;
  position: Vec3;
  rotationY: number;
  isRoof: boolean;
  armed: boolean;
  charges: number;
  cooldownTimer: number;
  turretYaw: number;
}

export type ShopItemId =
  | 'weapon_paintball'
  | 'weapon_water_blaster'
  | 'weapon_stink_bomb'
  | 'ammo_slingshot'
  | 'ammo_paintball'
  | 'ammo_water_blaster'
  | 'ammo_stink_bomb'
  | 'kit_trap_front'
  | 'kit_mine_driveway'
  | 'kit_doghouse'
  | 'kit_gnome'
  | 'kit_roof_cannon'
  | 'consumable_medkit';

export interface ShopCatalogItem {
  id: ShopItemId;
  category: 'weapons' | 'ammo' | 'defenses' | 'supplies';
  nameKey: string;
  descKey: string;
  price: number;
  weaponId?: WeaponId;
  defenseId?: DefenseItemId;
}

export const SHOP_CATALOG: ShopCatalogItem[] = [
  {
    id: 'weapon_paintball',
    category: 'weapons',
    nameKey: 'weapon.paintball',
    descKey: 'weapon.paintball.desc',
    price: WEAPON_SPECS.paintball.price,
    weaponId: 'paintball',
  },
  {
    id: 'weapon_water_blaster',
    category: 'weapons',
    nameKey: 'weapon.water_blaster',
    descKey: 'weapon.water_blaster.desc',
    price: WEAPON_SPECS.water_blaster.price,
    weaponId: 'water_blaster',
  },
  {
    id: 'weapon_stink_bomb',
    category: 'weapons',
    nameKey: 'weapon.stink_bomb',
    descKey: 'weapon.stink_bomb.desc',
    price: WEAPON_SPECS.stink_bomb.price,
    weaponId: 'stink_bomb',
  },
  {
    id: 'ammo_slingshot',
    category: 'ammo',
    nameKey: 'shop.ammo.slingshot',
    descKey: 'shop.ammo.slingshot.desc',
    price: WEAPON_SPECS.slingshot.ammoPackPrice,
    weaponId: 'slingshot',
  },
  {
    id: 'ammo_paintball',
    category: 'ammo',
    nameKey: 'shop.ammo.paintball',
    descKey: 'shop.ammo.paintball.desc',
    price: WEAPON_SPECS.paintball.ammoPackPrice,
    weaponId: 'paintball',
  },
  {
    id: 'ammo_water_blaster',
    category: 'ammo',
    nameKey: 'shop.ammo.water_blaster',
    descKey: 'shop.ammo.water_blaster.desc',
    price: WEAPON_SPECS.water_blaster.ammoPackPrice,
    weaponId: 'water_blaster',
  },
  {
    id: 'ammo_stink_bomb',
    category: 'ammo',
    nameKey: 'shop.ammo.stink_bomb',
    descKey: 'shop.ammo.stink_bomb.desc',
    price: WEAPON_SPECS.stink_bomb.ammoPackPrice,
    weaponId: 'stink_bomb',
  },
  {
    id: 'kit_trap_front',
    category: 'defenses',
    nameKey: 'defense.trap_front',
    descKey: 'defense.trap_front.desc',
    price: DEFENSE_SPECS.def_trap_front.price,
    defenseId: 'def_trap_front',
  },
  {
    id: 'kit_mine_driveway',
    category: 'defenses',
    nameKey: 'defense.mine_driveway',
    descKey: 'defense.mine_driveway.desc',
    price: DEFENSE_SPECS.def_mine_driveway.price,
    defenseId: 'def_mine_driveway',
  },
  {
    id: 'kit_doghouse',
    category: 'defenses',
    nameKey: 'defense.doghouse',
    descKey: 'defense.doghouse.desc',
    price: DEFENSE_SPECS.def_doghouse.price,
    defenseId: 'def_doghouse',
  },
  {
    id: 'kit_gnome',
    category: 'defenses',
    nameKey: 'defense.gnome',
    descKey: 'defense.gnome.desc',
    price: DEFENSE_SPECS.def_gnome.price,
    defenseId: 'def_gnome',
  },
  {
    id: 'kit_roof_cannon',
    category: 'defenses',
    nameKey: 'defense.roof_cannon',
    descKey: 'defense.roof_cannon.desc',
    price: DEFENSE_SPECS.roof_cannon.price,
    defenseId: 'roof_cannon',
  },
  {
    id: 'consumable_medkit',
    category: 'supplies',
    nameKey: 'shop.medkit',
    descKey: 'shop.medkit.desc',
    price: 35,
  },
];

export interface ProjectileEntity {
  id: string;
  ownerId: string;
  weaponId: WeaponId | 'roof_cannon' | 'roof_launcher' | 'gnome_zap';
  position: Vec3;
  velocity: Vec3;
  gravity: number;
  damage: number;
  splashRadius: number;
  color: string;
  age: number;
  maxAge: number;
}

export type AnimalKind = 'guard_dog' | 'stray_cat' | 'raccoon';

export interface AnimalEntity {
  id: string;
  kind: AnimalKind;
  ownerId: string | null;
  houseId: string | null;
  homePos: Vec3;
  position: Vec3;
  yaw: number;
  speed: number;
  state: 'idle' | 'patrol' | 'chase' | 'bite';
  targetId: string | null;
  animTime: number;
  barkTimer: number;
  attackCooldown: number;
  waypoint: Vec3;
}

export type RobberArchetype = 'burglar' | 'roof_ninja';

export interface RobberEntity {
  id: string;
  archetype: RobberArchetype;
  targetHouseId: string;
  position: Vec3;
  yaw: number;
  health: number;
  maxHealth: number;
  state: 'approaching' | 'breaking_in' | 'looting' | 'fleeing' | 'stunned' | 'arrested';
  targetPoint: Vec3;
  targetDoorId: string | null;
  breakProgress: number;
  stolenCash: number;
  stunTimer: number;
  hurtTimer: number;
  animTime: number;
  bounty: number;
}

export interface PoliceDispatchState {
  status: 'idle' | 'en_route' | 'on_scene' | 'departing';
  cruiserPos: Vec3;
  cruiserYaw: number;
  targetX: number;
  officerPos: Vec3;
  officerYaw: number;
  officerActive: boolean;
  timer: number;
  cooldown: number;
  arrestsThisCall: number;
  wasFalseAlarm: boolean;
  sirenPhase: number;
}

export type MissionId =
  | 'mission_buy_gear'
  | 'mission_build_defense'
  | 'mission_adopt_dog'
  | 'mission_foil_robber'
  | 'mission_prank_gary'
  | 'mission_post_photo';

export interface MissionProgress {
  id: MissionId;
  titleKey: string;
  descKey: string;
  reward: number;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
}

export interface Phase3FxEvent {
  id: string;
  pos: Vec3;
  color: string;
  radius: number;
  kind: 'splat' | 'stink' | 'explosion' | 'spark' | 'bark';
  age: number;
  maxAge: number;
}

export interface Phase3State {
  activeWeapon: WeaponId;
  ownedWeapons: WeaponId[];
  ammo: Record<WeaponId, number>;
  defenseKits: Partial<Record<DefenseItemId, number>>;
  weaponCooldown: number;
  recoilTimer: number;
  photoCooldown: number;
  roofPads: Record<string, RoofPadEntity>;
  defenses: Record<string, DefenseBuildState>;
  projectiles: ProjectileEntity[];
  animals: AnimalEntity[];
  robbers: RobberEntity[];
  police: PoliceDispatchState;
  missions: MissionProgress[];
  fxEvents: Phase3FxEvent[];
  lastRaidDay: number;
  raidBannerKey: string | null;
  raidBannerTimer: number;
  totalRobbersFoiled: number;
  totalGaryHits: number;
  nextEntitySeq: number;
  unreadFeedCount: number;
}

export interface SerializedPhase3State {
  activeWeapon: WeaponId;
  ownedWeapons: WeaponId[];
  ammo: Record<WeaponId, number>;
  defenseKits: Partial<Record<DefenseItemId, number>>;
  defenses: Record<string, DefenseBuildState>;
  missions: MissionProgress[];
  lastRaidDay: number;
  totalRobbersFoiled: number;
  totalGaryHits: number;
}
