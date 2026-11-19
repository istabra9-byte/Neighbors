/**
 * Phase 3 Pure TypeScript Simulation Engine for Neighborhood Wars.
 * Handles handheld weapons & projectiles, yard/roof defense builds & auto-turrets,
 * guard dog & wildlife AI, nighttime burglars/ninjas, 911 police cruiser dispatch,
 * hardware shop economy, NextBlock social feed posts, and suburban missions.
 * Zero React or Three.js dependencies so all rules are tested headlessly in node:test.
 */

import type {
  ActorEntity,
  DoorEntity,
  Vec3,
  WindowEntity,
  YardSlotEntity,
} from '../simulation/types';
import type { SpatialHashGrid } from '../simulation/spatialGrid';
import type { SeededRNG } from '../simulation/rng';
import type { HouseBlueprint } from '../world/houses';
import { localToWorld } from '../world/houses';
import type { SocialPost } from '../events/eventTypes';
import {
  DEFENSE_SPECS,
  SHOP_CATALOG,
  WEAPON_SPECS,
  YARD_SLOT_TO_DEFENSE,
  type AnimalEntity,
  type DefenseBuildState,
  type DefenseItemId,
  type MissionId,
  type MissionProgress,
  type Phase3State,
  type RobberEntity,
  type RoofPadEntity,
  type RoofPadKind,
  type SerializedPhase3State,
  type ShopItemId,
  type WeaponId,
} from './phase3Types';

export interface Phase3SoundEmission {
  type:
    | 'shot'
    | 'hit'
    | 'trap'
    | 'explosion'
    | 'bark'
    | 'siren'
    | 'cash'
    | 'phone'
    | 'alert'
    | 'lock';
}

export interface Phase3ActionResult {
  ok: boolean;
  toastKey?: string;
  toastParams?: Record<string, string | number>;
  sounds: Phase3SoundEmission[];
}

const ROOF_PAD_LAYOUT: Array<{ kind: RoofPadKind; x: number; z: number; labelKey: string }> = [
  { kind: 'roof_cannon', x: -4.2, z: 3.2, labelKey: 'defense.roof_cannon' },
  { kind: 'roof_radar', x: 0.2, z: 3.4, labelKey: 'defense.roof_radar' },
  { kind: 'roof_launcher', x: -1.4, z: -3.2, labelKey: 'defense.roof_launcher' },
];

export function createInitialMissions(): MissionProgress[] {
  return [
    {
      id: 'mission_buy_gear',
      titleKey: 'mission.buy_gear.title',
      descKey: 'mission.buy_gear.desc',
      reward: 50,
      progress: 0,
      goal: 1,
      completed: false,
      claimed: false,
    },
    {
      id: 'mission_build_defense',
      titleKey: 'mission.build_defense.title',
      descKey: 'mission.build_defense.desc',
      reward: 75,
      progress: 0,
      goal: 1,
      completed: false,
      claimed: false,
    },
    {
      id: 'mission_adopt_dog',
      titleKey: 'mission.adopt_dog.title',
      descKey: 'mission.adopt_dog.desc',
      reward: 90,
      progress: 0,
      goal: 1,
      completed: false,
      claimed: false,
    },
    {
      id: 'mission_foil_robber',
      titleKey: 'mission.foil_robber.title',
      descKey: 'mission.foil_robber.desc',
      reward: 120,
      progress: 0,
      goal: 1,
      completed: false,
      claimed: false,
    },
    {
      id: 'mission_prank_gary',
      titleKey: 'mission.prank_gary.title',
      descKey: 'mission.prank_gary.desc',
      reward: 65,
      progress: 0,
      goal: 1,
      completed: false,
      claimed: false,
    },
    {
      id: 'mission_post_photo',
      titleKey: 'mission.post_photo.title',
      descKey: 'mission.post_photo.desc',
      reward: 45,
      progress: 0,
      goal: 1,
      completed: false,
      claimed: false,
    },
  ];
}

export function buildRoofPads(houses: HouseBlueprint[]): Record<string, RoofPadEntity> {
  const pads: Record<string, RoofPadEntity> = {};
  for (const h of houses) {
    const mirror = h.lot.garageSide === 'left' ? -1 : 1;
    for (const spec of ROOF_PAD_LAYOUT) {
      const worldPos = localToWorld(h.worldOrigin, h.rotationY, {
        x: mirror * spec.x,
        y: h.roofDeckY,
        z: spec.z,
      });
      const id = `${h.houseId}_${spec.kind}`;
      pads[id] = {
        id,
        houseId: h.houseId,
        ownerId: h.lot.ownerSlotId ?? h.houseId,
        kind: spec.kind,
        labelKey: spec.labelKey,
        position: worldPos,
        rotationY: h.rotationY,
        occupiedItemId: null,
      };
    }
  }
  return pads;
}

export function createInitialWildlife(houses: HouseBlueprint[]): AnimalEntity[] {
  const animals: AnimalEntity[] = [];
  const playerHouse = houses.find((h) => h.lot.ownerSlotId === 'slot_player') ?? houses[0];
  const neighborHouse = houses.find((h) => h.lot.ownerSlotId === 'slot_neighbor_1') ?? houses[1];

  if (playerHouse) {
    const catHome = {
      x: playerHouse.lot.position.x + 11.5,
      y: 0.14,
      z: 6.4,
    };
    animals.push({
      id: 'animal_cat_1',
      kind: 'stray_cat',
      ownerId: null,
      houseId: null,
      homePos: { ...catHome },
      position: { ...catHome },
      yaw: 1.2,
      speed: 2.1,
      state: 'patrol',
      targetId: null,
      animTime: 0,
      barkTimer: 0,
      attackCooldown: 0,
      waypoint: { x: catHome.x - 10, y: 0.14, z: 6.4 },
    });
  }

  if (neighborHouse) {
    const racHome = {
      x: neighborHouse.lot.position.x - 11.5,
      y: 0.14,
      z: -6.5,
    };
    animals.push({
      id: 'animal_raccoon_1',
      kind: 'raccoon',
      ownerId: null,
      houseId: null,
      homePos: { ...racHome },
      position: { ...racHome },
      yaw: -1.4,
      speed: 2.4,
      state: 'patrol',
      targetId: null,
      animTime: 1.3,
      barkTimer: 0,
      attackCooldown: 0,
      waypoint: { x: racHome.x + 12, y: 0.14, z: -6.5 },
    });
  }

  return animals;
}

