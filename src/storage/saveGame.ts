/**
 * Local persistence for compact JSON GameState saves.
 * Stored strictly separately from LocalSettings (`nw_local_settings_v1`).
 */

import type { SerializedGameState } from '../simulation/types';
import { SAVE_VERSION } from '../simulation/simulation';

const SAVE_STORAGE_KEY = 'nw_save_slot_v1';

export function hasSavedGame(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(SAVE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveGameToStorage(state: SerializedGameState): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGameFromStorage(): SerializedGameState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SerializedGameState;
    if (
      !parsed ||
      (parsed.version !== SAVE_VERSION && parsed.version !== 3 && parsed.version !== 2) ||
      typeof parsed.seed !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
