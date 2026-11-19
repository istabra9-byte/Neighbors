/**
 * Pause and Local Settings modal.
 * Solid/rgba weathered suburban slate card (no backdrop-filter over WebGL),
 * flexible RTL-safe layout with extra space for longer French/Arabic labels.
 */

import { t } from '../i18n/translations';
import type {
  CameraMode,
  LocalSettings,
  QualityPreset,
  TouchControlMode,
} from '../storage/localSettings';

interface PauseAndSettingsModalProps {
  mode: 'pause' | 'settings';
  fromTitle: boolean;
  hasSave: boolean;
  settings: LocalSettings;
  onUpdateSettings: (patch: Partial<LocalSettings>) => void;
  onResume: () => void;
  onSaveGame: () => void;
  onLoadGame: () => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onReturnToTitle: () => void;
}

export function PauseAndSettingsModal({
  mode,
  fromTitle,
  hasSave,
  settings,
  onUpdateSettings,
  onResume,
  onSaveGame,
  onLoadGame,
  onOpenSettings,
  onCloseSettings,
  onReturnToTitle,
}: PauseAndSettingsModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 bg-[#0d1014b8] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'pause' ? t('menu.paused') : t('settings.title')}
    >
      <div className="w-full max-w-md bg-[#1d2228] border-2 border-[#7b7365] shadow-[0_8px_0_rgba(0,0,0,0.65)] p-5 sm:p-6 text-[#ece6da]">
        {mode === 'pause' ? (
          <>
            <div className="border-b border-[#3a4046] pb-3 mb-4 flex items-center justify-between">
              <h2 className="font-display font-extrabold text-2xl tracking-wider uppercase text-[#f2eadc]">
                {t('menu.paused')}
              </h2>
              <span className="font-mono-hud text-xs text-[#9c968b]">ESC</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="w-full py-3 px-5 bg-[#c67134] hover:bg-[#d67e3e] text-[#16181b] font-display font-extrabold text-lg tracking-wider uppercase border-2 border-[#e9c89f] cursor-pointer text-start"
              >
                {t('menu.resume')}
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onSaveGame}
                  className="py-2.5 px-4 bg-[#272e35] hover:bg-[#323b44] text-[#ece6da] font-display font-bold text-base tracking-wider uppercase border border-[#5c5a54] cursor-pointer"
                >
                  {t('menu.save')}
                </button>
                <button
                  type="button"
                  disabled={!hasSave}
                  onClick={onLoadGame}
                  className="py-2.5 px-4 bg-[#272e35] hover:bg-[#323b44] disabled:opacity-45 disabled:cursor-not-allowed text-[#ece6da] font-display font-bold text-base tracking-wider uppercase border border-[#5c5a54] cursor-pointer"
                >
                  {t('menu.load')}
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenSettings}
                className="w-full py-2.5 px-5 bg-[#242a30] hover:bg-[#2f373f] text-[#dfd8cb] font-display font-bold text-base tracking-wider uppercase border border-[#55544f] cursor-pointer text-start"
              >
                {t('menu.settings')}
              </button>

              <button
                type="button"
                onClick={onReturnToTitle}
                className="w-full py-2.5 px-5 bg-[#2a2120] hover:bg-[#3a2b29] text-[#e6cbc4] font-display font-bold text-base tracking-wider uppercase border border-[#6e4942] cursor-pointer text-start mt-1"
              >
                {t('menu.backToTitle')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-[#3a4046] pb-3 mb-4 flex items-center justify-between">
              <h2 className="font-display font-extrabold text-2xl tracking-wider uppercase text-[#f2eadc]">
                {t('settings.title')}
              </h2>
              <button
                type="button"
                onClick={onCloseSettings}
                className="px-3 py-1 bg-[#2a3138] hover:bg-[#38414a] border border-[#5c5a54] font-mono-hud text-xs uppercase cursor-pointer"
              >
                {t('menu.close')}
              </button>
            </div>

            <div className="flex flex-col gap-3.5 max-h-[65vh] overflow-y-auto pe-1">
              {/* Camera Mode */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#d8d2c6]">{t('settings.cameraMode')}</span>
                <div className="flex gap-1 shrink-0">
                  {(['third', 'first'] as CameraMode[]).map((cm) => (
                    <button
                      key={cm}
                      type="button"
                      onClick={() => onUpdateSettings({ cameraMode: cm })}
                      className={`px-3 py-1.5 text-xs font-mono-hud font-semibold uppercase border cursor-pointer ${
                        settings.cameraMode === cm
                          ? 'bg-[#c67134] text-[#15171a] border-[#e9c89f]'
                          : 'bg-[#252b32] text-[#c7c0b3] border-[#4b4d50]'
                      }`}
                    >
                      {cm === 'third' ? t('hud.camera.third') : t('hud.camera.first')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Graphics Quality */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#d8d2c6]">{t('settings.quality')}</span>
                <div className="flex gap-1 shrink-0">
                  {(['low', 'medium', 'high'] as QualityPreset[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onUpdateSettings({ quality: q })}
                      className={`px-2.5 py-1.5 text-xs font-mono-hud font-semibold uppercase border cursor-pointer ${
                        settings.quality === q
                          ? 'bg-[#c67134] text-[#15171a] border-[#e9c89f]'
                          : 'bg-[#252b32] text-[#c7c0b3] border-[#4b4d50]'
                      }`}
                    >
                      {t(`settings.quality.${q}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reduced Gore Toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#d8d2c6]">{t('settings.reducedGore')}</div>
                  <div className="text-xs text-[#9c968b]">{t('settings.reducedGoreDesc')}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ reducedGore: !settings.reducedGore })}
                  aria-pressed={settings.reducedGore}
                  className={`px-3.5 py-1.5 text-xs font-mono-hud font-bold uppercase border shrink-0 cursor-pointer ${
                    settings.reducedGore
                      ? 'bg-[#698356] text-[#111510] border-[#a8c493]'
                      : 'bg-[#252b32] text-[#c7c0b3] border-[#4b4d50]'
                  }`}
                >
                  {settings.reducedGore ? t('settings.on') : t('settings.off')}
                </button>
              </div>

              {/* Audio Mute */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#d8d2c6]">{t('settings.audioMuted')}</span>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ audioMuted: !settings.audioMuted })}
                  aria-pressed={settings.audioMuted}
                  className={`px-3.5 py-1.5 text-xs font-mono-hud font-bold uppercase border shrink-0 cursor-pointer ${
                    settings.audioMuted
                      ? 'bg-[#a6483a] text-[#f5eae7] border-[#d68c80]'
                      : 'bg-[#252b32] text-[#c7c0b3] border-[#4b4d50]'
                  }`}
                >
                  {settings.audioMuted ? t('settings.on') : t('settings.off')}
                </button>
              </div>

              {/* Volume Slider */}
              <label className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono-hud text-[#c7c0b3]">
                  <span>{t('settings.volume')}</span>
                  <span>{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.masterVolume * 100)}
                  onChange={(e) => onUpdateSettings({ masterVolume: Number(e.target.value) / 100 })}
                  className="w-full accent-[#c67134] cursor-pointer"
                />
              </label>

              {/* Look Sensitivity Slider */}
              <label className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono-hud text-[#c7c0b3]">
                  <span>{t('settings.mouseSensitivity')}</span>
                  <span>{settings.mouseSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={200}
                  value={Math.round(settings.mouseSensitivity * 100)}
                  onChange={(e) => onUpdateSettings({ mouseSensitivity: Number(e.target.value) / 100 })}
                  className="w-full accent-[#c67134] cursor-pointer"
                />
              </label>

              {/* Touch Controls Mode */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#d8d2c6]">{t('settings.touchControls')}</span>
                <div className="flex gap-1 shrink-0">
                  {(['auto', 'on', 'off'] as TouchControlMode[]).map((tm) => (
                    <button
                      key={tm}
                      type="button"
                      onClick={() => onUpdateSettings({ touchControls: tm })}
                      className={`px-2.5 py-1.5 text-xs font-mono-hud font-semibold uppercase border cursor-pointer ${
                        settings.touchControls === tm
                          ? 'bg-[#c67134] text-[#15171a] border-[#e9c89f]'
                          : 'bg-[#252b32] text-[#c7c0b3] border-[#4b4d50]'
                      }`}
                    >
                      {t(`settings.touch.${tm}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#3a4046]">
              <button
                type="button"
                onClick={onCloseSettings}
                className="w-full py-2.5 px-5 bg-[#c67134] hover:bg-[#d67e3e] text-[#16181b] font-display font-extrabold text-lg tracking-wider uppercase border-2 border-[#e9c89f] cursor-pointer"
              >
                {fromTitle ? t('menu.close') : t('menu.resume')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
