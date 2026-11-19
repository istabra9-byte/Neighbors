/**
 * Phase 3 3D World Entities Renderer:
 * - Placed Yard Defenses (Spring Trap, Proximity Mine, Guard Doghouse, Laser Gnome, Shock Fence, Auto Gate)
 * - Placed Roof Defenses (Swiveling Roof Cannon, Rotating Radar Dish, Paint Mortar Launcher)
 * - Animated Animals (Guard Dog Buster, Stray Cat, Neighborhood Raccoon)
 * - Nighttime Robbers (Burglars & Ninjas with loot sacks & animations)
 * - 911 Police Patrol Cruiser with alternating red/blue lightbar & arresting Officer
 * - In-flight ballistic projectiles & expanding impact/stink/explosion bursts
 *
 * Uses zero per-entity dynamic pointLights (emissive materials only) so Software WebGL stays fast.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameSimulation } from '../simulation/simulation';
import type {
  AnimalEntity,
  DefenseBuildState,
  Phase3FxEvent,
  PoliceDispatchState,
  ProjectileEntity,
  RobberEntity,
} from '../phase3/phase3Types';

interface Phase3EntitiesViewProps {
  simRef: React.MutableRefObject<GameSimulation>;
  isNight: boolean;
}

interface RenderSnapshot {
  defenses: DefenseBuildState[];
  animals: AnimalEntity[];
  robbers: RobberEntity[];
  projectiles: ProjectileEntity[];
  fx: Phase3FxEvent[];
  policeActive: boolean;
}

function DefenseMesh({ def, simRef }: { def: DefenseBuildState; simRef: React.MutableRefObject<GameSimulation> }) {
  const turretRef = useRef<THREE.Group>(null);
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const live = simRef.current.state.phase3.defenses[def.slotId];
    if (!live) return;
    if (turretRef.current) {
      turretRef.current.rotation.y = live.turretYaw;
    }
    if (ledRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 5.0);
      ledRef.current.emissiveIntensity = live.armed ? 1.1 + pulse * 1.4 : 0.15;
    }
  });

  const armedColor = def.armed ? '#e5483a' : '#5e6268';

  if (def.itemId === 'def_trap_front') {
    return (
      <group position={[def.position.x, def.position.y + 0.04, def.position.z]} rotation={[0, def.rotationY, 0]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[0.56, 0.62, 0.08, 12]} />
          <meshStandardMaterial color="#3c4248" metalness={0.68} roughness={0.42} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.05, 10]} />
          <meshStandardMaterial color={def.armed ? '#d6822d' : '#63686e'} roughness={0.45} />
        </mesh>
        {/* Hinged steel jaws */}
        <mesh position={[-0.3, 0.12, 0]} rotation={[0, 0, def.armed ? 0.35 : -0.45]} castShadow>
          <boxGeometry args={[0.14, 0.12, 0.85]} />
          <meshStandardMaterial color="#757d86" metalness={0.75} roughness={0.35} />
        </mesh>
        <mesh position={[0.3, 0.12, 0]} rotation={[0, 0, def.armed ? -0.35 : 0.45]} castShadow>
          <boxGeometry args={[0.14, 0.12, 0.85]} />
          <meshStandardMaterial color="#757d86" metalness={0.75} roughness={0.35} />
        </mesh>
      </group>
    );
  }

  if (def.itemId === 'def_mine_driveway') {
    return (
      <group position={[def.position.x, def.position.y + 0.05, def.position.z]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.5, 0.12, 14]} />
          <meshStandardMaterial color="#4a5344" metalness={0.45} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshStandardMaterial
            ref={ledRef}
            color={armedColor}
            emissive={armedColor}
            emissiveIntensity={1.6}
            roughness={0.25}
          />
        </mesh>
      </group>
    );
  }

  if (def.itemId === 'def_doghouse') {
    return (
      <group position={[def.position.x, def.position.y, def.position.z]} rotation={[0, def.rotationY, 0]}>
        {/* Wooden base & walls */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.38, 0.9, 1.52]} />
          <meshStandardMaterial color="#9c6c43" roughness={0.86} />
        </mesh>
        {/* Dark cozy interior doorway */}
        <mesh position={[0, 0.36, 0.765]}>
          <boxGeometry args={[0.56, 0.66, 0.04]} />
          <meshStandardMaterial color="#1f1a17" roughness={0.95} />
        </mesh>
        {/* Gabled shingle roof */}
        <mesh position={[-0.42, 1.12, 0]} rotation={[0, 0, 0.54]} castShadow receiveShadow>
          <boxGeometry args={[0.98, 0.1, 1.76]} />
          <meshStandardMaterial color="#6e362c" roughness={0.78} />
        </mesh>
        <mesh position={[0.42, 1.12, 0]} rotation={[0, 0, -0.54]} castShadow receiveShadow>
          <boxGeometry args={[0.98, 0.1, 1.76]} />
          <meshStandardMaterial color="#6e362c" roughness={0.78} />
        </mesh>
        {/* Bone nameplate */}
        <mesh position={[0, 0.84, 0.78]}>
          <boxGeometry args={[0.42, 0.12, 0.04]} />
          <meshStandardMaterial color="#ede4d2" roughness={0.6} />
        </mesh>
        {/* Water/food bowl beside doghouse */}
        <mesh position={[0.88, 0.08, 0.45]} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.14, 10]} />
          <meshStandardMaterial color="#c94b3b" roughness={0.45} />
        </mesh>
      </group>
    );
  }

  if (def.itemId === 'def_gnome') {
    return (
      <group position={[def.position.x, def.position.y, def.position.z]}>
        {/* Pedestal */}
        <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.38, 0.44, 0.28, 10]} />
          <meshStandardMaterial color="#8d8b84" roughness={0.88} />
        </mesh>
        {/* Rotating Gnome Turret */}
        <group ref={turretRef} position={[0, 0.28, 0]}>
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.24, 0.52, 10]} />
            <meshStandardMaterial color="#2f5c8a" roughness={0.68} />
          </mesh>
          {/* Beard & face */}
          <mesh position={[0, 0.62, 0]} castShadow>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial color="#e0b898" roughness={0.65} />
          </mesh>
          <mesh position={[0, 0.5, 0.12]}>
            <coneGeometry args={[0.14, 0.24, 8]} />
            <meshStandardMaterial color="#f0ece4" roughness={0.85} />
          </mesh>
          {/* Pointy red hat */}
          <mesh position={[0, 0.92, 0]} castShadow>
            <coneGeometry args={[0.18, 0.46, 10]} />
            <meshStandardMaterial color="#c83c32" roughness={0.55} />
          </mesh>
          {/* Glowing laser visor sensor */}
          <mesh position={[0, 0.64, 0.15]}>
            <boxGeometry args={[0.2, 0.06, 0.05]} />
            <meshStandardMaterial
              ref={ledRef}
              color="#ff3d3d"
              emissive="#ff3d3d"
              emissiveIntensity={2.0}
              roughness={0.2}
            />
          </mesh>
        </group>
      </group>
    );
  }

  if (def.itemId === 'def_fence' || def.itemId === 'def_gate') {
    const isGate = def.itemId === 'def_gate';
    return (
      <group position={[def.position.x, def.position.y, def.position.z]} rotation={[0, def.rotationY, 0]}>
        {[-1.35, 1.35].map((px) => (
          <mesh key={px} position={[px, 0.72, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.22, 1.44, 0.22]} />
            <meshStandardMaterial color="#4b535c" metalness={0.65} roughness={0.42} />
          </mesh>
        ))}
        <mesh position={[0, 0.85, 0]} castShadow>
          <boxGeometry args={[2.6, 0.14, 0.1]} />
          <meshStandardMaterial color={isGate ? '#d98a2b' : '#73808c'} metalness={0.55} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[2.6, 0.1, 0.08]} />
          <meshStandardMaterial color="#58636e" metalness={0.55} roughness={0.45} />
        </mesh>
        <mesh position={[1.35, 1.5, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            ref={ledRef}
            color="#f5a623"
            emissive="#f5a623"
            emissiveIntensity={1.6}
          />
        </mesh>
      </group>
    );
  }

  if (def.itemId === 'roof_radar') {
    return (
      <group position={[def.position.x, def.position.y, def.position.z]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.35, 0.7, 10]} />
          <meshStandardMaterial color="#4c535a" metalness={0.6} roughness={0.45} />
        </mesh>
        <group ref={turretRef} position={[0, 0.85, 0]}>
          <mesh rotation={[0.45, 0, 0]} castShadow>
            <cylinderGeometry args={[0.82, 0.18, 0.26, 14]} />
            <meshStandardMaterial color="#cfd5db" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.42, 0.24]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial
              ref={ledRef}
              color="#52d681"
              emissive="#52d681"
              emissiveIntensity={1.8}
            />
          </mesh>
        </group>
      </group>
    );
  }

  // Roof Auto-Cannon or Roof Paint Mortar Launcher
  const isLauncher = def.itemId === 'roof_launcher';
  return (
    <group position={[def.position.x, def.position.y, def.position.z]}>
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.72, 0.64, 12]} />
        <meshStandardMaterial color="#3c434a" metalness={0.62} roughness={0.45} />
      </mesh>
      <group ref={turretRef} position={[0, 0.85, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.72, 0.52, 0.86]} />
          <meshStandardMaterial
            color={isLauncher ? '#596e49' : '#3a668a'}
            metalness={0.45}
            roughness={0.45}
          />
        </mesh>
        {isLauncher ? (
          <>
            <mesh position={[-0.18, 0.18, 0.52]} rotation={[Math.PI / 2 - 0.35, 0, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.15, 0.95, 10]} />
              <meshStandardMaterial color="#2b3036" metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh position={[0.18, 0.18, 0.52]} rotation={[Math.PI / 2 - 0.35, 0, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.15, 0.95, 10]} />
              <meshStandardMaterial color="#2b3036" metalness={0.7} roughness={0.35} />
            </mesh>
          </>
        ) : (
          <mesh position={[0, 0.05, 0.72]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.14, 1.25, 10]} />
            <meshStandardMaterial color="#2d3338" metalness={0.72} roughness={0.35} />
          </mesh>
        )}
        <mesh position={[0, 0.34, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial
            ref={ledRef}
            color="#f29f38"
            emissive="#f29f38"
            emissiveIntensity={1.6}
          />
        </mesh>
      </group>
    </group>
  );
}

