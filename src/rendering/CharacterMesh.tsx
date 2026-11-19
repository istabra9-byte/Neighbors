/**
 * Redesigned ~1.65m stylized-survival low-poly character mesh.
 * Features:
 * - Articulated joint hierarchy: hips -> spine -> neck/head, backpack, shoulders -> elbows -> hands,
 *   hips -> knees -> feet (zero voxel box-stacking; uses tapered cylinders, rounded heads, beveled boots/gloves).
 * - Expressive face seen from the front: blinking eyelids, reactive eyebrows (worried when hurt,
 *   raised when celebrating, furrowed on neighbor), reactive mouth, sculpted nose & ears, beanie or cap.
 * - Smooth exponential crossfade blending across idle (breathing, weight shift, look-around, fidget),
 *   walk, run (forward lean + backpack bounce), stairs (step-up knee lift + slope lean), jump, land,
 *   turn, ladder climb (hand-over-hand alternating limbs), interact, hurt, ko, and celebrate.
 * - Gentle camera-proximity opacity fade when the 3P camera pulls very close to the player.
 * - NPCs & neighbor reuse the exact same rig with varied outfits, colors, and proportions.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ActorEntity, CharacterOutfit } from '../simulation/types';
import { getContactShadowTexture } from './proceduralTextures';
import { loadOptionalModel } from './modelLoader';

interface CharacterMeshProps {
  actorId: string;
  getActor: () => ActorEntity | undefined;
  visible?: boolean;
  isNeighbor?: boolean;
  /** Mutable ref (0..1) controlled by GameCanvas to fade character gently when 3P camera pulls close */
  fadeOpacityRef?: React.MutableRefObject<number>;
}

const DEFAULT_OUTFIT: CharacterOutfit = {
  jacket: '#4c5e4b',
  shirt: '#d7cfc0',
  pants: '#3a4654',
  boots: '#4a3628',
  gloves: '#3d342c',
  backpack: '#6c5840',
  hair: '#3b2c22',
  skin: '#d9b193',
  headwear: 'beanie',
  capColor: '#7a4734',
  heightScale: 1.0,
  shoulderScale: 1.0,
  headScale: 1.0,
};

