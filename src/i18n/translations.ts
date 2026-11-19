/**
 * Localization system for Neighborhood Wars.
 * All visible text goes through `t(key, params)` so French and Arabic (RTL)
 * can be added in future phases without touching UI components or data tables.
 */

export type LanguageCode = 'en';

export interface LocaleMeta {
  code: LanguageCode;
  label: string;
  dir: 'ltr' | 'rtl';
}

export const LOCALES: Record<LanguageCode, LocaleMeta> = {
  en: { code: 'en', label: 'English', dir: 'ltr' },
};

const EN_STRINGS: Record<string, string> = {
  // Game Title & Shell
  'game.title': 'NEIGHBORHOOD WARS',
  'game.subtitle': 'Suburban Feud & Survival',
  'menu.play': 'PLAY',
  'menu.newGame': 'NEW NEIGHBORHOOD',
  'menu.continue': 'CONTINUE',
  'menu.settings': 'SETTINGS',
  'menu.resume': 'RESUME',
  'menu.save': 'SAVE GAME',
  'menu.load': 'LOAD SAVE',
  'menu.backToTitle': 'MAIN MENU',
  'menu.close': 'CLOSE',
  'menu.paused': 'PAUSED',
  'menu.controlsHint': 'WASD / ZQSD Move · Mouse Look · E Interact · F / Click Fire/Dig · P Phone · C Camera · Space Jump · Shift Run · F3 Debug',

  // HUD
  'hud.day': 'DAY {day}',
  'hud.health': 'HP',
  'hud.cash': 'CASH',
  'hud.stamina': 'STAMINA',
  'hud.oxygen': 'O₂ AIR',
  'hud.caveInWarning': 'CAVE-IN RISK — BRACE WITH TIMBER [2]',
  'hud.flooded': 'FLOODED TUNNEL — PUMP WATER [5]',
  'hud.lowAir': 'LOW OXYGEN — INSTALL VENT DUCT [4]',
  'hud.camera.third': '3RD PERSON',
  'hud.camera.first': '1ST PERSON',
  'hud.clickToLook': 'Click view to lock mouse · Drag to look',
  'hud.savedToast': 'Game Saved',
  'hud.loadedToast': 'Save Loaded',
  'hud.noSave': 'No Saved Game',
  'hud.timeSpeed': 'TIME',
  'hud.climbingHint': '[W / S] Climb · [E / Space] Dismount',

  // F3 Debug Overlay (hidden unless F3 is toggled)
  'debug.title': 'DEBUG OVERLAY [F3]',
  'debug.walkabilityPass': 'WALKABILITY PASS ({passed}/{total})',
  'debug.walkabilityFail': 'WALKABILITY FAIL ({issues} issues)',
  'debug.cameraBlocked': 'PULL-IN',
  'debug.cameraClear': 'CLEAR',
  'debug.legend': 'Amber: Wall · Blue: Slab · Red/Grn: Door · Pink: Furn · Cyan: Headroom · Yellow: Ramp',

  // Locations & Zones
  'zone.street': 'Maple Crescent',
  'zone.yard': 'Your Yard',
  'zone.neighborYard': "Neighbor's Yard",
  'zone.groundFloor': 'Ground Floor',
  'zone.secondFloor': 'Second Floor',
  'zone.roofDeck': 'Roof Deck',
  'zone.shelter': 'Underground Shelter',
  'zone.tunnel': 'Underground Tunnel',
  'zone.tunnelDeep': 'Deep Stratum Tunnel',
  'zone.livingRoom': 'Living Room',
  'zone.kitchen': 'Kitchen',
  'zone.hallway': 'Hallway',
  'zone.den': 'Den / Dining',
  'zone.utility': 'Utility Room',
  'zone.garage': 'Garage',
  'zone.bedroom': 'Master Bedroom',
  'zone.bedroom2': 'Bedroom 2',
  'zone.bedroom3': 'Bedroom 3',
  'zone.bathroom': 'Bathroom',
  'zone.balcony': 'Balcony',
  'zone.sunroom': 'Sunroom',
  'zone.studio': 'Home Studio',
  'zone.diningRoom': 'Dining Room',
  'zone.foyer': 'Grand Foyer',

  // House Archetypes (8 Distinct Styles)
  'house.brick_colonial': 'Brick Colonial',
  'house.craftsman_clapboard': 'Craftsman Bungalow',
  'house.stucco_modern': 'Cantilever Modern',
  'house.tudor_manor': 'Tudor Timber Manor',
  'house.farmhouse_wrap': 'Modern Farmhouse',
  'house.mediterranean_villa': 'Mediterranean Villa',
  'house.nordic_gable': 'Nordic Cedar House',
  'house.industrial_loft': 'Brick & Steel Loft',

  // Interactables & States
  'interact.openDoor': 'Open {name}',
  'interact.closeDoor': 'Close {name}',
  'interact.unlockDoor': 'Unlock {name}',
  'interact.lockHint': '[R] Lock / Unlock',
  'interact.openWindow': 'Open {name}',
  'interact.closeWindow': 'Close {name}',
  'interact.barricadeHint': '[B] Barricade',
  'interact.unbarricadeHint': '[B] Remove Barricade',
  'interact.climbRoof': 'Climb to Roof Deck',
  'interact.descendYard': 'Climb Down to Yard',
  'interact.enterShelter': 'Open Hatch & Climb Down',
  'interact.climbShelterDown': 'Climb Down to Shelter',
  'interact.exitShelter': 'Climb Up to Garage',
  'interact.openAndExitShelter': 'Open Hatch & Climb Up',
  'interact.openHatchHint': '[R] Open Hatch Only',
  'interact.closeHatchHint': '[R] Close Hatch',
  'interact.climbSurfaceHatch': 'Climb Out to Yard',
  'interact.climbTunnelUp': 'Climb Up Tunnel Shaft',
  'interact.climbTunnelDown': 'Climb Down Tunnel Shaft',
  'interact.climbHint': '[W / S] Climb Rungs · [E / Space] Dismount',
  'interact.inspectSlot': 'Yard Slot: {name}',
  'interact.buildSlot': 'Build {name} (${cost})',
  'interact.placeKitSlot': 'Install {name} Kit',
  'interact.rearmSlot': 'Re-Arm {name} (${cost})',
  'interact.slotActive': '{name} Active',
  'interact.phoneShopHint': '[P] Open Phone Shop for Kits & Weapons',
  'interact.inspectTunnel': 'Tunnel Bulkhead',
  'interact.state.locked': 'Locked',
  'interact.state.barricaded': 'Barricaded',
  'interact.state.cracked': 'Cracked',
  'interact.state.broken': 'Broken',
  'interact.state.armed': 'Armed',
  'interact.state.spent': 'Disarmed',

  // Door & Window Labels
  'door.front': 'Front Door',
  'door.back': 'Back Door',
  'door.garage': 'Garage Door',
  'door.garageInt': 'Garage Interior Door',
  'door.roof': 'Roof Door',
  'door.balcony': 'Balcony Door',
  'door.bedroom': 'Bedroom Door',
  'door.bathroom': 'Bathroom Door',
  'door.interior': 'Interior Door',
  'door.tunnelBulkhead': 'Tunnel Bulkhead Door',
  'window.living': 'Living Room Window',
  'window.kitchen': 'Kitchen Window',
  'window.bedroom': 'Bedroom Window',
  'window.side': 'Side Window',

  // Yard Slots
  'slot.trap_front': 'Front Lawn Trap',
  'slot.mine_driveway': 'Driveway Mine',
  'slot.doghouse': 'Doghouse Pad',
  'slot.gnome': 'Lawn Gnome Pedestal',
  'slot.fence': 'Perimeter Fence',
  'slot.gate': 'Front Gate',

  // Characters
  'actor.player': 'You',
  'actor.neighbor': 'Gary (Neighbor)',

  // Settings
  'settings.title': 'SETTINGS',
  'settings.cameraMode': 'Camera Mode',
  'settings.quality': 'Graphics Quality',
  'settings.quality.low': 'Low',
  'settings.quality.medium': 'Medium',
  'settings.quality.high': 'High',
  'settings.reducedGore': 'Reduced Gore',
  'settings.reducedGoreDesc': 'Softens impact visuals and blood effects',
  'settings.audioMuted': 'Mute Audio',
  'settings.volume': 'Master Volume',
  'settings.mouseSensitivity': 'Look Sensitivity',
  'settings.touchControls': 'Touch Controls',
  'settings.touch.auto': 'Auto',
  'settings.touch.on': 'Always On',
  'settings.touch.off': 'Off',
  'settings.language': 'Language',
  'settings.on': 'ON',
  'settings.off': 'OFF',

  // Buttons & Accessibility
  'aria.toggleCamera': 'Toggle Camera View',
  'aria.quickSave': 'Quick Save Game',
  'aria.toggleMute': 'Toggle Sound Mute',
  'aria.pauseGame': 'Pause Game',
  'aria.jump': 'Jump',
  'aria.interact': 'Interact',
  'aria.sprint': 'Run',
  'aria.lock': 'Lock or Barricade',
  'aria.timeForward': 'Advance Time by 2 Hours',
  'aria.dig': 'Use Tunnel Tool',
  'aria.cycleTool': 'Next Tunnel Tool',

  // Phase 2 Equipment Tools & Soil Strata
  'tool.shovel': 'Shovel',
  'tool.timber': 'Timber Prop',
  'tool.lantern': 'Work Lantern',
  'tool.vent': 'Vent Duct',
  'tool.pump': 'Sump Pump',

  'soil.topsoil': 'Topsoil',
  'soil.clay': 'Dense Clay',
  'soil.rock': 'Bedrock',
  'soil.water': 'Water Pocket',

  'tunnel.action.dig': 'Dig {soil} ({hits}/{max})',
  'tunnel.action.digSurface': 'Dig Surface Hatch ({hits}/{max})',
  'tunnel.action.digDeep': 'Dig Deep Shaft ({hits}/{max})',
  'tunnel.action.support': 'Brace Timber Prop (${cost})',
  'tunnel.action.light': 'Hang Work Lantern (${cost})',
  'tunnel.action.vent': 'Install Vent Duct (${cost})',
  'tunnel.action.drain': 'Pump Out Water (${cost})',

  'tunnel.err.boundary': 'Outside neighborhood dig perimeter',
  'tunnel.err.concrete': 'Solid bunker foundation concrete',
  'tunnel.err.blockedAbove': 'Paved road or structure overhead',
  'tunnel.err.openBulkhead': 'Open Tunnel Bulkhead Door first [E]',
  'tunnel.err.alreadyInstalled': 'Already installed here',
  'tunnel.err.noCash': 'Need ${cost}',

  // Phase 3 Weapons & Combat
  'weapon.wrench': 'Pipe Wrench',
  'weapon.wrench.desc': 'Heavy close-range melee tool. Never runs out.',
  'weapon.slingshot': 'Slingshot',
  'weapon.slingshot.desc': 'Reliable suburban launcher for pelting robbers or pranking Gary.',
  'weapon.paintball': 'Paintball Marker',
  'weapon.paintball.desc': 'High-velocity marker with rapid fire and bright splat tags.',
  'weapon.water_blaster': 'Hydro Blaster',
  'weapon.water_blaster.desc': 'Fast pressurized stream that drives intruders off the lawn.',
  'weapon.stink_bomb': 'Stink Bombs',
  'weapon.stink_bomb.desc': 'Lobbed area-of-effect cloud that stuns whole burglar crews.',

  // Phase 3 Yard & Roof Defenses
  'defense.trap_front': 'Spring Lawn Trap',
  'defense.trap_front.desc': 'Snaps shut on trespassers approaching the front walk (2 charges).',
  'defense.mine_driveway': 'Paint Proximity Mine',
  'defense.mine_driveway.desc': 'High-impact driveway blast mine with wide stun radius.',
  'defense.doghouse': 'Guard Doghouse',
  'defense.doghouse.desc': 'Adopts Buster, a loyal guard dog who patrols and bites robbers.',
  'defense.gnome': 'Laser Alarm Gnome',
  'defense.gnome.desc': 'Ceramic garden sentry that zaps intruders at medium range.',
  'defense.fence': 'Shock Perimeter Fence',
  'defense.fence.desc': 'Reinforced yard deterrent that jolts prowlers.',
  'defense.gate': 'Auto Security Gate',
  'defense.gate.desc': 'Motorized entry gate with intrusion deterrent.',
  'defense.roof_cannon': 'Roof Auto-Cannon',
  'defense.roof_cannon.desc': 'Roof-mounted turret tracking street & lawn intruders automatically.',
  'defense.roof_radar': 'Suburban Radar Dish',
  'defense.roof_radar.desc': 'Rotating perimeter scanner providing early neighborhood watch.',
  'defense.roof_launcher': 'Roof Paint Mortar',
  'defense.roof_launcher.desc': 'Long-range splash launcher defending the entire lot from above.',

  // Phase 3 Shop Items
  'shop.ammo.slingshot': 'Slingshot Pellets (x18)',
  'shop.ammo.slingshot.desc': 'Bag of 18 steel bearings for your slingshot.',
  'shop.ammo.paintball': 'Paintball Hopper (x24)',
  'shop.ammo.paintball.desc': '24 high-vis neon paintballs.',
  'shop.ammo.water_blaster': 'Hydro Cartridges (x30)',
  'shop.ammo.water_blaster.desc': 'Pressurized refill canisters for the Hydro Blaster.',
  'shop.ammo.stink_bomb': 'Stink Bomb 6-Pack',
  'shop.ammo.stink_bomb.desc': '6 sulfur stink capsules for crowd control.',
  'shop.medkit': 'First-Aid Kit (+50 HP)',
  'shop.medkit.desc': 'Bandages and ice pack to patch up right away.',

  // Phase 3 Smartphone UI
  'phone.title': 'SUBURB-OS',
  'phone.tab.shop': 'Shop',
  'phone.tab.security': '911',
  'phone.tab.missions': 'Missions',
  'phone.tab.feed': 'Feed',
  'phone.shop.weapons': 'Weapons',
  'phone.shop.ammo': 'Ammo & Supplies',
  'phone.shop.defenses': 'Yard & Roof Kits',
  'phone.shop.buy': 'Buy ${price}',
  'phone.shop.owned': 'Owned',
  'phone.shop.equip': 'Equip',
  'phone.shop.equipped': 'Equipped',
  'phone.shop.kitsOwned': '{count} in pack',
  'phone.security.heading': 'Home Security & 911',
  'phone.security.doorsLocked': 'Doors Locked',
  'phone.security.windowsBarricaded': 'Windows Barricaded',
  'phone.security.defensesActive': 'Defenses Armed',
  'phone.security.guardDog': 'Guard Dog',
  'phone.security.guardDogReady': 'Buster on Patrol',
  'phone.security.guardDogNone': 'No Doghouse',
  'phone.security.intruders': 'Active Intruders',
  'phone.security.call911': 'CALL 911 DISPATCH',
  'phone.security.policeEnRoute': 'Cruiser En Route',
  'phone.security.policeOnScene': 'Officer On Scene',
  'phone.security.policeDeparting': 'Cruiser Clearing',
  'phone.security.policeCooldown': 'Dispatch Ready in {sec}s',
  'phone.security.falseAlarmNote': 'Calling 911 without active intruders carries a $25 false-alarm fine.',
  'phone.security.triggerRaid': 'Simulate Night Raid Drill',
  'phone.missions.heading': 'Neighborhood Bounties',
  'phone.missions.claim': 'Claim +${reward}',
  'phone.missions.claimed': 'Claimed',
  'phone.missions.inProgress': '{progress}/{goal}',
  'phone.feed.heading': 'NextBlock Live',
  'phone.feed.snapPhoto': 'Snap & Post Street Photo',
  'phone.feed.dayLabel': 'Day {day}',
  'phone.feed.likes': '{count} likes',
  'phone.author.actor_player': 'You (#42 Maple)',
  'phone.author.actor_neighbor_1': 'Gary (Across St.)',
  'phone.author.watch_admin': 'Maple Watch HOA',
  'phone.author.police_dept': 'Maple Crescent PD',

  // Missions
  'mission.buy_gear.title': 'Hardware Run',
  'mission.buy_gear.desc': 'Order any weapon, ammo pack, or defense kit from the Phone Shop.',
  'mission.build_defense.title': 'Fortify the Lawn',
  'mission.build_defense.desc': 'Build a defense on any yard slot or roof pad [E].',
  'mission.adopt_dog.title': 'Best Friend on Patrol',
  'mission.adopt_dog.desc': 'Build the Guard Doghouse in your yard to adopt Buster.',
  'mission.foil_robber.title': 'Neighborhood Defender',
  'mission.foil_robber.desc': 'Stop a nighttime burglar via weapons, traps, Buster, or 911.',
  'mission.prank_gary.title': 'Across-the-Street Feud',
  'mission.prank_gary.desc': 'Tag rival neighbor Gary with a slingshot or paintball shot.',
  'mission.post_photo.title': 'Viral Watch Post',
  'mission.post_photo.desc': 'Post a live neighborhood photo on the NextBlock app.',

  // NextBlock Posts
  'feed.post.garyWelcome': '"Keep your leaves off my driveway or I am calling the HOA again."',
  'feed.post.watchAlert': 'Night prowlers spotted near Maple Crescent. Lock doors, barricade windows, or call 911!',
  'feed.post.called911Raid': 'Emergency 911 call placed — suspicious prowlers caught on my lawn!',
  'feed.post.called911Quiet': 'Requested a Maple PD patrol check on our block.',
  'feed.post.garyPranked': '"WHO JUST PELTED ME FROM ACROSS THE STREET?! My jacket is ruined!"',
  'feed.post.robberFoiled': 'Just chased a nighttime burglar straight off Maple Crescent! Block stays safe.',
  'feed.post.robberLooted': 'Burglary report logged on Maple Crescent. Secure doors and install yard traps!',
  'feed.post.policeArrest': 'Maple PD arrested a prowler on scene. Neighborhood Watch bounty awarded.',
  'feed.post.falseAlarm': 'Maple PD cleared a false alarm call ($25 dispatch citation issued).',
  'feed.post.photoRobber': 'Caught a prowler sneaking through the yard on camera! #MapleWatch',
  'feed.post.photoPolice': 'Maple PD cruiser with lights flashing right outside the house!',
  'feed.post.photoFortress': 'Check out the upgraded lawn defenses — good luck getting past this.',
  'feed.post.photoStreet': 'Quiet patrol check down Maple Crescent today.',

  // Phase 3 Banners & Toasts
  'phase3.banner.raidAlert': 'INTRUDER ALERT — ROBBER ON MAPLE CRESCENT! DEFEND OR CALL 911 [P]',
  'phase3.banner.policeEnRoute': '911 DISPATCH — PATROL CRUISER EN ROUTE TO YOUR HOUSE',
  'phase3.banner.policeOnScene': 'MAPLE PD ON SCENE — OFFICER SWEEPING PROPERTY',
  'phase3.banner.robberFoiled': 'INTRUDER STOPPED! BOUNTY COLLECTED',
  'phase3.banner.cashStolen': 'BURGLAR ESCAPED WITH CASH — LOCK DOORS & BUILD TRAPS!',
  'phase3.banner.falseAlarmFine': 'FALSE ALARM — $25 POLICE CITATION ISSUED',
  'phase3.toast.noCash': 'Need ${cost}',
  'phase3.toast.alreadyOwned': 'Already owned',
  'phase3.toast.purchased': 'Delivered to gear bar',
  'phase3.toast.needWeaponFirst': 'Buy weapon first',
  'phase3.toast.ammoBought': 'Ammo restocked',
  'phase3.toast.kitBought': 'Defense kit packed',
  'phase3.toast.fullHealth': 'Health already full',
  'phase3.toast.healed': 'Patched up (+50 HP)',
  'phase3.toast.alreadyArmed': 'Defense already armed',
  'phase3.toast.rearmed': 'Defense re-armed',
  'phase3.toast.built': 'Defense installed',
  'phase3.toast.dogAdopted': 'Buster the Guard Dog moved in!',
  'phase3.toast.outOfAmmo': 'Out of ammo — open Phone Shop [P]',
  'phase3.toast.policeBusy': 'Patrol already active',
  'phase3.toast.policeCooldown': '911 ready in {sec}s',
  'phase3.toast.policeDispatched': '911 Patrol Dispatched!',
  'phase3.toast.photoCooldown': 'Camera cooling down',
  'phase3.toast.photoPosted': 'Posted to NextBlock (+${cash})',
  'phase3.toast.missionClaimed': 'Bounty claimed (+${cash})',
  'phase3.toast.raidStarted': 'Night intruders spotted on Maple Crescent!',
  'aria.openPhone': 'Open Smartphone',
  'aria.fireWeapon': 'Fire Weapon',
};

const DICTIONARIES: Record<LanguageCode, Record<string, string>> = {
  en: EN_STRINGS,
};

let activeLanguage: LanguageCode = 'en';

export function setLanguage(lang: LanguageCode): void {
  activeLanguage = lang;
  if (typeof document !== 'undefined') {
    document.documentElement.dir = LOCALES[lang].dir;
    document.documentElement.lang = lang;
  }
}

export function getLanguage(): LanguageCode {
  return activeLanguage;
}

export function t(
  key: string,
  params?: Record<string, string | number>,
  lang: LanguageCode = activeLanguage,
): string {
  const dict = DICTIONARIES[lang] ?? EN_STRINGS;
  let value = dict[key] ?? EN_STRINGS[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replaceAll(`{${k}}`, String(v));
    }
  }
  return value;
}
