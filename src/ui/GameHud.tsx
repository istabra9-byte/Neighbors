/**
 * World-matched, low-occlusion Gameplay HUD (`>= 85%` clear viewport).
 * Zero `backdrop-filter` over WebGL, `pointer-events: none` wrapper,
 * weathered metal/enamel perimeter clusters, tabular-nums integers, and RTL-ready layout.
 */

import { t } from '../i18n/translations';
import { formatGameClock } from '../simulation/simulation';
import type { HudSnapshot } from '../rendering/GameCanvas';
import type { CameraMode } from '../storage/localSettings';

interface GameHudProps {
  hud: HudSnapshot;
  cameraMode: CameraMode;
  audioMuted: boolean;
  debugMode: boolean;
  toastText: string | null;
  onToggleCamera: () => void;
  onQuickSave: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onAdvanceTime: () => void;
}

export function GameHud({
  hud,
  cameraMode,
  audioMuted,
  debugMode,
  toastText,
  onToggleCamera,
  onQuickSave,
  onToggleMute,
  onPause,
  onAdvanceTime,
}: GameHudProps) {
  const clockStr = formatGameClock(hud.timeOfDay);
  const hpPct = Math.max(0, Math.min(100, (hud.health / Math.max(1, hud.maxHealth)) * 100));

  const blurClick = (fn: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    fn();
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between safe-top safe-bottom safe-x p-3 sm:p-5">
      {/* TOP PERIMETER BAR */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* Top-Left Weathered Enamel Status Plaque */}
        <div
          className="bg-[#1b2025e6] border-2 border-[#4d4a44] shadow-[0_3px_0_rgba(0,0,0,0.55)] px-2.5 sm:px-3.5 py-2 sm:py-2.5 min-w-0 sm:min-w-[235px] max-w-[208px] sm:max-w-[320px]"
          data-testid="hud-status-cluster"
        >
          {/* Row 1: Day, Clock & Location */}
          <div className="flex items-center justify-between gap-2 border-b border-[#3a3e42] pb-1.5">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {/* Custom Sun / Moon SVG Icon */}
              {hud.isNight ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#a9c2e8] shrink-0" aria-hidden="true">
                  <path
                    fill="currentColor"
                    stroke="#14171a"
                    strokeWidth="1.5"
                    d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#e3b259] shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" fill="currentColor" stroke="#14171a" strokeWidth="1.5" />
                  <path
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
                  />
                </svg>
              )}
              <span className="font-display font-bold text-xs sm:text-sm tracking-wider uppercase text-[#c7baa2] shrink-0">
                {t('hud.day', { day: hud.day })}
              </span>
              <span className="font-mono-hud font-bold text-sm sm:text-base text-[#f2ece1]" data-testid="hud-clock">
                {clockStr}
              </span>
            </div>

            <button
              type="button"
              tabIndex={-1}
              onClick={blurClick(onAdvanceTime)}
              aria-label={t('aria.timeForward')}
              title={t('aria.timeForward')}
              className="pointer-events-auto px-1.5 py-0.5 text-[10px] sm:text-[11px] font-mono-hud font-semibold bg-[#2a3036] hover:bg-[#3a424a] text-[#d9ccb2] border border-[#56544e] cursor-pointer shrink-0"
            >
              +2h
            </button>
          </div>

          {/* Row 2: Health Bar & Cash */}
          <div className="mt-1.5 sm:mt-2 flex items-center justify-between gap-2.5 sm:gap-4">
            {/* HP Bar */}
            <div className="flex-1 min-w-[78px] sm:min-w-[110px]">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono-hud mb-1">
                <span className="text-[#b8b0a1] font-semibold">{t('hud.health')}</span>
                <span className="text-[#f2ece1] font-bold" data-testid="hud-health">
                  {hud.health}
                </span>
              </div>
              <div className="h-2 sm:h-2.5 w-full bg-[#101316] border border-[#424549] p-[1px]">
                <div
                  className="h-full bg-[#a84234] transition-all duration-150"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>

            {/* Money Counter */}
            <div className="text-end shrink-0">
              <div className="text-[9px] sm:text-[10px] font-mono-hud uppercase tracking-wider text-[#a9a295]">
                {t('hud.cash')}
              </div>
              <div className="font-mono-hud font-bold text-base sm:text-lg leading-tight text-[#b7c88d]" data-testid="hud-money">
                ${hud.money}
              </div>
            </div>
          </div>

          {/* Row 3: Current Room / Zone Tag */}
          <div className="mt-1 sm:mt-1.5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono-hud text-[#b8b0a1]">
            <span className="truncate" data-testid="hud-location">
              {t(hud.locationKey)}
            </span>
            <span className="hidden sm:inline text-[#8e959c] ms-2 shrink-0">
              {cameraMode === 'third' ? t('hud.camera.third') : t('hud.camera.first')}
            </span>
          </div>

          {/* F3 DEBUG TELEMETRY (Strictly hidden unless F3 is enabled) */}
          {debugMode && hud.debugInfo && (
            <div
              className="mt-2 pt-2 border-t border-[#3b4752] text-[10px] font-mono-hud text-[#cde2f5] space-y-0.5"
              data-testid="hud-f3-debug"
            >
              <div className="flex items-center justify-between font-bold text-[#5cd3f7]">
                <span>{t('debug.title')}</span>
                <span className={hud.debugInfo.walkabilityPassed ? 'text-[#5cd68d]' : 'text-[#f26d6d]'}>
                  {hud.debugInfo.walkabilityPassed
                    ? t('debug.walkabilityPass', {
                        passed: hud.debugInfo.walkabilityHousesPassed,
                        total: hud.debugInfo.walkabilityHousesTotal,
                      })
                    : t('debug.walkabilityFail', { issues: hud.debugInfo.walkabilityIssues })}
                </span>
              </div>
              <div>
                POS {hud.playerX.toFixed(2)}, {hud.playerY.toFixed(2)}, {hud.playerZ.toFixed(2)} · F{hud.floorLevel} ·{' '}
                {hud.debugInfo.animState.toUpperCase()}
                {hud.debugInfo.onStairs ? ' (STAIRS)' : ''}
              </div>
              <div>
                CAM {hud.debugInfo.camDist.toFixed(2)}m / {hud.debugInfo.camDesired.toFixed(2)}m [
                {hud.debugInfo.camBlocked ? t('debug.cameraBlocked') : t('debug.cameraClear')}] · COL{' '}
                {hud.debugInfo.colliderCount}
              </div>
              <div className="text-[9px] text-[#9bb3c7] leading-snug">{t('debug.legend')}</div>
            </div>
          )}
        </div>

        {/* Top-Right Compact Utility Icon Buttons */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Camera Mode Toggle [C] */}
          <button
            type="button"
            tabIndex={-1}
            onClick={blurClick(onToggleCamera)}
            aria-label={t('aria.toggleCamera')}
            title={`${t('aria.toggleCamera')} [C]`}
            className="w-9 h-9 sm:w-auto sm:h-10 sm:px-2.5 bg-[#1b2025e6] hover:bg-[#2a3139f5] border-2 border-[#4d4a44] shadow-[0_2px_0_rgba(0,0,0,0.5)] text-[#ece6da] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            <span className="hidden sm:inline font-mono-hud text-xs font-bold">
              {cameraMode === 'third' ? '3P' : '1P'}
            </span>
          </button>

          {/* Quick Save */}
          <button
            type="button"
            tabIndex={-1}
            onClick={blurClick(onQuickSave)}
            aria-label={t('aria.quickSave')}
            title={t('aria.quickSave')}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-[#1b2025e6] hover:bg-[#2a3139f5] border-2 border-[#4d4a44] shadow-[0_2px_0_rgba(0,0,0,0.5)] text-[#ece6da] flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>

          {/* Mute Toggle [M] */}
          <button
            type="button"
            tabIndex={-1}
            onClick={blurClick(onToggleMute)}
            aria-label={t('aria.toggleMute')}
            title={`${t('aria.toggleMute')} [M]`}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-[#1b2025e6] hover:bg-[#2a3139f5] border-2 border-[#4d4a44] shadow-[0_2px_0_rgba(0,0,0,0.5)] text-[#ece6da] flex items-center justify-center cursor-pointer"
          >
            {audioMuted ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#c26352]" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          {/* Pause [Esc] */}
          <button
            type="button"
            tabIndex={-1}
            onClick={blurClick(onPause)}
            aria-label={t('aria.pauseGame')}
            title={`${t('aria.pauseGame')} [Esc]`}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-[#1b2025e6] hover:bg-[#2a3139f5] border-2 border-[#4d4a44] shadow-[0_2px_0_rgba(0,0,0,0.5)] text-[#ece6da] flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* CENTER FIRST-PERSON CROSSHAIR */}
      {cameraMode === 'first' && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
            <circle cx="8" cy="8" r="2.2" fill="#f2eadc" stroke="#15181c" strokeWidth="1.4" />
          </svg>
        </div>
      )}

      {/* SAVE / LOAD TOAST */}
      {toastText && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#1f262cf0] border-2 border-[#c67134] px-4 py-1.5 font-mono-hud text-xs font-bold uppercase tracking-wider text-[#f2eadc] shadow-[0_3px_0_rgba(0,0,0,0.6)]">
          {toastText}
        </div>
      )}

      {/* BOTTOM INTERACTION OR CLIMBING PROMPT */}
      <div className="flex flex-col items-center gap-2 pb-1">
        {hud.isClimbing ? (
          <div
            className="bg-[#1b2025ed] border-2 border-[#c7b593] shadow-[0_3px_0_rgba(0,0,0,0.65)] px-4 py-2 font-mono-hud text-xs font-bold uppercase tracking-wider text-[#f4efe4]"
            data-testid="hud-climb-prompt"
          >
            {t('hud.climbingHint')}
          </div>
        ) : (
          hud.interaction && (
            <div
              className="bg-[#1b2025ed] border-2 border-[#c7b593] shadow-[0_3px_0_rgba(0,0,0,0.65)] px-4 py-2 flex flex-col items-center gap-0.5"
              data-testid="hud-interact-prompt"
            >
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-[#c67134] text-[#15171a] font-mono-hud font-bold text-xs">
                  E
                </span>
                <span className="font-display font-bold text-base tracking-wide uppercase text-[#f4efe4]">
                  {t(hud.interaction.actionKey, { name: t(hud.interaction.labelKey) })}
                </span>
                {hud.interaction.stateBadgeKey && (
                  <span className="px-1.5 py-0.5 bg-[#6b342b] text-[#f2ddd9] font-mono-hud text-[10px] uppercase">
                    {t(hud.interaction.stateBadgeKey)}
                  </span>
                )}
              </div>
              {hud.interaction.secondaryHintKey && (
                <span className="font-mono-hud text-[11px] text-[#c7baa2]">
                  {t(hud.interaction.secondaryHintKey)}
                </span>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
