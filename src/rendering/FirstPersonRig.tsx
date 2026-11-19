/**
 * First-person viewmodel: tapered sleeved forearms, gloved hands, and heavy-duty flashlight
 * matching the redesigned 1.65m character rig, with walking/running/climbing bob and reach motion.
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ActorEntity } from '../simulation/types';

interface FirstPersonRigProps {
  enabled: boolean;
  getPlayer: () => ActorEntity | undefined;
  isNight: boolean;
}

const _offset = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export function FirstPersonRig({ enabled, getPlayer, isNight }: FirstPersonRigProps) {
  const rigRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);
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

    const rate = 1 - Math.exp(-16 * dt);
    if (rightHandRef.current) {
      const targetZ = climbing ? -0.36 : -0.43 + (player.interactTimer > 0 ? -0.14 : 0);
      const targetY = climbing ? -0.12 - Math.sin(phase) * 0.11 : -0.22;
      const targetRotX = climbing ? 0.55 : player.interactTimer > 0 ? 0.35 : 0.06;
      rightHandRef.current.position.z += (targetZ - rightHandRef.current.position.z) * rate;
      rightHandRef.current.position.y += (targetY - rightHandRef.current.position.y) * rate;
      rightHandRef.current.rotation.x += (targetRotX - rightHandRef.current.rotation.x) * rate;
    }
    if (leftHandRef.current) {
      const targetY = climbing ? -0.12 + Math.sin(phase) * 0.11 : -0.24 + Math.sin(phase) * 0.006;
      const targetRotX = climbing ? 0.55 : 0.18;
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

      {/* Right tapered jacket sleeve + work glove + heavy-duty aluminum flashlight */}
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
        {/* Flashlight body */}
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
    </group>
  );
}
