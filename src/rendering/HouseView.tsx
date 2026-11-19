/**
 * Modular 3D House renderer built from engineered HouseBlueprint data.
 * Features:
 * - 8 genuinely distinct house architectures with unique silhouettes, materials, porches,
 *   balconies, facade accents (Tudor half-timbering, Craftsman brackets, Colonial pediments,
 *   Farmhouse gables, Mediterranean arches, Nordic timber fins, Industrial steel + roof pergola)
 * - World-space tiled box UVs via getTiledBoxGeometry (zero stretched wall or floor textures)
 * - Zero-Z-fighting doors (stepped jambs, proud casings, reveal gaps, paneled leaves, tunnel collar)
 * - Realistic full-opening dual-leaf hinged casement windows (zero fixed cross-bars, smooth 103deg swing)
 * - Concrete 4-wall shelter hatch shaft liner descending cleanly into the underground bunker
 * - Real baluster stair handrails & horizontal guardrails (wood, metal, tempered glass)
 */

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { HouseBlueprint, RailingSpec } from '../world/houses';
import type { GameSimulation } from '../simulation/simulation';
import type { CameraMode } from '../storage/localSettings';
import { getProceduralTextureLibrary } from './proceduralTextures';
import { getTiledBoxGeometry } from './tiledGeometry';
import { FurniturePiece } from './InteriorAssets';
import { worldToLocal } from '../world/houses';

interface HouseViewProps {
  blueprint: HouseBlueprint;
  simRef: React.MutableRefObject<GameSimulation>;
  cameraMode: CameraMode;
  isNight: boolean;
}

/** Real architectural railing with end newel posts, bottom/top rails, balusters or glass panels. */
function RailingPiece({
  spec,
  woodMat,
  metalMat,
  glassMat,
}: {
  spec: RailingSpec;
  woodMat: THREE.Material;
  metalMat: THREE.Material;
  glassMat: THREE.Material;
}) {
  const dx = spec.x2 - spec.x1;
  const dy = spec.y2 - spec.y1;
  const dz = spec.z2 - spec.z1;
  const horizLen = Math.hypot(dx, dz);
  const fullLen = Math.hypot(dx, dy, dz);
  if (fullLen < 0.08) return null;

  const yaw = Math.atan2(dx, dz);
  const slopeAngle = -Math.atan2(dy, Math.max(horizLen, 1e-4));
  const midX = (spec.x1 + spec.x2) / 2;
  const midY = (spec.y1 + spec.y2) / 2;
  const midZ = (spec.z1 + spec.z2) / 2;

  const postMat = spec.style === 'wood' ? woodMat : metalMat;
  const balusterCount = Math.max(1, Math.floor(horizLen / 0.34));

  return (
    <group>
      {/* Start & End Newel Posts */}
      <mesh position={[spec.x1, spec.y1 + (spec.height + 0.06) / 2, spec.z1]} material={postMat} castShadow>
        <boxGeometry args={[0.09, spec.height + 0.06, 0.09]} />
      </mesh>
      <mesh position={[spec.x2, spec.y2 + (spec.height + 0.06) / 2, spec.z2]} material={postMat} castShadow>
        <boxGeometry args={[0.09, spec.height + 0.06, 0.09]} />
      </mesh>

      {/* Top Handrail + Bottom Rail (sloped or level) */}
      <group position={[midX, midY, midZ]} rotation={[0, yaw, 0]}>
        <mesh position={[0, spec.height, 0]} rotation={[slopeAngle, 0, 0]} material={postMat} castShadow>
          <boxGeometry args={[0.085, 0.065, fullLen + 0.06]} />
        </mesh>
        <mesh position={[0, 0.09, 0]} rotation={[slopeAngle, 0, 0]} material={postMat}>
          <boxGeometry args={[0.06, 0.05, fullLen]} />
        </mesh>
        {spec.style === 'glass' && (
          <mesh position={[0, spec.height * 0.54, 0]} rotation={[slopeAngle, 0, 0]} material={glassMat}>
            <boxGeometry args={[0.025, spec.height - 0.22, Math.max(0.08, fullLen - 0.14)]} />
          </mesh>
        )}
      </group>

      {/* Vertical Balusters (wood/metal) or Intermediate Mullion Posts (glass) */}
      {spec.style !== 'glass'
        ? Array.from({ length: balusterCount - 1 }).map((_, idx) => {
            const t = (idx + 1) / balusterCount;
            const bx = spec.x1 + dx * t;
            const by = spec.y1 + dy * t;
            const bz = spec.z1 + dz * t;
            return (
              <mesh
                key={idx}
                position={[bx, by + spec.height * 0.52, bz]}
                material={postMat}
                castShadow
              >
                <boxGeometry args={[0.036, spec.height - 0.1, 0.036]} />
              </mesh>
            );
          })
        : Array.from({ length: Math.max(0, Math.floor(horizLen / 1.8) - 1) }).map((_, idx) => {
            const divs = Math.max(2, Math.floor(horizLen / 1.8));
            const t = (idx + 1) / divs;
            return (
              <mesh
                key={idx}
                position={[spec.x1 + dx * t, spec.y1 + dy * t + spec.height / 2, spec.z1 + dz * t]}
                material={metalMat}
                castShadow
              >
                <boxGeometry args={[0.055, spec.height, 0.055]} />
              </mesh>
            );
          })}
    </group>
  );
}