function AnimalMesh({ animalId, simRef }: { animalId: string; simRef: React.MutableRefObject<GameSimulation> }) {
  const rootRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const legFL = useRef<THREE.Mesh>(null);
  const legFR = useRef<THREE.Mesh>(null);
  const legBL = useRef<THREE.Mesh>(null);
  const legBR = useRef<THREE.Mesh>(null);

  const initial = simRef.current.state.phase3.animals.find((a) => a.id === animalId);
  const kind = initial?.kind ?? 'guard_dog';

  useFrame((_, delta) => {
    const a = simRef.current.state.phase3.animals.find((item) => item.id === animalId);
    const root = rootRef.current;
    if (!a || !root) return;
    const dt = Math.min(delta, 0.05);
    const rate = 1 - Math.exp(-16 * dt);
    root.position.x += (a.position.x - root.position.x) * rate;
    root.position.y += (a.position.y - root.position.y) * rate;
    root.position.z += (a.position.z - root.position.z) * rate;
    root.rotation.y = a.yaw;

    const strideFreq = a.state === 'chase' ? 14 : 7.5;
    const swing = Math.sin(a.animTime * strideFreq) * (a.state === 'chase' ? 0.55 : 0.28);
    if (legFL.current) legFL.current.rotation.x = swing;
    if (legBR.current) legBR.current.rotation.x = swing;
    if (legFR.current) legFR.current.rotation.x = -swing;
    if (legBL.current) legBL.current.rotation.x = -swing;
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(a.animTime * 12) * 0.48;
    }
  });

  const scale = kind === 'guard_dog' ? 1.0 : kind === 'raccoon' ? 0.68 : 0.58;
  const bodyColor = kind === 'guard_dog' ? '#b07b42' : kind === 'raccoon' ? '#676b70' : '#c9884c';
  const accentColor = kind === 'guard_dog' ? '#4a3220' : kind === 'raccoon' ? '#25272a' : '#f0e7d8';

  return (
    <group ref={rootRef} scale={[scale, scale, scale]}>
      {/* Torso */}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.32, 0.74]} />
        <meshStandardMaterial color={bodyColor} roughness={0.86} />
      </mesh>
      {/* Head & Snout (faces -Z) */}
      <mesh position={[0, 0.62, -0.44]} castShadow>
        <boxGeometry args={[0.28, 0.26, 0.3]} />
        <meshStandardMaterial color={bodyColor} roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.56, -0.64]} castShadow>
        <boxGeometry args={[0.16, 0.14, 0.18]} />
        <meshStandardMaterial color={accentColor} roughness={0.78} />
      </mesh>
      {/* Ears */}
      <mesh position={[-0.1, 0.79, -0.42]} castShadow>
        <coneGeometry args={[0.06, 0.14, 5]} />
        <meshStandardMaterial color={accentColor} roughness={0.85} />
      </mesh>
      <mesh position={[0.1, 0.79, -0.42]} castShadow>
        <coneGeometry args={[0.06, 0.14, 5]} />
        <meshStandardMaterial color={accentColor} roughness={0.85} />
      </mesh>
      {/* Guard Dog Red Collar */}
      {kind === 'guard_dog' && (
        <mesh position={[0, 0.53, -0.32]}>
          <boxGeometry args={[0.31, 0.09, 0.1]} />
          <meshStandardMaterial color="#c9362e" roughness={0.45} />
        </mesh>
      )}
      {/* Wagging Tail */}
      <mesh ref={tailRef} position={[0, 0.56, 0.46]} rotation={[0.55, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.34, 6]} />
        <meshStandardMaterial color={accentColor} roughness={0.85} />
      </mesh>
      {/* 4 Animated Legs */}
      <mesh ref={legFL} position={[-0.12, 0.18, -0.24]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.36, 6]} />
        <meshStandardMaterial color={bodyColor} roughness={0.88} />
      </mesh>
      <mesh ref={legFR} position={[0.12, 0.18, -0.24]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.36, 6]} />
        <meshStandardMaterial color={bodyColor} roughness={0.88} />
      </mesh>
      <mesh ref={legBL} position={[-0.12, 0.18, 0.24]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.36, 6]} />
        <meshStandardMaterial color={bodyColor} roughness={0.88} />
      </mesh>
      <mesh ref={legBR} position={[0.12, 0.18, 0.24]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.36, 6]} />
        <meshStandardMaterial color={bodyColor} roughness={0.88} />
      </mesh>
    </group>
  );
}