export function createInitialPhase3State(houses: HouseBlueprint[]): Phase3State {
  return {
    activeWeapon: 'slingshot',
    ownedWeapons: ['wrench', 'slingshot'],
    ammo: {
      wrench: 999,
      slingshot: 24,
      paintball: 0,
      water_blaster: 0,
      stink_bomb: 0,
    },
    defenseKits: {},
    weaponCooldown: 0,
    recoilTimer: 0,
    photoCooldown: 0,
    roofPads: buildRoofPads(houses),
    defenses: {},
    projectiles: [],
    animals: createInitialWildlife(houses),
    robbers: [],
    police: {
      status: 'idle',
      cruiserPos: { x: -95, y: 0, z: 2.1 },
      cruiserYaw: Math.PI / 2,
      targetX: 0,
      officerPos: { x: -95, y: 0, z: 5.5 },
      officerYaw: 0,
      officerActive: false,
      timer: 0,
      cooldown: 0,
      arrestsThisCall: 0,
      wasFalseAlarm: false,
      sirenPhase: 0,
    },
    missions: createInitialMissions(),
    fxEvents: [],
    lastRaidDay: 0,
    raidBannerKey: null,
    raidBannerTimer: 0,
    totalRobbersFoiled: 0,
    totalGaryHits: 0,
    nextEntitySeq: 1,
    unreadFeedCount: 0,
  };
}

export function createWelcomeSocialFeed(): SocialPost[] {
  return [
    {
      id: 'post_welcome_1',
      authorId: 'actor_neighbor_1',
      captionKey: 'feed.post.garyWelcome',
      timestampDay: 1,
      likes: 7,
    },
    {
      id: 'post_welcome_2',
      authorId: 'watch_admin',
      captionKey: 'feed.post.watchAlert',
      timestampDay: 1,
      likes: 14,
    },
  ];
}

function advanceMission(p3: Phase3State, id: MissionId, amount: number = 1): void {
  const m = p3.missions.find((item) => item.id === id);
  if (!m || m.completed) return;
  m.progress = Math.min(m.goal, m.progress + amount);
  if (m.progress >= m.goal) {
    m.completed = true;
  }
}

export function pushSocialPost(
  socialFeed: SocialPost[],
  p3: Phase3State,
  authorId: string,
  captionKey: string,
  day: number,
  baseLikes: number,
): SocialPost {
  const post: SocialPost = {
    id: `post_${day}_${p3.nextEntitySeq++}`,
    authorId,
    captionKey,
    timestampDay: day,
    likes: baseLikes,
  };
  socialFeed.unshift(post);
  if (socialFeed.length > 24) {
    socialFeed.length = 24;
  }
  p3.unreadFeedCount += 1;
  return post;
}

export function ensureGuardDogForHouse(p3: Phase3State, defense: DefenseBuildState): void {
  if (defense.itemId !== 'def_doghouse') return;
  const dogId = `guard_dog_${defense.houseId}`;
  if (p3.animals.some((a) => a.id === dogId)) return;
  const startPos: Vec3 = {
    x: defense.position.x + Math.sin(defense.rotationY) * 1.4,
    y: 0.02,
    z: defense.position.z + Math.cos(defense.rotationY) * 1.4,
  };
  p3.animals.push({
    id: dogId,
    kind: 'guard_dog',
    ownerId: 'slot_player',
    houseId: defense.houseId,
    homePos: { ...startPos },
    position: { ...startPos },
    yaw: defense.rotationY,
    speed: 4.8,
    state: 'patrol',
    targetId: null,
    animTime: 0,
    barkTimer: 0.9,
    attackCooldown: 0,
    waypoint: { x: startPos.x + 3.2, y: 0.02, z: startPos.z + 1.8 },
  });
}

export function handleEquipWeapon(p3: Phase3State, weaponId: WeaponId): boolean {
  if (!p3.ownedWeapons.includes(weaponId)) return false;
  p3.activeWeapon = weaponId;
  return true;
}

export function handleBuyShopItem(
  p3: Phase3State,
  actor: ActorEntity,
  itemId: string,
): Phase3ActionResult {
  const item = SHOP_CATALOG.find((c) => c.id === (itemId as ShopItemId));
  if (!item) return { ok: false, sounds: [{ type: 'lock' }] };
  if (actor.money < item.price) {
    return {
      ok: false,
      toastKey: 'phase3.toast.noCash',
      toastParams: { cost: item.price },
      sounds: [{ type: 'lock' }],
    };
  }

  if (item.category === 'weapons' && item.weaponId) {
    if (p3.ownedWeapons.includes(item.weaponId)) {
      return { ok: false, toastKey: 'phase3.toast.alreadyOwned', sounds: [{ type: 'lock' }] };
    }
    actor.money -= item.price;
    p3.ownedWeapons.push(item.weaponId);
    const spec = WEAPON_SPECS[item.weaponId];
    p3.ammo[item.weaponId] = (p3.ammo[item.weaponId] ?? 0) + spec.ammoPackSize;
    p3.activeWeapon = item.weaponId;
    advanceMission(p3, 'mission_buy_gear', 1);
    return { ok: true, toastKey: 'phase3.toast.purchased', sounds: [{ type: 'cash' }] };
  }

  if (item.category === 'ammo' && item.weaponId) {
    if (!p3.ownedWeapons.includes(item.weaponId)) {
      return { ok: false, toastKey: 'phase3.toast.needWeaponFirst', sounds: [{ type: 'lock' }] };
    }
    actor.money -= item.price;
    const spec = WEAPON_SPECS[item.weaponId];
    p3.ammo[item.weaponId] = (p3.ammo[item.weaponId] ?? 0) + spec.ammoPackSize;
    advanceMission(p3, 'mission_buy_gear', 1);
    return { ok: true, toastKey: 'phase3.toast.ammoBought', sounds: [{ type: 'cash' }] };
  }

  if (item.category === 'defenses' && item.defenseId) {
    actor.money -= item.price;
    p3.defenseKits[item.defenseId] = (p3.defenseKits[item.defenseId] ?? 0) + 1;
    advanceMission(p3, 'mission_buy_gear', 1);
    return { ok: true, toastKey: 'phase3.toast.kitBought', sounds: [{ type: 'cash' }] };
  }

  if (item.id === 'consumable_medkit') {
    if (actor.health >= actor.maxHealth) {
      return { ok: false, toastKey: 'phase3.toast.fullHealth', sounds: [{ type: 'lock' }] };
    }
    actor.money -= item.price;
    actor.health = Math.min(actor.maxHealth, actor.health + 50);
    return { ok: true, toastKey: 'phase3.toast.healed', sounds: [{ type: 'cash' }] };
  }

  return { ok: false, sounds: [{ type: 'lock' }] };
}

