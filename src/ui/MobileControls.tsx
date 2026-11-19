/**
 * Android / mobile touch controls:
 * - Bottom-left virtual thumb joystick (zero scroll/zoom interference)
 * - Right-half touch-drag look pad
 * - Large thumb-friendly buttons for Jump, Interact, Lock/Barricade, and Run
 */

import { useRef, useState } from 'react';
import type { MobileInputState } from '../rendering/GameCanvas';
import { t } from '../i18n/translations';
import { soundEngine } from '../audio/soundEngine';

interface MobileControlsProps {
  mobileInputRef: React.MutableRefObject<MobileInputState>;
  hasInteractTarget: boolean;
  hasSecondaryAction: boolean;
  onInteract: () => void;
  onSecondaryInteract: () => void;
}

export function MobileControls({
  mobileInputRef,
  hasInteractTarget,
  hasSecondaryAction,
  onInteract,
  onSecondaryInteract,
}: MobileControlsProps) {
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sprintActive, setSprintActive] = useState(false);

  const joyTouchIdRef = useRef<number | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const MAX_RADIUS = 44;

  const onJoyStart = (e: React.TouchEvent<HTMLDivElement>) => {
    soundEngine.unlock();
    if (joyTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    joyTouchIdRef.current = touch.identifier;
    const rect = e.currentTarget.getBoundingClientRect();
    joyOriginRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateJoy(touch.clientX, touch.clientY);
  };

  const updateJoy = (clientX: number, clientY: number) => {
    const dx = clientX - joyOriginRef.current.x;
    const dy = clientY - joyOriginRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, MAX_RADIUS);
    const nx = dist > 0.001 ? (dx / dist) * clamped : 0;
    const ny = dist > 0.001 ? (dy / dist) * clamped : 0;
    setKnobOffset({ x: nx, y: ny });
    mobileInputRef.current.moveX = nx / MAX_RADIUS;
    mobileInputRef.current.moveY = -ny / MAX_RADIUS;
  };

  const onJoyMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joyTouchIdRef.current) {
        updateJoy(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const onJoyEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchIdRef.current) {
        joyTouchIdRef.current = null;
        setKnobOffset({ x: 0, y: 0 });
        mobileInputRef.current.moveX = 0;
        mobileInputRef.current.moveY = 0;
        break;
      }
    }
  };

  const onLookStart = (e: React.TouchEvent<HTMLDivElement>) => {
    soundEngine.unlock();
    if (lookTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lookLastRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onLookMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        mobileInputRef.current.lookDeltaX += touch.clientX - lookLastRef.current.x;
        mobileInputRef.current.lookDeltaY += touch.clientY - lookLastRef.current.y;
        lookLastRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  const onLookEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-15 pointer-events-none safe-bottom safe-x">
      {/* Right-side invisible touch-drag look pad */}
      <div
        className="pointer-events-auto fixed top-20 right-0 bottom-44 left-1/2"
        onTouchStart={onLookStart}
        onTouchMove={onLookMove}
        onTouchEnd={onLookEnd}
        onTouchCancel={onLookEnd}
      />

      {/* Bottom-Left Virtual Joystick */}
      <div
        className="pointer-events-auto fixed bottom-6 left-5 w-32 h-32 rounded-full bg-[#1a1f24aa] border-2 border-[#7b7365aa] flex items-center justify-center touch-none"
        onTouchStart={onJoyStart}
        onTouchMove={onJoyMove}
        onTouchEnd={onJoyEnd}
        onTouchCancel={onJoyEnd}
      >
        <div
          className="w-12 h-12 rounded-full bg-[#c67134e6] border-2 border-[#f2eadc] shadow-md"
          style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
        />
      </div>

      {/* Bottom-Right Thumb Action Buttons */}
      <div className="pointer-events-auto fixed bottom-6 right-5 flex items-end gap-2.5">
        {hasSecondaryAction && (
          <button
            type="button"
            aria-label={t('aria.lock')}
            onClick={onSecondaryInteract}
            className="w-14 h-14 rounded-full bg-[#2a3139e0] active:bg-[#3f4954] border-2 border-[#8c8476] font-mono-hud text-xs font-bold text-[#ece6da]"
          >
            LOCK
          </button>
        )}

        <button
          type="button"
          aria-label={t('aria.sprint')}
          onClick={() => {
            const next = !sprintActive;
            setSprintActive(next);
            mobileInputRef.current.sprint = next;
          }}
          className={`w-14 h-14 rounded-full border-2 font-mono-hud text-xs font-bold ${
            sprintActive
              ? 'bg-[#c67134eb] text-[#15171a] border-[#f2eadc]'
              : 'bg-[#1e242be0] text-[#ece6da] border-[#787266]'
          }`}
        >
          RUN
        </button>

        <div className="flex flex-col gap-2.5">
          {hasInteractTarget && (
            <button
              type="button"
              aria-label={t('aria.interact')}
              onClick={onInteract}
              className="w-16 h-16 rounded-full bg-[#c67134f0] active:bg-[#df8543] border-2 border-[#f4e2c6] font-display font-extrabold text-sm tracking-wider text-[#15171a]"
            >
              USE
            </button>
          )}
          <button
            type="button"
            aria-label={t('aria.jump')}
            onTouchStart={() => {
              soundEngine.unlock();
              mobileInputRef.current.jumpPressed = true;
              mobileInputRef.current.jumpHeld = true;
            }}
            onTouchEnd={() => {
              mobileInputRef.current.jumpHeld = false;
            }}
            onClick={() => {
              mobileInputRef.current.jumpPressed = true;
            }}
            className="w-16 h-16 rounded-full bg-[#262d34e6] active:bg-[#3d4752] border-2 border-[#9e9482] font-display font-bold text-sm tracking-wider text-[#f2eadc]"
          >
            JUMP
          </button>
        </div>
      </div>
    </div>
  );
}