function RobberMesh({ robberId, simRef }: { robberId: string; simRef: React.MutableRefObject<GameSimulation> }) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const lLegRef = useRef<THREE.Mesh>(null);
  const rLegRef = useRef<THREE.Mesh>(null);

  const init = simRef.current.state.phase3.robbers.find((r) => r.id === robberId);
  const isNinja = init?.archetype === 'roof_ninja';

  useFrame((_, delta) => {
    const r = simRef.current.state.phase3.robbers.find((item) => item.id === robberId);
    const root = rootRef.current;
    if (!r || !root) return;
    const dt = Math.min(delta, 0.05);
    const rate = 1 - Math.exp(-16 * dt);
    root.position.x += (r.position.x - root.position.x) * rate;
    root.position.y += (r.position.y - root.position.y) * rate;
    root.position.z += (r.position.z - root.position.z) * rate;
    root.rotation.y = r.yaw;

    const moving = r.state === 'approaching' || r.state === 'fleeing';
    const swing = moving ? Math.sin(r.animTime * 9.0) * 0.52 : 0;
    if (lLegRef.current) lLegRef.current.rotation.x = swing;
    if (rLegRef.current) rLegRef.current.rotation.x = -swing;
    if (bodyRef.current) {
      if (r.state === 'stunned' || r.state === 'arrested') {
        bodyRef.current.rotation.x = r.state === 'stunned' ? -1.35 : 0;
        bodyRef.current.position.y = r.state === 'stunned' ? 0.22 : 0;
      } else {
        bodyRef.current.rotation.x = r.hurtTimer > 0 ? 0.28 : -0.1;
        bodyRef.current.position.y = 0;
      }
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={bodyRef}>
        {/* Dark hoodie / ninja tunic */}
        <mesh position={[0, 1.02, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.21, 0.18, 0.56, 8]} />
          <meshStandardMaterial color={isNinja ? '#1d2028' : '#2a2d34'} roughness={0.85} />
        </mesh>
        {/* Ski-masked head */}
        <mesh position={[0, 1.48, 0]} castShadow>
          <icosahedronGeometry args={[0.16, 1]} />
          <meshStandardMaterial color="#181a1f" roughness={0.82} />
        </mesh>
        {/* Eye slit */}
        <mesh position={[0, 1.5, -0.145]}>
          <boxGeometry args={[0.16, 0.045, 0.03]} />
          <meshStandardMaterial color="#e0b592" roughness={0.65} />
        </mesh>
        {/* Knit burglar beanie / ninja headband */}
        <mesh position={[0, 1.58, 0]} castShadow>
          <sphereGeometry args={[0.165, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={isNinja ? '#8a2323' : '#2f343c'} roughness={0.85} />
        </mesh>
        {/* Canvas Loot Sack on back */}
        <mesh position={[0, 1.08, 0.24]} castShadow>
          <sphereGeometry args={[0.22, 8, 8]} />
          <meshStandardMaterial color="#9c8964" roughness={0.92} />
        </mesh>
        {/* Arms & Dark Gloves */}
        <mesh position={[-0.26, 1.0, 0]} rotation={[0.15, 0, 0.1]} castShadow>
          <cylinderGeometry args={[0.06, 0.048, 0.46, 8]} />
          <meshStandardMaterial color={isNinja ? '#1d2028' : '#2a2d34'} roughness={0.85} />
        </mesh>
        <mesh position={[0.26, 1.0, 0]} rotation={[-0.15, 0, -0.1]} castShadow>
          <cylinderGeometry args={[0.06, 0.048, 0.46, 8]} />
          <meshStandardMaterial color={isNinja ? '#1d2028' : '#2a2d34'} roughness={0.85} />
        </mesh>
        <mesh position={[-0.28, 0.74, -0.04]}>
          <sphereGeometry args={[0.052, 7, 6]} />
          <meshStandardMaterial color="#181a1f" roughness={0.8} />
        </mesh>
        <mesh position={[0.28, 0.74, 0.04]}>
          <sphereGeometry args={[0.052, 7, 6]} />
          <meshStandardMaterial color="#181a1f" roughness={0.8} />
        </mesh>
        {/* Legs */}
        <mesh ref={lLegRef} position={[-0.1, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.06, 0.72, 8]} />
          <meshStandardMaterial color="#202329" roughness={0.88} />
        </mesh>
        <mesh ref={rLegRef} position={[0.1, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.06, 0.72, 8]} />
          <meshStandardMaterial color="#202329" roughness={0.88} />
        </mesh>
      </group>
    </group>
  );
}

function PoliceUnitMesh({ simRef }: { simRef: React.MutableRefObject<GameSimulation> }) {
  const cruiserRef = useRef<THREE.Group>(null);
  const officerRef = useRef<THREE.Group>(null);
  const redLightMat = useRef<THREE.MeshStandardMaterial>(null);
  const blueLightMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const pol: PoliceDispatchState = simRef.current.state.phase3.police;
    if (cruiserRef.current) {
      cruiserRef.current.visible = pol.status !== 'idle';
      cruiserRef.current.position.set(pol.cruiserPos.x, pol.cruiserPos.y, pol.cruiserPos.z);
      cruiserRef.current.rotation.y = pol.cruiserYaw;
    }
    if (officerRef.current) {
      officerRef.current.visible = pol.officerActive;
      officerRef.current.position.set(pol.officerPos.x, pol.officerPos.y, pol.officerPos.z);
      officerRef.current.rotation.y = pol.officerYaw;
    }
    const flash = Math.sin(pol.sirenPhase) > 0;
    if (redLightMat.current) redLightMat.current.emissiveIntensity = flash ? 3.2 : 0.25;
    if (blueLightMat.current) blueLightMat.current.emissiveIntensity = flash ? 0.25 : 3.2;
  });

  return (
    <>
      {/* Maple PD Patrol Cruiser */}
      <group ref={cruiserRef} visible={false}>
        {/* Lower Chassis (Black) */}
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.62, 4.55]} />
          <meshStandardMaterial color="#1d222b" metalness={0.35} roughness={0.45} />
        </mesh>
        {/* White Police Door Panels */}
        <mesh position={[0, 0.56, 0.05]}>
          <boxGeometry args={[2.03, 0.5, 1.85]} />
          <meshStandardMaterial color="#eceef2" roughness={0.38} />
        </mesh>
        {/* Cabin */}
        <mesh position={[0, 1.12, -0.15]} castShadow>
          <boxGeometry args={[1.76, 0.64, 2.25]} />
          <meshStandardMaterial color="#eceef2" roughness={0.4} />
        </mesh>
        {/* Windshield & Windows */}
        <mesh position={[0, 1.14, -0.15]}>
          <boxGeometry args={[1.8, 0.44, 2.02]} />
          <meshStandardMaterial color="#273647" metalness={0.55} roughness={0.2} />
        </mesh>
        {/* Alternating Red / Blue Emissive Lightbar */}
        <mesh position={[-0.36, 1.52, -0.1]}>
          <boxGeometry args={[0.56, 0.16, 0.28]} />
          <meshStandardMaterial
            ref={redLightMat}
            color="#ff3b3b"
            emissive="#ff2a2a"
            emissiveIntensity={2.8}
          />
        </mesh>
        <mesh position={[0.36, 1.52, -0.1]}>
          <boxGeometry args={[0.56, 0.16, 0.28]} />
          <meshStandardMaterial
            ref={blueLightMat}
            color="#3b82ff"
            emissive="#256eff"
            emissiveIntensity={2.8}
          />
        </mesh>
        {/* Headlights */}
        <mesh position={[-0.68, 0.58, 2.29]}>
          <boxGeometry args={[0.34, 0.16, 0.05]} />
          <meshStandardMaterial color="#fff4cc" emissive="#ffe599" emissiveIntensity={2.2} />
        </mesh>
        <mesh position={[0.68, 0.58, 2.29]}>
          <boxGeometry args={[0.34, 0.16, 0.05]} />
          <meshStandardMaterial color="#fff4cc" emissive="#ffe599" emissiveIntensity={2.2} />
        </mesh>
        {/* 4 Wheels */}
        {[
          [-0.96, 0.34, 1.38],
          [0.96, 0.34, 1.38],
          [-0.96, 0.34, -1.38],
          [0.96, 0.34, -1.38],
        ].map(([wx, wy, wz], idx) => (
          <mesh key={idx} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.24, 12]} />
            <meshStandardMaterial color="#18191c" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Maple PD Police Officer */}
      <group ref={officerRef} visible={false}>
        <mesh position={[0, 1.02, 0]} castShadow>
          <cylinderGeometry args={[0.21, 0.18, 0.56, 8]} />
          <meshStandardMaterial color="#233657" roughness={0.78} />
        </mesh>
        {/* Gold badge */}
        <mesh position={[0.09, 1.12, -0.19]}>
          <boxGeometry args={[0.07, 0.07, 0.03]} />
          <meshStandardMaterial color="#e0b84c" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, 1.48, 0]} castShadow>
          <icosahedronGeometry args={[0.155, 1]} />
          <meshStandardMaterial color="#dcb393" roughness={0.68} />
        </mesh>
        {/* Peaked police cap + visor */}
        <mesh position={[0, 1.61, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.15, 0.11, 10]} />
          <meshStandardMaterial color="#1b2942" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.56, -0.14]} rotation={[0.14, 0, 0]}>
          <boxGeometry args={[0.22, 0.024, 0.11]} />
          <meshStandardMaterial color="#141c2b" roughness={0.5} />
        </mesh>
        {/* Navy Sleeves & Hands */}
        <mesh position={[-0.26, 1.0, 0]} rotation={[0.08, 0, 0.08]} castShadow>
          <cylinderGeometry args={[0.062, 0.05, 0.46, 8]} />
          <meshStandardMaterial color="#233657" roughness={0.78} />
        </mesh>
        <mesh position={[0.26, 1.0, 0]} rotation={[-0.22, 0, -0.08]} castShadow>
          <cylinderGeometry args={[0.062, 0.05, 0.46, 8]} />
          <meshStandardMaterial color="#233657" roughness={0.78} />
        </mesh>
        <mesh position={[-0.27, 0.74, -0.02]}>
          <sphereGeometry args={[0.05, 7, 6]} />
          <meshStandardMaterial color="#dcb393" roughness={0.7} />
        </mesh>
        <mesh position={[0.27, 0.76, -0.08]}>
          <sphereGeometry args={[0.05, 7, 6]} />
          <meshStandardMaterial color="#dcb393" roughness={0.7} />
        </mesh>
        {/* Officer Duty Flashlight */}
        <mesh position={[0.27, 0.78, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.022, 0.22, 8]} />
          <meshStandardMaterial color="#1e2228" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[-0.1, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.06, 0.72, 8]} />
          <meshStandardMaterial color="#1c273a" roughness={0.85} />
        </mesh>
        <mesh position={[0.1, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.06, 0.72, 8]} />
          <meshStandardMaterial color="#1c273a" roughness={0.85} />
        </mesh>
      </group>
    </>
  );
}