export function handleBuildDefense(
  p3: Phase3State,
  actor: ActorEntity,
  slotId: string,
  requestedItemId: string,
  yardSlots: Record<string, YardSlotEntity>,
): Phase3ActionResult {
  const yardSlot = yardSlots[slotId];
  const roofPad = p3.roofPads[slotId];
  if (!yardSlot && !roofPad) {
    return { ok: false, sounds: [{ type: 'lock' }] };
  }

  const houseId = yardSlot ? yardSlot.houseId : roofPad!.houseId;
  const position = yardSlot ? yardSlot.position : roofPad!.position;
  const rotationY = yardSlot ? yardSlot.rotationY : roofPad!.rotationY;
  const isRoof = Boolean(roofPad);

  const itemId: DefenseItemId = yardSlot
    ? YARD_SLOT_TO_DEFENSE[yardSlot.kind]
    : (roofPad!.kind as DefenseItemId);
  const spec = DEFENSE_SPECS[(requestedItemId as DefenseItemId) || itemId] ?? DEFENSE_SPECS[itemId];
  const existing = p3.defenses[slotId];

  // If already built and spent/disarmed, re-arm/repair it
  if (existing) {
    if (existing.armed && existing.charges >= spec.maxCharges) {
      return { ok: false, toastKey: 'phase3.toast.alreadyArmed', sounds: [{ type: 'lock' }] };
    }
    if (actor.money < spec.repairCost) {
      return {
        ok: false,
        toastKey: 'phase3.toast.noCash',
        toastParams: { cost: spec.repairCost },
        sounds: [{ type: 'lock' }],
      };
    }
    actor.money -= spec.repairCost;
    actor.interactTimer = 0.3;
    existing.armed = true;
    existing.charges = spec.maxCharges;
    existing.cooldownTimer = 0;
    return { ok: true, toastKey: 'phase3.toast.rearmed', sounds: [{ type: 'trap' }] };
  }

  // Use a pre-purchased kit if available, otherwise buy & place directly on the spot
  const kitCount = p3.defenseKits[spec.id] ?? 0;
  if (kitCount > 0) {
    p3.defenseKits[spec.id] = kitCount - 1;
  } else {
    if (actor.money < spec.price) {
      return {
        ok: false,
        toastKey: 'phase3.toast.noCash',
        toastParams: { cost: spec.price },
        sounds: [{ type: 'lock' }],
      };
    }
    actor.money -= spec.price;
  }

  actor.interactTimer = 0.34;
  const built: DefenseBuildState = {
    slotId,
    houseId,
    itemId: spec.id,
    position: { ...position },
    rotationY,
    isRoof,
    armed: true,
    charges: spec.maxCharges,
    cooldownTimer: 0,
    turretYaw: rotationY,
  };
  p3.defenses[slotId] = built;

  if (yardSlot) yardSlot.occupiedItemId = spec.id;
  if (roofPad) roofPad.occupiedItemId = spec.id;

  advanceMission(p3, 'mission_build_defense', 1);
  if (spec.id === 'def_doghouse') {
    ensureGuardDogForHouse(p3, built);
    advanceMission(p3, 'mission_adopt_dog', 1);
    return { ok: true, toastKey: 'phase3.toast.dogAdopted', sounds: [{ type: 'bark' }, { type: 'cash' }] };
  }

  return { ok: true, toastKey: 'phase3.toast.built', sounds: [{ type: 'trap' }] };
}

export function handleFireWeapon(
  p3: Phase3State,
  actor: ActorEntity,
  weaponId: WeaponId,
  target: Vec3,
  actors: Record<string, ActorEntity>,
  socialFeed: SocialPost[],
  day: number,
): Phase3ActionResult {
  const activeId: WeaponId = p3.ownedWeapons.includes(weaponId) ? weaponId : p3.activeWeapon;
  const spec = WEAPON_SPECS[activeId];
  if (!spec || p3.weaponCooldown > 0) return { ok: false, sounds: [] };

  if (!spec.infiniteAmmo) {
    const curAmmo = p3.ammo[activeId] ?? 0;
    if (curAmmo <= 0) {
      return { ok: false, toastKey: 'phase3.toast.outOfAmmo', sounds: [{ type: 'lock' }] };
    }
    p3.ammo[activeId] = curAmmo - 1;
  }

  p3.weaponCooldown = spec.cooldown;
  p3.recoilTimer = 0.22;
  actor.interactTimer = 0.24;

  const sounds: Phase3SoundEmission[] = [{ type: 'shot' }];
  const origin: Vec3 = {
    x: actor.position.x - Math.sin(actor.yaw) * 0.45,
    y: actor.position.y + 1.32,
    z: actor.position.z - Math.cos(actor.yaw) * 0.45,
  };

  // Melee Wrench swing
  if (spec.speed <= 0) {
    const fwdX = -Math.sin(actor.yaw);
    const fwdZ = -Math.cos(actor.yaw);
    for (const robber of p3.robbers) {
      if (robber.state === 'arrested') continue;
      const dx = robber.position.x - actor.position.x;
      const dz = robber.position.z - actor.position.z;
      const d = Math.hypot(dx, dz);
      if (d <= spec.range + 0.5 && (dx * fwdX + dz * fwdZ) / Math.max(0.01, d) > 0.25) {
        damageRobber(p3, robber, spec.damage, actor, socialFeed, day, sounds);
      }
    }
    const gary = actors['actor_neighbor_1'];
    if (gary && gary.id !== actor.id) {
      const dx = gary.position.x - actor.position.x;
      const dz = gary.position.z - actor.position.z;
      const d = Math.hypot(dx, dz);
      if (d <= spec.range + 0.4 && (dx * fwdX + dz * fwdZ) / Math.max(0.01, d) > 0.25) {
        hitNeighborGary(p3, gary, socialFeed, day, sounds);
      }
    }
    p3.fxEvents.push({
      id: `fx_${p3.nextEntitySeq++}`,
      pos: { x: origin.x + fwdX * 0.85, y: origin.y - 0.1, z: origin.z + fwdZ * 0.85 },
      color: spec.color,
      radius: 0.45,
      kind: 'spark',
      age: 0,
      maxAge: 0.24,
    });
    return { ok: true, sounds };
  }

  // Ballistic projectile aimed toward `target` (or along player look yaw/pitch)
  let dx = target.x - origin.x;
  let dy = target.y - origin.y;
  let dz = target.z - origin.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.25) {
    const cosP = Math.cos(actor.pitch);
    dx = -Math.sin(actor.yaw) * cosP;
    dy = Math.sin(actor.pitch);
    dz = -Math.cos(actor.yaw) * cosP;
  } else {
    dx /= len;
    dy /= len;
    dz /= len;
  }

  p3.projectiles.push({
    id: `proj_${p3.nextEntitySeq++}`,
    ownerId: actor.id,
    weaponId: activeId,
    position: origin,
    velocity: {
      x: dx * spec.speed,
      y: dy * spec.speed + (activeId === 'stink_bomb' ? 3.2 : 1.0),
      z: dz * spec.speed,
    },
    gravity: spec.gravity,
    damage: spec.damage,
    splashRadius: spec.splashRadius,
    color: spec.color,
    age: 0,
    maxAge: 3.0,
  });

  return { ok: true, sounds };
}

