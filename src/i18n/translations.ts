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
  'menu.controlsHint': 'WASD / ZQSD Move · Mouse Look · E Interact · C Camera · Space Jump · Shift Run · F3 Debug · Esc Pause',

  // HUD
  'hud.day': 'DAY {day}',
  'hud.health': 'HP',
  'hud.cash': 'CASH',
  'hud.stamina': 'STAMINA',
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

  // House Archetypes
  'house.brick_colonial': 'Brick Colonial',
  'house.craftsman_clapboard': 'Craftsman Clapboard',
  'house.stucco_modern': 'Suburban Stucco',

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
  'interact.exitShelter': 'Climb Up to Garage',
  'interact.climbHint': '[W / S] Climb Rungs · [E / Space] Dismount',
  'interact.inspectSlot': 'Yard Slot: {name} (Phase 3)',
  'interact.inspectTunnel': 'Tunnel Hatch (Phase 2)',
  'interact.state.locked': 'Locked',
  'interact.state.barricaded': 'Barricaded',
  'interact.state.cracked': 'Cracked',
  'interact.state.broken': 'Broken',

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