function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function CharacterMesh({
  actorId,
  getActor,
  visible = true,
  isNeighbor = false,
  fadeOpacityRef,
}: CharacterMeshProps) {
  const rootRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Group>(null);
  const backpackRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const lShoulderRef = useRef<THREE.Group>(null);
  const lElbowRef = useRef<THREE.Group>(null);
  const rShoulderRef = useRef<THREE.Group>(null);
  const rElbowRef = useRef<THREE.Group>(null);

  const lHipRef = useRef<THREE.Group>(null);
  const lKneeRef = useRef<THREE.Group>(null);
  const lFootRef = useRef<THREE.Group>(null);
  const rHipRef = useRef<THREE.Group>(null);
  const rKneeRef = useRef<THREE.Group>(null);
  const rFootRef = useRef<THREE.Group>(null);

  const eyeLRef = useRef<THREE.Group>(null);
  const eyeRRef = useRef<THREE.Group>(null);
  const browLRef = useRef<THREE.Mesh>(null);
  const browRRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);

  const customModelHostRef = useRef<THREE.Group>(null);
  const proceduralGroupRef = useRef<THREE.Group>(null);
  const rightToolRef = useRef<THREE.Group>(null);
  const lastOpacityRef = useRef<number>(1.0);

  const initialActor = getActor();
  const outfit: CharacterOutfit = initialActor?.outfit ?? DEFAULT_OUTFIT;
  const hScale = outfit.heightScale ?? 1.0;
  const sScale = outfit.shoulderScale ?? 1.0;
  const headScale = outfit.headScale ?? 1.0;

  const shadowTex = useMemo(() => getContactShadowTexture(), []);

  // Shared materials per character instance so camera-proximity fade updates cleanly without reallocating
  const mats = useMemo(
    () => ({
      jacket: new THREE.MeshStandardMaterial({ color: outfit.jacket, roughness: 0.82 }),
      jacketDark: new THREE.MeshStandardMaterial({
        color: new THREE.Color(outfit.jacket).multiplyScalar(0.76),
        roughness: 0.86,
      }),
      shirt: new THREE.MeshStandardMaterial({ color: outfit.shirt, roughness: 0.88 }),
      pants: new THREE.MeshStandardMaterial({ color: outfit.pants, roughness: 0.86 }),
      boots: new THREE.MeshStandardMaterial({ color: outfit.boots, roughness: 0.62 }),
      bootSole: new THREE.MeshStandardMaterial({ color: '#221d1a', roughness: 0.9 }),
      gloves: new THREE.MeshStandardMaterial({ color: outfit.gloves, roughness: 0.78 }),
      backpack: new THREE.MeshStandardMaterial({ color: outfit.backpack, roughness: 0.85 }),
      backpackTrim: new THREE.MeshStandardMaterial({ color: '#332d26', roughness: 0.75 }),
      belt: new THREE.MeshStandardMaterial({ color: '#2b241e', roughness: 0.58 }),
      buckle: new THREE.MeshStandardMaterial({ color: '#9c8a5e', metalness: 0.72, roughness: 0.35 }),
      skin: new THREE.MeshStandardMaterial({ color: outfit.skin, roughness: 0.68 }),
      hair: new THREE.MeshStandardMaterial({ color: outfit.hair, roughness: 0.9 }),
      cap: new THREE.MeshStandardMaterial({ color: outfit.capColor, roughness: 0.8 }),
      capCuff: new THREE.MeshStandardMaterial({
        color: new THREE.Color(outfit.capColor).multiplyScalar(0.8),
        roughness: 0.88,
      }),
      sclera: new THREE.MeshStandardMaterial({ color: '#f2efe9', roughness: 0.28 }),
      pupil: new THREE.MeshStandardMaterial({ color: '#1b1a19', roughness: 0.2 }),
      mouth: new THREE.MeshStandardMaterial({ color: '#6b3f35', roughness: 0.6 }),
    }),
    [outfit],
  );

  // Optional glTF/GLB model override check (keeps procedural fallback always ready)
  useEffect(() => {
    let active = true;
    const slotKey = isNeighbor ? 'character_neighbor' : 'character_player';
    void loadOptionalModel(slotKey).then((model) => {
      if (!active || !model || !customModelHostRef.current || !proceduralGroupRef.current) return;
      customModelHostRef.current.clear();
      customModelHostRef.current.add(model);
      proceduralGroupRef.current.visible = false;
    });
    return () => {
      active = false;
    };
  }, [isNeighbor, actorId]);

  useFrame((_, delta) => {
    const actor = getActor();
    const root = rootRef.current;
    if (!actor || !root) return;

    root.visible = visible;
    if (!visible) return;

    const dt = Math.min(delta, 0.05);
    const posRate = actor.climbState ? 24 : 20;
    const lerpPos = 1 - Math.exp(-posRate * dt);
    root.position.x += (actor.position.x - root.position.x) * lerpPos;
    root.position.y += (actor.position.y - root.position.y) * lerpPos;
    root.position.z += (actor.position.z - root.position.z) * lerpPos;

    // Smooth yaw interpolation
    let dyaw = actor.yaw - root.rotation.y;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    root.rotation.y += dyaw * (1 - Math.exp(-15 * dt));

    // Gentle camera-proximity opacity fade when 3P camera pulls very close
    const desiredOpacity = fadeOpacityRef ? fadeOpacityRef.current : 1.0;
    if (Math.abs(desiredOpacity - lastOpacityRef.current) > 0.01) {
      lastOpacityRef.current = desiredOpacity;
      const isTransparent = desiredOpacity < 0.99;
      for (const m of Object.values(mats)) {
        m.transparent = isTransparent;
        m.opacity = desiredOpacity;
        m.depthWrite = !isTransparent;
      }
    }

    const hips = hipsRef.current;
    const spine = spineRef.current;
    const backpack = backpackRef.current;
    const head = headRef.current;
    const lSh = lShoulderRef.current;
    const lEl = lElbowRef.current;
    const rSh = rShoulderRef.current;
    const rEl = rElbowRef.current;
    const lHip = lHipRef.current;
    const lKnee = lKneeRef.current;
    const lFoot = lFootRef.current;
    const rHip = rHipRef.current;
    const rKnee = rKneeRef.current;
    const rFoot = rFootRef.current;
    if (!hips || !spine || !head || !lSh || !lEl || !rSh || !rEl || !lHip || !lKnee || !lFoot || !rHip || !rKnee || !rFoot) {
      return;
    }

    const t = actor.animTime;
    const state = actor.animState;

    // Target joint poses (smoothly crossfaded every frame via exponential damping)
    let hipsY = 0.77;
    let hipsX = 0;
    let hipsRotX = 0;
    let hipsRotZ = 0;
    let spineRotX = 0;
    let spineRotY = 0;
    let spineRotZ = 0;
    let headRotX = 0;
    let headRotY = 0;
    let packY = 0.25;
    let packRotX = 0;

    let lShX = 0;
    let lShZ = 0.10;
    let lElX = -0.14;
    let rShX = 0;
    let rShZ = -0.10;
    let rElX = -0.14;

    let lHipX = 0;
    let lKneeX = 0.04;
    let lFootX = 0;
    let rHipX = 0;
    let rKneeX = 0.04;
    let rFootX = 0;

    const blendRate = state === 'climb' ? 16 : 13;

    if (state === 'climb' && actor.climbState) {
      // Real hand-over-hand alternating ladder climb!
      const p = actor.climbState.climbMeters * 6.2;
      const s = Math.sin(p);
      const c = Math.cos(p);
      hipsY = 0.76 + Math.abs(c) * 0.025;
      hipsX = s * 0.035;
      spineRotX = -0.08;
      spineRotY = -s * 0.14;
      headRotX = actor.climbState.climbVelY < -0.1 ? -0.35 : 0.35; // glance up when climbing up, down when descending

      lShX = -2.15 + s * 0.62;
      rShX = -2.15 - s * 0.62;
      lShZ = 0.18;
      rShZ = -0.18;
      lElX = -0.65 - Math.max(0, -s) * 0.55;
      rElX = -0.65 - Math.max(0, s) * 0.55;

      lHipX = -0.55 - s * 0.48;
      rHipX = -0.55 + s * 0.48;
      lKneeX = 0.75 + Math.max(0, s) * 0.55;
      rKneeX = 0.75 + Math.max(0, -s) * 0.55;
      lFootX = -0.25;
      rFootX = -0.25;
    } else if (state === 'walk' || state === 'run') {
      const isRun = state === 'run';
      const onStairs = actor.onStairs;
      const phase = actor.walkDistance * (isRun ? 3.4 : 4.2);
      const s = Math.sin(phase);
      const c = Math.cos(phase);

      // Step-up knee lift & body slope lean on stairs!
      const stairLift = onStairs ? 0.32 : 0;
      const legAmp = (isRun ? 0.72 : 0.48) + (onStairs ? 0.1 : 0);
      const armAmp = isRun ? 0.88 : 0.44;

      lHipX = s * legAmp - stairLift * Math.max(0, -s);
      rHipX = -s * legAmp - stairLift * Math.max(0, s);
      // Articulated knee bend during swing phase + high step-up knee bend on stairs
      lKneeX = Math.max(0.06, -c * (isRun ? 0.95 : 0.55) + stairLift * 1.4 * Math.max(0, -s));
      rKneeX = Math.max(0.06, c * (isRun ? 0.95 : 0.55) + stairLift * 1.4 * Math.max(0, s));
      lFootX = -lHipX * 0.35 - lKneeX * 0.25;
      rFootX = -rHipX * 0.35 - rKneeX * 0.25;

      lShX = -s * armAmp;
      rShX = s * armAmp;
      lElX = isRun ? -0.95 - Math.max(0, -s) * 0.35 : -0.28 - Math.max(0, -s) * 0.22;
      rElX = isRun ? -0.95 - Math.max(0, s) * 0.35 : -0.28 - Math.max(0, s) * 0.22;
      lShZ = isRun ? 0.15 : 0.1;
      rShZ = isRun ? -0.15 : -0.1;

      // Ground-contact hip bob, hip sway, torso counter-twist, forward lean & backpack bounce
      hipsY = 0.77 + Math.abs(s) * (isRun ? 0.055 : 0.028) - (isRun ? 0.025 : 0);
      hipsX = c * (isRun ? 0.024 : 0.016);
      hipsRotZ = c * (isRun ? 0.055 : 0.032);
      spineRotX = (isRun ? -0.18 : -0.05) - (onStairs ? actor.stairSlope * 0.32 : 0);
      spineRotY = s * (isRun ? 0.14 : 0.075);
      headRotY = -spineRotY * 0.5;
      headRotX = isRun ? 0.12 : 0.02;
      packY = 0.25 + (isRun ? Math.sin(phase * 2 - 0.8) * 0.026 : Math.sin(phase * 2) * 0.008);
      packRotX = isRun ? 0.08 + Math.sin(phase * 2) * 0.06 : 0;
    } else if (state === 'jump') {
      hipsY = 0.81;
      spineRotX = -0.08;
      lHipX = -0.45;
      lKneeX = 0.65;
      rHipX = 0.25;
      rKneeX = 0.32;
      lShX = -0.75;
      rShX = -0.75;
      lShZ = 0.32;
      rShZ = -0.32;
      lElX = -0.4;
      rElX = -0.4;
      packY = 0.28;
      packRotX = 0.14;
    } else if (state === 'land') {
      hipsY = 0.68;
      spineRotX = -0.16;
      lHipX = -0.35;
      lKneeX = 0.62;
      rHipX = -0.35;
      rKneeX = 0.62;
      lShX = 0.22;
      rShX = 0.22;
      lShZ = 0.24;
      rShZ = -0.24;
      packY = 0.22;
    } else if (state === 'turn') {
      const turnDir = Math.sign(actor.turnRate || 1);
      const step = Math.sin(t * 10);
      hipsY = 0.765;
      spineRotY = turnDir * 0.18;
      headRotY = turnDir * 0.24;
      lHipX = step * 0.18;
      rHipX = -step * 0.18;
      lKneeX = Math.max(0.05, -step * 0.25);
      rKneeX = Math.max(0.05, step * 0.25);
      lShZ = 0.14;
      rShZ = -0.14;
    } else if (state === 'dig') {
      // Energetic two-handed shovel thrust & heave
      const swing = Math.sin(t * 22);
      hipsY = 0.72 + Math.max(0, swing) * 0.03;
      spineRotX = -0.26 - swing * 0.16;
      spineRotY = -0.22 + swing * 0.18;
      headRotX = -0.15;
      rShX = -1.45 - swing * 0.65;
      rElX = -0.65 + swing * 0.35;
      rShZ = -0.14;
      lShX = -1.15 - swing * 0.45;
      lElX = -0.75 + swing * 0.25;
      lShZ = 0.22;
      lHipX = -0.22;
      lKneeX = 0.35;
      rHipX = 0.18;
      rKneeX = 0.22;
    } else if (state === 'interact') {
      spineRotX = -0.12;
      spineRotY = -0.16;
      rShX = -1.35;
      rElX = -0.35;
      rShZ = -0.08;
      lShX = -0.2;
      lElX = -0.3;
    } else if (state === 'hurt') {
      hipsY = 0.73;
      spineRotX = 0.26;
      spineRotZ = 0.12;
      headRotX = 0.22;
      lShX = -0.5;
      rShX = -0.8;
      lShZ = 0.4;
      rShZ = -0.35;
      lElX = -0.8;
      rElX = -0.9;
    } else if (state === 'ko') {
      hipsY = 0.18;
      hipsRotX = -Math.PI / 2;
      lShZ = 0.65;
      rShZ = -0.55;
      lKneeX = 0.25;
      rKneeX = 0.15;
    } else if (state === 'celebrate') {
      const bounce = Math.abs(Math.sin(t * 7));
      hipsY = 0.77 + bounce * 0.1;
      lShX = -2.65 + Math.sin(t * 9) * 0.2;
      rShX = -2.65 - Math.sin(t * 9) * 0.2;
      lShZ = 0.35;
      rShZ = -0.35;
      lElX = -0.25;
      rElX = -0.25;
      headRotX = 0.15;
    } else {
      // Expressive idle: breathing, weight shift, periodic look-around, comedic fidget after 4.5s
      const breath = Math.sin(t * 2.15);
      const sway = Math.sin(t * 0.72);
      hipsY = 0.77 + breath * 0.011;
      hipsX = sway * 0.018;
      hipsRotZ = sway * 0.022;
      spineRotZ = -sway * 0.018;
      spineRotX = breath * 0.015;

      // Occasional curious look-around
      const lookCycle = Math.sin(t * 0.55);
      headRotY = isNeighbor
        ? Math.sin(t * 0.95) * 0.42
        : Math.abs(lookCycle) > 0.65
          ? Math.sign(lookCycle) * (Math.abs(lookCycle) - 0.65) * 1.15
          : 0;
      headRotX = breath * 0.025;

      if (isNeighbor) {
        // Gary's signature suspicious suburban hands-on-hips / peering stance
        lShX = -0.18;
        lShZ = 0.32;
        lElX = -0.85;
        rShX = -0.22 + Math.cos(t * 1.3) * 0.08;
        rShZ = -0.30;
        rElX = -0.82;
      } else {
        // Subtle funny fidget after standing idle for > 4.5s (quick head-scratch / shoulder shrug)
        const fidgetWindow = actor.idleTime > 4.5 ? (actor.idleTime - 4.5) % 7.0 : -1;
        if (fidgetWindow >= 0 && fidgetWindow < 1.6) {
          const f = Math.sin((fidgetWindow / 1.6) * Math.PI);
          rShX = -1.65 * f;
          rElX = -1.35 * f;
          rShZ = -0.24 * f;
          headRotZSafe(head, -0.14 * f, dt);
        } else {
          headRotZSafe(head, 0, dt);
          lShX = breath * 0.035;
          rShX = -breath * 0.035;
          lShZ = 0.11;
          rShZ = -0.11;
          lElX = -0.18;
          rElX = -0.18;
        }
      }
    }

    // Apply smooth exponential crossfades to every joint
    hips.position.y = damp(hips.position.y, hipsY, blendRate, dt);
    hips.position.x = damp(hips.position.x, hipsX, blendRate, dt);
    hips.rotation.x = damp(hips.rotation.x, hipsRotX, blendRate, dt);
    hips.rotation.z = damp(hips.rotation.z, hipsRotZ, blendRate, dt);

    spine.rotation.x = damp(spine.rotation.x, spineRotX, blendRate, dt);
    spine.rotation.y = damp(spine.rotation.y, spineRotY, blendRate, dt);
    spine.rotation.z = damp(spine.rotation.z, spineRotZ, blendRate, dt);

    head.rotation.x = damp(head.rotation.x, headRotX, blendRate, dt);
    head.rotation.y = damp(head.rotation.y, headRotY, blendRate, dt);

    if (backpack) {
      backpack.position.y = damp(backpack.position.y, packY, 16, dt);
      backpack.rotation.x = damp(backpack.rotation.x, packRotX, 16, dt);
    }

    lSh.rotation.x = damp(lSh.rotation.x, lShX, blendRate, dt);
    lSh.rotation.z = damp(lSh.rotation.z, lShZ, blendRate, dt);
    lEl.rotation.x = damp(lEl.rotation.x, lElX, blendRate, dt);

    rSh.rotation.x = damp(rSh.rotation.x, rShX, blendRate, dt);
    rSh.rotation.z = damp(rSh.rotation.z, rShZ, blendRate, dt);
    rEl.rotation.x = damp(rEl.rotation.x, rElX, blendRate, dt);

    lHip.rotation.x = damp(lHip.rotation.x, lHipX, blendRate, dt);
    lKnee.rotation.x = damp(lKnee.rotation.x, lKneeX, blendRate, dt);
    lFoot.rotation.x = damp(lFoot.rotation.x, lFootX, blendRate, dt);

    rHip.rotation.x = damp(rHip.rotation.x, rHipX, blendRate, dt);
    rKnee.rotation.x = damp(rKnee.rotation.x, rKneeX, blendRate, dt);
    rFoot.rotation.x = damp(rFoot.rotation.x, rFootX, blendRate, dt);

    if (rightToolRef.current) {
      rightToolRef.current.visible =
        !isNeighbor && !actor.climbState && (state === 'dig' || actor.inTunnel || actor.inShelter);
    }

    // Expressive face animations: natural blinking + reactive eyebrows + mouth!
    const blinkCycle = (t + (isNeighbor ? 1.4 : 0)) % 3.8;
    const isBlinking = state === 'ko' || (blinkCycle > 3.64 && blinkCycle < 3.78);
    const eyeScaleY = isBlinking ? 0.14 : 1.0;
    if (eyeLRef.current) eyeLRef.current.scale.y = damp(eyeLRef.current.scale.y, eyeScaleY, 28, dt);
    if (eyeRRef.current) eyeRRef.current.scale.y = damp(eyeRRef.current.scale.y, eyeScaleY, 28, dt);

    // Eyebrow reactions: worried when hurt, raised when celebrating, furrowed on neighbor
    let browTilt = isNeighbor ? -0.18 : 0.03;
    let browY = 0.205;
    if (state === 'hurt') {
      browTilt = 0.24; // worried inner-raised brows
      browY = 0.215;
    } else if (state === 'celebrate') {
      browTilt = 0.10;
      browY = 0.228;
    }
    if (browLRef.current) {
      browLRef.current.rotation.z = damp(browLRef.current.rotation.z, browTilt, 16, dt);
      browLRef.current.position.y = damp(browLRef.current.position.y, browY, 16, dt);
    }
    if (browRRef.current) {
      browRRef.current.rotation.z = damp(browRRef.current.rotation.z, -browTilt, 16, dt);
      browRRef.current.position.y = damp(browRRef.current.position.y, browY, 16, dt);
    }
    if (mouthRef.current) {
      const targetScaleX = state === 'celebrate' ? 1.45 : state === 'hurt' ? 0.72 : 1.0;
      const targetScaleY = state === 'celebrate' ? 1.6 : state === 'hurt' ? 1.5 : 0.85;
      mouthRef.current.scale.x = damp(mouthRef.current.scale.x, targetScaleX, 16, dt);
      mouthRef.current.scale.y = damp(mouthRef.current.scale.y, targetScaleY, 16, dt);
    }
  });

  return (
    <group ref={rootRef} name={`actor_${actorId}`}>
      {/* Soft radial contact shadow grounded at feet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} renderOrder={1}>
        <circleGeometry args={[0.42, 20]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.76} />
      </mesh>

      {/* Optional GLB override host */}
      <group ref={customModelHostRef} />

      {/* Redesigned ~1.65m Articulated Low-Poly Stylized-Survival Rig (faces -Z) */}
      <group ref={proceduralGroupRef} scale={[sScale, hScale, sScale]}>
        {/* HIPS ROOT (y = 0.77 m) */}
        <group ref={hipsRef} position={[0, 0.77, 0]}>
          {/* Pelvis & Utility Belt */}
          <mesh position={[0, 0.0, 0]} material={mats.pants} castShadow receiveShadow>
            <cylinderGeometry args={[0.175, 0.165, 0.14, 10]} />
          </mesh>
          <mesh position={[0, 0.06, 0]} material={mats.belt} castShadow>
            <cylinderGeometry args={[0.185, 0.185, 0.06, 12]} />
          </mesh>
          <mesh position={[0, 0.06, -0.182]} material={mats.buckle}>
            <boxGeometry args={[0.075, 0.055, 0.025]} />
          </mesh>

          {/* ================= SPINE & CHUNKY JACKET ================= */}
          <group ref={spineRef} position={[0, 0.08, 0]}>
            {/* Tapered jacket torso (wider shoulders, cinched waist) */}
            <mesh position={[0, 0.24, 0]} scale={[1.18, 1.0, 0.78]} material={mats.jacket} castShadow receiveShadow>
              <cylinderGeometry args={[0.205, 0.17, 0.46, 10]} />
            </mesh>
            {/* Rounded upper chest / shoulder yoke */}
            <mesh position={[0, 0.45, 0]} scale={[1.28, 0.55, 0.8]} material={mats.jacket} castShadow>
              <sphereGeometry args={[0.195, 10, 8]} />
            </mesh>
            {/* Inner shirt placket & zipper seam */}
            <mesh position={[0, 0.25, -0.145]} material={mats.shirt}>
              <boxGeometry args={[0.10, 0.38, 0.03]} />
            </mesh>
            {/* Chunky upturned jacket collar */}
            <mesh position={[0, 0.49, 0.01]} material={mats.jacketDark} castShadow>
              <cylinderGeometry args={[0.115, 0.13, 0.09, 10]} />
            </mesh>
            {/* Front jacket pockets */}
            <mesh position={[-0.12, 0.15, -0.142]} material={mats.jacketDark}>
              <boxGeometry args={[0.1, 0.11, 0.03]} />
            </mesh>
            <mesh position={[0.12, 0.15, -0.142]} material={mats.jacketDark}>
              <boxGeometry args={[0.1, 0.11, 0.03]} />
            </mesh>

            {/* ================= SURVIVAL BACKPACK (bounces on run/jump) ================= */}
            <group ref={backpackRef} position={[0, 0.25, 0.195]}>
              {/* Main pack body (rounded capsule-like silhouette) */}
              <mesh scale={[1.0, 1.0, 0.72]} material={mats.backpack} castShadow receiveShadow>
                <cylinderGeometry args={[0.145, 0.155, 0.34, 8]} />
              </mesh>
              {/* Top flap & bedroll */}
              <mesh position={[0, 0.17, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.backpackTrim} castShadow>
                <cylinderGeometry args={[0.065, 0.065, 0.27, 8]} />
              </mesh>
              {/* Rear utility pouch */}
              <mesh position={[0, -0.05, 0.105]} material={mats.backpackTrim} castShadow>
                <boxGeometry args={[0.20, 0.15, 0.06]} />
              </mesh>
              {/* Shoulder straps wrapping onto front of jacket */}
              <mesh position={[-0.12, 0.04, -0.19]} material={mats.backpackTrim}>
                <boxGeometry args={[0.042, 0.36, 0.035]} />
              </mesh>
              <mesh position={[0.12, 0.04, -0.19]} material={mats.backpackTrim}>
                <boxGeometry args={[0.042, 0.36, 0.035]} />
              </mesh>
            </group>

            {/* ================= NECK + STYLIZED EXPRESSIVE HEAD ================= */}
            <group ref={headRef} position={[0, 0.50, 0]} scale={[headScale, headScale, headScale]}>
              {/* Neck */}
              <mesh position={[0, 0.045, 0]} material={mats.skin} castShadow>
                <cylinderGeometry args={[0.062, 0.072, 0.095, 10]} />
              </mesh>
              {/* Slightly larger rounded low-poly cranium + jaw (readable, stylized-survival!) */}
              <mesh position={[0, 0.185, 0]} scale={[0.96, 1.05, 0.98]} material={mats.skin} castShadow receiveShadow>
                <icosahedronGeometry args={[0.148, 1]} />
              </mesh>
              {/* Chin/jaw taper */}
              <mesh position={[0, 0.105, -0.025]} scale={[0.85, 0.72, 0.85]} material={mats.skin} castShadow>
                <sphereGeometry args={[0.095, 8, 6]} />
              </mesh>
              {/* Ears */}
              <mesh position={[-0.142, 0.175, 0.01]} scale={[0.45, 0.75, 0.55]} material={mats.skin}>
                <sphereGeometry args={[0.045, 6, 6]} />
              </mesh>
              <mesh position={[0.142, 0.175, 0.01]} scale={[0.45, 0.75, 0.55]} material={mats.skin}>
                <sphereGeometry args={[0.045, 6, 6]} />
              </mesh>
              {/* Sculpted Nose */}
              <mesh position={[0, 0.16, -0.142]} rotation={[0.25, 0, 0]} material={mats.skin} castShadow>
                <coneGeometry args={[0.028, 0.06, 6]} />
              </mesh>

              {/* Blinking Eyes (seen clearly from front!) */}
              <group ref={eyeLRef} position={[-0.054, 0.185, -0.132]}>
                <mesh material={mats.sclera}>
                  <sphereGeometry args={[0.025, 8, 6]} />
                </mesh>
                <mesh position={[0, 0, -0.019]} material={mats.pupil}>
                  <sphereGeometry args={[0.013, 6, 6]} />
                </mesh>
              </group>
              <group ref={eyeRRef} position={[0.054, 0.185, -0.132]}>
                <mesh material={mats.sclera}>
                  <sphereGeometry args={[0.025, 8, 6]} />
                </mesh>
                <mesh position={[0, 0, -0.019]} material={mats.pupil}>
                  <sphereGeometry args={[0.013, 6, 6]} />
                </mesh>
              </group>

              {/* Reactive Eyebrows */}
              <mesh ref={browLRef} position={[-0.056, 0.222, -0.140]} material={mats.hair}>
                <boxGeometry args={[0.058, 0.016, 0.018]} />
              </mesh>
              <mesh ref={browRRef} position={[0.056, 0.222, -0.140]} material={mats.hair}>
                <boxGeometry args={[0.058, 0.016, 0.018]} />
              </mesh>

              {/* Reactive Mouth */}
              <mesh ref={mouthRef} position={[0, 0.112, -0.134]} material={mats.mouth}>
                <boxGeometry args={[0.055, 0.014, 0.015]} />
              </mesh>

              {/* Back/side hair */}
              <mesh position={[0, 0.195, 0.055]} scale={[1.02, 0.92, 0.82]} material={mats.hair} castShadow>
                <sphereGeometry args={[0.138, 10, 8]} />
              </mesh>

              {/* Headwear: Knit Beanie OR Baseball Cap */}
              {outfit.headwear === 'beanie' && (
                <group position={[0, 0.255, 0.01]}>
                  {/* Knit dome */}
                  <mesh scale={[1.04, 0.85, 1.05]} material={mats.cap} castShadow>
                    <sphereGeometry args={[0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                  </mesh>
                  {/* Folded ribbed cuff */}
                  <mesh position={[0, -0.015, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.capCuff} castShadow>
                    <torusGeometry args={[0.142, 0.026, 6, 14]} />
                  </mesh>
                  {/* Top slouch nub */}
                  <mesh position={[0, 0.125, 0.02]} material={mats.capCuff}>
                    <sphereGeometry args={[0.036, 7, 6]} />
                  </mesh>
                </group>
              )}
              {outfit.headwear === 'cap' && (
                <group position={[0, 0.255, 0.005]}>
                  <mesh scale={[1.05, 0.72, 1.08]} material={mats.cap} castShadow>
                    <sphereGeometry args={[0.148, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                  </mesh>
                  {/* Curved visor brim */}
                  <mesh position={[0, 0.0, -0.15]} rotation={[0.14, 0, 0]} material={mats.capCuff} castShadow>
                    <cylinderGeometry args={[0.12, 0.135, 0.018, 10, 1, false, -Math.PI * 0.42, Math.PI * 0.84]} />
                  </mesh>
                </group>
              )}
            </group>

            {/* ================= LEFT ARM (Shoulder -> Upper Arm -> Elbow -> Forearm -> Work Glove) ================= */}
            <group ref={lShoulderRef} position={[-0.255, 0.42, 0]}>
              <mesh material={mats.jacket} castShadow>
                <sphereGeometry args={[0.072, 8, 6]} />
              </mesh>
              <mesh position={[0, -0.125, 0]} material={mats.jacket} castShadow receiveShadow>
                <cylinderGeometry args={[0.066, 0.056, 0.23, 8]} />
              </mesh>
              <group ref={lElbowRef} position={[0, -0.24, 0]}>
                <mesh material={mats.jacketDark} castShadow>
                  <sphereGeometry args={[0.056, 7, 6]} />
                </mesh>
                <mesh position={[0, -0.11, 0]} material={mats.jacket} castShadow receiveShadow>
                  <cylinderGeometry args={[0.054, 0.044, 0.21, 8]} />
                </mesh>
                {/* Cuff */}
                <mesh position={[0, -0.215, 0]} material={mats.jacketDark}>
                  <cylinderGeometry args={[0.048, 0.046, 0.04, 8]} />
                </mesh>
                {/* Gloved Hand + Thumb */}
                <mesh position={[0, -0.265, -0.008]} scale={[0.85, 1.05, 0.9]} material={mats.gloves} castShadow>
                  <sphereGeometry args={[0.052, 8, 6]} />
                </mesh>
                <mesh position={[0.032, -0.255, -0.032]} material={mats.gloves}>
                  <sphereGeometry args={[0.022, 6, 6]} />
                </mesh>
              </group>
            </group>

            {/* ================= RIGHT ARM (Shoulder -> Upper Arm -> Elbow -> Forearm -> Work Glove) ================= */}
            <group ref={rShoulderRef} position={[0.255, 0.42, 0]}>
              <mesh material={mats.jacket} castShadow>
                <sphereGeometry args={[0.072, 8, 6]} />
              </mesh>
              <mesh position={[0, -0.125, 0]} material={mats.jacket} castShadow receiveShadow>
                <cylinderGeometry args={[0.066, 0.056, 0.23, 8]} />
              </mesh>
              <group ref={rElbowRef} position={[0, -0.24, 0]}>
                <mesh material={mats.jacketDark} castShadow>
                  <sphereGeometry args={[0.056, 7, 6]} />
                </mesh>
                <mesh position={[0, -0.11, 0]} material={mats.jacket} castShadow receiveShadow>
                  <cylinderGeometry args={[0.054, 0.044, 0.21, 8]} />
                </mesh>
                <mesh position={[0, -0.215, 0]} material={mats.jacketDark}>
                  <cylinderGeometry args={[0.048, 0.046, 0.04, 8]} />
                </mesh>
                <mesh position={[0, -0.265, -0.008]} scale={[0.85, 1.05, 0.9]} material={mats.gloves} castShadow>
                  <sphereGeometry args={[0.052, 8, 6]} />
                </mesh>
                <mesh position={[-0.032, -0.255, -0.032]} material={mats.gloves}>
                  <sphereGeometry args={[0.022, 6, 6]} />
                </mesh>
                {/* Held Shovel / Digging Tool (visible underground or while digging) */}
                <group ref={rightToolRef} position={[0, -0.27, -0.04]} rotation={[Math.PI / 2.2, 0, 0]} visible={false}>
                  <mesh position={[0, 0.25, 0]}>
                    <cylinderGeometry args={[0.02, 0.022, 0.96, 8]} />
                    <meshStandardMaterial color="#7d5c3e" roughness={0.82} />
                  </mesh>
                  <mesh position={[0, -0.28, 0.02]} rotation={[0.14, 0, 0]}>
                    <boxGeometry args={[0.19, 0.24, 0.022]} />
                    <meshStandardMaterial color="#585e64" metalness={0.72} roughness={0.4} />
                  </mesh>
                  <mesh position={[0, 0.74, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.022, 0.022, 0.13, 6]} />
                    <meshStandardMaterial color="#543e2a" roughness={0.85} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>

          {/* ================= LEFT LEG (Hip -> Thigh -> Knee -> Shin -> Work Boot) ================= */}
          <group ref={lHipRef} position={[-0.105, -0.03, 0]}>
            <mesh position={[0, -0.165, 0]} material={mats.pants} castShadow receiveShadow>
              <cylinderGeometry args={[0.082, 0.068, 0.34, 8]} />
            </mesh>
            <group ref={lKneeRef} position={[0, -0.34, 0]}>
              <mesh material={mats.pants} castShadow>
                <sphereGeometry args={[0.066, 7, 6]} />
              </mesh>
              <mesh position={[0, -0.155, 0]} material={mats.pants} castShadow receiveShadow>
                <cylinderGeometry args={[0.066, 0.056, 0.31, 8]} />
              </mesh>
              {/* Work Boot (ankle collar + toe box + rugged tread sole) */}
              <group ref={lFootRef} position={[0, -0.32, 0]}>
                <mesh position={[0, -0.015, -0.01]} material={mats.boots} castShadow receiveShadow>
                  <cylinderGeometry args={[0.064, 0.068, 0.11, 8]} />
                </mesh>
                <mesh position={[0, -0.04, -0.075]} scale={[0.92, 0.65, 1.1]} material={mats.boots} castShadow>
                  <sphereGeometry args={[0.068, 8, 6]} />
                </mesh>
                <mesh position={[0, -0.072, -0.04]} material={mats.bootSole} castShadow>
                  <boxGeometry args={[0.125, 0.032, 0.235]} />
                </mesh>
              </group>
            </group>
          </group>

          {/* ================= RIGHT LEG (Hip -> Thigh -> Knee -> Shin -> Work Boot) ================= */}
          <group ref={rHipRef} position={[0.105, -0.03, 0]}>
            <mesh position={[0, -0.165, 0]} material={mats.pants} castShadow receiveShadow>
              <cylinderGeometry args={[0.082, 0.068, 0.34, 8]} />
            </mesh>
            <group ref={rKneeRef} position={[0, -0.34, 0]}>
              <mesh material={mats.pants} castShadow>
                <sphereGeometry args={[0.066, 7, 6]} />
              </mesh>
              <mesh position={[0, -0.155, 0]} material={mats.pants} castShadow receiveShadow>
                <cylinderGeometry args={[0.066, 0.056, 0.31, 8]} />
              </mesh>
              <group ref={rFootRef} position={[0, -0.32, 0]}>
                <mesh position={[0, -0.015, -0.01]} material={mats.boots} castShadow receiveShadow>
                  <cylinderGeometry args={[0.064, 0.068, 0.11, 8]} />
                </mesh>
                <mesh position={[0, -0.04, -0.075]} scale={[0.92, 0.65, 1.1]} material={mats.boots} castShadow>
                  <sphereGeometry args={[0.068, 8, 6]} />
                </mesh>
                <mesh position={[0, -0.072, -0.04]} material={mats.bootSole} castShadow>
                  <boxGeometry args={[0.125, 0.032, 0.235]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function headRotZSafe(head: THREE.Group, targetZ: number, dt: number): void {
  head.rotation.z = damp(head.rotation.z, targetZ, 12, dt);
}