export function spawnNightRaid(
  p3: Phase3State,
  houses: HouseBlueprint[],
  doors: Record<string, DoorEntity>,
  rng: SeededRNG,
  day: number,
  forceCount?: number,
): Phase3SoundEmission[] {
  const playerHouse = houses.find((h) => h.lot.ownerSlotId === 'slot_player') ?? houses[0];
  if (!playerHouse) return [];

  const activeCount = p3.robbers.filter((r) => r.state !== 'arrested' && r.state !== 'fleeing').length;
  if (activeCount >= 3) return [];

  const count = forceCount ?? Math.min(2, 1 + Math.floor(day / 2));
  const frontDoor = Object.values(doors).find(
    (d) => d.houseId === playerHouse.houseId && d.kind === 'front',
  );
  const backDoor = Object.values(doors).find(
    (d) => d.houseId === playerHouse.houseId && d.kind === 'back',
  );

  for (let i = 0; i < count; i++) {
    const isNinja = i === 1 && rng.next() > 0.35;
    const spawnSide = rng.next() > 0.5 ? 1 : -1;
    const spawnPos: Vec3 = {
      x: playerHouse.lot.position.x + spawnSide * (18 + i * 5),
      y: 0.14,
      z: playerHouse.lot.side === 'south' ? 6.2 : -6.2,
    };
    const chosenDoor = isNinja && backDoor ? backDoor : frontDoor;
    const targetPoint = chosenDoor
      ? { x: chosenDoor.position.x, y: 0.02, z: chosenDoor.position.z }
      : { x: playerHouse.worldOrigin.x, y: 0.02, z: playerHouse.worldOrigin.z };

    const robber: RobberEntity = {
      id: `robber_${day}_${p3.nextEntitySeq++}`,
      archetype: isNinja ? 'roof_ninja' : 'burglar',
      targetHouseId: playerHouse.houseId,
      position: spawnPos,
      yaw: 0,
      health: isNinja ? 85 : 70,
      maxHealth: isNinja ? 85 : 70,
      state: 'approaching',
      targetPoint,
      targetDoorId: chosenDoor?.id ?? null,
      breakProgress: 0,
      stolenCash: 0,
      stunTimer: 0,
      hurtTimer: 0,
      animTime: rng.next() * 4,
      bounty: isNinja ? 65 : 45,
    };
    p3.robbers.push(robber);
  }

  p3.lastRaidDay = day;
  p3.raidBannerKey = 'phase3.banner.raidAlert';
  p3.raidBannerTimer = 8.0;
  return [{ type: 'alert' }];
}

export function handleCall911(
  p3: Phase3State,
  actor: ActorEntity,
  houses: HouseBlueprint[],
  socialFeed: SocialPost[],
  day: number,
): Phase3ActionResult {
  if (p3.police.status !== 'idle') {
    return { ok: false, toastKey: 'phase3.toast.policeBusy', sounds: [{ type: 'phone' }] };
  }
  if (p3.police.cooldown > 0) {
    return {
      ok: false,
      toastKey: 'phase3.toast.policeCooldown',
      toastParams: { sec: Math.ceil(p3.police.cooldown) },
      sounds: [{ type: 'lock' }],
    };
  }

  const playerHouse = houses.find((h) => h.houseId === actor.houseId) ?? houses[0];
  const targetX = playerHouse ? playerHouse.lot.position.x : actor.position.x;
  const activeRobbers = p3.robbers.filter((r) => r.state !== 'arrested').length;

  p3.police = {
    status: 'en_route',
    cruiserPos: { x: targetX - 58, y: 0, z: 2.0 },
    cruiserYaw: Math.PI / 2,
    targetX,
    officerPos: { x: targetX, y: 0.14, z: 6.2 },
    officerYaw: Math.PI,
    officerActive: false,
    timer: 0,
    cooldown: 0,
    arrestsThisCall: 0,
    wasFalseAlarm: activeRobbers === 0,
    sirenPhase: 0,
  };

  p3.raidBannerKey = 'phase3.banner.policeEnRoute';
  p3.raidBannerTimer = 6.5;

  pushSocialPost(
    socialFeed,
    p3,
    actor.id,
    activeRobbers > 0 ? 'feed.post.called911Raid' : 'feed.post.called911Quiet',
    day,
    activeRobbers > 0 ? 11 : 3,
  );

  return { ok: true, toastKey: 'phase3.toast.policeDispatched', sounds: [{ type: 'siren' }, { type: 'phone' }] };
}