export function HouseView({ blueprint, simRef, isNight }: HouseViewProps) {
  const { gl } = useThree();
  const floor1GroupRef = useRef<THREE.Group>(null);
  const floor2GroupRef = useRef<THREE.Group>(null);
  const roofGroupRef = useRef<THREE.Group>(null);
  const shelterGroupRef = useRef<THREE.Group>(null);
  const interiorFurnRef = useRef<THREE.Group>(null);
  const interiorLightGroupRef = useRef<THREE.Group>(null);
  const shelterHatchPivotRef = useRef<THREE.Group>(null);
  const doorPivotRefs = useRef<Record<string, THREE.Group | null>>({});
  const doorLockRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const windowBarricadeRefs = useRef<Record<string, THREE.Group | null>>({});
  const windowLeftPivotRefs = useRef<Record<string, THREE.Group | null>>({});
  const windowRightPivotRefs = useRef<Record<string, THREE.Group | null>>({});

  const textures = useMemo(
    () => getProceduralTextureLibrary(Math.min(4, gl.capabilities.getMaxAnisotropy())),
    [gl],
  );

  // Shared per-house PBR materials (grounded, clean, non-spotty, readable iron/metal)
  const mats = useMemo(() => {
    const extTex = textures[blueprint.palette.exteriorTexture] ?? textures.brick;
    return {
      exterior: new THREE.MeshStandardMaterial({
        color: blueprint.palette.exteriorColor,
        map: extTex.map,
        normalMap: extTex.normalMap,
        roughnessMap: extTex.roughnessMap,
        roughness: 0.88,
        metalness: 0.04,
      }),
      interior: new THREE.MeshStandardMaterial({
        color: '#e5dfd4',
        map: textures.plaster.map,
        normalMap: textures.plaster.normalMap,
        roughness: 0.9,
      }),
      garage: new THREE.MeshStandardMaterial({
        color: '#c4bfb6',
        map: textures.concrete.map,
        normalMap: textures.concrete.normalMap,
        roughness: 0.9,
      }),
      shelter: new THREE.MeshStandardMaterial({
        color: '#8f8d88',
        map: textures.concrete.map,
        normalMap: textures.concrete.normalMap,
        roughness: 0.92,
      }),
      stone: new THREE.MeshStandardMaterial({
        color: '#b2aba0',
        map: textures.stone.map,
        normalMap: textures.stone.normalMap,
        roughnessMap: textures.stone.roughnessMap,
        roughness: 0.9,
      }),
      trim: new THREE.MeshStandardMaterial({
        color: blueprint.palette.trimColor,
        roughness: 0.64,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: blueprint.palette.accentColor,
        roughness: 0.7,
      }),
      woodFloor: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: textures.woodFloor.map,
        normalMap: textures.woodFloor.normalMap,
        roughnessMap: textures.woodFloor.roughnessMap,
        roughness: 0.68,
      }),
      tileFloor: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: textures.tile.map,
        normalMap: textures.tile.normalMap,
        roughnessMap: textures.tile.roughnessMap,
        roughness: 0.48,
      }),
      concreteFloor: new THREE.MeshStandardMaterial({
        color: '#c8c4bc',
        map: textures.concrete.map,
        normalMap: textures.concrete.normalMap,
        roughness: 0.86,
      }),
      roofFloor: new THREE.MeshStandardMaterial({
        color: blueprint.palette.roofColor,
        map: textures.roof.map,
        normalMap: textures.roof.normalMap,
        roughnessMap: textures.roof.roughnessMap,
        roughness: 0.88,
      }),
      door: new THREE.MeshStandardMaterial({
        color: blueprint.palette.doorColor,
        roughness: 0.58,
      }),
      doorPanel: new THREE.MeshStandardMaterial({
        color: new THREE.Color(blueprint.palette.doorColor).multiplyScalar(0.84),
        roughness: 0.62,
      }),
      shutter: new THREE.MeshStandardMaterial({
        color: blueprint.palette.shutterColor,
        roughness: 0.74,
      }),
      // Lifted architectural charcoal iron so porch columns & mullions never render pitch-black
      metalDark: new THREE.MeshStandardMaterial({
        color: '#4c525a',
        metalness: 0.52,
        roughness: 0.44,
      }),
      sashFrame: new THREE.MeshStandardMaterial({
        color: new THREE.Color(blueprint.palette.trimColor).lerp(new THREE.Color('#4a4e54'), 0.25),
        roughness: 0.56,
        metalness: 0.14,
      }),
      railingGlass: new THREE.MeshStandardMaterial({
        color: '#7a94a3',
        roughness: 0.14,
        metalness: 0.25,
        transparent: true,
        opacity: 0.42,
      }),
      glassDay: new THREE.MeshStandardMaterial({
        color: '#88a4b5',
        roughness: 0.1,
        metalness: 0.22,
        transparent: true,
        opacity: 0.36,
      }),
      glassNight: new THREE.MeshStandardMaterial({
        color: '#d8be89',
        emissive: '#f2b863',
        emissiveIntensity: 1.25,
        roughness: 0.18,
        transparent: true,
        opacity: 0.76,
      }),
      barricadeWood: new THREE.MeshStandardMaterial({
        color: '#8c6f4b',
        roughness: 0.9,
      }),
    };
  }, [blueprint.palette, textures]);

  const wallsByFloor = useMemo(() => {
    const map: Record<number, typeof blueprint.walls> = { [-1]: [], 0: [], 1: [], 2: [] };
    for (const w of blueprint.walls) {
      (map[w.floorLevel] ?? map[0]).push(w);
    }
    return map;
  }, [blueprint.walls]);

  const slabsByFloor = useMemo(() => {
    const map: Record<number, typeof blueprint.slabs> = { [-1]: [], 0: [], 1: [], 2: [] };
    for (const s of blueprint.slabs) {
      (map[s.floorLevel] ?? map[0]).push(s);
    }
    return map;
  }, [blueprint.slabs]);

  const railingsByFloor = useMemo(() => {
    const map: Record<number, typeof blueprint.railings> = { [-1]: [], 0: [], 1: [], 2: [] };
    for (const r of blueprint.railings) {
      (map[r.floorLevel] ?? map[0]).push(r);
    }
    return map;
  }, [blueprint.railings]);

  const furnByFloor = useMemo(() => {
    const map: Record<number, typeof blueprint.furniture> = { [-1]: [], 0: [], 1: [], 2: [] };
    for (const f of blueprint.furniture) {
      (map[f.floorLevel] ?? map[0]).push(f);
    }
    return map;
  }, [blueprint.furniture]);

  // Precompute local coordinates of the exterior roof ladder & shelter hatch ladder
  const roofLadderLocal = useMemo(() => {
    const l = blueprint.ladders.find((item) => item.kind === 'roof');
    if (!l) return null;
    const pos = worldToLocal(blueprint.worldOrigin, blueprint.rotationY, {
      x: l.climbX,
      y: l.bottomY,
      z: l.climbZ,
    });
    return {
      x: pos.x,
      z: pos.z,
      rotY: l.faceYaw - blueprint.rotationY,
      height: l.topY - l.bottomY,
    };
  }, [blueprint]);

  const shelterLadderLocal = useMemo(() => {
    const l = blueprint.ladders.find((item) => item.kind === 'shelter');
    if (!l) return null;
    const pos = worldToLocal(blueprint.worldOrigin, blueprint.rotationY, {
      x: l.climbX,
      y: l.bottomY,
      z: l.climbZ,
    });
    return {
      x: pos.x,
      z: pos.z,
      bottomY: l.bottomY,
      topY: l.topY,
      height: l.topY - l.bottomY,
    };
  }, [blueprint]);

  // Dynamic frame updates: keep full house structure ALWAYS loaded, animate doors/hatch/casement windows
  useFrame(() => {
    const sim = simRef.current;
    const player = sim.getLocalPlayer();
    if (!player) return;

    const isPlayerInThisHouse = player.insideHouseId === blueprint.houseId;
    const distSq =
      (player.position.x - blueprint.worldOrigin.x) ** 2 +
      (player.position.z - blueprint.worldOrigin.z) ** 2;

    if (floor1GroupRef.current) floor1GroupRef.current.visible = true;
    if (floor2GroupRef.current) floor2GroupRef.current.visible = true;
    if (roofGroupRef.current) roofGroupRef.current.visible = true;
    if (shelterGroupRef.current) {
      shelterGroupRef.current.visible =
        player.position.y < -0.45 || isPlayerInThisHouse || distSq < 46 * 46;
    }
    if (interiorLightGroupRef.current) {
      interiorLightGroupRef.current.visible = isPlayerInThisHouse;
    }
    if (interiorFurnRef.current) {
      interiorFurnRef.current.visible = isPlayerInThisHouse || distSq < 72 * 72;
    }

    // Animate hinged metal shelter trapdoor in garage
    const hatchState = sim.state.shelterHatches[blueprint.houseId];
    if (shelterHatchPivotRef.current && hatchState) {
      shelterHatchPivotRef.current.rotation.x = -hatchState.openProgress * (Math.PI * 0.62);
    }

    // Sync interactive door swing & lock visual
    for (const d of blueprint.doors) {
      const live = sim.state.doors[d.id];
      const pivot = doorPivotRefs.current[d.id];
      if (live && pivot) {
        if (d.kind === 'garage') {
          pivot.position.y = live.openProgress * 2.55;
        } else {
          pivot.rotation.y = -live.openProgress * (Math.PI * 0.56);
        }
      }
      const lockMesh = doorLockRefs.current[d.id];
      if (live && lockMesh) {
        lockMesh.visible = live.isLocked;
      }
    }

    // Sync realistic full-opening dual-leaf outward-swinging casement windows + barricades
    for (const w of blueprint.windows) {
      const live = sim.state.windows[w.id];
      if (!live) continue;
      const bar = windowBarricadeRefs.current[w.id];
      if (bar) {
        bar.visible = live.isBarricaded;
      }
      const openAng = live.openProgress * 1.8; // ~103 degrees outward swing leaving 100% clear opening
      const leftPivot = windowLeftPivotRefs.current[w.id];
      if (leftPivot) {
        leftPivot.rotation.y = -openAng;
      }
      const rightPivot = windowRightPivotRefs.current[w.id];
      if (rightPivot) {
        rightPivot.rotation.y = openAng;
      }
    }
  });

  const wallMaterialFor = (m: string) => {
    switch (m) {
      case 'exterior':
        return mats.exterior;
      case 'interior':
        return mats.interior;
      case 'garage':
        return mats.garage;
      case 'shelter':
        return mats.shelter;
      case 'trim':
        return mats.trim;
      case 'accent':
        return mats.accent;
      case 'roof':
        return mats.roofFloor;
      default:
        return mats.concreteFloor;
    }
  };

  const slabMaterialFor = (s: string) => {
    switch (s) {
      case 'wood':
        return mats.woodFloor;
      case 'tile':
        return mats.tileFloor;
      case 'roof':
        return mats.roofFloor;
      default:
        return mats.concreteFloor;
    }
  };

  const hw = blueprint.width / 2;
  const hd = blueprint.depth / 2;
  const mirror = blueprint.lot.garageSide === 'left' ? -1 : 1;
  const arch = blueprint.archetype;
  const porch = blueprint.porch;
  const usesBalconyCanopy = arch.balconySide !== 'none' && (arch.id === 'stucco_modern' || arch.id === 'industrial_loft');
  const isSymmetricFront = Math.abs(arch.westFrontZ - arch.eastFrontZ) < 0.05;
  const frontZLeft = mirror === 1 ? arch.westFrontZ : arch.eastFrontZ;
  const frontZRight = mirror === 1 ? arch.eastFrontZ : arch.westFrontZ;

  // Shelter light position centered inside the bunker beneath garage/utility
  const shelterCenterLocalX =
    blueprint.garageCenterLocalX - mirror * (blueprint.garageWidth / 2) - mirror * 0.6;
  const shelterCenterLocalZ = shelterLadderLocal?.z ?? -0.65;

  return (
    <group
      position={[blueprint.worldOrigin.x, blueprint.worldOrigin.y, blueprint.worldOrigin.z]}
      rotation={[0, blueprint.rotationY, 0]}
      name={blueprint.houseId}
    >
      {/* ==================== GROUND FLOOR (Level 0) ==================== */}
      <group ref={floor1GroupRef}>
        {slabsByFloor[0].map((s) => (
          <mesh
            key={s.id}
            position={[s.x, s.y - s.thickness / 2, s.z]}
            geometry={getTiledBoxGeometry(s.sx, s.thickness, s.sz, s.surface === 'tile' ? 1.8 : 2.3)}
            material={slabMaterialFor(s.surface)}
            receiveShadow
          />
        ))}

        {wallsByFloor[0].map((w) => (
          <mesh
            key={w.id}
            position={[w.x, w.y, w.z]}
            geometry={getTiledBoxGeometry(w.sx, w.sy, w.sz, w.material === 'exterior' ? 2.4 : 2.5)}
            material={wallMaterialFor(w.material)}
            castShadow
            receiveShadow
          />
        ))}

        {/* Archetype-specific Front Porch Canopy, Columns, Brackets/Arches & Entrance Sconce */}
        <group>
          {!usesBalconyCanopy && (
            <>
              <mesh
                position={[porch.x, porch.roofY + 0.14, porch.z + 0.08]}
                geometry={getTiledBoxGeometry(porch.width + 0.5, 0.24, porch.depth + 0.4, 2.4)}
                material={mats.roofFloor}
                castShadow
                receiveShadow
              />
              <mesh
                position={[porch.x, porch.roofY + 0.08, porch.z + porch.depth / 2 + 0.29]}
                material={mats.trim}
                castShadow
              >
                <boxGeometry args={[porch.width + 0.58, 0.22, 0.08]} />
              </mesh>
            </>
          )}

          {/* Porch Columns (Craftsman & Tudor have stone plinth bases; Modern/Industrial have architectural charcoal iron) */}
          {porch.columnLocalXs.map((cx, idx) => {
            const colH = porch.roofY - blueprint.groundFloorY;
            const colZ = porch.z + porch.depth / 2 - 0.18;
            const isSteelPost =
              arch.porchStyle === 'modern_patio' ||
              arch.porchStyle === 'industrial_canopy' ||
              arch.porchStyle === 'nordic_deck';
            return (
              <group key={idx} position={[cx, blueprint.groundFloorY, colZ]}>
                {porch.hasStoneBases && (
                  <mesh
                    position={[0, 0.62, 0]}
                    geometry={getTiledBoxGeometry(0.44, 1.24, 0.44, 1.6)}
                    material={mats.stone}
                    castShadow
                    receiveShadow
                  />
                )}
                <mesh
                  position={[0, colH / 2, 0]}
                  material={isSteelPost ? mats.metalDark : mats.trim}
                  castShadow
                >
                  <boxGeometry args={[isSteelPost ? 0.17 : 0.23, colH, isSteelPost ? 0.17 : 0.23]} />
                </mesh>
                {/* Decorative column capital */}
                <mesh
                  position={[0, colH - 0.08, 0]}
                  material={isSteelPost ? mats.metalDark : mats.trim}
                >
                  <boxGeometry args={[isSteelPost ? 0.24 : 0.32, 0.14, isSteelPost ? 0.24 : 0.32]} />
                </mesh>
                {/* Craftsman diagonal knee braces */}
                {arch.facadeAccent === 'craftsman_brackets' && (
                  <mesh
                    position={[0, colH - 0.42, -0.26]}
                    rotation={[0.68, 0, 0]}
                    material={mats.accent}
                    castShadow
                  >
                    <boxGeometry args={[0.12, 0.64, 0.12]} />
                  </mesh>
                )}
              </group>
            );
          })}

          {/* Mediterranean Villa: Arched Loggia Spandrel Trim between porch columns */}
          {arch.facadeAccent === 'villa_arches' &&
            porch.columnLocalXs.slice(0, -1).map((cx, idx) => {
              const nextX = porch.columnLocalXs[idx + 1];
              const span = Math.abs(nextX - cx);
              const midX = (cx + nextX) / 2;
              const colZ = porch.z + porch.depth / 2 - 0.18;
              return (
                <group key={`arch_${idx}`} position={[midX, porch.roofY - 0.34, colZ]}>
                  <mesh material={mats.trim} castShadow>
                    <boxGeometry args={[span - 0.2, 0.34, 0.24]} />
                  </mesh>
                  <mesh position={[0, 0.24, 0.16]} material={mats.accent} castShadow>
                    <boxGeometry args={[span + 0.1, 0.14, 0.22]} />
                  </mesh>
                </group>
              );
            })}

          {/* Warm entrance porch sconce beside front door */}
          <mesh
            position={[
              blueprint.frontDoorLocalX + 1.0,
              blueprint.groundFloorY + 2.45,
              blueprint.frontDoorLocalZ + 0.19,
            ]}
          >
            <boxGeometry args={[0.2, 0.28, 0.2]} />
            <meshStandardMaterial
              color="#f4e8ce"
              emissive="#ffbd6b"
              emissiveIntensity={isNight ? 2.5 : 0.25}
              roughness={0.35}
            />
          </mesh>
        </group>

        {/* Ground-to-2F Walkable Interior Stairs */}
        {blueprint.stairs
          .filter((st) => st.floorLevel === 0)
          .map((st) => {
            const stepD = (st.zEnd - st.zStart) / st.steps;
            const stepH = (st.yEnd - st.yStart) / st.steps;
            return (
              <group key={st.id}>
                {Array.from({ length: st.steps }).map((_, idx) => {
                  const topY = st.yStart + (idx + 1) * stepH;
                  const cz = st.zStart + (idx + 0.5) * stepD;
                  return (
                    <mesh
                      key={idx}
                      position={[st.x, topY - stepH / 2, cz]}
                      geometry={getTiledBoxGeometry(st.width, stepH + 0.02, Math.abs(stepD) + 0.025, 1.8)}
                      material={mats.woodFloor}
                      castShadow
                      receiveShadow
                    />
                  );
                })}
              </group>
            );
          })}

        {/* Ground Floor Real Baluster Stair Railings */}
        {railingsByFloor[0].map((r) => (
          <RailingPiece
            key={r.id}
            spec={r}
            woodMat={mats.accent}
            metalMat={mats.metalDark}
            glassMat={mats.railingGlass}
          />
        ))}

        {/* Animated Hinged Metal Shelter Trapdoor + Full 4-Wall Concrete Shaft Liner */}
        {shelterLadderLocal && (
          <group position={[shelterLadderLocal.x, blueprint.groundFloorY, shelterLadderLocal.z]}>
            {/* Recessed steel collar rim flush with garage concrete floor */}
            <mesh position={[0, 0.022, -0.68]} material={mats.metalDark} receiveShadow>
              <boxGeometry args={[1.44, 0.06, 0.12]} />
            </mesh>
            <mesh position={[0, 0.022, 0.68]} material={mats.metalDark} receiveShadow>
              <boxGeometry args={[1.44, 0.06, 0.12]} />
            </mesh>
            <mesh position={[-0.68, 0.022, 0]} material={mats.metalDark} receiveShadow>
              <boxGeometry args={[0.12, 0.06, 1.24]} />
            </mesh>
            <mesh position={[0.68, 0.022, 0]} material={mats.metalDark} receiveShadow>
              <boxGeometry args={[0.12, 0.06, 1.24]} />
            </mesh>

            {/* Full 4-wall concrete shaft liner descending cleanly down through foundation into shelter */}
            <mesh
              position={[0, -0.34, -0.64]}
              geometry={getTiledBoxGeometry(1.36, 0.76, 0.08, 1.5)}
              material={mats.shelter}
              receiveShadow
            />
            <mesh
              position={[0, -0.34, 0.64]}
              geometry={getTiledBoxGeometry(1.36, 0.76, 0.08, 1.5)}
              material={mats.shelter}
              receiveShadow
            />
            <mesh
              position={[-0.64, -0.34, 0]}
              geometry={getTiledBoxGeometry(0.08, 0.76, 1.22, 1.5)}
              material={mats.shelter}
              receiveShadow
            />
            <mesh
              position={[0.64, -0.34, 0]}
              geometry={getTiledBoxGeometry(0.08, 0.76, 1.22, 1.5)}
              material={mats.shelter}
              receiveShadow
            />

            {/* Hinged steel trapdoor lid pivoted on the -Z back edge */}
            <group ref={shelterHatchPivotRef} position={[0, 0.052, -0.64]}>
              <mesh position={[0, 0.02, 0.64]} castShadow receiveShadow>
                <boxGeometry args={[1.26, 0.06, 1.26]} />
                <meshStandardMaterial color="#585e64" metalness={0.55} roughness={0.5} />
              </mesh>
              {/* Hazard handle bar */}
              <mesh position={[0, 0.065, 1.08]}>
                <boxGeometry args={[0.42, 0.045, 0.08]} />
                <meshStandardMaterial color="#c49a38" roughness={0.48} />
              </mesh>
            </group>
          </group>
        )}

        {/* Interior furniture (culled when far) */}
        <group ref={interiorFurnRef}>
          {furnByFloor[0].map((f) => (
            <FurniturePiece key={f.id} spec={f} />
          ))}
        </group>

        {/* Warm architectural ceiling light fixtures on 1F */}
        {[
          { x: mirror * -7.2, z: 4.2 },
          { x: mirror * -7.2, z: -4.2 },
          { x: mirror * 0.2, z: 4.5 },
          { x: mirror * 0.2, z: -4.5 },
          { x: mirror * 7.8, z: 4.2 },
          { x: mirror * 7.8, z: -4.2 },
          { x: blueprint.garageCenterLocalX, z: 1.8 },
        ].map((lamp, idx) => (
          <group
            key={`c1_${idx}`}
            position={[lamp.x, blueprint.groundFloorY + blueprint.ceilingHeight - 0.05, lamp.z]}
          >
            <mesh material={mats.metalDark}>
              <cylinderGeometry args={[0.3, 0.32, 0.06, 12]} />
            </mesh>
            <mesh position={[0, -0.04, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 0.04, 12]} />
              <meshStandardMaterial color="#fff3d6" emissive="#ffd99a" emissiveIntensity={1.5} roughness={0.3} />
            </mesh>
          </group>
        ))}

        {/* Active warm residential interior fill lights (enabled only while inside this house) */}
        <group ref={interiorLightGroupRef} visible={false}>
          <pointLight
            position={[mirror * -6.5, blueprint.groundFloorY + 3.2, 1.5]}
            color="#fff1d8"
            intensity={20}
            distance={26}
            decay={1.55}
          />
          <pointLight
            position={[mirror * 3.8, blueprint.groundFloorY + 3.2, 0.5]}
            color="#fff1d8"
            intensity={20}
            distance={26}
            decay={1.55}
          />
          <pointLight
            position={[blueprint.garageCenterLocalX, blueprint.groundFloorY + 3.2, 1.6]}
            color="#f0f5ff"
            intensity={16}
            distance={20}
            decay={1.65}
          />
          <pointLight
            position={[mirror * -5.5, blueprint.secondFloorY + 3.2, 1.0]}
            color="#fff1d8"
            intensity={20}
            distance={26}
            decay={1.55}
          />
          <pointLight
            position={[mirror * 4.5, blueprint.secondFloorY + 3.2, 1.0]}
            color="#fff1d8"
            intensity={20}
            distance={26}
            decay={1.55}
          />
        </group>

        {/* Exterior gutters & downspouts anchored flush on non-garage outer corners */}
        <mesh
          position={[
            blueprint.lot.garageSide === 'left' ? hw + 0.14 : -hw - 0.14,
            blueprint.roofDeckY / 2,
            (blueprint.lot.garageSide === 'left' ? frontZRight : frontZLeft) - 0.18,
          ]}
          material={mats.metalDark}
          castShadow
        >
          <cylinderGeometry args={[0.048, 0.048, blueprint.roofDeckY, 8]} />
        </mesh>
        <mesh
          position={[
            blueprint.lot.garageSide === 'left' ? hw + 0.14 : -hw - 0.14,
            blueprint.roofDeckY / 2,
            -hd + 0.18,
          ]}
          material={mats.metalDark}
          castShadow
        >
          <cylinderGeometry args={[0.048, 0.048, blueprint.roofDeckY, 8]} />
        </mesh>

        {/* Exterior Climbable Steel Roof Ladder */}
        {roofLadderLocal && (
          <group
            position={[roofLadderLocal.x, 0, roofLadderLocal.z]}
            rotation={[0, roofLadderLocal.rotY, 0]}
          >
            <mesh position={[-0.24, (roofLadderLocal.height + 0.95) / 2, -0.16]} material={mats.metalDark} castShadow>
              <cylinderGeometry args={[0.032, 0.032, roofLadderLocal.height + 0.95, 8]} />
            </mesh>
            <mesh position={[0.24, (roofLadderLocal.height + 0.95) / 2, -0.16]} material={mats.metalDark} castShadow>
              <cylinderGeometry args={[0.032, 0.032, roofLadderLocal.height + 0.95, 8]} />
            </mesh>
            <mesh
              position={[-0.24, roofLadderLocal.height + 0.95, -0.34]}
              rotation={[Math.PI / 2, 0, 0]}
              material={mats.metalDark}
            >
              <cylinderGeometry args={[0.03, 0.03, 0.38, 8]} />
            </mesh>
            <mesh
              position={[0.24, roofLadderLocal.height + 0.95, -0.34]}
              rotation={[Math.PI / 2, 0, 0]}
              material={mats.metalDark}
            >
              <cylinderGeometry args={[0.03, 0.03, 0.38, 8]} />
            </mesh>
            {[1.4, 3.8, 6.2].map((sy) => (
              <group key={sy} position={[0, sy, -0.27]}>
                <mesh position={[-0.24, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.metalDark}>
                  <cylinderGeometry args={[0.022, 0.022, 0.24, 6]} />
                </mesh>
                <mesh position={[0.24, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.metalDark}>
                  <cylinderGeometry args={[0.022, 0.022, 0.24, 6]} />
                </mesh>
              </group>
            ))}
            {Array.from({ length: Math.floor((roofLadderLocal.height + 0.1) / 0.35) }).map((_, i) => (
              <mesh
                key={i}
                position={[0, 0.35 + i * 0.35, -0.16]}
                rotation={[0, 0, Math.PI / 2]}
                material={mats.metalDark}
                castShadow
              >
                <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
              </mesh>
            ))}
          </group>
        )}

        {/* ==================== 8-ARCHETYPE SIGNATURE FACADE ACCENTS ==================== */}
        {/* Tudor Manor: Half-timbering 2F oak beams + stone ground plinth */}
        {arch.facadeAccent === 'tudor_beams' && (
          <group>
            {/* Stone lower wainscoting band along front */}
            <mesh
              position={[0, blueprint.groundFloorY + 0.52, hd + 0.13]}
              geometry={getTiledBoxGeometry(blueprint.width + 0.06, 1.04, 0.06, 1.8)}
              material={mats.stone}
              castShadow
            />
            {/* Horizontal 2F oak bressummers */}
            <mesh position={[0, blueprint.secondFloorY + 0.04, hd + 0.14]} material={mats.trim}>
              <boxGeometry args={[blueprint.width + 0.12, 0.22, 0.08]} />
            </mesh>
            <mesh position={[0, blueprint.secondFloorY + 3.68, hd + 0.14]} material={mats.trim}>
              <boxGeometry args={[blueprint.width + 0.12, 0.2, 0.08]} />
            </mesh>
            {/* Vertical Tudor timber studs across 2F front facade */}
            {[-11.8, -8.2, -3.4, 0, 3.4, 8.2, 11.8].map((bx) => (
              <mesh key={`tb_${bx}`} position={[bx, blueprint.secondFloorY + 1.86, hd + 0.14]} material={mats.trim}>
                <boxGeometry args={[0.18, 3.55, 0.08]} />
              </mesh>
            ))}
            {/* Diagonal corner braces */}
            {[-10.0, 10.0].map((bx) => (
              <mesh
                key={`td_${bx}`}
                position={[bx, blueprint.secondFloorY + 2.8, hd + 0.14]}
                rotation={[0, 0, bx < 0 ? -0.58 : 0.58]}
                material={mats.trim}
              >
                <boxGeometry args={[0.14, 1.5, 0.07]} />
              </mesh>
            ))}
          </group>
        )}

        {/* Brick Colonial: Corner pilasters & formal classical gable entry pediment */}
        {arch.facadeAccent === 'colonial_cornice' && (
          <group>
            {[-hw - 0.04, hw + 0.04].map((qx) => (
              <mesh key={`quoin_${qx}`} position={[qx, blueprint.roofDeckY / 2, hd + 0.05]} material={mats.trim}>
                <boxGeometry args={[0.26, blueprint.roofDeckY, 0.26]} />
              </mesh>
            ))}
            <group position={[blueprint.frontDoorLocalX, porch.roofY + 0.24, porch.z + porch.depth / 2 + 0.1]}>
              <mesh position={[-1.08, 0.34, 0]} rotation={[0, 0, 0.36]} material={mats.roofFloor} castShadow>
                <boxGeometry args={[2.35, 0.14, 0.92]} />
              </mesh>
              <mesh position={[1.08, 0.34, 0]} rotation={[0, 0, -0.36]} material={mats.roofFloor} castShadow>
                <boxGeometry args={[2.35, 0.14, 0.92]} />
              </mesh>
              <mesh position={[-1.08, 0.26, 0.44]} rotation={[0, 0, 0.36]} material={mats.trim}>
                <boxGeometry args={[2.38, 0.1, 0.08]} />
              </mesh>
              <mesh position={[1.08, 0.26, 0.44]} rotation={[0, 0, -0.36]} material={mats.trim}>
                <boxGeometry args={[2.38, 0.1, 0.08]} />
              </mesh>
              <mesh position={[0, 0.18, 0.38]} material={mats.trim}>
                <boxGeometry args={[2.8, 0.34, 0.1]} />
              </mesh>
            </group>
          </group>
        )}

        {/* Farmhouse Wrap: Classic centered front roof gable peak */}
        {arch.facadeAccent === 'farmhouse_gable' && (
          <group position={[0, blueprint.roofDeckY + 1.55, hd + 0.04]}>
            <mesh position={[-3.3, 0, 0]} rotation={[0, 0, 0.36]} material={mats.roofFloor} castShadow>
              <boxGeometry args={[7.4, 0.24, 1.8]} />
            </mesh>
            <mesh position={[3.3, 0, 0]} rotation={[0, 0, -0.36]} material={mats.roofFloor} castShadow>
              <boxGeometry args={[7.4, 0.24, 1.8]} />
            </mesh>
            <mesh position={[0, -0.25, 0.02]} material={mats.exterior}>
              <boxGeometry args={[6.4, 1.4, 0.3]} />
            </mesh>
            <mesh position={[0, 0.05, 0.2]} material={mats.trim}>
              <cylinderGeometry args={[0.52, 0.52, 0.08, 12]} />
            </mesh>
          </group>
        )}

        {/* Nordic Gable: Anchored architectural parapet brow & vertical iron fins */}
        {arch.facadeAccent === 'nordic_gable' && (
          <group>
            <mesh
              position={[0, blueprint.roofDeckY + 1.06, -hd + 0.1]}
              material={mats.roofFloor}
              castShadow
            >
              <boxGeometry args={[blueprint.width + 0.65, 0.22, 1.35]} />
            </mesh>
            <mesh
              position={[0, blueprint.roofDeckY + 1.06, Math.max(frontZLeft, frontZRight) - 0.15]}
              material={mats.roofFloor}
              castShadow
            >
              <boxGeometry args={[blueprint.width + 0.65, 0.22, 1.35]} />
            </mesh>
            {[-9.6, -9.0, -8.4, 9.0, 9.6].map((fx) => (
              <mesh
                key={`nfin_${fx}`}
                position={[
                  fx,
                  blueprint.secondFloorY + 1.9,
                  (fx < 0 ? frontZLeft : frontZRight) + 0.16,
                ]}
                material={mats.metalDark}
                castShadow
              >
                <boxGeometry args={[0.1, 3.6, 0.22]} />
              </mesh>
            ))}
          </group>
        )}

        {/* Modern Overhang: Sleek cantilevered top fascia brow & warm cedar soffit */}
        {arch.facadeAccent === 'modern_overhang' && (
          <mesh position={[0, blueprint.roofDeckY + 0.08, hd + 0.55]} material={mats.accent} castShadow>
            <boxGeometry args={[blueprint.width + 0.7, 0.26, 1.25]} />
          </mesh>
        )}

        {/* Industrial Loft: Exterior charcoal steel H-beam pilasters */}
        {arch.facadeAccent === 'industrial_steel' && (
          <group>
            {[-hw, -4.5, 4.5, hw].map((sx) => (
              <mesh key={`ibeam_${sx}`} position={[sx, blueprint.roofDeckY / 2, hd + 0.14]} material={mats.metalDark} castShadow>
                <boxGeometry args={[0.24, blueprint.roofDeckY + 0.9, 0.2]} />
              </mesh>
            ))}
          </group>
        )}
      </group>

      {/* ==================== SECOND FLOOR (Level 1) ==================== */}
      <group ref={floor2GroupRef}>
        {slabsByFloor[1].map((s) => (
          <mesh
            key={s.id}
            position={[s.x, s.y - s.thickness / 2, s.z]}
            geometry={getTiledBoxGeometry(s.sx, s.thickness, s.sz, s.surface === 'tile' ? 1.8 : 2.3)}
            material={slabMaterialFor(s.surface)}
            castShadow
            receiveShadow
          />
        ))}

        {wallsByFloor[1].map((w) => (
          <mesh
            key={w.id}
            position={[w.x, w.y, w.z]}
            geometry={getTiledBoxGeometry(w.sx, w.sy, w.sz, w.material === 'exterior' ? 2.4 : 2.5)}
            material={wallMaterialFor(w.material)}
            castShadow
            receiveShadow
          />
        ))}

        {/* Architectural belt-course trim between 1F and 2F */}
        <mesh position={[0, blueprint.secondFloorY - 0.1, -hd - 0.08]} material={mats.trim}>
          <boxGeometry args={[blueprint.width + 0.32, 0.18, 0.12]} />
        </mesh>
        {isSymmetricFront && (
          <mesh position={[0, blueprint.secondFloorY - 0.1, hd + 0.08]} material={mats.trim}>
            <boxGeometry args={[blueprint.width + 0.32, 0.18, 0.12]} />
          </mesh>
        )}

        {/* Walkable 2F Balcony Fascia */}
        {blueprint.balcony && (
          <mesh
            position={[
              blueprint.balcony.x,
              blueprint.balcony.floorY - 0.14,
              blueprint.balcony.z + blueprint.balcony.depth / 2 + 0.04,
            ]}
            material={mats.trim}
            castShadow
          >
            <boxGeometry args={[blueprint.balcony.width + 0.16, 0.28, 0.12]} />
          </mesh>
        )}

        {/* Garage roof coping cap */}
        <mesh
          position={[blueprint.garageCenterLocalX, blueprint.secondFloorY + 0.58, blueprint.garageMaxZ]}
          material={mats.trim}
        >
          <boxGeometry args={[blueprint.garageWidth + 0.26, 0.09, 0.32]} />
        </mesh>

        {/* 2F-to-Roof Walkable Stairs */}
        {blueprint.stairs
          .filter((st) => st.floorLevel === 1)
          .map((st) => {
            const stepD = (st.zEnd - st.zStart) / st.steps;
            const stepH = (st.yEnd - st.yStart) / st.steps;
            return (
              <group key={st.id}>
                {Array.from({ length: st.steps }).map((_, idx) => {
                  const topY = st.yStart + (idx + 1) * stepH;
                  const cz = st.zStart + (idx + 0.5) * stepD;
                  return (
                    <mesh
                      key={idx}
                      position={[st.x, topY - stepH / 2, cz]}
                      geometry={getTiledBoxGeometry(st.width, stepH + 0.02, Math.abs(stepD) + 0.025, 1.8)}
                      material={mats.woodFloor}
                      castShadow
                      receiveShadow
                    />
                  );
                })}
              </group>
            );
          })}

        {/* 2F Real Baluster Railings */}
        {railingsByFloor[1].map((r) => (
          <RailingPiece
            key={r.id}
            spec={r}
            woodMat={mats.accent}
            metalMat={mats.metalDark}
            glassMat={mats.railingGlass}
          />
        ))}

        {/* Warm architectural ceiling light fixtures on 2F */}
        {[
          { x: mirror * -7.2, z: 4.2 },
          { x: mirror * -7.2, z: -4.2 },
          { x: mirror * 0.2, z: 4.6 },
          { x: mirror * 0.2, z: -5.2 },
          { x: mirror * 8.2, z: 5.0 },
          { x: mirror * 8.2, z: -5.4 },
        ].map((lamp, idx) => (
          <group
            key={`c2_${idx}`}
            position={[lamp.x, blueprint.secondFloorY + blueprint.ceilingHeight - 0.05, lamp.z]}
          >
            <mesh material={mats.metalDark}>
              <cylinderGeometry args={[0.3, 0.32, 0.06, 12]} />
            </mesh>
            <mesh position={[0, -0.04, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 0.04, 12]} />
              <meshStandardMaterial color="#fff3d6" emissive="#ffd99a" emissiveIntensity={1.5} roughness={0.3} />
            </mesh>
          </group>
        ))}

        {furnByFloor[1].map((f) => (
          <FurniturePiece key={f.id} spec={f} />
        ))}
      </group>

      {/* ==================== FLAT WALKABLE ROOF DECK (Level 2) ==================== */}
      <group ref={roofGroupRef}>
        {slabsByFloor[2].map((s) => (
          <mesh
            key={s.id}
            position={[s.x, s.y - s.thickness / 2, s.z]}
            geometry={getTiledBoxGeometry(s.sx, s.thickness, s.sz, 2.8)}
            material={slabMaterialFor(s.surface)}
            castShadow
            receiveShadow
          />
        ))}

        {wallsByFloor[2].map((w) => (
          <mesh
            key={w.id}
            position={[w.x, w.y, w.z]}
            geometry={getTiledBoxGeometry(w.sx, w.sy, w.sz, 2.4)}
            material={wallMaterialFor(w.material)}
            castShadow
            receiveShadow
          />
        ))}

        {/* Roof Parapet Coping Trim */}
        <mesh position={[0, blueprint.roofDeckY + 1.04, -hd]} material={mats.trim} castShadow>
          <boxGeometry args={[blueprint.width + 0.36, 0.1, 0.34]} />
        </mesh>
        {isSymmetricFront && (
          <mesh position={[0, blueprint.roofDeckY + 1.04, hd]} material={mats.trim} castShadow>
            <boxGeometry args={[blueprint.width + 0.36, 0.1, 0.34]} />
          </mesh>
        )}

        {/* Rooftop Steel & Timber Pergola (Industrial Loft & select houses) */}
        {arch.hasRoofPergola && (
          <group position={[mirror * -5.4, blueprint.roofDeckY, 2.6]}>
            {[-2.4, 2.4].map((px) =>
              [-1.8, 1.8].map((pz) => (
                <mesh key={`pp_${px}_${pz}`} position={[px, 1.35, pz]} material={mats.metalDark} castShadow>
                  <boxGeometry args={[0.16, 2.7, 0.16]} />
                </mesh>
              )),
            )}
            {[-1.8, 1.8].map((pz) => (
              <mesh key={`pb_${pz}`} position={[0, 2.66, pz]} material={mats.metalDark} castShadow>
                <boxGeometry args={[5.2, 0.18, 0.18]} />
              </mesh>
            ))}
            {[-2.0, -1.2, -0.4, 0.4, 1.2, 2.0].map((lx) => (
              <mesh key={`pl_${lx}`} position={[lx, 2.78, 0]} material={mats.accent} castShadow>
                <boxGeometry args={[0.12, 0.1, 4.1]} />
              </mesh>
            ))}
          </group>
        )}

        {/* Masonry Chimney */}
        <group position={[mirror * (-hw + 1.3), blueprint.roofDeckY + 1.4, -hd + 1.3]}>
          <mesh
            geometry={getTiledBoxGeometry(1.15, 2.8, 1.15, 1.8)}
            material={arch.facadeAccent === 'tudor_beams' ? mats.stone : mats.exterior}
            castShadow
            receiveShadow
          />
          <mesh position={[0, 1.45, 0]} material={mats.concreteFloor} castShadow>
            <boxGeometry args={[1.34, 0.16, 1.34]} />
          </mesh>
          <mesh position={[0, 1.66, 0]} material={mats.metalDark}>
            <cylinderGeometry args={[0.22, 0.24, 0.38, 10]} />
          </mesh>
        </group>

        {/* Roof Vent */}
        <group position={[mirror * -4.5, blueprint.roofDeckY + 0.24, -2.2]}>
          <mesh material={mats.metalDark} castShadow>
            <boxGeometry args={[1.05, 0.48, 1.05]} />
          </mesh>
          <mesh position={[0, 0.3, 0]} material={mats.trim}>
            <boxGeometry args={[1.18, 0.08, 1.18]} />
          </mesh>
        </group>

        {/* Subtle staging pads for future roof equipment */}
        {[
          { x: mirror * -4.2, z: 3.2, r: 1.25 },
          { x: mirror * 0.2, z: 3.4, r: 0.85 },
          { x: mirror * -1.4, z: -3.2, r: 1.35 },
        ].map((pad, idx) => (
          <mesh
            key={idx}
            position={[pad.x, blueprint.roofDeckY + 0.02, pad.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[pad.r - 0.09, pad.r, 20]} />
            <meshBasicMaterial color="#9e967a" transparent opacity={0.45} />
          </mesh>
        ))}
      </group>

      {/* ==================== UNDERGROUND SHELTER (Level -1) ==================== */}
      <group ref={shelterGroupRef} visible={false}>
        {slabsByFloor[-1].map((s) => (
          <mesh
            key={s.id}
            position={[s.x, s.y - s.thickness / 2, s.z]}
            geometry={getTiledBoxGeometry(s.sx, s.thickness, s.sz, 2.2)}
            material={mats.shelter}
            receiveShadow
          />
        ))}
        {wallsByFloor[-1].map((w) => (
          <mesh
            key={w.id}
            position={[w.x, w.y, w.z]}
            geometry={getTiledBoxGeometry(w.sx, w.sy, w.sz, 2.2)}
            material={mats.shelter}
            receiveShadow
          />
        ))}
        {/* Hanging bunker work light */}
        <pointLight
          position={[shelterCenterLocalX, blueprint.shelterFloorY + 3.0, shelterCenterLocalZ]}
          color="#ffe3b5"
          intensity={20}
          distance={16}
          decay={1.8}
        />
        <mesh position={[shelterCenterLocalX, blueprint.shelterFloorY + 3.25, shelterCenterLocalZ]}>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial color="#fff1d2" emissive="#ffd48a" emissiveIntensity={2.5} />
        </mesh>
        {/* Full-height steel ladder ascending from shelter floor cleanly through garage hatch */}
        {shelterLadderLocal && (
          <group position={[shelterLadderLocal.x, shelterLadderLocal.bottomY, shelterLadderLocal.z]}>
            <mesh position={[-0.24, shelterLadderLocal.height / 2, -0.26]} material={mats.metalDark}>
              <cylinderGeometry args={[0.032, 0.032, shelterLadderLocal.height, 8]} />
            </mesh>
            <mesh position={[0.24, shelterLadderLocal.height / 2, -0.26]} material={mats.metalDark}>
              <cylinderGeometry args={[0.032, 0.032, shelterLadderLocal.height, 8]} />
            </mesh>
            {Array.from({ length: Math.floor(shelterLadderLocal.height / 0.35) }).map((_, i) => (
              <mesh
                key={i}
                position={[0, 0.35 + i * 0.35, -0.26]}
                rotation={[0, 0, Math.PI / 2]}
                material={mats.metalDark}
              >
                <cylinderGeometry args={[0.02, 0.02, 0.48, 6]} />
              </mesh>
            ))}
          </group>
        )}
        {furnByFloor[-1].map((f) => (
          <FurniturePiece key={f.id} spec={f} />
        ))}
      </group>

      {/* ==================== INTERACTIVE DOORS (ZERO Z-FIGHTING GEOMETRY) ==================== */}
      {blueprint.doors.map((d) => {
        const localPos = worldToLocal(blueprint.worldOrigin, blueprint.rotationY, d.position);
        const localRot = d.rotationY - blueprint.rotationY;
        const isGarage = d.kind === 'garage';
        const isTunnel = d.kind === 'tunnel';
        const wallT = d.kind === 'interior' ? 0.16 : isTunnel ? 0.28 : 0.24;
        const frameMat = isTunnel ? mats.metalDark : mats.trim;
        const leafMat = isTunnel ? mats.metalDark : isGarage ? mats.trim : mats.door;

        // Clean stepped jamb + casing dimensions (ZERO coplanar overlap with wall edges or door leaf)
        const jambH = d.height - 0.055;
        const jambDepth = wallT + 0.05;
        const headDepth = wallT + 0.056;
        const casingZ = wallT / 2 + 0.016;
        const leafW = isGarage ? d.width - 0.1 : d.width - 0.108; // 4mm clean reveal gap on both sides
        const leafH = d.height - 0.062;
        const leafD = isTunnel ? 0.1 : 0.056;

        return (
          <group key={d.id} position={[localPos.x, localPos.y, localPos.z]} rotation={[0, localRot, 0]}>
            {/* Left & Right Door Jambs stopping cleanly BELOW head jamb */}
            <mesh position={[-d.width / 2 + 0.02, jambH / 2, 0]} material={frameMat} castShadow receiveShadow>
              <boxGeometry args={[0.06, jambH, jambDepth]} />
            </mesh>
            <mesh position={[d.width / 2 - 0.02, jambH / 2, 0]} material={frameMat} castShadow receiveShadow>
              <boxGeometry args={[0.06, jambH, jambDepth]} />
            </mesh>
            {/* Head Jamb sitting cleanly ABOVE side jambs */}
            <mesh position={[0, d.height - 0.025, 0]} material={frameMat} castShadow receiveShadow>
              <boxGeometry args={[d.width + 0.02, 0.055, headDepth]} />
            </mesh>

            {/* Front & Back Architrave Casing Trim (strictly proud of wall faces, zero Z-fighting!) */}
            {[-casingZ, casingZ].map((cz) => (
              <group key={`cas_${cz}`}>
                <mesh position={[-d.width / 2 - 0.02, d.height / 2, cz]} material={frameMat}>
                  <boxGeometry args={[0.09, d.height, 0.026]} />
                </mesh>
                <mesh position={[d.width / 2 + 0.02, d.height / 2, cz]} material={frameMat}>
                  <boxGeometry args={[0.09, d.height, 0.026]} />
                </mesh>
                <mesh position={[0, d.height + 0.048, cz]} material={frameMat}>
                  <boxGeometry args={[d.width + 0.22, 0.096, 0.03]} />
                </mesh>
              </group>
            ))}

            {/* Flush Threshold & Concrete Tunnel Reveal Collar for Tunnel Bulkhead */}
            {isTunnel && (
              <>
                <mesh position={[0, 0.015, 0]} material={frameMat}>
                  <boxGeometry args={[d.width + 0.16, 0.03, wallT + 0.08]} />
                </mesh>
                <mesh position={[0, d.height / 2, -0.22]} material={mats.shelter}>
                  <boxGeometry args={[d.width + 0.34, d.height + 0.24, 0.18]} />
                </mesh>
              </>
            )}

            {/* Hinged / Overhead Door Leaf */}
            <group
              ref={(el) => {
                doorPivotRefs.current[d.id] = el;
              }}
              position={[isGarage ? 0 : -d.width / 2 + 0.054, 0, 0]}
            >
              <mesh
                position={[isGarage ? 0 : leafW / 2, leafH / 2 + 0.008, 0]}
                material={leafMat}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[leafW, leafH, leafD]} />
              </mesh>

              {/* Decorative recessed door panels on residential doors */}
              {!isGarage && !isTunnel && (
                <>
                  {[-leafD / 2 - 0.006, leafD / 2 + 0.006].map((pz) => (
                    <group key={`dp_${pz}`}>
                      <mesh position={[leafW / 2, leafH * 0.72, pz]} material={mats.doorPanel}>
                        <boxGeometry args={[leafW * 0.68, leafH * 0.32, 0.012]} />
                      </mesh>
                      <mesh position={[leafW / 2, leafH * 0.28, pz]} material={mats.doorPanel}>
                        <boxGeometry args={[leafW * 0.68, leafH * 0.32, 0.012]} />
                      </mesh>
                    </group>
                  ))}
                  {/* Dual-sided brass lever door handles */}
                  {[-leafD / 2 - 0.032, leafD / 2 + 0.032].map((hz) => (
                    <group key={`dh_${hz}`} position={[leafW - 0.14, 1.04, hz]}>
                      <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.034, 0.034, 0.02, 10]} />
                        <meshStandardMaterial color="#c9a85c" metalness={0.85} roughness={0.25} />
                      </mesh>
                      <mesh position={[-0.045, 0, hz > 0 ? 0.018 : -0.018]}>
                        <boxGeometry args={[0.11, 0.024, 0.024]} />
                        <meshStandardMaterial color="#c9a85c" metalness={0.85} roughness={0.25} />
                      </mesh>
                    </group>
                  ))}
                </>
              )}

              {/* Steel bulkhead cross-ribs & 4-spoke brass vault wheel handle */}
              {isTunnel && (
                <>
                  <mesh position={[leafW / 2, leafH * 0.82, 0]} material={mats.barricadeWood}>
                    <boxGeometry args={[leafW - 0.18, 0.1, 0.12]} />
                  </mesh>
                  <mesh position={[leafW / 2, leafH * 0.18, 0]} material={mats.barricadeWood}>
                    <boxGeometry args={[leafW - 0.18, 0.1, 0.12]} />
                  </mesh>
                  {[0.08, -0.08].map((zSide) => (
                    <group key={zSide} position={[leafW * 0.62, 1.18, zSide]}>
                      <mesh>
                        <torusGeometry args={[0.2, 0.028, 8, 16]} />
                        <meshStandardMaterial color="#c49b46" metalness={0.78} roughness={0.3} />
                      </mesh>
                      <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.045, 0.045, 0.05, 8]} />
                        <meshStandardMaterial color="#4b5056" metalness={0.8} roughness={0.35} />
                      </mesh>
                      <mesh>
                        <boxGeometry args={[0.38, 0.026, 0.026]} />
                        <meshStandardMaterial color="#c49b46" metalness={0.78} roughness={0.3} />
                      </mesh>
                      <mesh rotation={[0, 0, Math.PI / 2]}>
                        <boxGeometry args={[0.38, 0.026, 0.026]} />
                        <meshStandardMaterial color="#c49b46" metalness={0.78} roughness={0.3} />
                      </mesh>
                    </group>
                  ))}
                </>
              )}

              {/* Garage horizontal panel ribs & top light-band windows */}
              {isGarage && (
                <>
                  {[0.65, 1.32, 1.98].map((gy) => (
                    <mesh key={gy} position={[0, gy, 0.04]} material={mats.metalDark}>
                      <boxGeometry args={[leafW - 0.14, 0.032, 0.02]} />
                    </mesh>
                  ))}
                  {[-1.4, -0.48, 0.48, 1.4].map((wx) => (
                    <mesh key={wx} position={[wx, 2.34, 0.038]} material={isNight ? mats.glassNight : mats.glassDay}>
                      <boxGeometry args={[0.72, 0.34, 0.02]} />
                    </mesh>
                  ))}
                </>
              )}

              {/* Lock indicator deadbolt (visible when locked) */}
              <mesh
                ref={(el) => {
                  doorLockRefs.current[d.id] = el;
                }}
                position={[isGarage ? 0 : leafW - 0.14, 1.22, leafD / 2 + 0.025]}
                visible={false}
              >
                <boxGeometry args={[0.075, 0.075, 0.04]} />
                <meshStandardMaterial color="#b84a39" emissive="#8f2c1f" emissiveIntensity={0.6} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* ==================== INTERACTIVE DUAL-LEAF CASEMENT WINDOWS (ZERO Z-FIGHTING) ==================== */}
      {blueprint.windows.map((w) => {
        const localPos = worldToLocal(blueprint.worldOrigin, blueprint.rotationY, w.position);
        const localRot = w.rotationY - blueprint.rotationY;

        // Clean stepped frame geometry (wall is 0.24m thick: z in [-0.12, +0.12])
        // Sill, head, and jambs sit strictly proud of BOTH interior and exterior wall faces with ZERO overlap!
        const jambH = w.height - 0.114;
        const innerW = w.width - 0.105;
        const innerH = w.height - 0.118;
        const leafW = innerW / 2 - 0.006;
        const leafH = innerH - 0.014;
        const stile = 0.048;

        return (
          <group key={w.id} position={[localPos.x, localPos.y, localPos.z]} rotation={[0, localRot, 0]}>
            {/* Bottom Sill (extends proudly outside & inside wall) */}
            <mesh position={[0, -w.height / 2 + 0.024, 0.016]} material={mats.trim} castShadow receiveShadow>
              <boxGeometry args={[w.width + 0.24, 0.068, 0.36]} />
            </mesh>
            {/* Top Head Jamb */}
            <mesh position={[0, w.height / 2 - 0.022, 0]} material={mats.trim} castShadow receiveShadow>
              <boxGeometry args={[w.width + 0.22, 0.066, 0.34]} />
            </mesh>
            {/* Left & Right Side Jambs (fit cleanly between sill & head, zero overlap!) */}
            <mesh position={[-w.width / 2 + 0.018, 0, 0]} material={mats.trim} receiveShadow>
              <boxGeometry args={[0.066, jambH, 0.31]} />
            </mesh>
            <mesh position={[w.width / 2 - 0.018, 0, 0]} material={mats.trim} receiveShadow>
              <boxGeometry args={[0.066, jambH, 0.31]} />
            </mesh>

            {/* Separate Exterior & Interior Trim Casing Strips (strictly outside wall faces +/-0.12) */}
            {[-0.146, 0.146].map((cz) => (
              <group key={`wcas_${cz}`}>
                <mesh position={[-w.width / 2 - 0.025, 0, cz]} material={mats.trim}>
                  <boxGeometry args={[0.085, jambH, 0.024]} />
                </mesh>
                <mesh position={[w.width / 2 + 0.025, 0, cz]} material={mats.trim}>
                  <boxGeometry args={[0.085, jambH, 0.024]} />
                </mesh>
              </group>
            ))}

            {/* Optional Decorative Exterior Shutters (positioned safely clear of wall & casing) */}
            {arch.hasShutters && (
              <>
                <mesh position={[-w.width / 2 - 0.25, 0, 0.155]} material={mats.shutter} castShadow>
                  <boxGeometry args={[0.3, w.height - 0.04, 0.045]} />
                </mesh>
                <mesh position={[w.width / 2 + 0.25, 0, 0.155]} material={mats.shutter} castShadow>
                  <boxGeometry args={[0.3, w.height - 0.04, 0.045]} />
                </mesh>
              </>
            )}

            {/* LEFT HINGED CASEMENT LEAF (swings 103deg outward -> 100% unobstructed full opening!) */}
            <group
              ref={(el) => {
                windowLeftPivotRefs.current[w.id] = el;
              }}
              position={[-innerW / 2, 0, 0.06]}
            >
              {/* Top & bottom sash rails */}
              <mesh position={[leafW / 2, leafH / 2 - stile / 2, 0]} material={mats.sashFrame} castShadow>
                <boxGeometry args={[leafW, stile, 0.044]} />
              </mesh>
              <mesh position={[leafW / 2, -leafH / 2 + stile / 2, 0]} material={mats.sashFrame} castShadow>
                <boxGeometry args={[leafW, stile, 0.044]} />
              </mesh>
              {/* Left & right sash stiles */}
              <mesh position={[stile / 2, 0, 0]} material={mats.sashFrame} castShadow>
                <boxGeometry args={[stile, leafH - stile * 2, 0.044]} />
              </mesh>
              <mesh position={[leafW - stile / 2, 0, 0]} material={mats.sashFrame} castShadow>
                <boxGeometry args={[stile, leafH - stile * 2, 0.044]} />
              </mesh>
              {/* Clear Glass Pane */}
              <mesh position={[leafW / 2, 0, 0]} material={isNight ? mats.glassNight : mats.glassDay}>
                <boxGeometry args={[leafW - stile * 2, leafH - stile * 2, 0.016]} />
              </mesh>
              {/* Brass Casement Latch Handle */}
              <mesh position={[leafW - stile * 0.55, -0.05, -0.032]}>
                <boxGeometry args={[0.022, 0.1, 0.026]} />
                <meshStandardMaterial color="#c9a85c" metalness={0.85} roughness={0.25} />
              </mesh>
            </group>

            {/* RIGHT HINGED CASEMENT LEAF (swings 103deg outward -> 100% unobstructed full opening!) */}
            <group
              ref={(el) => {
                windowRightPivotRefs.current[w.id] = el;
              }}
              position={[innerW / 2, 0, 0.06]}
            >
              <mesh position={[-leafW / 2, leafH / 2 - stile / 2, 0]} material={mats.sashFrame} castShadow>
                <boxGeometry args={[leafW, stile, 0.044]} />
              </mesh>
              <mesh position={[-leafW / 2, -leafH / 2 + stile / 2, 0]} material={mats.sashFrame} castShadow>
                <boxGeometry args={[leafW, stile, 0.044]} />
              </mesh>
              <mesh position={[-stile / 2, 0, 0]} material={mats.sashFrame} castShadow>
                <boxGeometry args={[stile, leafH - stile * 2, 0.044]} />
              </mesh>
              <mesh position={[-leafW + stile / 2, 0, 0]} material={mats.sashFrame} castShadow>
                <boxGeometry args={[stile, leafH - stile * 2, 0.044]} />
              </mesh>
              <mesh position={[-leafW / 2, 0, 0]} material={isNight ? mats.glassNight : mats.glassDay}>
                <boxGeometry args={[leafW - stile * 2, leafH - stile * 2, 0.016]} />
              </mesh>
              <mesh position={[-leafW + stile * 0.55, -0.05, -0.032]}>
                <boxGeometry args={[0.022, 0.1, 0.026]} />
                <meshStandardMaterial color="#c9a85c" metalness={0.85} roughness={0.25} />
              </mesh>
            </group>

            {/* Barricade Wood Planks */}
            <group
              ref={(el) => {
                windowBarricadeRefs.current[w.id] = el;
              }}
              visible={false}
              position={[0, 0, 0.18]}
            >
              {[-0.42, 0, 0.42].map((by, idx) => (
                <mesh
                  key={by}
                  position={[0, by, 0]}
                  rotation={[0, 0, idx === 1 ? 0.07 : -0.05]}
                  material={mats.barricadeWood}
                  castShadow
                >
                  <boxGeometry args={[w.width + 0.24, 0.18, 0.05]} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}

      {/* ==================== NAMED YARD SLOT MARKERS ==================== */}
      {blueprint.yardSlots.map((slot) => {
        const localPos = worldToLocal(blueprint.worldOrigin, blueprint.rotationY, slot.position);
        return (
          <group key={slot.id} position={[localPos.x, 0.025, localPos.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.42, 0.52, 16]} />
              <meshBasicMaterial color="#c9ba8e" transparent opacity={0.34} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
