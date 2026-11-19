/**
 * Local user settings stored separately from game state.
 * Camera mode, quality, reduced gore, audio, sensitivity, and language live here.
 */

import type { LanguageCode } from '../i18n/translations';

export type CameraMode = 'third' | 'first';
export type QualityPreset = 'low' | 'medium' | 'high';
export type TouchControlMode = 'auto' | 'on' | 'off';

export interface LocalSettings {
  cameraMode: CameraMode;
  language: LanguageCode;
  reducedGore: boolean;
  quality: QualityPreset;
  audioMuted: boolean;
  masterVolume: number; // 0..1
  mouseSensitivity: number; // 0.3..2.0
  touchControls: TouchControlMode;
}

const SETTINGS_STORAGE_KEY = 'nw_local_settings_v1';

export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  cameraMode: 'third',
  language: 'en',
  reducedGore: false,
  quality: 'medium',
  audioMuted: false,
  masterVolume: 0.7,
  mouseSensitivity: 1.0,
  touchControls: 'auto',
};

export function loadLocalSettings(): LocalSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_LOCAL_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LOCAL_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<LocalSettings>;
    return {
      cameraMode: parsed.cameraMode === 'first' ? 'first' : 'third',
      language: parsed.language === 'en' ? 'en' : 'en',
      reducedGore: Boolean(parsed.reducedGore),
      quality:
        parsed.quality === 'low' || parsed.quality === 'medium' || parsed.quality === 'high'
          ? parsed.quality
          : 'medium',
      audioMuted: Boolean(parsed.audioMuted),
      masterVolume:
        typeof parsed.masterVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.masterVolume))
          : DEFAULT_LOCAL_SETTINGS.masterVolume,
      mouseSensitivity:
        typeof parsed.mouseSensitivity === 'number'
          ? Math.max(0.3, Math.min(2.0, parsed.mouseSensitivity))
          : DEFAULT_LOCAL_SETTINGS.mouseSensitivity,
      touchControls:
        parsed.touchControls === 'on' || parsed.touchControls === 'off'
          ? parsed.touchControls
          : 'auto',
    };
  } catch {
    return { ...DEFAULT_LOCAL_SETTINGS };
  }
}

export function saveLocalSettings(settings: LocalSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage quota or private browsing restriction; keep in-memory state.
  }
}