export function handlePostPhoto(
  p3: Phase3State,
  actor: ActorEntity,
  captionKey: string,
  socialFeed: SocialPost[],
  day: number,
): Phase3ActionResult {
  if (p3.photoCooldown > 0) {
    return { ok: false, toastKey: 'phase3.toast.photoCooldown', sounds: [{ type: 'lock' }] };
  }

  const hasRobber = p3.robbers.some((r) => r.state !== 'arrested');
  const hasPolice = p3.police.status === 'on_scene' || p3.police.status === 'en_route';
  const hasDefense = Object.keys(p3.defenses).length > 0;

  let resolvedKey = captionKey;
  let likes = 6;
  let tipCash = 10;

  if (!resolvedKey || resolvedKey === 'auto') {
    if (hasRobber) {
      resolvedKey = 'feed.post.photoRobber';
      likes = 24;
      tipCash = 25;
    } else if (hasPolice) {
      resolvedKey = 'feed.post.photoPolice';
      likes = 19;
      tipCash = 20;
    } else if (hasDefense) {
      resolvedKey = 'feed.post.photoFortress';
      likes = 15;
      tipCash = 15;
    } else {
      resolvedKey = 'feed.post.photoStreet';
      likes = 8;
      tipCash = 10;
    }
  }

  pushSocialPost(socialFeed, p3, actor.id, resolvedKey, day, likes);
  actor.money += tipCash;
  p3.photoCooldown = 5.0;
  advanceMission(p3, 'mission_post_photo', 1);

  return {
    ok: true,
    toastKey: 'phase3.toast.photoPosted',
    toastParams: { cash: tipCash },
    sounds: [{ type: 'phone' }, { type: 'cash' }],
  };
}

export function handleClaimMission(
  p3: Phase3State,
  actor: ActorEntity,
  missionId: string,
): Phase3ActionResult {
  const m = p3.missions.find((item) => item.id === (missionId as MissionId));
  if (!m || !m.completed || m.claimed) {
    return { ok: false, sounds: [{ type: 'lock' }] };
  }
  m.claimed = true;
  actor.money += m.reward;
  actor.celebrateTimer = 1.4;
  return {
    ok: true,
    toastKey: 'phase3.toast.missionClaimed',
    toastParams: { cash: m.reward },
    sounds: [{ type: 'cash' }],
  };
}

function hitNeighborGary(
  p3: Phase3State,
  gary: ActorEntity,
  socialFeed: SocialPost[],
  day: number,
  sounds: Phase3SoundEmission[],
): void {
  gary.hurtTimer = 0.75;
  p3.totalGaryHits += 1;
  advanceMission(p3, 'mission_prank_gary', 1);
  sounds.push({ type: 'hit' });
  p3.fxEvents.push({
    id: `fx_${p3.nextEntitySeq++}`,
    pos: { x: gary.position.x, y: gary.position.y + 1.2, z: gary.position.z },
    color: '#e85d3f',
    radius: 0.75,
    kind: 'splat',
    age: 0,
    maxAge: 0.65,
  });
  if (p3.totalGaryHits === 1 || p3.totalGaryHits % 3 === 0) {
    pushSocialPost(socialFeed, p3, gary.id, 'feed.post.garyPranked', day, 18);
  }
}

function damageRobber(
  p3: Phase3State,
  robber: RobberEntity,
  damage: number,
  player: ActorEntity,
  socialFeed: SocialPost[],
  day: number,
  sounds: Phase3SoundEmission[],
): void {
  if (robber.state === 'arrested') return;
  robber.health = Math.max(0, robber.health - damage);
  robber.hurtTimer = 0.45;
  sounds.push({ type: 'hit' });

  if (robber.health <= 0) {
    // Robber knocked out / driven off; return any stolen loot + award bounty!
    if (robber.stolenCash > 0) {
      player.money += robber.stolenCash;
      robber.stolenCash = 0;
    }
    robber.state = 'stunned';
    robber.stunTimer = 6.0;
    player.money += robber.bounty;
    player.celebrateTimer = 1.2;
    p3.totalRobbersFoiled += 1;
    advanceMission(p3, 'mission_foil_robber', 1);
    p3.raidBannerKey = 'phase3.banner.robberFoiled';
    p3.raidBannerTimer = 4.5;
    sounds.push({ type: 'cash' });
    pushSocialPost(socialFeed, p3, player.id, 'feed.post.robberFoiled', day, 21);
  }
}

