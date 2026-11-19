/**
 * First-person viewmodel: tapered sleeved forearms, gloved hands, and heavy-duty flashlight
 * matching the redesigned 1.65m character rig, with walking/running/climbing bob and reach motion.
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ActorEntity } from '../simulation/types';
import type { WeaponId } from '../phase3/phase3Types';

interface FirstPersonRigProps {
  enabled: boolean;
  getPlayer: () => ActorEntity | undefined;
  getActiveWeapon?: () => { weapon: WeaponId; recoil: number };
  isNight: boolean;
}

const _offset = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export function FirstPersonRig({ enabled, getPlayer, getActiveWeapon, isNight }: FirstPersonRigProps) {
  const rigRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);
  const flashlightRef = useRef<THREE.Group>(null);
  const weaponGroupRef = useRef<THREE.Group>(null);
  const wrenchRef = useRef<THREE.Group>(null);
  const slingshotRef = useRef<THREE.Group>(null);
  const paintballRef = useRef<THREE.Group>(null);
  const blasterRef = useRef<THREE.Group>(null);
  const stinkRef = useRef<THREE.Group>(null);
  const shovelRef = useRef<THREE.Group>(null);
  const timberRef = useRef<THREE.Group>(null);
  const lanternRef = useRef<THREE.Group>(null);
  const ventRef = useRef<THREE.Group>(null);
  const pumpRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((_, delta) => {
    const rig = rigRef.current;
    if (!rig) return;
    rig.visible = enabled;
    if (!enabled) return;

    const player = getPlayer();
    if (!player) return;

    const dt = Math.min(delta, 0.05);
    const climbing = player.animState === 'climb' && player.climbState !== null;
    const moving = player.animState === 'walk' || player.animState === 'run';
    const digging = player.digTimer > 0;
    const bobAmp = moving ? (player.animState === 'run' ? 0.022 : 0.012) : 0.003;
    const phase = climbing
      ? (player.climbState?.climbMeters ?? 0) * 6.0
      : moving
        ? player.walkDistance * 3.6
        : player.animTime * 1.8;

    const bobX = climbing ? 0 : Math.cos(phase * 0.5) * bobAmp;
    const bobY = climbing ? Math.sin(phase) * 0.012 : Math.abs(Math.sin(phase)) * -bobAmp;

    _quat.copy(camera.quaternion);
    _offset.set(bobX, bobY, 0).applyQuaternion(_quat);
    rig.position.copy(camera.position).add(_offset);
    rig.quaternion.copy(_quat);

    // Toggle held prop based on underground status, activeTool & above-ground Phase 3 weapon
    const underground = !climbing && (player.inTunnel || player.inShelter || digging);
    const tool = player.activeTool;
    const weaponInfo = getActiveWeapon?.() ?? { weapon: 'slingshot' as WeaponId, recoil: 0 };
    const showWeapon = !climbing && !underground;

    if (flashlightRef.current) flashlightRef.current.visible = false;
    if (weaponGroupRef.current) weaponGroupRef.current.visible = showWeapon;
    if (wrenchRef.current) wrenchRef.current.visible = showWeapon && weaponInfo.weapon === 'wrench';
    if (slingshotRef.current) slingshotRef.current.visible = showWeapon && weaponInfo.weapon === 'slingshot';
    if (paintballRef.current) paintballRef.current.visible = showWeapon && weaponInfo.weapon === 'paintball';
    if (blasterRef.current) blasterRef.current.visible = showWeapon && weaponInfo.weapon === 'water_blaster';
    if (stinkRef.current) stinkRef.current.visible = showWeapon && weaponInfo.weapon === 'stink_bomb';

    if (shovelRef.current) shovelRef.current.visible = underground && tool === 'shovel';
    if (timberRef.current) timberRef.current.visible = underground && tool === 'timber';
    if (lanternRef.current) lanternRef.current.visible = underground && tool === 'lantern';
    if (ventRef.current) ventRef.current.visible = underground && tool === 'vent';
    if (pumpRef.current) pumpRef.current.visible = underground && tool === 'pump';

    const swingAmt = digging ? Math.sin((player.digTimer / 0.28) * Math.PI) : 0;
    const recoilKick = weaponInfo.recoil > 0 ? Math.sin((weaponInfo.recoil / 0.22) * Math.PI) : 0;
    const rate = 1 - Math.exp(-18 * dt);
    if (rightHandRef.current) {
      const targetZ = climbing
        ? -0.36
        : -0.43 - swingAmt * 0.22 + recoilKick * 0.1 + (player.interactTimer > 0 && !recoilKick ? -0.1 : 0);
      const targetY = climbing ? -0.12 - Math.sin(phase) * 0.11 : -0.22 - swingAmt * 0.08 + recoilKick * 0.03;
      const targetRotX = climbing
        ? 0.55
        : digging
          ? -0.58 * swingAmt
          : recoilKick > 0
            ? 0.26 * recoilKick
            : player.interactTimer > 0
              ? 0.28
              : 0.06;
      rightHandRef.current.position.z += (targetZ - rightHandRef.current.position.z) * rate;
      rightHandRef.current.position.y += (targetY - rightHandRef.current.position.y) * rate;
      rightHandRef.current.rotation.x += (targetRotX - rightHandRef.current.rotation.x) * rate;
    }
    if (leftHandRef.current) {
      const targetY = climbing ? -0.12 + Math.sin(phase) * 0.11 : -0.24 + Math.sin(phase) * 0.006;
      const targetRotX = climbing ? 0.55 : digging ? -0.25 * swingAmt : 0.18;
      leftHandRef.current.position.y += (targetY - leftHandRef.current.position.y) * rate;
      leftHandRef.current.rotation.x += (targetRotX - leftHandRef.current.rotation.x) * rate;
    }
  });

  return (
    <group ref={rigRef} visible={false} renderOrder={20}>
      {/* Left tapered jacket sleeve + dark cuff + work glove */}
      <group ref={leftHandRef} position={[-0.24, -0.24, -0.43]} rotation={[0.18, 0.28, -0.14]}>
        <mesh position={[0, -0.02, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.044, 0.056, 0.3, 8]} />
          <meshStandardMaterial color="#4c5e4b" roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.015, 0.0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.048, 0.048, 0.045, 8]} />
          <meshStandardMaterial color="#384537" roughness={0.86} />
        </mesh>
        <mesh position={[0, -0.01, -0.055]} scale={[0.9, 0.85, 1.15]}>
          <sphereGeometry args={[0.046, 8, 6]} />
          <meshStandardMaterial color="#3d342c" roughness={0.78} />
        </mesh>
      </group>

      {/* Right tapered jacket sleeve + work glove + context-aware prop */}
      <group ref={rightHandRef} position={[0.24, -0.22, -0.43]} rotation={[0.06, -0.16, 0.08]}>
        <mesh position={[0, -0.025, 0.155]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.058, 0.3, 8]} />
          <meshStandardMaterial color="#4c5e4b" roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.015, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.049, 0.049, 0.045, 8]} />
          <meshStandardMaterial color="#384537" roughness={0.86} />
        </mesh>
        <mesh position={[0, -0.005, -0.045]} scale={[0.9, 0.85, 1.15]}>
          <sphereGeometry args={[0.048, 8, 6]} />
          <meshStandardMaterial color="#3d342c" roughness={0.78} />
        </mesh>

        {/* Phase 3 Above-Ground Handheld Weapons */}
        <group ref={weaponGroupRef}>
          {/* Pipe Wrench */}
          <group ref={wrenchRef} position={[0, 0.04, -0.14]} rotation={[0.35, 0, 0]} visible={false}>
            <mesh>
              <boxGeometry args={[0.036, 0.34, 0.025]} />
              <meshStandardMaterial color="#8d969e" metalness={0.75} roughness={0.35} />
            </mesh>
            <mesh position={[0.02, 0.17, 0]}>
              <boxGeometry args={[0.1, 0.08, 0.035]} />
              <meshStandardMaterial color="#b33d2e" roughness={0.5} />
            </mesh>
          </group>

          {/* Wooden Slingshot */}
          <group ref={slingshotRef} position={[0, 0.04, -0.12]} visible={true}>
            <mesh position={[0, -0.02, 0]}>
              <cylinderGeometry args={[0.018, 0.02, 0.14, 8]} />
              <meshStandardMaterial color="#7d5838" roughness={0.85} />
            </mesh>
            <mesh position={[-0.045, 0.08, 0]} rotation={[0, 0, 0.4]}>
              <cylinderGeometry args={[0.014, 0.016, 0.13, 8]} />
              <meshStandardMaterial color="#7d5838" roughness={0.85} />
            </mesh>
            <mesh position={[0.045, 0.08, 0]} rotation={[0, 0, -0.4]}>
              <cylinderGeometry args={[0.014, 0.016, 0.13, 8]} />
              <meshStandardMaterial color="#7d5838" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.12, 0.03]}>
              <boxGeometry args={[0.14, 0.014, 0.014]} />
              <meshStandardMaterial color="#d48837" roughness={0.6} />
            </mesh>
          </group>

          {/* Paintball Marker */}
          <group ref={paintballRef} position={[0, 0.04, -0.16]} visible={false}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.024, 0.34, 10]} />
              <meshStandardMaterial color="#2b3036" metalness={0.65} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.075, 0.04]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <meshStandardMaterial color="#e85d3f" roughness={0.4} />
            </mesh>
          </group>

          {/* Hydro Water Blaster */}
          <group ref={blasterRef} position={[0, 0.04, -0.16]} visible={false}>
            <mesh>
              <boxGeometry args={[0.07, 0.09, 0.36]} />
              <meshStandardMaterial color="#3c91c9" roughness={0.38} />
            </mesh>
            <mesh position={[0, 0.06, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.036, 0.036, 0.2, 10]} />
              <meshStandardMaterial color="#f0b63a" roughness={0.35} />
            </mesh>
          </group>

          {/* Stink Bomb Capsule */}
          <group ref={stinkRef} position={[0, 0.03, -0.1]} visible={false}>
            <mesh>
              <sphereGeometry args={[0.065, 10, 8]} />
              <meshStandardMaterial
                color="#7da842"
                emissive="#587a2a"
                emissiveIntensity={0.45}
                roughness={0.4}
              />
            </mesh>
          </group>
        </group>

        {/* Surface Flashlight (fallback) */}
        <group ref={flashlightRef} visible={false}>
          <mesh position={[0, 0.02, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.02, 0.22, 12]} />
            <meshStandardMaterial color="#2b2e33" metalness={0.65} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.02, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.033, 0.024, 0.05, 12]} />
            <meshStandardMaterial color="#3c4046" metalness={0.7} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.02, -0.276]}>
            <circleGeometry args={[0.028, 12]} />
            <meshStandardMaterial
              color={isNight ? '#fff6dc' : '#cfd6dc'}
              emissive={isNight ? '#ffdfa0' : '#000000'}
              emissiveIntensity={isNight ? 2.2 : 0}
              roughness={0.15}
            />
          </mesh>
        </group>

        {/* Underground Tool 1: Shovel */}
        <group ref={shovelRef} position={[0, 0.02, -0.18]} rotation={[0.42, 0, 0]} visible={false}>
          <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.017, 0.019, 0.56, 8]} />
            <meshStandardMaterial color="#7d5c3e" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.02, -0.32]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.14, 0.018, 0.19]} />
            <meshStandardMaterial color="#5c6268" metalness={0.74} roughness={0.36} />
          </mesh>
        </group>

        {/* Underground Tool 2: Timber Beam Prop */}
        <group ref={timberRef} position={[0, 0.04, -0.16]} visible={false}>
          <mesh rotation={[0.3, 0.2, 0]}>
            <boxGeometry args={[0.08, 0.08, 0.42]} />
            <meshStandardMaterial color="#7c5d41" roughness={0.88} />
          </mesh>
        </group>

        {/* Underground Tool 3: Caged Work Lantern */}
        <group ref={lanternRef} position={[0, 0.01, -0.16]} visible={false}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.055, 0.065, 0.03, 10]} />
            <meshStandardMaterial color="#2c3035" metalness={0.7} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.12, 10]} />
            <meshStandardMaterial color="#fff1cc" emissive="#ffbf66" emissiveIntensity={2.0} roughness={0.2} />
          </mesh>
        </group>

        {/* Underground Tool 4: Galvanized Vent Duct */}
        <group ref={ventRef} position={[0, 0.03, -0.18]} visible={false}>
          <mesh rotation={[0.15, 0.25, 0]}>
            <boxGeometry args={[0.13, 0.09, 0.34]} />
            <meshStandardMaterial color="#8d969e" metalness={0.68} roughness={0.38} />
          </mesh>
        </group>

        {/* Underground Tool 5: Sump Pump */}
        <group ref={pumpRef} position={[0, 0.02, -0.16]} visible={false}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.07, 0.18, 10]} />
            <meshStandardMaterial color="#3b5e73" metalness={0.55} roughness={0.42} />
          </mesh>
          <mesh position={[0.05, 0.04, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.16, 8]} />
            <meshStandardMaterial color="#272a2e" roughness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
