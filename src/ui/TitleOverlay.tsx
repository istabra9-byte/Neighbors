/**
 * Full-viewport Title Screen overlay anchored over calm upper-left negative space
 * above the live Maple Crescent 3D street flyover.
 * Features a bespoke inline <svg> weathered suburban street-sign lockup,
 * primary Play CTA (data-start="true"), optional Continue Save CTA, Settings CTA,
 * and a single flat borderless bottom control-hint line.
 */

import { t } from '../i18n/translations';

interface TitleOverlayProps {
  hasSave: boolean;
  onStartNew: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
}

export function TitleOverlay({
  hasSave,
  onStartNew,
  onContinue,
  onOpenSettings,
}: TitleOverlayProps) {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between safe-top safe-bottom safe-x p-6 sm:p-10">
      {/* Upper-Left Negative Space Emblem & Menu Stack */}
      <div className="pointer-events-auto max-w-md mt-2 sm:mt-4">
        {/* Bespoke Inline SVG Weathered Suburban Street-Sign & House Crest Lockup */}
        <svg
          viewBox="0 0 420 132"
          className="w-full max-w-[390px] h-auto drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]"
          role="img"
          aria-label={t('game.title')}
        >
          {/* Weathered enamel street sign backing */}
          <rect
            x="4"
            y="8"
            width="412"
            height="114"
            rx="6"
            fill="#1f252b"
            fillOpacity="0.92"
            stroke="#c7b593"
            strokeWidth="3"
          />
          <rect
            x="11"
            y="15"
            width="398"
            height="100"
            rx="3"
            fill="none"
            stroke="#8a7a5c"
            strokeWidth="1.2"
            strokeDasharray="6 4"
          />
          {/* Mounting bolts */}
          <circle cx="24" cy="28" r="3.5" fill="#9e9689" />
          <circle cx="396" cy="28" r="3.5" fill="#9e9689" />
          <circle cx="24" cy="102" r="3.5" fill="#9e9689" />
          <circle cx="396" cy="102" r="3.5" fill="#9e9689" />

          {/* Mini house & crossed-shovel crest icon */}
          <g transform="translate(26, 36)">
            <polygon points="24,4 4,22 44,22" fill="#b45a3c" stroke="#ece4d4" strokeWidth="1.8" />
            <rect x="9" y="22" width="30" height="24" fill="#d9d1c2" stroke="#1f252b" strokeWidth="1.5" />
            <rect x="20" y="31" width="8" height="15" fill="#43382e" />
            <rect x="13" y="27" width="5" height="6" fill="#5b7382" />
            <rect x="30" y="27" width="5" height="6" fill="#5b7382" />
            <rect x="32" y="7" width="5" height="11" fill="#8d5342" />
          </g>

          {/* Main Display Title */}
          <text
            x="84"
            y="64"
            fill="#f2eadc"
            fontFamily="'Barlow Condensed', sans-serif"
            fontWeight="800"
            fontSize="41"
            letterSpacing="2.2"
          >
            NEIGHBORHOOD
          </text>
          <text
            x="84"
            y="102"
            fill="#d48947"
            fontFamily="'Barlow Condensed', sans-serif"
            fontWeight="800"
            fontSize="40"
            letterSpacing="5.5"
          >
            WARS
          </text>
          {/* Decorative suburban picket divider */}
          <line x1="196" y1="88" x2="386" y2="88" stroke="#8a7a5c" strokeWidth="2" />
          <text
            x="202"
            y="102"
            fill="#b8b0a1"
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight="600"
            fontSize="11"
            letterSpacing="1.4"
          >
            MAPLE CRESCENT
          </text>
        </svg>

        {/* Primary Menu Stack (<= 3 actions, generous padding for localization) */}
        <div className="mt-6 flex flex-col gap-2.5 w-full max-w-[280px]">
          {hasSave ? (
            <>
              <button
                type="button"
                data-start="true"
                onClick={onContinue}
                className="w-full py-3.5 px-6 bg-[#c67134] hover:bg-[#d67e3e] active:translate-y-[1px] text-[#17191c] font-display font-extrabold text-xl tracking-wider uppercase border-2 border-[#e9c89f] shadow-[0_4px_0_#14171a] transition-colors cursor-pointer text-start flex items-center justify-between"
              >
                <span>{t('menu.continue')}</span>
                <span className="font-mono-hud text-xs opacity-75">ENTER</span>
              </button>
              <button
                type="button"
                onClick={onStartNew}
                className="w-full py-2.5 px-5 bg-[#20262cf0] hover:bg-[#2b333bf5] text-[#ece6da] font-display font-bold text-lg tracking-wider uppercase border border-[#6e6a61] shadow-[0_3px_0_#111316] transition-colors cursor-pointer text-start"
              >
                {t('menu.newGame')}
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onStartNew}
              className="w-full py-3.5 px-6 bg-[#c67134] hover:bg-[#d67e3e] active:translate-y-[1px] text-[#17191c] font-display font-extrabold text-2xl tracking-wider uppercase border-2 border-[#e9c89f] shadow-[0_4px_0_#14171a] transition-colors cursor-pointer text-start flex items-center justify-between"
            >
              <span>{t('menu.play')}</span>
              <span className="font-mono-hud text-xs opacity-75">ENTER</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 px-5 bg-[#1b2026eb] hover:bg-[#272e36f5] text-[#d7d0c3] font-display font-bold text-lg tracking-wider uppercase border border-[#565550] shadow-[0_3px_0_#111316] transition-colors cursor-pointer text-start"
          >
            {t('menu.settings')}
          </button>
        </div>
      </div>

      {/* Single flat borderless bottom control-hint line */}
      <div className="w-full text-center pb-1">
        <p className="text-xs sm:text-sm font-mono-hud text-[#ece6da] tracking-wide [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
          {t('menu.controlsHint')}
        </p>
      </div>
    </div>
  );
}