export function stepPhase3(
  p3: Phase3State,
  actors: Record<string, ActorEntity>,
  doors: Record<string, DoorEntity>,
  windows: Record<string, WindowEntity>,
  houses: HouseBlueprint[],
  spatialGrid: SpatialHashGrid,
  socialFeed: SocialPost[],
  timeOfDay: number,
  day: number,
  rng: SeededRNG,
  dt: number,
): Phase3SoundEmission[] {
  const sounds: Phase3SoundEmission[] = [];
  const player = actors['actor_player'];
  const gary = actors['actor_neighbor_1'];
  if (!player) return sounds;

  if (p3.weaponCooldown > 0) p3.weaponCooldown = Math.max(0, p3.weaponCooldown - dt);
  if (p3.recoilTimer > 0) p3.recoilTimer = Math.max(0, p3.recoilTimer - dt);
  if (p3.photoCooldown > 0) p3.photoCooldown = Math.max(0, p3.photoCooldown - dt);
  if (p3.raidBannerTimer > 0) {
    p3.raidBannerTimer = Math.max(0, p3.raidBannerTimer - dt);
    if (p3.raidBannerTimer === 0) p3.raidBannerKey = null;
  }
  if (p3.police.cooldown > 0) {
    p3.police.cooldown = Math.max(0, p3.police.cooldown - dt);
  }

  // 1. Organic nighttime robber raids (between 21:00 and 03:30 once per night)
  const isRaidWindow = timeOfDay >= 21.0 || timeOfDay < 3.5;
  if (isRaidWindow && p3.lastRaidDay < day && p3.robbers.length === 0) {
    sounds.push(...spawnNightRaid(p3, houses, doors, rng, day));
  }

  // 2. Step projectiles & collision detection
  for (let i = p3.projectiles.length - 1; i >= 0; i--) {
    const proj = p3.projectiles[i];
    proj.age += dt;
    if (proj.age >= proj.maxAge) {
      p3.projectiles.splice(i, 1);
      continue;
    }

    const prevX = proj.position.x;
    const prevY = proj.position.y;
    const prevZ = proj.position.z;
    proj.velocity.y -= proj.gravity * dt;
    proj.position.x += proj.velocity.x * dt;
    proj.position.y += proj.velocity.y * dt;
    proj.position.z += proj.velocity.z * dt;

    let impacted = proj.position.y <= 0.05;
    if (impacted) proj.position.y = 0.05;

    // Check robber hits
    if (!impacted) {
      for (const robber of p3.robbers) {
        if (robber.state === 'arrested' || robber.state === 'stunned') continue;
        const d = Math.hypot(
          proj.position.x - robber.position.x,
          proj.position.z - robber.position.z,
        );
        if (d < 0.72 && proj.position.y >= robber.position.y && proj.position.y <= robber.position.y + 1.8) {
          impacted = true;
          damageRobber(p3, robber, proj.damage, player, socialFeed, day, sounds);
          break;
        }
      }
    }

    // Check Gary hit
    if (!impacted && gary && proj.ownerId === player.id) {
      const d = Math.hypot(proj.position.x - gary.position.x, proj.position.z - gary.position.z);
      if (d < 0.72 && proj.position.y >= gary.position.y && proj.position.y <= gary.position.y + 1.8) {
        impacted = true;
        hitNeighborGary(p3, gary, socialFeed, day, sounds);
      }
    }

    // Check static world raycast
    if (!impacted) {
      const stepDx = proj.position.x - prevX;
      const stepDy = proj.position.y - prevY;
      const stepDz = proj.position.z - prevZ;
      const stepLen = Math.hypot(stepDx, stepDy, stepDz);
      if (stepLen > 0.001) {
        const hit = spatialGrid.raycast(
          prevX,
          prevY,
          prevZ,
          stepDx / stepLen,
          stepDy / stepLen,
          stepDz / stepLen,
          stepLen,
          0.08,
          (box) => {
            if (box.dynamicDoorId && doors[box.dynamicDoorId]?.openProgress > 0.4) return false;
            return box.category === 'wall' || box.category === 'floor' || box.category === 'door' || box.category === 'prop';
          },
        );
        if (hit) {
          proj.position.x = hit.hitX;
          proj.position.y = hit.hitY;
          proj.position.z = hit.hitZ;
          impacted = true;
        }
      }
    }

    if (impacted) {
      // Splash damage (stink bombs, roof launcher)
      if (proj.splashRadius > 1.2) {
        sounds.push({ type: 'explosion' });
        for (const robber of p3.robbers) {
          if (robber.state === 'arrested' || robber.state === 'stunned') continue;
          const sd = Math.hypot(
            proj.position.x - robber.position.x,
            proj.position.z - robber.position.z,
          );
          if (sd <= proj.splashRadius) {
            damageRobber(p3, robber, proj.damage * 0.85, player, socialFeed, day, sounds);
          }
        }
      }
      p3.fxEvents.push({
        id: `fx_${p3.nextEntitySeq++}`,
        pos: { ...proj.position },
        color: proj.color,
        radius: Math.max(0.45, proj.splashRadius),
        kind: proj.weaponId === 'stink_bomb' ? 'stink' : proj.splashRadius > 1.5 ? 'explosion' : 'splat',
        age: 0,
        maxAge: proj.weaponId === 'stink_bomb' ? 2.4 : 0.65,
      });
      p3.projectiles.splice(i, 1);
    }
  }

  // 3. Step Yard & Roof Defenses (traps, mines, alarm gnomes, roof cannons)
  for (const def of Object.values(p3.defenses)) {
    if (def.cooldownTimer > 0) def.cooldownTimer = Math.max(0, def.cooldownTimer - dt);
    if (!def.armed || def.charges <= 0 || def.cooldownTimer > 0) continue;

    const spec = DEFENSE_SPECS[def.itemId];
    if (!spec || def.itemId === 'def_doghouse') continue;

    if (def.itemId === 'roof_radar') {
      def.turretYaw += dt * 1.4;
      continue;
    }

    // Find nearest active robber inside trigger radius
    let nearest: RobberEntity | null = null;
    let nearestDist = spec.triggerRadius;
    for (const r of p3.robbers) {
      if (r.state === 'arrested' || r.state === 'stunned') continue;
      const d = Math.hypot(r.position.x - def.position.x, r.position.z - def.position.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = r;
      }
    }

    if (!nearest) continue;

    def.turretYaw = Math.atan2(nearest.position.x - def.position.x, nearest.position.z - def.position.z);
    def.cooldownTimer = spec.cooldown;

    if (def.itemId === 'roof_cannon' || def.itemId === 'roof_launcher' || def.itemId === 'def_gnome') {
      const origin: Vec3 = {
        x: def.position.x,
        y: def.position.y + (def.isRoof ? 1.15 : 0.72),
        z: def.position.z,
      };
      const dx = nearest.position.x - origin.x;
      const dy = nearest.position.y + 1.0 - origin.y;
      const dz = nearest.position.z - origin.z;
      const len = Math.max(0.1, Math.hypot(dx, dy, dz));
      const spd = def.itemId === 'roof_launcher' ? 22 : 30;
      p3.projectiles.push({
        id: `proj_${p3.nextEntitySeq++}`,
        ownerId: 'actor_player',
        weaponId:
          def.itemId === 'roof_launcher'
            ? 'roof_launcher'
            : def.itemId === 'roof_cannon'
              ? 'roof_cannon'
              : 'gnome_zap',
        position: origin,
        velocity: {
          x: (dx / len) * spd,
          y: (dy / len) * spd + (def.itemId === 'roof_launcher' ? 4.0 : 0.6),
          z: (dz / len) * spd,
        },
        gravity: def.itemId === 'roof_launcher' ? 11.5 : 4.5,
        damage: spec.damage,
        splashRadius: def.itemId === 'roof_launcher' ? 3.2 : 0.55,
        color: def.itemId === 'def_gnome' ? '#ff4a4a' : '#4ea8de',
        age: 0,
        maxAge: 2.8,
      });
      sounds.push({ type: 'shot' });
    } else {
      // Ground contact trap / driveway mine / electric fence / gate
      damageRobber(p3, nearest, spec.damage, player, socialFeed, day, sounds);
      if (spec.maxCharges < 50) {
        def.charges = Math.max(0, def.charges - 1);
        if (def.charges === 0) def.armed = false;
      }
      sounds.push({ type: def.itemId === 'def_mine_driveway' ? 'explosion' : 'trap' });
      p3.fxEvents.push({
        id: `fx_${p3.nextEntitySeq++}`,
        pos: { x: def.position.x, y: def.position.y + 0.35, z: def.position.z },
        color: def.itemId === 'def_mine_driveway' ? '#f29e38' : '#d6523e',
        radius: def.itemId === 'def_mine_driveway' ? 2.1 : 0.9,
        kind: def.itemId === 'def_mine_driveway' ? 'explosion' : 'spark',
        age: 0,
        maxAge: 0.85,
      });
    }
  }

  // 4. Step Animals (Guard Dog chases & bites robbers; ambient cat/raccoon patrol sidewalks)
  for (const animal of p3.animals) {
    animal.animTime += dt;
    if (animal.barkTimer > 0) animal.barkTimer = Math.max(0, animal.barkTimer - dt);
    if (animal.attackCooldown > 0) animal.attackCooldown = Math.max(0, animal.attackCooldown - dt);

    if (animal.kind === 'guard_dog') {
      let targetRobber: RobberEntity | null = null;
      let bestDist = 19.0;
      for (const r of p3.robbers) {
        if (r.state === 'arrested' || r.state === 'stunned') continue;
        const d = Math.hypot(r.position.x - animal.homePos.x, r.position.z - animal.homePos.z);
        if (d < bestDist) {
          bestDist = d;
          targetRobber = r;
        }
      }

      if (targetRobber) {
        animal.state = 'chase';
        animal.targetId = targetRobber.id;
        const dx = targetRobber.position.x - animal.position.x;
        const dz = targetRobber.position.z - animal.position.z;
        const dist = Math.hypot(dx, dz);
        animal.yaw = Math.atan2(-dx, -dz);
        if (dist > 1.05) {
          animal.position.x += (dx / dist) * animal.speed * dt;
          animal.position.z += (dz / dist) * animal.speed * dt;
        } else if (animal.attackCooldown <= 0) {
          animal.state = 'bite';
          animal.attackCooldown = 1.1;
          animal.barkTimer = 0.7;
          sounds.push({ type: 'bark' });
          damageRobber(p3, targetRobber, 26, player, socialFeed, day, sounds);
          p3.fxEvents.push({
            id: `fx_${p3.nextEntitySeq++}`,
            pos: { x: animal.position.x, y: animal.position.y + 0.7, z: animal.position.z },
            color: '#f2c14e',
            radius: 0.65,
            kind: 'bark',
            age: 0,
            maxAge: 0.45,
          });
        }
      } else {
        animal.state = 'patrol';
        animal.targetId = null;
        const dx = animal.waypoint.x - animal.position.x;
        const dz = animal.waypoint.z - animal.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.6) {
          const angle = rng.next() * Math.PI * 2;
          const r = 1.8 + rng.next() * 4.2;
          animal.waypoint = {
            x: animal.homePos.x + Math.cos(angle) * r,
            y: animal.homePos.y,
            z: animal.homePos.z + Math.sin(angle) * r,
          };
        } else {
          animal.yaw = Math.atan2(-dx, -dz);
          animal.position.x += (dx / dist) * 2.1 * dt;
          animal.position.z += (dz / dist) * 2.1 * dt;
        }
      }
    } else {
      // Stray Cat & Raccoon gentle neighborhood wander
      const dx = animal.waypoint.x - animal.position.x;
      const dz = animal.waypoint.z - animal.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.5) {
        const offsetX = (rng.next() - 0.5) * 22;
        animal.waypoint = {
          x: animal.homePos.x + offsetX,
          y: animal.homePos.y,
          z: animal.homePos.z + (rng.next() - 0.5) * 1.4,
        };
      } else {
        animal.yaw = Math.atan2(-dx, -dz);
        animal.position.x += (dx / dist) * animal.speed * 0.55 * dt;
        animal.position.z += (dz / dist) * animal.speed * 0.55 * dt;
      }
    }
  }

  // 5. Step Robbers
  for (let i = p3.robbers.length - 1; i >= 0; i--) {
    const r = p3.robbers[i];
    r.animTime += dt;
    if (r.hurtTimer > 0) r.hurtTimer = Math.max(0, r.hurtTimer - dt);

    if (r.state === 'stunned' || r.state === 'arrested') {
      r.stunTimer -= dt;
      if (r.stunTimer <= 0) {
        p3.robbers.splice(i, 1);
      }
      continue;
    }

    if (r.state === 'approaching') {
      const dx = r.targetPoint.x - r.position.x;
      const dz = r.targetPoint.z - r.position.z;
      const dist = Math.hypot(dx, dz);
      r.yaw = Math.atan2(-dx, -dz);
      if (dist > 1.2) {
        const spd = r.archetype === 'roof_ninja' ? 3.3 : 2.6;
        r.position.x += (dx / dist) * spd * dt;
        r.position.z += (dz / dist) * spd * dt;
      } else {
        r.state = 'breaking_in';
        r.breakProgress = 0;
      }
    } else if (r.state === 'breaking_in') {
      const door = r.targetDoorId ? doors[r.targetDoorId] : null;
      const barricadedCount = Object.values(windows).filter(
        (w) => w.houseId === r.targetHouseId && w.isBarricaded,
      ).length;
      // Locked doors & barricaded windows significantly slow break-ins!
      const lockFactor = door?.isLocked ? 0.35 : 1.0;
      const barFactor = barricadedCount >= 2 ? 0.65 : 1.0;
      r.breakProgress += dt * 0.22 * lockFactor * barFactor;

      if (r.breakProgress >= 1.0) {
        if (door && door.isLocked) {
          door.isLocked = false;
          door.damageState = 'cracked';
        }
        r.state = 'looting';
        r.breakProgress = 0;
        sounds.push({ type: 'alert' });
      }
    } else if (r.state === 'looting') {
      r.breakProgress += dt * 0.45;
      if (r.breakProgress >= 1.0) {
        const stealAmt = Math.min(40, Math.max(0, Math.floor(player.money)));
        if (stealAmt > 0) {
          player.money -= stealAmt;
          r.stolenCash = stealAmt;
        }
        r.state = 'fleeing';
        r.targetPoint = { x: r.position.x + 58, y: 0.14, z: 6.2 };
        p3.raidBannerKey = 'phase3.banner.cashStolen';
        p3.raidBannerTimer = 5.0;
        pushSocialPost(socialFeed, p3, 'watch_admin', 'feed.post.robberLooted', day, 9);
      }
    } else if (r.state === 'fleeing') {
      const dx = r.targetPoint.x - r.position.x;
      const dz = r.targetPoint.z - r.position.z;
      const dist = Math.hypot(dx, dz);
      r.yaw = Math.atan2(-dx, -dz);
      if (dist < 2.0) {
        p3.robbers.splice(i, 1);
      } else {
        r.position.x += (dx / dist) * 4.2 * dt;
        r.position.z += (dz / dist) * 4.2 * dt;
      }
    }
  }

  // 6. Step 911 Police Patrol Cruiser & Officer
  const pol = p3.police;
  if (pol.status !== 'idle') {
    pol.sirenPhase += dt * 9.0;
  }

  if (pol.status === 'en_route') {
    const dx = pol.targetX - pol.cruiserPos.x;
    if (Math.abs(dx) <= 0.6) {
      pol.cruiserPos.x = pol.targetX;
      pol.status = 'on_scene';
      pol.timer = 9.0;
      pol.officerActive = true;
      pol.officerPos = { x: pol.cruiserPos.x - 1.2, y: 0.14, z: 5.5 };
      p3.raidBannerKey = 'phase3.banner.policeOnScene';
      p3.raidBannerTimer = 5.0;
      sounds.push({ type: 'siren' });
    } else {
      pol.cruiserPos.x += Math.sign(dx) * 16.5 * dt;
    }
  } else if (pol.status === 'on_scene') {
    pol.timer -= dt;
    // Officer arrests any active/stunned robbers cleanly
    const activeRobber = p3.robbers.find((r) => r.state !== 'arrested');
    if (activeRobber) {
      const dx = activeRobber.position.x - pol.officerPos.x;
      const dz = activeRobber.position.z - pol.officerPos.z;
      const dist = Math.hypot(dx, dz);
      pol.officerYaw = Math.atan2(-dx, -dz);
      if (dist > 1.8) {
        pol.officerPos.x += (dx / dist) * 5.2 * dt;
        pol.officerPos.z += (dz / dist) * 5.2 * dt;
      } else {
        if (activeRobber.stolenCash > 0) {
          player.money += activeRobber.stolenCash;
          activeRobber.stolenCash = 0;
        }
        activeRobber.state = 'arrested';
        activeRobber.stunTimer = 2.5;
        pol.arrestsThisCall += 1;
        player.money += 60;
        p3.totalRobbersFoiled += 1;
        advanceMission(p3, 'mission_foil_robber', 1);
        sounds.push({ type: 'cash' });
        pushSocialPost(socialFeed, p3, 'police_dept', 'feed.post.policeArrest', day, 26);
      }
    }

    if (pol.timer <= 0) {
      if (pol.wasFalseAlarm && pol.arrestsThisCall === 0) {
        const fine = Math.min(25, Math.floor(player.money));
        player.money -= fine;
        p3.raidBannerKey = 'phase3.banner.falseAlarmFine';
        p3.raidBannerTimer = 4.5;
        pushSocialPost(socialFeed, p3, 'police_dept', 'feed.post.falseAlarm', day, 12);
      }
      pol.officerActive = false;
      pol.status = 'departing';
    }
  } else if (pol.status === 'departing') {
    pol.cruiserPos.x += 17.5 * dt;
    if (pol.cruiserPos.x > pol.targetX + 68) {
      pol.status = 'idle';
      pol.cooldown = 18.0;
    }
  }

  // 7. Age & prune FX bursts
  for (let i = p3.fxEvents.length - 1; i >= 0; i--) {
    p3.fxEvents[i].age += dt;
    if (p3.fxEvents[i].age >= p3.fxEvents[i].maxAge) {
      p3.fxEvents.splice(i, 1);
    }
  }

  return sounds;
}

