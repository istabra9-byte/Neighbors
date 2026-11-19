/**
 * Isolated R3F WebGL Game Canvas & Simulation Driver.
 * - Mounts once outside re-rendering HUD overlays.
 * - Uses GPU 60fps loop with subtle Bloom + Vignette postprocessing on hardware GPUs.
 * - Uses `frameloop="demand"` + WebGL2 `fenceSync` `afterDraw()` pacing on software WebGL.
 * - Sphere-swept multi-ray SpatialHashGrid 3P camera collision (radius 0.26m), asymmetric damping,
 *   gentle character close-proximity opacity fade, ladder-climb camera tracking, and 1P eye clearance.
 * - Hosts optional F3 DebugOverlay (strictly hidden unless debugMode === true).
 */

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { GameSimulation } from '../simulation/simulation';
import type { AABB, InteractionTarget } from '../simulation/types';
import type { CameraMode, LocalSettings, QualityPreset } from '../storage/localSettings';
import { TOOL_ORDER } from '../tunnels/tunnelEngine';
import type { SoilLayerType, TunnelToolId } from '../tunnels/tunnelTypes';
import { WEAPON_ORDER, type WeaponId } from '../phase3/phase3Types';
import { soundEngine } from '../audio/soundEngine';
import { SkyAndLighting } from './SkyAndLighting';
import { StreetEnvironment } from './StreetEnvironment';
import { HouseView } from './HouseView';
import { TunnelView } from './TunnelView';
import { Phase3EntitiesView } from './Phase3EntitiesView';
import { CharacterMesh } from './CharacterMesh';
import { FirstPersonRig } from './FirstPersonRig';
import { DebugOverlay, type CameraRayDebugData } from './DebugOverlay';

export type GameShellState = 'title' | 'playing' | 'paused';

export interface HudDebugInfo {
  animState: string;
  onStairs: boolean;
  camDist: number;
  camDesired: number;
  camBlocked: boolean;
  colliderCount: number;
  walkabilityPassed: boolean;
  walkabilityHousesPassed: number;
  walkabilityHousesTotal: number;
  walkabilityIssues: number;
}

export interface HudDigTargetSnapshot {
  tool: TunnelToolId;
  actionKind: 'dig' | 'support' | 'light' | 'vent' | 'drain';
  gy: number;
  soil: SoilLayerType;
  valid: boolean;
  reasonKey?: string;
  hitsDone: number;
  hitsMax: number;
  cost: number;
}

export interface HudSnapshot {
  day: number;
  timeOfDay: number;
  isNight: boolean;
  health: number;
  maxHealth: number;
  stamina: number;
  oxygen: number;
  maxOxygen: number;
  money: number;
  locationKey: string;
  interaction: InteractionTarget | null;
  digTarget: HudDigTargetSnapshot | null;
  isClimbing: boolean;
  playerX: number;
  playerY: number;
  playerZ: number;
  floorLevel: number;
  inShelter: boolean;
  inTunnel: boolean;
  inFloodedTunnel: boolean;
  activeTool: TunnelToolId;
  collapseWarning: boolean;
  tunnelCount: number;
  pointerLocked: boolean;
  activeWeapon: WeaponId;
  ownedWeapons: WeaponId[];
  weaponAmmo: Record<WeaponId, number>;
  activeRobberCount: number;
  policeStatus: 'idle' | 'en_route' | 'on_scene' | 'departing';
  raidBannerKey: string | null;
  phoneBadgeCount: number;
  debugInfo?: HudDebugInfo;
}

export interface MobileInputState {
  moveX: number;
  moveY: number;
  sprint: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
}

interface GameCanvasProps {
  simRef: React.MutableRefObject<GameSimulation>;
  shellState: GameShellState;
  phoneOpen: boolean;
  settings: LocalSettings;
  debugMode: boolean;
  isSoftwareGl: boolean;
  isNight: boolean;
  mobileInputRef: React.MutableRefObject<MobileInputState>;
  onHudUpdate: (snap: HudSnapshot) => void;
  onSimToast?: (key: string, params?: Record<string, string | number>) => void;
  onAutoQualityDown?: (nextQuality: QualityPreset) => void;
  onInteractRequest?: (secondary: 'lock' | 'barricade' | null) => void;
  onSelectTool?: (tool: TunnelToolId) => void;
  onEquipWeapon?: (weapon: WeaponId) => void;
  onUseActiveTool?: () => void;
  sceneRevision: number;
}

