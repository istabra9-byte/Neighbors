/**
 * Procedural 3D Renderer for Phase 2 Underground Tunnel Network.
 * Features:
 * - Textured earth strata (topsoil, clay strata, fractured bedrock, wet seepage walls)
 * - Un-dug shelter bulkhead soil plugs revealed when opening the steel bulkhead door
 * - Timber A-frame pit-prop bracing + wooden duckboard walkways
 * - Hanging caged work lanterns (emissive glow + strictly capped 2-light dynamic pool + headlamp)
 * - Overhead galvanized ventilation ducting + intake grilles
 * - Translucent rippling groundwater floor layer when flooded
 * - Vertical wooden shaft ladders (surface breakout hatch + deep level -2 drop)
 * - Wireframe dig/place target reticle when underground
 * - Zero-GC 80-chunk pooled InstancedMesh particle bursts (dirt, clay, rock, water splash, cave-in dust)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameSimulation, SimParticleEvent } from '../simulation/simulation';
import {
  gridToWorldCenter,
  sampleSoilLayer,
  TUNNEL_CONSTANTS,
  tunnelCellKey,
} from '../tunnels/tunnelEngine';
import type { SoilLayerType } from '../tunnels/tunnelTypes';
import { getProceduralTextureLibrary } from './proceduralTextures';

interface TunnelViewProps {
  simRef: React.MutableRefObject<GameSimulation>;
}

interface ActiveParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  vrx: number;
  vry: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const PARTICLE_POOL_SIZE = 84;
const _dummy = new THREE.Object3D();
const _pColor = new THREE.Color();

function particleColorForKind(kind: SimParticleEvent['kind']): string {
  switch (kind) {
    case 'rock':
      return '#6d7278';
    case 'clay':
      return '#8a5d42';
    case 'water':
      return '#5a8fa6';
    case 'dust':
      return '#9c8f7e';
    default:
      return '#634f3b';
  }
}

export function TunnelView({ simRef }: TunnelViewProps) {
  const { gl } = useThree();
  const [tunnelRev, setTunnelRev] = useState(0);

  const headlampRef = useRef<THREE.PointLight>(null);
  const lanternLight0Ref = useRef<THREE.PointLight>(null);
  const lanternLight1Ref = useRef<THREE.PointLight>(null);
  const reticleRef = useRef<THREE.LineSegments>(null);
  const reticleMatRef = useRef<THREE.LineBasicMaterial>(null);
  const waterMeshesRef = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  const particlePoolRef = useRef<ActiveParticle[]>([]);
  if (particlePoolRef.current.length === 0) {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      particlePoolRef.current.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        vrx: 0,
        vry: 0,
        life: 0,
        maxLife: 0.6,
        scale: 0.1,
        color: new THREE.Color('#634f3b'),
      });
    }
  }

  const textures = useMemo(
    () => getProceduralTextureLibrary(Math.min(4, gl.capabilities.getMaxAnisotropy())),
    [gl],
  );

  const mats = useMemo(
    () => ({
      topsoil: new THREE.MeshStandardMaterial({
        color: '#a3876a',
        map: textures.dirt.map,
        normalMap: textures.dirt.normalMap,
        roughnessMap: textures.dirt.roughnessMap,
        roughness: 0.94,
      }),
      clay: new THREE.MeshStandardMaterial({
        color: '#b88b6d',
        map: textures.clay.map,
        normalMap: textures.clay.normalMap,
        roughnessMap: textures.clay.roughnessMap,
        roughness: 0.82,
      }),
      rock: new THREE.MeshStandardMaterial({
        color: '#989ea6',
        map: textures.rock.map,
        normalMap: textures.rock.normalMap,
        roughnessMap: textures.rock.roughnessMap,
        roughness: 0.88,
      }),
      waterEarth: new THREE.MeshStandardMaterial({
        color: '#63594d',
        map: textures.dirt.map,
        normalMap: textures.dirt.normalMap,
        roughness: 0.38,
      }),
      timber: new THREE.MeshStandardMaterial({
        color: '#7c5d41',
        map: textures.woodFloor.map,
        normalMap: textures.woodFloor.normalMap,
        roughness: 0.88,
      }),
      ventDuct: new THREE.MeshStandardMaterial({
        color: '#8d969e',
        metalness: 0.68,
        roughness: 0.38,
      }),
      metalDark: new THREE.MeshStandardMaterial({
        color: '#2c3035',
        metalness: 0.72,
        roughness: 0.45,
      }),
      lanternGlow: new THREE.MeshStandardMaterial({
        color: '#fff1cc',
        emissive: '#ffbf66',
        emissiveIntensity: 2.3,
        roughness: 0.25,
      }),
      waterSurface: new THREE.MeshStandardMaterial({
        color: '#3e626b',
        roughness: 0.14,
        metalness: 0.22,
        transparent: true,
        opacity: 0.74,
      }),
      unstableAccent: new THREE.MeshStandardMaterial({
        color: '#6e4e35',
        map: textures.rock.map,
        roughness: 0.95,
      }),
      pitVoid: new THREE.MeshBasicMaterial({
        color: '#11100e',
      }),
    }),
    [textures],
  );

  const reticleGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(
      TUNNEL_CONSTANTS.CELL_W - 0.08,
      TUNNEL_CONSTANTS.CELL_H - 0.1,
      TUNNEL_CONSTANTS.CELL_W - 0.08,
    );
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  useEffect(() => {
    return () => {
      reticleGeo.dispose();
    };
  }, [reticleGeo]);

  const soilMaterial = (soil: SoilLayerType, unstable: boolean) => {
    if (unstable && soil === 'topsoil') return mats.unstableAccent;
    switch (soil) {
      case 'clay':
        return mats.clay;
      case 'rock':
        return mats.rock;
      case 'water':
        return mats.waterEarth;
      default:
        return mats.topsoil;
    }
  };

  // Dynamic light pool, target reticle & zero-GC particle simulation
  useFrame((state, delta) => {
    const sim = simRef.current;
    if (sim.tunnelVersion !== tunnelRev) {
      setTunnelRev(sim.tunnelVersion);
    }

    const dt = Math.min(delta, 0.05);
    const player = sim.getLocalPlayer();
    if (!player) return;

    // 1. Warm underground headlamp (also gently illuminates open bulkhead & excavated face from shelter threshold)
    if (headlampRef.current) {
      const underground = player.inTunnel || player.inShelter || player.position.y < -0.5;
      headlampRef.current.visible = underground;
      if (underground) {
        const fwdX = -Math.sin(player.yaw);
        const fwdZ = -Math.cos(player.yaw);
        headlampRef.current.intensity = player.inTunnel ? 13.5 : 6.5;
        headlampRef.current.position.set(
          player.position.x + fwdX * 0.55,
          player.position.y + 1.52,
          player.position.z + fwdZ * 0.55,
        );
      }
    }

    // 2. Snap 2 pooled pointLights onto the 2 closest lit tunnel segments
    const litLights = [lanternLight0Ref.current, lanternLight1Ref.current];
    const litSegments: Array<{ x: number; y: number; z: number; dSq: number }> = [];
    const segments = sim.state.tunnels.segments;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (!s.lit) continue;
      const c = gridToWorldCenter(s.gx, s.gy, s.gz);
      const dx = c.x - player.position.x;
      const dy = c.y - player.position.y;
      const dz = c.z - player.position.z;
      litSegments.push({ x: c.x, y: c.y + 2.35, z: c.z, dSq: dx * dx + dy * dy + dz * dz });
    }
    litSegments.sort((a, b) => a.dSq - b.dSq);
    for (let k = 0; k < 2; k++) {
      const pl = litLights[k];
      if (!pl) continue;
      const item = litSegments[k];
      if (item && item.dSq < 34 * 34) {
        pl.visible = true;
        pl.position.set(item.x, item.y, item.z);
      } else {
        pl.visible = false;
      }
    }

    // 3. Dig / Place Wireframe Reticle
    if (reticleRef.current && reticleMatRef.current) {
      const target = sim.getActiveTunnelTarget(player);
      if (target) {
        reticleRef.current.visible = true;
        const yOff =
          target.gy === 1
            ? TUNNEL_CONSTANTS.CELL_H + 0.1
            : target.gy === -1
              ? -1.4
              : TUNNEL_CONSTANTS.CELL_H / 2;
        reticleRef.current.position.set(
          target.worldCenter.x,
          target.worldCenter.y + yOff,
          target.worldCenter.z,
        );
        reticleRef.current.scale.set(
          1,
          target.gy === 1 || target.gy === -1 ? 0.45 : 1,
          1,
        );
        reticleMatRef.current.color.set(
          target.valid ? (target.actionKind === 'dig' ? '#e8b95b' : '#58c97a') : '#d14d43',
        );
      } else {
        reticleRef.current.visible = false;
      }
    }

    // 4. Gently ripple flooded water planes
    const elapsed = state.clock.elapsedTime;
    for (let i = 0; i < waterMeshesRef.current.length; i++) {
      const m = waterMeshesRef.current[i];
      if (m) {
        m.position.y = 0.28 + Math.sin(elapsed * 2.4 + i * 1.1) * 0.018;
      }
    }

    // 5. Consume simulation particle events and step pooled InstancedMesh chunks
    const spawned = sim.drainParticleEvents();
    const pool = particlePoolRef.current;
    for (let e = 0; e < spawned.length; e++) {
      const ev = spawned[e];
      _pColor.set(particleColorForKind(ev.kind));
      let rem = ev.count;
      for (let i = 0; i < pool.length && rem > 0; i++) {
        const p = pool[i];
        if (!p.active) {
          p.active = true;
          const a = Math.random() * Math.PI * 2;
          const spd = 1.1 + Math.random() * 2.6;
          p.x = ev.pos.x + (Math.random() - 0.5) * 0.65;
          p.y = ev.pos.y + (Math.random() - 0.5) * 0.45;
          p.z = ev.pos.z + (Math.random() - 0.5) * 0.65;
          p.vx = Math.cos(a) * spd;
          p.vy = 1.4 + Math.random() * 2.8;
          p.vz = Math.sin(a) * spd;
          p.rx = Math.random() * 3;
          p.ry = Math.random() * 3;
          p.vrx = (Math.random() - 0.5) * 9;
          p.vry = (Math.random() - 0.5) * 9;
          p.life = 0;
          p.maxLife = 0.48 + Math.random() * 0.35;
          p.scale = ev.kind === 'water' ? 0.08 : 0.09 + Math.random() * 0.08;
          p.color.copy(_pColor);
          rem--;
        }
      }
    }

    const inst = particlesRef.current;
    if (inst) {
      let dirty = false;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.active) {
          _dummy.position.set(0, -100, 0);
          _dummy.scale.setScalar(0.0001);
          _dummy.updateMatrix();
          inst.setMatrixAt(i, _dummy.matrix);
          continue;
        }
        dirty = true;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          _dummy.position.set(0, -100, 0);
          _dummy.scale.setScalar(0.0001);
          _dummy.updateMatrix();
          inst.setMatrixAt(i, _dummy.matrix);
          continue;
        }
        p.vy -= 9.8 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.rx += p.vrx * dt;
        p.ry += p.vry * dt;

        const shrink = p.scale * (1 - (p.life / p.maxLife) * 0.85);
        _dummy.position.set(p.x, p.y, p.z);
        _dummy.rotation.set(p.rx, p.ry, 0);
        _dummy.scale.setScalar(shrink);
        _dummy.updateMatrix();
        inst.setMatrixAt(i, _dummy.matrix);
        inst.setColorAt(i, p.color);
      }
      if (dirty || spawned.length > 0) {
        inst.instanceMatrix.needsUpdate = true;
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      }
    }
  });

  const sim = simRef.current;
  const segments = sim.state.tunnels.segments;
  const segMap = sim.tunnelSegmentMap;
  const unstableKeys = sim.tunnelStability.unstableKeys;
  const halfW = TUNNEL_CONSTANTS.CELL_W / 2;
  const h = TUNNEL_CONSTANTS.CELL_H;

  waterMeshesRef.current.length = 0;

  return (
    <group name="underground_tunnel_network">
      {/* Underground Point Light Pool (1 headlamp + 2 closest lit lanterns) */}
      <pointLight ref={headlampRef} color="#ffe7c2" intensity={13.5} distance={13.5} decay={1.65} visible={false} />
      <pointLight ref={lanternLight0Ref} color="#ffd082" intensity={20} distance={16} decay={1.6} visible={false} />
      <pointLight ref={lanternLight1Ref} color="#ffd082" intensity={20} distance={16} decay={1.6} visible={false} />

      {/* Target Excavation / Tool Reticle */}
      <lineSegments ref={reticleRef} geometry={reticleGeo} visible={false} renderOrder={18}>
        <lineBasicMaterial ref={reticleMatRef} color="#e8b95b" transparent opacity={0.88} />
      </lineSegments>

      {/* Zero-GC Pooled Particle Bursts */}
      <instancedMesh ref={particlesRef} args={[undefined, undefined, PARTICLE_POOL_SIZE]} frustumCulled={false}>
        <dodecahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>

      {/* Un-dug Earth Plugs directly behind closed/open Shelter Bulkhead Doors */}
      {sim.shelterPortals.map((p) => {
        const entryKey = tunnelCellKey(p.entryGx, 0, p.entryGz);
        if (segMap.has(entryKey)) return null;
        const c = gridToWorldCenter(p.entryGx, 0, p.entryGz);
        const soil = sampleSoilLayer(sim.state.seed, p.entryGx, 0, p.entryGz);
        return (
          <mesh
            key={`plug_${p.houseId}`}
            position={[c.x, c.y + h / 2, c.z]}
            material={soilMaterial(soil, false)}
            receiveShadow
          >
            <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W, h, TUNNEL_CONSTANTS.CELL_W]} />
          </mesh>
        );
      })}

      {/* Excavated Tunnel Segments */}
      {segments.map((seg) => {
        const c = gridToWorldCenter(seg.gx, seg.gy, seg.gz);
        const key = tunnelCellKey(seg.gx, seg.gy, seg.gz);
        const wallMat = soilMaterial(seg.soil, unstableKeys.has(key));

        if (seg.gy === 1) {
          // Surface breakout exit shaft up to yard lawn at Y = 0
          const shaftBot = TUNNEL_CONSTANTS.BASE_FLOOR_Y + h;
          const shaftH = 0.0 - shaftBot;
          const ladderH = 0.0 - TUNNEL_CONSTANTS.BASE_FLOOR_Y;
          return (
            <group key={seg.id} position={[c.x, 0, c.z]}>
              {/* Dark pit interior plane right inside yard hatch collar */}
              <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.pitVoid}>
                <planeGeometry args={[1.24, 1.24]} />
              </mesh>
              {/* Timber Hatch Collar framing on yard grass */}
              <mesh position={[0, 0.055, -0.68]} material={mats.timber} castShadow receiveShadow>
                <boxGeometry args={[1.48, 0.11, 0.14]} />
              </mesh>
              <mesh position={[0, 0.055, 0.68]} material={mats.timber} castShadow receiveShadow>
                <boxGeometry args={[1.48, 0.11, 0.14]} />
              </mesh>
              <mesh position={[-0.67, 0.055, 0]} material={mats.timber} castShadow receiveShadow>
                <boxGeometry args={[0.14, 0.11, 1.22]} />
              </mesh>
              <mesh position={[0.67, 0.055, 0]} material={mats.timber} castShadow receiveShadow>
                <boxGeometry args={[0.14, 0.11, 1.22]} />
              </mesh>
              {/* Shaft Earth/Timber Vertical Liner Walls */}
              <mesh position={[0, shaftBot + shaftH / 2, -0.7]} material={mats.topsoil}>
                <boxGeometry args={[1.44, shaftH, 0.14]} />
              </mesh>
              <mesh position={[0, shaftBot + shaftH / 2, 0.7]} material={mats.topsoil}>
                <boxGeometry args={[1.44, shaftH, 0.14]} />
              </mesh>
              <mesh position={[-0.7, shaftBot + shaftH / 2, 0]} material={mats.topsoil}>
                <boxGeometry args={[0.14, shaftH, 1.26]} />
              </mesh>
              <mesh position={[0.7, shaftBot + shaftH / 2, 0]} material={mats.topsoil}>
                <boxGeometry args={[0.14, shaftH, 1.26]} />
              </mesh>
              {/* Full-Height Wooden Ladder connecting gy=0 floor to yard */}
              <group position={[0, TUNNEL_CONSTANTS.BASE_FLOOR_Y, -0.34]}>
                <mesh position={[-0.23, ladderH / 2, 0]} material={mats.timber}>
                  <boxGeometry args={[0.06, ladderH + 0.15, 0.06]} />
                </mesh>
                <mesh position={[0.23, ladderH / 2, 0]} material={mats.timber}>
                  <boxGeometry args={[0.06, ladderH + 0.15, 0.06]} />
                </mesh>
                {Array.from({ length: Math.floor(ladderH / 0.34) }).map((_, idx) => (
                  <mesh key={idx} position={[0, 0.34 + idx * 0.34, 0]} material={mats.timber}>
                    <boxGeometry args={[0.46, 0.045, 0.045]} />
                  </mesh>
                ))}
              </group>
            </group>
          );
        }

        const hasPosX = segMap.has(tunnelCellKey(seg.gx + 1, seg.gy, seg.gz));
        const hasNegX = segMap.has(tunnelCellKey(seg.gx - 1, seg.gy, seg.gz));
        const hasPosZ = segMap.has(tunnelCellKey(seg.gx, seg.gy, seg.gz + 1));
        const hasNegZ = segMap.has(tunnelCellKey(seg.gx, seg.gy, seg.gz - 1));
        const hasAbove = segMap.has(tunnelCellKey(seg.gx, seg.gy + 1, seg.gz));
        const hasBelow = segMap.has(tunnelCellKey(seg.gx, seg.gy - 1, seg.gz));

        const portalHere =
          seg.gy === 0
            ? sim.shelterPortals.find((p) => p.entryGx === seg.gx && p.entryGz === seg.gz)
            : undefined;
        const openPosZ = Boolean(portalHere && portalHere.outZ < -0.5);
        const openNegZ = Boolean(portalHere && portalHere.outZ > 0.5);

        return (
          <group key={seg.id} position={[c.x, c.y, c.z]}>
            {/* Floor slab or deep-shaft timber collar rim */}
            {!hasBelow ? (
              <mesh position={[0, -0.1, 0]} material={wallMat} receiveShadow>
                <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W, 0.2, TUNNEL_CONSTANTS.CELL_W]} />
              </mesh>
            ) : (
              <>
                <mesh position={[0, -0.1, -0.92]} material={mats.timber} receiveShadow>
                  <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W, 0.2, 0.56]} />
                </mesh>
                <mesh position={[0, -0.1, 0.92]} material={mats.timber} receiveShadow>
                  <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W, 0.2, 0.56]} />
                </mesh>
                <mesh position={[-0.92, -0.1, 0]} material={mats.timber} receiveShadow>
                  <boxGeometry args={[0.56, 0.2, 1.28]} />
                </mesh>
                <mesh position={[0.92, -0.1, 0]} material={mats.timber} receiveShadow>
                  <boxGeometry args={[0.56, 0.2, 1.28]} />
                </mesh>
                {/* Vertical ladder descending 3.2m to deep stratum gy=-1 */}
                <group position={[0, -TUNNEL_CONSTANTS.LEVEL_STEP_Y, -0.34]}>
                  <mesh position={[-0.23, TUNNEL_CONSTANTS.LEVEL_STEP_Y / 2, 0]} material={mats.timber}>
                    <boxGeometry args={[0.06, TUNNEL_CONSTANTS.LEVEL_STEP_Y, 0.06]} />
                  </mesh>
                  <mesh position={[0.23, TUNNEL_CONSTANTS.LEVEL_STEP_Y / 2, 0]} material={mats.timber}>
                    <boxGeometry args={[0.06, TUNNEL_CONSTANTS.LEVEL_STEP_Y, 0.06]} />
                  </mesh>
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <mesh key={idx} position={[0, 0.34 + idx * 0.34, 0]} material={mats.timber}>
                      <boxGeometry args={[0.46, 0.045, 0.045]} />
                    </mesh>
                  ))}
                </group>
              </>
            )}

            {/* Ceiling vault slab (open when vertical shaft extends above) */}
            {!hasAbove ? (
              <mesh position={[0, h + 0.1, 0]} material={wallMat} receiveShadow>
                <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W, 0.2, TUNNEL_CONSTANTS.CELL_W]} />
              </mesh>
            ) : (
              <>
                <mesh position={[0, h + 0.08, -0.92]} material={wallMat}>
                  <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W, 0.16, 0.56]} />
                </mesh>
                <mesh position={[0, h + 0.08, 0.92]} material={wallMat}>
                  <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W, 0.16, 0.56]} />
                </mesh>
                <mesh position={[-0.92, h + 0.08, 0]} material={wallMat}>
                  <boxGeometry args={[0.56, 0.16, 1.28]} />
                </mesh>
                <mesh position={[0.92, h + 0.08, 0]} material={wallMat}>
                  <boxGeometry args={[0.56, 0.16, 1.28]} />
                </mesh>
              </>
            )}

            {/* Un-dug Side Earth Walls + Rock-Cut Base Skirting for Architectural Depth */}
            {!hasPosX && (
              <group>
                <mesh position={[halfW + 0.12, h / 2, 0]} material={wallMat} receiveShadow>
                  <boxGeometry args={[0.24, h, TUNNEL_CONSTANTS.CELL_W]} />
                </mesh>
                <mesh position={[halfW - 0.04, 0.14, 0]} material={mats.rock}>
                  <boxGeometry args={[0.1, 0.28, TUNNEL_CONSTANTS.CELL_W - 0.04]} />
                </mesh>
              </group>
            )}
            {!hasNegX && (
              <group>
                <mesh position={[-halfW - 0.12, h / 2, 0]} material={wallMat} receiveShadow>
                  <boxGeometry args={[0.24, h, TUNNEL_CONSTANTS.CELL_W]} />
                </mesh>
                <mesh position={[-halfW + 0.04, 0.14, 0]} material={mats.rock}>
                  <boxGeometry args={[0.1, 0.28, TUNNEL_CONSTANTS.CELL_W - 0.04]} />
                </mesh>
              </group>
            )}
            {!hasPosZ && !openPosZ && (
              <group>
                <mesh position={[0, h / 2, halfW + 0.12]} material={wallMat} receiveShadow>
                  <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W, h, 0.24]} />
                </mesh>
                <mesh position={[0, 0.14, halfW - 0.04]} material={mats.rock}>
                  <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W - 0.04, 0.28, 0.1]} />
                </mesh>
              </group>
            )}
            {!hasNegZ && !openNegZ && (
              <group>
                <mesh position={[0, h / 2, -halfW - 0.12]} material={wallMat} receiveShadow>
                  <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W, h, 0.24]} />
                </mesh>
                <mesh position={[0, 0.14, -halfW + 0.04]} material={mats.rock}>
                  <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W - 0.04, 0.28, 0.1]} />
                </mesh>
              </group>
            )}

            {/* Portal Entrance Timber Framing right outside Shelter Bulkheads */}
            {(openPosZ || openNegZ) && (
              <group position={[0, 0, openPosZ ? halfW - 0.09 : -halfW + 0.09]}>
                <mesh position={[-0.95, h / 2 - 0.05, 0]} material={mats.timber}>
                  <boxGeometry args={[0.16, h - 0.1, 0.16]} />
                </mesh>
                <mesh position={[0.95, h / 2 - 0.05, 0]} material={mats.timber}>
                  <boxGeometry args={[0.16, h - 0.1, 0.16]} />
                </mesh>
                <mesh position={[0, h - 0.12, 0]} material={mats.timber}>
                  <boxGeometry args={[2.12, 0.18, 0.18]} />
                </mesh>
              </group>
            )}

            {/* Timber A-Frame Pit-Prop Bracing + Duckboard Walkway */}
            {seg.supported && (
              <group>
                {/* Upright posts */}
                <mesh position={[-halfW + 0.11, h / 2 - 0.04, 0]} material={mats.timber} castShadow receiveShadow>
                  <boxGeometry args={[0.14, h - 0.08, 0.14]} />
                </mesh>
                <mesh position={[halfW - 0.11, h / 2 - 0.04, 0]} material={mats.timber} castShadow receiveShadow>
                  <boxGeometry args={[0.14, h - 0.08, 0.14]} />
                </mesh>
                {/* Heavy cross-cap beam */}
                <mesh position={[0, h - 0.1, 0]} material={mats.timber} castShadow receiveShadow>
                  <boxGeometry args={[TUNNEL_CONSTANTS.CELL_W - 0.08, 0.16, 0.16]} />
                </mesh>
                {/* Corner diagonal knee braces */}
                <mesh position={[-halfW + 0.28, h - 0.28, 0]} rotation={[0, 0, -Math.PI / 4]} material={mats.timber}>
                  <boxGeometry args={[0.42, 0.1, 0.1]} />
                </mesh>
                <mesh position={[halfW - 0.28, h - 0.28, 0]} rotation={[0, 0, Math.PI / 4]} material={mats.timber}>
                  <boxGeometry args={[0.42, 0.1, 0.1]} />
                </mesh>
                {/* Wooden duckboard sleepers on floor */}
                {!hasBelow && (
                  <>
                    <mesh position={[-0.28, 0.02, 0]} material={mats.timber} receiveShadow>
                      <boxGeometry args={[0.24, 0.04, TUNNEL_CONSTANTS.CELL_W - 0.12]} />
                    </mesh>
                    <mesh position={[0.28, 0.02, 0]} material={mats.timber} receiveShadow>
                      <boxGeometry args={[0.24, 0.04, TUNNEL_CONSTANTS.CELL_W - 0.12]} />
                    </mesh>
                  </>
                )}
              </group>
            )}

            {/* Hanging Caged Work Lantern */}
            {seg.lit && (
              <group position={[hasAbove ? 0.72 : 0, h - 0.12, 0]}>
                <mesh position={[0, -0.14, 0]} material={mats.metalDark}>
                  <cylinderGeometry args={[0.014, 0.014, 0.28, 6]} />
                </mesh>
                <mesh position={[0, -0.27, 0]} material={mats.metalDark}>
                  <cylinderGeometry args={[0.13, 0.17, 0.06, 10]} />
                </mesh>
                <mesh position={[0, -0.36, 0]} material={mats.lanternGlow}>
                  <sphereGeometry args={[0.085, 8, 8]} />
                </mesh>
              </group>
            )}

            {/* Overhead Galvanized Ventilation Ducting */}
            {seg.ventilated && (
              <group position={[0.62, h - 0.16, 0]}>
                <mesh material={mats.ventDuct}>
                  <boxGeometry args={[0.34, 0.22, TUNNEL_CONSTANTS.CELL_W]} />
                </mesh>
                <mesh position={[-0.18, 0, 0]} material={mats.metalDark}>
                  <boxGeometry args={[0.03, 0.16, 0.34]} />
                </mesh>
              </group>
            )}

            {/* Glistening Groundwater Flooded Layer */}
            {seg.flooded && !hasBelow && (
              <mesh
                ref={(el) => {
                  if (el) waterMeshesRef.current.push(el);
                }}
                position={[0, 0.28, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                material={mats.waterSurface}
              >
                <planeGeometry args={[TUNNEL_CONSTANTS.CELL_W - 0.04, TUNNEL_CONSTANTS.CELL_W - 0.04]} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
