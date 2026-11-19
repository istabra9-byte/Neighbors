/**
 * Neighborhood Wars — Phase 1 Foundation Shell.
 * Wires the decoupled pure-TS GameSimulation, local settings, JSON save/load,
 * procedural audio, isolated 3D GameCanvas, Title screen, HUD, Pause/Settings modals,
 * and responsive Android touch controls.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameSimulation } from './simulation/simulation';
import {
  loadLocalSettings,
  saveLocalSettings,
  type LocalSettings,
  type QualityPreset,
} from './storage/localSettings';
import { hasSavedGame, loadGameFromStorage, saveGameToStorage } from './storage/saveGame';
import { setLanguage, t } from './i18n/translations';
import { soundEngine } from './audio/soundEngine';
import { TOOL_ORDER } from './tunnels/tunnelEngine';
import type { TunnelToolId } from './tunnels/tunnelTypes';
import type { WeaponId } from './phase3/phase3Types';
import { detectSoftwareWebGL } from './rendering/webglDetect';
import {
  GameCanvas,
  type GameShellState,
  type HudSnapshot,
  type MobileInputState,
} from './rendering/GameCanvas';
import { TitleOverlay } from './ui/TitleOverlay';
import { GameHud } from './ui/GameHud';
import { PauseAndSettingsModal } from './ui/PauseAndSettingsModal';
import { MobileControls } from './ui/MobileControls';
import { PhoneOverlay } from './ui/PhoneOverlay';

const DEFAULT_SEED = 202611;

function isAutostartEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

function isTouchCapable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export default function App() {
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const simRef = useRef<GameSimulation | null>(null);
  if (!simRef.current) {
    simRef.current = new GameSimulation(DEFAULT_SEED, 8);
  }
  const activeSimRef = simRef as React.MutableRefObject<GameSimulation>;

  const [settings, setSettings] = useState<LocalSettings>(() => loadLocalSettings());
  const [shellState, setShellState] = useState<GameShellState>(() =>
    isAutostartEnabled() ? 'playing' : 'title',
  );
  const [modalMode, setModalMode] = useState<'none' | 'pause' | 'settings'>('none');
  const [settingsFromTitle, setSettingsFromTitle] = useState(false);
  const [saveAvailable, setSaveAvailable] = useState<boolean>(() => hasSavedGame());
  const [toastText, setToastText] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneRev, setPhoneRev] = useState(0);
  const [sceneRevision, setSceneRevision] = useState(0);

  const mobileInputRef = useRef<MobileInputState>({
    moveX: 0,
    moveY: 0,
    sprint: false,
    jumpPressed: false,
    jumpHeld: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
  });

  const [hud, setHud] = useState<HudSnapshot>(() => {
    const sim = activeSimRef.current;
    const p = sim.getLocalPlayer();
    const p3 = sim.state.phase3;
    return {
      day: sim.state.day,
      timeOfDay: sim.state.timeOfDay,
      isNight: false,
      health: p.health,
      maxHealth: p.maxHealth,
      stamina: p.stamina,
      oxygen: p.oxygen,
      maxOxygen: p.maxOxygen,
      money: p.money,
      locationKey: sim.getActorLocationKey(p),
      interaction: null,
      digTarget: null,
      isClimbing: p.climbState !== null,
      playerX: p.position.x,
      playerY: p.position.y,
      playerZ: p.position.z,
      floorLevel: p.currentFloor,
      inShelter: p.inShelter,
      inTunnel: p.inTunnel,
      inFloodedTunnel: p.inFloodedTunnel,
      activeTool: p.activeTool,
      collapseWarning: false,
      tunnelCount: sim.state.tunnels.segments.length,
      pointerLocked: false,
      activeWeapon: p3.activeWeapon,
      ownedWeapons: [...p3.ownedWeapons],
      weaponAmmo: { ...p3.ammo },
      activeRobberCount: 0,
      policeStatus: p3.police.status,
      raidBannerKey: p3.raidBannerKey,
      phoneBadgeCount: 0,
    };
  });

  // Log automatic startup walkability check clearly to console
  useEffect(() => {
    (window as unknown as { __nwSim?: GameSimulation }).__nwSim = activeSimRef.current;
    const report = activeSimRef.current.walkabilityReport;
    if (report.passed) {
      console.info(
        `[Neighborhood Wars] Startup walkability check PASSED: ${report.totalHouses}/${report.totalHouses} houses verified, ${report.totalColliders} indexed colliders, all stair headrooms >= 2.40m.`,
      );
    } else {
      console.warn('[Neighborhood Wars] Startup walkability check found issues:', report.issues);
    }
  }, [activeSimRef, sceneRevision]);

  const toastTimerRef = useRef<number>(0);
  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastText(null), 2100);
  }, []);

  const handleSimToast = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      showToast(t(key, params));
    },
    [showToast],
  );

  // Mirror shell state to document.body.dataset.state for testability & pointer-lock hygiene
  useEffect(() => {
    document.body.dataset.state = shellState;
    if ((shellState !== 'playing' || phoneOpen) && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }, [phoneOpen, shellState]);

  // Apply language & audio settings whenever LocalSettings change
  useEffect(() => {
    setLanguage(settings.language);
    soundEngine.setSettings(settings.audioMuted, settings.masterVolume);
    saveLocalSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<LocalSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const syncImmediateHud = useCallback(() => {
    const sim = activeSimRef.current;
    const p = sim.getLocalPlayer();
    const p3 = sim.state.phase3;
    const activeTarget = sim.getActiveTunnelTarget(p);
    const activeRobberCount = p3.robbers.filter(
      (r) => r.state !== 'arrested' && r.state !== 'stunned',
    ).length;
    const claimableMissions = p3.missions.filter((m) => m.completed && !m.claimed).length;

    const toasts = sim.drainToastEvents();
    if (toasts.length > 0) {
      const last = toasts[toasts.length - 1];
      showToast(t(last.key, last.params));
    }
    const sounds = sim.drainSoundEvents();
    for (let i = 0; i < sounds.length; i++) {
      soundEngine.playEvent(sounds[i]);
    }

    setHud({
      day: sim.state.day,
      timeOfDay: sim.state.timeOfDay,
      isNight: sim.state.timeOfDay < 6.0 || sim.state.timeOfDay >= 19.2,
      health: Math.round(p.health),
      maxHealth: p.maxHealth,
      stamina: Math.round(p.stamina),
      oxygen: Math.round(p.oxygen),
      maxOxygen: p.maxOxygen,
      money: Math.round(p.money),
      locationKey: sim.getActorLocationKey(p),
      interaction: sim.findInteractionTarget(p),
      digTarget: activeTarget
        ? {
            tool: activeTarget.tool,
            actionKind: activeTarget.actionKind,
            gy: activeTarget.gy,
            soil: activeTarget.soil,
            valid: activeTarget.valid,
            reasonKey: activeTarget.reasonKey,
            hitsDone: activeTarget.hitsDone,
            hitsMax: activeTarget.hitsMax,
            cost: activeTarget.cost,
          }
        : null,
      isClimbing: p.climbState !== null,
      playerX: p.position.x,
      playerY: p.position.y,
      playerZ: p.position.z,
      floorLevel: p.currentFloor,
      inShelter: p.inShelter,
      inTunnel: p.inTunnel,
      inFloodedTunnel: p.inFloodedTunnel,
      activeTool: p.activeTool,
      collapseWarning: p.collapseWarningTimer > 0.1,
      tunnelCount: sim.state.tunnels.segments.length,
      pointerLocked: false,
      activeWeapon: p3.activeWeapon,
      ownedWeapons: [...p3.ownedWeapons],
      weaponAmmo: { ...p3.ammo },
      activeRobberCount,
      policeStatus: p3.police.status,
      raidBannerKey: p3.raidBannerKey,
      phoneBadgeCount: activeRobberCount + claimableMissions + p3.unreadFeedCount,
    });
    setPhoneRev((r) => r + 1);
  }, [activeSimRef, showToast]);

  const handleStartNew = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playUiClick();
    activeSimRef.current = new GameSimulation(DEFAULT_SEED, 8);
    setSceneRevision((r) => r + 1);
    setPhoneOpen(false);
    setModalMode('none');
    setShellState('playing');
    document.body.dataset.state = 'playing';
    (document.activeElement as HTMLElement | null)?.blur?.();
    syncImmediateHud();
  }, [activeSimRef, syncImmediateHud]);

  const handleContinue = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playUiClick();
    const saved = loadGameFromStorage();
    if (saved) {
      activeSimRef.current = GameSimulation.deserialize(saved);
      setSceneRevision((r) => r + 1);
      showToast(t('hud.loadedToast'));
    }
    setModalMode('none');
    setShellState('playing');
    document.body.dataset.state = 'playing';
    (document.activeElement as HTMLElement | null)?.blur?.();
    syncImmediateHud();
  }, [activeSimRef, showToast, syncImmediateHud]);

  const handleSaveGame = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playUiClick();
    const ok = saveGameToStorage(activeSimRef.current.serialize());
    if (ok) {
      setSaveAvailable(true);
      showToast(t('hud.savedToast'));
    }
  }, [activeSimRef, showToast]);

  const handleLoadGame = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playUiClick();
    const saved = loadGameFromStorage();
    if (!saved) {
      showToast(t('hud.noSave'));
      return;
    }
    activeSimRef.current = GameSimulation.deserialize(saved);
    setSceneRevision((r) => r + 1);
    setModalMode('none');
    setShellState('playing');
    syncImmediateHud();
    showToast(t('hud.loadedToast'));
  }, [activeSimRef, showToast, syncImmediateHud]);

  const handleInteract = useCallback(
    (secondary: 'lock' | 'barricade' | null) => {
      const sim = activeSimRef.current;
      const p = sim.getLocalPlayer();
      if (p.climbState && !secondary) {
        sim.applyCommand({ type: 'DISMOUNT_LADDER', actorId: p.id });
        syncImmediateHud();
        return;
      }
      const target = sim.findInteractionTarget(p);
      if (!target) return;

      if (target.kind === 'door') {
        if (secondary === 'lock') {
          sim.applyCommand({ type: 'TOGGLE_LOCK_DOOR', actorId: p.id, doorId: target.id });
        } else if (!secondary) {
          sim.applyCommand({ type: 'INTERACT_DOOR', actorId: p.id, doorId: target.id });
        }
      } else if (target.kind === 'window') {
        if (secondary === 'barricade' || secondary === 'lock') {
          sim.applyCommand({ type: 'TOGGLE_BARRICADE_WINDOW', actorId: p.id, windowId: target.id });
        } else {
          sim.applyCommand({ type: 'INTERACT_WINDOW', actorId: p.id, windowId: target.id });
        }
      } else if (target.kind === 'roof_up' && !secondary) {
        sim.applyCommand({ type: 'USE_ROOF_ACCESS', actorId: p.id, houseId: target.houseId, direction: 'up' });
      } else if (target.kind === 'roof_down' && !secondary) {
        sim.applyCommand({ type: 'USE_ROOF_ACCESS', actorId: p.id, houseId: target.houseId, direction: 'down' });
      } else if (target.kind === 'shelter_enter') {
        if (secondary === 'lock') {
          sim.applyCommand({ type: 'TOGGLE_SHELTER_HATCH', actorId: p.id, houseId: target.houseId });
        } else if (!secondary) {
          sim.applyCommand({ type: 'USE_SHELTER_ACCESS', actorId: p.id, houseId: target.houseId, direction: 'enter' });
        }
      } else if (target.kind === 'shelter_exit') {
        if (secondary === 'lock') {
          sim.applyCommand({ type: 'TOGGLE_SHELTER_HATCH', actorId: p.id, houseId: target.houseId });
        } else if (!secondary) {
          sim.applyCommand({ type: 'USE_SHELTER_ACCESS', actorId: p.id, houseId: target.houseId, direction: 'exit' });
        }
      } else if (target.kind === 'shaft_up' && !secondary) {
        sim.applyCommand({ type: 'USE_TUNNEL_SHAFT', actorId: p.id, ladderId: target.id, direction: 'up' });
      } else if (target.kind === 'shaft_down' && !secondary) {
        sim.applyCommand({ type: 'USE_TUNNEL_SHAFT', actorId: p.id, ladderId: target.id, direction: 'down' });
      } else if ((target.kind === 'yard_slot' || target.kind === 'roof_pad') && !secondary) {
        sim.applyCommand({ type: 'BUILD', actorId: p.id, itemId: '', slotId: target.id });
      }
      syncImmediateHud();
    },
    [activeSimRef, syncImmediateHud],
  );

  const handleEquipWeapon = useCallback(
    (weapon: WeaponId) => {
      soundEngine.unlock();
      soundEngine.playUiClick();
      const sim = activeSimRef.current;
      sim.applyCommand({ type: 'EQUIP_WEAPON', actorId: sim.getLocalPlayer().id, weaponId: weapon });
      syncImmediateHud();
    },
    [activeSimRef, syncImmediateHud],
  );

  const handleBuyItem = useCallback(
    (itemId: string) => {
      soundEngine.unlock();
      const sim = activeSimRef.current;
      sim.applyCommand({ type: 'BUY', actorId: sim.getLocalPlayer().id, itemId });
      syncImmediateHud();
    },
    [activeSimRef, syncImmediateHud],
  );

  const handleCall911 = useCallback(() => {
    soundEngine.unlock();
    const sim = activeSimRef.current;
    sim.applyCommand({ type: 'CALL_911', actorId: sim.getLocalPlayer().id });
    syncImmediateHud();
  }, [activeSimRef, syncImmediateHud]);

  const handleTriggerRaid = useCallback(() => {
    soundEngine.unlock();
    const sim = activeSimRef.current;
    sim.applyCommand({ type: 'TRIGGER_RAID', actorId: sim.getLocalPlayer().id });
    setPhoneOpen(false);
    syncImmediateHud();
  }, [activeSimRef, syncImmediateHud]);

  const handlePostPhoto = useCallback(() => {
    soundEngine.unlock();
    const sim = activeSimRef.current;
    sim.applyCommand({ type: 'POST_PHOTO', actorId: sim.getLocalPlayer().id, captionKey: 'auto' });
    syncImmediateHud();
  }, [activeSimRef, syncImmediateHud]);

  const handleClaimMission = useCallback(
    (missionId: string) => {
      soundEngine.unlock();
      const sim = activeSimRef.current;
      sim.applyCommand({ type: 'CLAIM_MISSION', actorId: sim.getLocalPlayer().id, missionId });
      syncImmediateHud();
    },
    [activeSimRef, syncImmediateHud],
  );

  const handleFeedViewed = useCallback(() => {
    const sim = activeSimRef.current;
    sim.applyCommand({ type: 'CLEAR_FEED_UNREAD', actorId: sim.getLocalPlayer().id });
    syncImmediateHud();
  }, [activeSimRef, syncImmediateHud]);

  const handleTogglePhone = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playUiClick();
    setPhoneOpen((prev) => {
      const next = !prev;
      if (next) syncImmediateHud();
      return next;
    });
  }, [syncImmediateHud]);

  const handleSelectTool = useCallback(
    (tool: TunnelToolId) => {
      soundEngine.unlock();
      soundEngine.playUiClick();
      const sim = activeSimRef.current;
      const p = sim.getLocalPlayer();
      sim.applyCommand({ type: 'SELECT_TOOL', actorId: p.id, tool });
      syncImmediateHud();
    },
    [activeSimRef, syncImmediateHud],
  );

  const handleCycleTool = useCallback(() => {
    const p = activeSimRef.current.getLocalPlayer();
    const cur = TOOL_ORDER.indexOf(p.activeTool);
    handleSelectTool(TOOL_ORDER[(cur + 1) % TOOL_ORDER.length]);
  }, [activeSimRef, handleSelectTool]);

  const handleUseActiveTool = useCallback(() => {
    soundEngine.unlock();
    const sim = activeSimRef.current;
    const p = sim.getLocalPlayer();
    sim.applyCommand({ type: 'USE_ACTIVE_TOOL', actorId: p.id });
    syncImmediateHud();
  }, [activeSimRef, syncImmediateHud]);

  const handleToggleCamera = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playUiClick();
    setSettings((prev) => ({
      ...prev,
      cameraMode: prev.cameraMode === 'third' ? 'first' : 'third',
    }));
  }, []);

  const handleAdvanceTime = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playUiClick();
    activeSimRef.current.applyCommand({ type: 'ADVANCE_TIME', hours: 2 });
    syncImmediateHud();
  }, [activeSimRef, syncImmediateHud]);

  const handleAutoQualityDown = useCallback((nextQuality: QualityPreset) => {
    setSettings((prev) => ({ ...prev, quality: nextQuality }));
  }, []);

  // Global keyboard shortcuts (Title Enter/Space, Playing C/M/Esc, Paused Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shellState === 'title' && modalMode === 'none') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          if (saveAvailable) handleContinue();
          else handleStartNew();
        }
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        if (shellState === 'title' && modalMode === 'settings') {
          setModalMode('none');
        } else if (shellState === 'playing' && phoneOpen) {
          setPhoneOpen(false);
        } else if (shellState === 'playing') {
          setShellState('paused');
          setModalMode('pause');
        } else if (shellState === 'paused') {
          if (modalMode === 'settings') {
            setModalMode('pause');
          } else {
            setModalMode('none');
            setShellState('playing');
          }
        }
        return;
      }

      if (shellState === 'playing') {
        if (e.code === 'KeyP' || e.code === 'Tab') {
          e.preventDefault();
          handleTogglePhone();
        } else if (e.code === 'KeyC' && !phoneOpen) {
          e.preventDefault();
          handleToggleCamera();
        } else if (e.code === 'KeyM') {
          e.preventDefault();
          updateSettings({ audioMuted: !settings.audioMuted });
        } else if (e.code === 'F3') {
          e.preventDefault();
          setDebugMode((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleContinue,
    handleStartNew,
    handleToggleCamera,
    handleTogglePhone,
    modalMode,
    phoneOpen,
    saveAvailable,
    settings.audioMuted,
    shellState,
    updateSettings,
  ]);

  const showTouchControls =
    shellState === 'playing' &&
    (settings.touchControls === 'on' ||
      (settings.touchControls === 'auto' && isTouchCapable()));

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#181b1f]">
      {/* Isolated 3D WebGL Canvas */}
      <GameCanvas
        simRef={activeSimRef}
        shellState={shellState}
        phoneOpen={phoneOpen}
        settings={settings}
        debugMode={debugMode}
        isSoftwareGl={isSoftwareGl}
        isNight={hud.isNight}
        mobileInputRef={mobileInputRef}
        onHudUpdate={setHud}
        onSimToast={handleSimToast}
        onAutoQualityDown={handleAutoQualityDown}
        onInteractRequest={handleInteract}
        onSelectTool={handleSelectTool}
        onEquipWeapon={handleEquipWeapon}
        onUseActiveTool={handleUseActiveTool}
        sceneRevision={sceneRevision}
      />

      {/* Title Screen Overlay */}
      {shellState === 'title' && modalMode === 'none' && (
        <TitleOverlay
          hasSave={saveAvailable}
          onStartNew={handleStartNew}
          onContinue={handleContinue}
          onOpenSettings={() => {
            soundEngine.unlock();
            soundEngine.playUiClick();
            setSettingsFromTitle(true);
            setModalMode('settings');
          }}
        />
      )}

      {/* Playing HUD */}
      {shellState === 'playing' && (
        <GameHud
          hud={hud}
          cameraMode={settings.cameraMode}
          audioMuted={settings.audioMuted}
          debugMode={debugMode}
          phoneOpen={phoneOpen}
          touchControlsActive={showTouchControls}
          toastText={toastText}
          onTogglePhone={handleTogglePhone}
          onToggleCamera={handleToggleCamera}
          onQuickSave={handleSaveGame}
          onToggleMute={() => updateSettings({ audioMuted: !settings.audioMuted })}
          onPause={() => {
            soundEngine.playUiClick();
            setPhoneOpen(false);
            setShellState('paused');
            setModalMode('pause');
          }}
          onAdvanceTime={handleAdvanceTime}
          onSelectTool={handleSelectTool}
          onEquipWeapon={handleEquipWeapon}
        />
      )}

      {/* Phase 3 Diegetic Smartphone Overlay */}
      {shellState === 'playing' && phoneOpen && (
        <PhoneOverlay
          simRef={activeSimRef}
          money={hud.money}
          health={hud.health}
          maxHealth={hud.maxHealth}
          revision={phoneRev}
          onClose={() => setPhoneOpen(false)}
          onBuyItem={handleBuyItem}
          onEquipWeapon={handleEquipWeapon}
          onCall911={handleCall911}
          onTriggerRaid={handleTriggerRaid}
          onPostPhoto={handlePostPhoto}
          onClaimMission={handleClaimMission}
          onFeedViewed={handleFeedViewed}
        />
      )}

      {/* Responsive Android Touch Controls */}
      {showTouchControls && !phoneOpen && (
        <MobileControls
          mobileInputRef={mobileInputRef}
          hasInteractTarget={hud.interaction !== null}
          hasSecondaryAction={
            hud.interaction?.kind === 'door' ||
            hud.interaction?.kind === 'window' ||
            hud.interaction?.kind === 'shelter_enter' ||
            hud.interaction?.kind === 'shelter_exit'
          }
          showTunnelTools={hud.inShelter || hud.inTunnel}
          hasTunnelAction={Boolean(hud.digTarget?.valid)}
          onInteract={() => handleInteract(null)}
          onSecondaryInteract={() =>
            handleInteract(hud.interaction?.kind === 'window' ? 'barricade' : 'lock')
          }
          onUseTool={handleUseActiveTool}
          onCycleTool={handleCycleTool}
        />
      )}

      {/* Pause & Settings Modal */}
      {modalMode !== 'none' && (
        <PauseAndSettingsModal
          mode={modalMode}
          fromTitle={settingsFromTitle}
          hasSave={saveAvailable}
          settings={settings}
          onUpdateSettings={updateSettings}
          onResume={() => {
            soundEngine.playUiClick();
            setModalMode('none');
            setShellState('playing');
          }}
          onSaveGame={handleSaveGame}
          onLoadGame={handleLoadGame}
          onOpenSettings={() => {
            soundEngine.playUiClick();
            setSettingsFromTitle(false);
            setModalMode('settings');
          }}
          onCloseSettings={() => {
            soundEngine.playUiClick();
            if (settingsFromTitle) {
              setModalMode('none');
            } else {
              setModalMode('none');
              setShellState('playing');
            }
          }}
          onReturnToTitle={() => {
            soundEngine.playUiClick();
            setModalMode('none');
            setShellState('title');
          }}
        />
      )}
    </main>
  );
}