const CAMERA_RADIUS = 0.26;
const FIRST_PERSON_EYE_HEIGHT = 1.48; // cleanly inside 1.65 m redesigned character head

// Pre-allocated scratch vectors (zero GC in render loop)
const _camDesired = new THREE.Vector3();
const _camAnchor = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _upVec = new THREE.Vector3();

interface InnerSceneProps {
  simRef: React.MutableRefObject<GameSimulation>;
  shellStateRef: React.MutableRefObject<GameShellState>;
  phoneOpenRef: React.MutableRefObject<boolean>;
  settingsRef: React.MutableRefObject<LocalSettings>;
  debugModeRef: React.MutableRefObject<boolean>;
  mobileInputRef: React.MutableRefObject<MobileInputState>;
  onHudUpdateRef: React.MutableRefObject<(snap: HudSnapshot) => void>;
  onSimToastRef: React.MutableRefObject<((key: string, params?: Record<string, string | number>) => void) | undefined>;
  onAutoQualityDownRef: React.MutableRefObject<((q: QualityPreset) => void) | undefined>;
  onInteractRequestRef: React.MutableRefObject<((sec: 'lock' | 'barricade' | null) => void) | undefined>;
  onSelectToolRef: React.MutableRefObject<((tool: TunnelToolId) => void) | undefined>;
  onEquipWeaponRef: React.MutableRefObject<((weapon: WeaponId) => void) | undefined>;
  onUseActiveToolRef: React.MutableRefObject<(() => void) | undefined>;
  cameraMode: CameraMode;
  quality: QualityPreset;
  debugMode: boolean;
  isSoftwareGl: boolean;
  isNight: boolean;
}