export function serializePhase3State(p3: Phase3State): SerializedPhase3State {
  const defenses: Record<string, DefenseBuildState> = {};
  for (const [k, v] of Object.entries(p3.defenses)) {
    defenses[k] = { ...v, position: { ...v.position } };
  }
  return {
    activeWeapon: p3.activeWeapon,
    ownedWeapons: [...p3.ownedWeapons],
    ammo: { ...p3.ammo },
    defenseKits: { ...p3.defenseKits },
    defenses,
    missions: p3.missions.map((m) => ({ ...m })),
    lastRaidDay: p3.lastRaidDay,
    totalRobbersFoiled: p3.totalRobbersFoiled,
    totalGaryHits: p3.totalGaryHits,
  };
}

export function hydratePhase3State(
  p3: Phase3State,
  saved: SerializedPhase3State | undefined,
  yardSlots: Record<string, YardSlotEntity>,
): void {
  if (!saved) return;
  p3.activeWeapon = saved.activeWeapon ?? 'slingshot';
  p3.ownedWeapons =
    Array.isArray(saved.ownedWeapons) && saved.ownedWeapons.length > 0
      ? [...saved.ownedWeapons]
      : ['wrench', 'slingshot'];
  p3.ammo = { ...p3.ammo, ...(saved.ammo ?? {}) };
  p3.defenseKits = { ...(saved.defenseKits ?? {}) };
  p3.lastRaidDay = saved.lastRaidDay ?? 0;
  p3.totalRobbersFoiled = saved.totalRobbersFoiled ?? 0;
  p3.totalGaryHits = saved.totalGaryHits ?? 0;

  if (Array.isArray(saved.missions) && saved.missions.length > 0) {
    for (const savedM of saved.missions) {
      const target = p3.missions.find((m) => m.id === savedM.id);
      if (target) {
        target.progress = savedM.progress;
        target.completed = savedM.completed;
        target.claimed = savedM.claimed;
      }
    }
  }

  p3.defenses = {};
  for (const [slotId, def] of Object.entries(saved.defenses ?? {})) {
    p3.defenses[slotId] = { ...def, position: { ...def.position } };
    if (yardSlots[slotId]) {
      yardSlots[slotId].occupiedItemId = def.itemId;
    }
    if (p3.roofPads[slotId]) {
      p3.roofPads[slotId].occupiedItemId = def.itemId;
    }
    if (def.itemId === 'def_doghouse') {
      ensureGuardDogForHouse(p3, p3.defenses[slotId]);
    }
  }
}