export function Phase3EntitiesView({ simRef }: Phase3EntitiesViewProps) {
  const [snap, setSnap] = useState<RenderSnapshot>(() => {
    const p3 = simRef.current.state.phase3;
    return {
      defenses: Object.values(p3.defenses),
      animals: [...p3.animals],
      robbers: [...p3.robbers],
      projectiles: [...p3.projectiles],
      fx: [...p3.fxEvents],
      policeActive: p3.police.status !== 'idle',
    };
  });

  const syncTimerRef = useRef(0);
  const lastKeyRef = useRef('');

  useFrame((_, delta) => {
    syncTimerRef.current += delta;
    if (syncTimerRef.current < 0.06) return;
    syncTimerRef.current = 0;

    const p3 = simRef.current.state.phase3;
    const defList = Object.values(p3.defenses);
    const key = [
      defList.map((d) => `${d.slotId}:${d.armed ? 1 : 0}:${d.charges}`).join(','),
      p3.animals.map((a) => a.id).join(','),
      p3.robbers.map((r) => `${r.id}:${r.state}`).join(','),
      p3.projectiles.length,
      p3.fxEvents.length,
      p3.police.status !== 'idle' ? 1 : 0,
    ].join('|');

    // Always re-render smoothly when projectiles or FX bursts are active
    if (key !== lastKeyRef.current || p3.projectiles.length > 0 || p3.fxEvents.length > 0) {
      lastKeyRef.current = key;
      setSnap({
        defenses: defList,
        animals: [...p3.animals],
        robbers: [...p3.robbers],
        projectiles: p3.projectiles.map((pr) => ({ ...pr, position: { ...pr.position } })),
        fx: p3.fxEvents.map((f) => ({ ...f, pos: { ...f.pos } })),
        policeActive: p3.police.status !== 'idle',
      });
    }
  });

  return (
    <group name="phase3_world_entities">
      {/* Placed Yard & Roof Defenses */}
      {snap.defenses.map((def) => (
        <DefenseMesh key={def.slotId} def={def} simRef={simRef} />
      ))}

      {/* Guard Dog & Neighborhood Wildlife */}
      {snap.animals.map((a) => (
        <AnimalMesh key={a.id} animalId={a.id} simRef={simRef} />
      ))}

      {/* Nighttime Burglars & Ninjas */}
      {snap.robbers.map((r) => (
        <RobberMesh key={r.id} robberId={r.id} simRef={simRef} />
      ))}

      {/* 911 Police Patrol Cruiser & Officer */}
      <PoliceUnitMesh simRef={simRef} />

      {/* In-Flight Projectiles */}
      {snap.projectiles.map((p) => (
        <mesh key={p.id} position={[p.position.x, p.position.y, p.position.z]}>
          <sphereGeometry args={[p.weaponId === 'stink_bomb' ? 0.16 : 0.09, 8, 6]} />
          <meshStandardMaterial
            color={p.color}
            emissive={p.color}
            emissiveIntensity={1.2}
            roughness={0.3}
          />
        </mesh>
      ))}

      {/* Impact Splats, Stink Clouds & Explosion Bursts */}
      {snap.fx.map((fx) => {
        const progress = Math.min(1, fx.age / Math.max(0.05, fx.maxAge));
        const r = fx.radius * (0.35 + progress * 0.85);
        const opacity = Math.max(0.05, (1 - progress) * (fx.kind === 'stink' ? 0.55 : 0.78));
        return (
          <mesh key={fx.id} position={[fx.pos.x, fx.pos.y, fx.pos.z]}>
            <icosahedronGeometry args={[r, 1]} />
            <meshStandardMaterial
              color={fx.color}
              emissive={fx.color}
              emissiveIntensity={fx.kind === 'explosion' ? 1.4 : 0.45}
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