function InnerScene({
  simRef,
  shellStateRef,
  phoneOpenRef,
  settingsRef,
  debugModeRef,
  mobileInputRef,
  onHudUpdateRef,
  onSimToastRef,
  onAutoQualityDownRef,
  onInteractRequestRef,
  onSelectToolRef,
  onEquipWeaponRef,
  onUseActiveToolRef,
  cameraMode,
  quality,
  debugMode,
  isSoftwareGl,
  isNight,
}: InnerSceneProps) {
  const { camera, gl, invalidate } = useThree();

  const keysHeldRef = useRef<Set<string>>(new Set());
  const jumpJustPressedRef = useRef(false);
  const pointerLockedRef = useRef(false);
  const draggingLookRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const yawRef = useRef(0.22);
  const pitchRef = useRef(-0.06);
  const titleTourTimeRef = useRef(0);
  const hudTimerRef = useRef(0);
  const lowFpsSecondsRef = useRef(0);
  const lastWallClockRef = useRef(performance.now());
  const cameraInitializedRef = useRef(false);
  const currentCamDistRef = useRef(4.4);
  const playerFadeOpacityRef = useRef(1.0);
  const cameraRayRef = useRef<CameraRayDebugData>({
    rays: [],
    desiredDist: 4.4,
    actualDist: 4.4,
    blocked: false,
    cameraOpacity: 1.0,
  });

  // Sync camera angles from player when simulation resets or loads
  useEffect(() => {
    const p = simRef.current.getLocalPlayer();
    if (p) {
      yawRef.current = p.yaw;
      pitchRef.current = p.pitch;
    }
  }, [simRef]);

  // Unified keyboard + pointer-lock + drag-look listeners (WASD + ZQSD via physical event.code)
  useEffect(() => {
    const dom = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (shellStateRef.current !== 'playing' || phoneOpenRef.current) return;
      soundEngine.unlock();

      const code = e.code;
      const alreadyHeld = keysHeldRef.current.has(code);
      keysHeldRef.current.add(code);

      if (code === 'Space') {
        e.preventDefault();
        if (!alreadyHeld) jumpJustPressedRef.current = true;
      } else if (code === 'KeyE' && !alreadyHeld) {
        onInteractRequestRef.current?.(null);
      } else if (code === 'KeyR' && !alreadyHeld) {
        onInteractRequestRef.current?.('lock');
      } else if (code === 'KeyB' && !alreadyHeld) {
        onInteractRequestRef.current?.('barricade');
      } else if (code === 'KeyF' && !alreadyHeld) {
        onUseActiveToolRef.current?.();
      } else if (!alreadyHeld && code.startsWith('Digit')) {
        const idx = Number(code.slice(5)) - 1;
        const p = simRef.current.getLocalPlayer();
        if (p && (p.inShelter || p.inTunnel)) {
          if (idx >= 0 && idx < TOOL_ORDER.length) {
            onSelectToolRef.current?.(TOOL_ORDER[idx]);
          }
        } else if (idx >= 0 && idx < WEAPON_ORDER.length) {
          const w = WEAPON_ORDER[idx];
          if (simRef.current.state.phase3.ownedWeapons.includes(w)) {
            onEquipWeaponRef.current?.(w);
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    const clearInputs = () => {
      keysHeldRef.current.clear();
      jumpJustPressedRef.current = false;
      draggingLookRef.current = false;
    };

    const onPointerLockChange = () => {
      pointerLockedRef.current = document.pointerLockElement === dom;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (shellStateRef.current !== 'playing' || phoneOpenRef.current) return;
      soundEngine.unlock();
      if (e.button === 0) {
        if (pointerLockedRef.current) {
          onUseActiveToolRef.current?.();
          return;
        }
        draggingLookRef.current = true;
        mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        if (document.pointerLockElement !== dom && dom.requestPointerLock && !isSoftwareGl) {
          try {
            dom.requestPointerLock();
          } catch {
            // Drag-look fallback stays active
          }
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (
        draggingLookRef.current &&
        e.button === 0 &&
        !pointerLockedRef.current &&
        !phoneOpenRef.current
      ) {
        const dragDist = Math.hypot(
          e.clientX - mouseDownPosRef.current.x,
          e.clientY - mouseDownPosRef.current.y,
        );
        if (dragDist < 6) {
          onUseActiveToolRef.current?.();
        }
      }
      draggingLookRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (shellStateRef.current !== 'playing' || phoneOpenRef.current) return;
      const p = simRef.current.getLocalPlayer();
      if (!p) return;
      if (p.inTunnel || p.inShelter) {
        const curIdx = TOOL_ORDER.indexOf(p.activeTool);
        const step = e.deltaY > 0 ? 1 : -1;
        const nextIdx = (curIdx + step + TOOL_ORDER.length) % TOOL_ORDER.length;
        onSelectToolRef.current?.(TOOL_ORDER[nextIdx]);
      } else {
        const owned = simRef.current.state.phase3.ownedWeapons;
        if (owned.length > 1) {
          const curIdx = owned.indexOf(simRef.current.state.phase3.activeWeapon);
          const step = e.deltaY > 0 ? 1 : -1;
          const nextIdx = (curIdx + step + owned.length) % owned.length;
          onEquipWeaponRef.current?.(owned[nextIdx]);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (shellStateRef.current !== 'playing' || phoneOpenRef.current) return;
      const sens = 0.0022 * settingsRef.current.mouseSensitivity;
      if (pointerLockedRef.current) {
        yawRef.current -= e.movementX * sens;
        pitchRef.current = THREE.MathUtils.clamp(
          pitchRef.current - e.movementY * sens,
          -1.18,
          1.12,
        );
      } else if (draggingLookRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        yawRef.current -= dx * sens * 1.4;
        pitchRef.current = THREE.MathUtils.clamp(
          pitchRef.current - dy * sens * 1.4,
          -1.18,
          1.12,
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    dom.addEventListener('mousedown', onMouseDown);
    dom.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      dom.removeEventListener('mousedown', onMouseDown);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [
    gl,
    isSoftwareGl,
    onEquipWeaponRef,
    onInteractRequestRef,
    onSelectToolRef,
    onUseActiveToolRef,
    phoneOpenRef,
    settingsRef,
    shellStateRef,
    simRef,
  ]);

  // Software-WebGL fenceSync `afterDraw()` demand loop so SwiftShader stays completely responsive
  useEffect(() => {
    if (!isSoftwareGl) return;
    let alive = true;
    let timerId = 0;

    const scheduleAfterDraw = () => {
      if (!alive) return;
      const ctx = gl.getContext() as WebGL2RenderingContext;
      if (ctx && typeof ctx.fenceSync === 'function') {
        const sync = ctx.fenceSync(ctx.SYNC_GPU_COMMANDS_COMPLETE, 0);
        ctx.flush();
        const poll = () => {
          if (!alive) {
            if (sync) ctx.deleteSync(sync);
            return;
          }
          const status = sync ? ctx.getSyncParameter(sync, ctx.SYNC_STATUS) : ctx.SIGNALED;
          if (status === ctx.UNSIGNALED) {
            timerId = window.setTimeout(poll, 8);
          } else {
            if (sync) ctx.deleteSync(sync);
            timerId = window.setTimeout(() => {
              if (!alive) return;
              invalidate();
              timerId = window.setTimeout(scheduleAfterDraw, 16);
            }, 85);
          }
        };
        timerId = window.setTimeout(poll, 8);
      } else {
        timerId = window.setTimeout(() => {
          if (!alive) return;
          invalidate();
          scheduleAfterDraw();
        }, 120);
      }
    };

    invalidate();
    timerId = window.setTimeout(scheduleAfterDraw, 40);

    return () => {
      alive = false;
      window.clearTimeout(timerId);
    };
  }, [gl, invalidate, isSoftwareGl]);

  useFrame((_, rawDelta) => {
    const now = performance.now();
    const wallDt = (now - lastWallClockRef.current) / 1000;
    lastWallClockRef.current = now;
    const dt = Math.min(Math.max(isSoftwareGl ? wallDt : rawDelta, 0.001), 0.05);

    const sim = simRef.current;
    const shell = shellStateRef.current;
    const player = sim.getLocalPlayer();
    if (!player) return;

    // Auto-reduce quality on real GPUs if sustained low FPS
    if (!isSoftwareGl && shell === 'playing' && rawDelta > 0) {
      const fps = 1 / rawDelta;
      if (fps < 26) {
        lowFpsSecondsRef.current += rawDelta;
        if (lowFpsSecondsRef.current > 4.5) {
          lowFpsSecondsRef.current = 0;
          const cur = settingsRef.current.quality;
          if (cur === 'high') onAutoQualityDownRef.current?.('medium');
          else if (cur === 'medium') onAutoQualityDownRef.current?.('low');
        }
      } else {
        lowFpsSecondsRef.current = Math.max(0, lowFpsSecondsRef.current - rawDelta * 0.5);
      }
    }

    if (shell === 'title') {
      sim.step(dt);
      sim.drainSoundEvents();

      titleTourTimeRef.current += dt;
      const t = titleTourTimeRef.current;
      // Smooth scenic street flyover framing enlarged 18x14m houses, garages, cars, and Gary
      const cx = Math.sin(t * 0.13) * 18 - 4;
      const cy = 7.4 + Math.sin(t * 0.22) * 0.8;
      const cz = 16.5 + Math.cos(t * 0.13) * 4.5;
      camera.position.set(cx, cy, cz);
      _camLookTarget.set(cx * 0.35 + 6, 3.2, -16);
      camera.lookAt(_camLookTarget);
      cameraInitializedRef.current = false;
      playerFadeOpacityRef.current = 1.0;
      return;
    }

    if (shell === 'paused') {
      return;
    }

    const held = keysHeldRef.current;
    const mob = mobileInputRef.current;

    if (mob.lookDeltaX !== 0 || mob.lookDeltaY !== 0) {
      const sens = 0.0042 * settingsRef.current.mouseSensitivity;
      yawRef.current -= mob.lookDeltaX * sens;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - mob.lookDeltaY * sens,
        -1.18,
        1.12,
      );
      mob.lookDeltaX = 0;
      mob.lookDeltaY = 0;
    }

    let fwd = 0;
    let right = 0;
    if (held.has('KeyW') || held.has('ArrowUp')) fwd += 1;
    if (held.has('KeyS') || held.has('ArrowDown')) fwd -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) right += 1;
    if (held.has('KeyA') || held.has('ArrowLeft')) right -= 1;

    if (Math.abs(mob.moveY) > 0.05) fwd = mob.moveY;
    if (Math.abs(mob.moveX) > 0.05) right = mob.moveX;

    const sprint = held.has('ShiftLeft') || held.has('ShiftRight') || mob.sprint;
    const jumpPressed = jumpJustPressedRef.current || mob.jumpPressed;
    const jumpHeld = held.has('Space') || mob.jumpHeld;
    jumpJustPressedRef.current = false;
    mob.jumpPressed = false;

    sim.applyCommand({
      type: 'MOVE_INPUT',
      actorId: player.id,
      input: {
        forward: fwd,
        right,
        yaw: yawRef.current,
        pitch: pitchRef.current,
        sprint,
        jumpPressed,
        jumpHeld,
      },
    });

    sim.step(dt);

    const sounds = sim.drainSoundEvents();
    for (let i = 0; i < sounds.length; i++) {
      soundEngine.playEvent(sounds[i]);
    }
    const toasts = sim.drainToastEvents();
    for (let i = 0; i < toasts.length; i++) {
      onSimToastRef.current?.(toasts[i].key, toasts[i].params);
    }

    // Shared collider filter for camera raycasts
    const camColliderFilter = (b: AABB): boolean => {
      if (!b.blocksCamera) return false;
      if (b.dynamicDoorId) {
        const door = sim.state.doors[b.dynamicDoorId];
        if (door && door.openProgress > 0.35) return false;
      }
      if (b.hatchHouseId && player.climbState?.kind === 'shelter') {
        return false;
      }
      return true;
    };

    const activeCamMode = settingsRef.current.cameraMode;
    const yaw = player.climbState ? yawRef.current : player.yaw;
    const pitch = player.pitch;

    if (activeCamMode === 'first') {
      const moving = player.animState === 'walk' || player.animState === 'run';
      const bobY = moving
        ? Math.sin(player.walkDistance * 3.8) * (player.animState === 'run' ? 0.05 : 0.026)
        : 0;
      let eyeX = player.position.x;
      let eyeY = player.position.y + FIRST_PERSON_EYE_HEIGHT + bobY;
      let eyeZ = player.position.z;

      // Keep 1P eye position clear of nearby walls/ceilings so near plane never clips geometry
      const fwdX = -Math.sin(yaw);
      const fwdZ = -Math.cos(yaw);
      const fwdHit = sim.spatialGrid.raycast(eyeX, eyeY, eyeZ, fwdX, 0, fwdZ, 0.24, 0.08, camColliderFilter);
      if (fwdHit && fwdHit.t < 0.24) {
        const pull = 0.24 - fwdHit.t;
        eyeX -= fwdX * pull;
        eyeZ -= fwdZ * pull;
      }
      const ceilHit = sim.spatialGrid.raycast(eyeX, eyeY, eyeZ, 0, 1, 0, 0.25, 0.05, camColliderFilter);
      if (ceilHit && ceilHit.t < 0.25) {
        eyeY -= 0.25 - ceilHit.t;
      }

      camera.position.set(eyeX, eyeY, eyeZ);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(pitch, yaw, 0);
      cameraInitializedRef.current = true;
      playerFadeOpacityRef.current = 1.0;

      // Record forward probe ray for F3 debug
      cameraRayRef.current = {
        rays: [
          {
            from: { x: eyeX, y: eyeY, z: eyeZ },
            to: { x: eyeX + fwdX * 0.6, y: eyeY, z: eyeZ + fwdZ * 0.6 },
            hit: fwdHit !== null,
            hitPoint: fwdHit ? { x: fwdHit.hitX, y: fwdHit.hitY, z: fwdHit.hitZ } : undefined,
          },
        ],
        desiredDist: 0,
        actualDist: 0,
        blocked: fwdHit !== null,
        cameraOpacity: 1.0,
      };
    } else {
      // Third-person collision-aware over-the-shoulder camera with sphere-swept multi-raycast
      const isClimbing = player.climbState !== null;
      const shoulderOffset = isClimbing || player.inTunnel ? 0.24 : 0.48;
      const distBack = isClimbing
        ? player.climbState!.kind === 'shelter' || player.climbState!.kind === 'tunnel_shaft'
          ? 2.2
          : 3.6
        : player.inTunnel
          ? 2.25
          : player.inShelter
            ? 2.8
            : player.insideHouseId
              ? 3.6
              : 4.6;
      const clampedPitch = THREE.MathUtils.clamp(pitch, -0.78, 0.68);

      const cosP = Math.cos(clampedPitch);
      const sinP = Math.sin(clampedPitch);
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);

      // Start at character neck/head pivot (y + 1.42 m on 1.65 m character)
      const headX = player.position.x;
      const headY = player.position.y + 1.42;
      const headZ = player.position.z;

      // Validate horizontal shoulder offset with a sphere-swept ray so anchor never enters walls
      const shHit = sim.spatialGrid.raycast(
        headX,
        headY,
        headZ,
        cosY,
        0,
        -sinY,
        shoulderOffset,
        0.2,
        camColliderFilter,
      );
      const safeShoulder = shHit ? Math.max(0, shHit.t - 0.04) : shoulderOffset;
      _camAnchor.set(headX + cosY * safeShoulder, headY, headZ - sinY * safeShoulder);

      const offX = sinY * cosP * distBack;
      const offY = -sinP * distBack + 0.46;
      const offZ = cosY * cosP * distBack;
      const desiredDist = Math.hypot(offX, offY, offZ);
      _rayDir.set(offX / desiredDist, offY / desiredDist, offZ / desiredDist);

      // Build camera orthonormal basis for 4 whisker rays around the sphere-swept center ray
      _rightVec.set(cosY, 0, -sinY);
      _upVec.crossVectors(_rightVec, _rayDir).normalize();

      const whiskerOffsets: Array<[number, number]> = [
        [0, 0],
        [0.16, 0],
        [-0.16, 0],
        [0, 0.14],
        [0, -0.14],
      ];

      let allowedDist = desiredDist;
      let blocked = false;
      const debugRays: CameraRayDebugData['rays'] = [];

      for (let w = 0; w < whiskerOffsets.length; w++) {
        const [rx, ry] = whiskerOffsets[w];
        const ox = _camAnchor.x + _rightVec.x * rx + _upVec.x * ry;
        const oy = _camAnchor.y + _rightVec.y * rx + _upVec.y * ry;
        const oz = _camAnchor.z + _rightVec.z * rx + _upVec.z * ry;

        const hit = sim.spatialGrid.raycast(
          ox,
          oy,
          oz,
          _rayDir.x,
          _rayDir.y,
          _rayDir.z,
          desiredDist,
          w === 0 ? CAMERA_RADIUS : CAMERA_RADIUS * 0.65,
          camColliderFilter,
        );

        if (hit && hit.t < allowedDist) {
          allowedDist = Math.max(0.58, hit.t - 0.04);
          blocked = true;
        }

        if (debugModeRef.current) {
          debugRays.push({
            from: { x: ox, y: oy, z: oz },
            to: {
              x: ox + _rayDir.x * desiredDist,
              y: oy + _rayDir.y * desiredDist,
              z: oz + _rayDir.z * desiredDist,
            },
            hit: hit !== null,
            hitPoint: hit ? { x: hit.hitX, y: hit.hitY, z: hit.hitZ } : undefined,
          });
        }
      }

      // Asymmetric camera distance damping: pull in quickly on wall contact, ease back out gently
      if (!cameraInitializedRef.current) {
        currentCamDistRef.current = allowedDist;
      } else {
        const rate = allowedDist < currentCamDistRef.current ? 24 : 8.5;
        currentCamDistRef.current +=
          (allowedDist - currentCamDistRef.current) * (1 - Math.exp(-rate * dt));
      }

      const dUse = currentCamDistRef.current;
      const minCamY =
        player.inShelter ||
        player.inTunnel ||
        player.climbState?.kind === 'shelter' ||
        player.climbState?.kind === 'tunnel_shaft'
          ? player.position.y + 0.35
          : 0.32;

      _camDesired.set(
        _camAnchor.x + _rayDir.x * dUse,
        Math.max(minCamY, _camAnchor.y + _rayDir.y * dUse),
        _camAnchor.z + _rayDir.z * dUse,
      );

      if (!cameraInitializedRef.current) {
        camera.position.copy(_camDesired);
        cameraInitializedRef.current = true;
      } else {
        const posDamp = 1 - Math.exp(-(blocked ? 24 : 15) * dt);
        camera.position.lerp(_camDesired, posDamp);
      }

      // Gently fade character when camera pulls very close (< 1.35 m) instead of clipping through head
      const targetOpacity = dUse < 1.35 ? THREE.MathUtils.clamp((dUse - 0.55) / 0.8, 0.14, 1.0) : 1.0;
      playerFadeOpacityRef.current = targetOpacity;

      _camLookTarget.set(
        _camAnchor.x - sinY * 6.5,
        _camAnchor.y + sinP * 4.5,
        _camAnchor.z - cosY * 6.5,
      );
      camera.lookAt(_camLookTarget);

      cameraRayRef.current = {
        rays: debugRays,
        desiredDist,
        actualDist: dUse,
        blocked,
        cameraOpacity: targetOpacity,
      };
    }

    // Subtle cave-in camera tremor
    if (player.caveInShakeTimer > 0) {
      const amp = Math.min(0.11, player.caveInShakeTimer * 0.16);
      camera.position.x += Math.sin(now * 0.055) * amp;
      camera.position.y += Math.cos(now * 0.072) * amp * 0.7;
    }

    // Throttled HUD snapshot push (~8 Hz)
    hudTimerRef.current += dt;
    if (hudTimerRef.current >= 0.12) {
      hudTimerRef.current = 0;
      const interaction = sim.findInteractionTarget(player);
      const activeTarget = sim.getActiveTunnelTarget(player);
      const report = sim.walkabilityReport;
      const p3 = sim.state.phase3;
      const activeRobberCount = p3.robbers.filter(
        (r) => r.state !== 'arrested' && r.state !== 'stunned',
      ).length;
      const claimableMissions = p3.missions.filter((m) => m.completed && !m.claimed).length;
      onHudUpdateRef.current({
        day: sim.state.day,
        timeOfDay: sim.state.timeOfDay,
        isNight: sim.state.timeOfDay < 6.0 || sim.state.timeOfDay >= 19.2,
        health: Math.round(player.health),
        maxHealth: player.maxHealth,
        stamina: Math.round(player.stamina),
        oxygen: Math.round(player.oxygen),
        maxOxygen: player.maxOxygen,
        money: Math.round(player.money),
        locationKey: sim.getActorLocationKey(player),
        interaction,
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
        isClimbing: player.climbState !== null,
        playerX: player.position.x,
        playerY: player.position.y,
        playerZ: player.position.z,
        floorLevel: player.currentFloor,
        inShelter: player.inShelter,
        inTunnel: player.inTunnel,
        inFloodedTunnel: player.inFloodedTunnel,
        activeTool: player.activeTool,
        collapseWarning: player.collapseWarningTimer > 0.1,
        tunnelCount: sim.state.tunnels.segments.length,
        pointerLocked: pointerLockedRef.current,
        activeWeapon: p3.activeWeapon,
        ownedWeapons: [...p3.ownedWeapons],
        weaponAmmo: { ...p3.ammo },
        activeRobberCount,
        policeStatus: p3.police.status,
        raidBannerKey: p3.raidBannerKey,
        phoneBadgeCount: activeRobberCount + claimableMissions + p3.unreadFeedCount,
        debugInfo: debugModeRef.current
          ? {
              animState: player.animState,
              onStairs: player.onStairs,
              camDist: cameraRayRef.current.actualDist,
              camDesired: cameraRayRef.current.desiredDist,
              camBlocked: cameraRayRef.current.blocked,
              colliderCount: sim.spatialGrid.count,
              walkabilityPassed: report.passed,
              walkabilityHousesPassed: report.houses.filter((h) => h.passed).length,
              walkabilityHousesTotal: report.totalHouses,
              walkabilityIssues: report.issues.length,
            }
          : undefined,
      });
    }
  });

  const sim = simRef.current;

  return (
    <>
      <SkyAndLighting simRef={simRef} quality={quality} isSoftwareGl={isSoftwareGl} />

      <StreetEnvironment
        streetProps={sim.streetProps}
        houses={sim.houses}
        roadLength={sim.roadLength}
        isNight={isNight}
      />

      {sim.houses.map((bp) => (
        <HouseView
          key={bp.houseId}
          blueprint={bp}
          simRef={simRef}
          cameraMode={cameraMode}
          isNight={isNight}
        />
      ))}

      {/* Phase 2 Underground Tunnel Network, Strata, Props & Particle Bursts */}
      <TunnelView simRef={simRef} />

      {/* Phase 3 Yard/Roof Defenses, Guard Dog & Wildlife, Night Robbers, 911 Police & Projectiles */}
      <Phase3EntitiesView simRef={simRef} isNight={isNight} />

      {/* Player Character (~1.65m stylized-survival rig with close-camera opacity fade) */}
      <CharacterMesh
        actorId="actor_player"
        getActor={() => simRef.current.state.actors['actor_player']}
        visible={cameraMode === 'third' || shellStateRef.current === 'title'}
        fadeOpacityRef={playerFadeOpacityRef}
      />

      {/* Phase 1 Idle AI Neighbor across the street (reuses exact same articulated rig) */}
      <CharacterMesh
        actorId="actor_neighbor_1"
        getActor={() => simRef.current.state.actors['actor_neighbor_1']}
        visible={true}
        isNeighbor={true}
      />

      {/* First-person sleeved forearms, work gloves & equipped Phase 3 weapon / tunnel tool */}
      <FirstPersonRig
        enabled={cameraMode === 'first' && shellStateRef.current === 'playing'}
        getPlayer={() => simRef.current.state.actors['actor_player']}
        getActiveWeapon={() => ({
          weapon: simRef.current.state.phase3.activeWeapon,
          recoil: simRef.current.state.phase3.recoilTimer,
        })}
        isNight={isNight}
      />

      {/* F3 3D Debug Visualization Overlay (strictly unmounted when debugMode is false) */}
      <DebugOverlay enabled={debugMode} simRef={simRef} cameraRayRef={cameraRayRef} />

      {/* Subtle Bloom (lamps/windows only) + Vignette on GPU when quality != low */}
      {!isSoftwareGl && quality !== 'low' && (
        <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
          <Bloom
            intensity={0.32}
            luminanceThreshold={1.15}
            luminanceSmoothing={0.25}
            mipmapBlur
          />
          <Vignette offset={0.28} darkness={0.42} />
        </EffectComposer>
      )}
    </>
  );
}

export function GameCanvas({
  simRef,
  shellState,
  phoneOpen,
  settings,
  debugMode,
  isSoftwareGl,
  isNight,
  mobileInputRef,
  onHudUpdate,
  onSimToast,
  onAutoQualityDown,
  onInteractRequest,
  onSelectTool,
  onEquipWeapon,
  onUseActiveTool,
  sceneRevision,
}: GameCanvasProps) {
  const shellStateRef = useRef(shellState);
  shellStateRef.current = shellState;

  const phoneOpenRef = useRef(phoneOpen);
  phoneOpenRef.current = phoneOpen;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const debugModeRef = useRef(debugMode);
  debugModeRef.current = debugMode;

  const onHudUpdateRef = useRef(onHudUpdate);
  onHudUpdateRef.current = onHudUpdate;

  const onSimToastRef = useRef(onSimToast);
  onSimToastRef.current = onSimToast;

  const onAutoQualityDownRef = useRef(onAutoQualityDown);
  onAutoQualityDownRef.current = onAutoQualityDown;

  const onInteractRequestRef = useRef(onInteractRequest);
  onInteractRequestRef.current = onInteractRequest;

  const onSelectToolRef = useRef(onSelectTool);
  onSelectToolRef.current = onSelectTool;

  const onEquipWeaponRef = useRef(onEquipWeapon);
  onEquipWeaponRef.current = onEquipWeapon;

  const onUseActiveToolRef = useRef(onUseActiveTool);
  onUseActiveToolRef.current = onUseActiveTool;

  const dpr: [number, number] | number = useMemo(() => {
    if (isSoftwareGl) return 1;
    if (settings.quality === 'low') return [0.75, 1];
    if (settings.quality === 'medium') return [1, 1.5];
    return [1, 2];
  }, [isSoftwareGl, settings.quality]);

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden"
      data-testid="game-canvas-container"
    >
      <Canvas
        key={sceneRevision}
        frameloop={isSoftwareGl ? 'demand' : 'always'}
        shadows={isSoftwareGl ? false : 'soft'}
        dpr={dpr}
        camera={{ fov: 62, near: 0.08, far: 360, position: [0, 7, 17] }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.06,
        }}
      >
        <InnerScene
          simRef={simRef}
          shellStateRef={shellStateRef}
          phoneOpenRef={phoneOpenRef}
          settingsRef={settingsRef}
          debugModeRef={debugModeRef}
          mobileInputRef={mobileInputRef}
          onHudUpdateRef={onHudUpdateRef}
          onSimToastRef={onSimToastRef}
          onAutoQualityDownRef={onAutoQualityDownRef}
          onInteractRequestRef={onInteractRequestRef}
          onSelectToolRef={onSelectToolRef}
          onEquipWeaponRef={onEquipWeaponRef}
          onUseActiveToolRef={onUseActiveToolRef}
          cameraMode={settings.cameraMode}
          quality={settings.quality}
          debugMode={debugMode}
          isSoftwareGl={isSoftwareGl}
          isNight={isNight}
        />
      </Canvas>
    </div>
  );
}
