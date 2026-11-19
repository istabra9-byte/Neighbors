/**
 * F3 3D Debug Visualization Overlay (rendered ONLY when debugMode === true).
 * Shows:
 * 1. Color-coded wireframe collision shapes (walls, floors/ceilings, doors open/closed,
 *    railings, furniture, ladders, street props) + player 1.65m x 0.35m capsule wireframe.
 * 2. Live Third-Person / First-Person Camera Collision Rays + red wall-hit marker.
 * 3. Architectural 1m x 1m Floor Grid snapped to the player's current floor elevation.
 * 4. Stair Headroom Volumes (cyan >= 2.40m pass, red if obstructed).
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameSimulation } from '../simulation/simulation';
import type { AABB, Vec3 } from '../simulation/types';
import { PHYSICS } from '../simulation/physics';
import { HOUSE_CONSTANTS } from '../world/houses';

export interface CameraRayDebugData {
  rays: Array<{
    from: Vec3;
    to: Vec3;
    hit: boolean;
    hitPoint?: Vec3;
  }>;
  desiredDist: number;
  actualDist: number;
  blocked: boolean;
  cameraOpacity: number;
}

interface DebugOverlayProps {
  enabled: boolean;
  simRef: React.MutableRefObject<GameSimulation>;
  cameraRayRef: React.MutableRefObject<CameraRayDebugData>;
}

const COLOR_BY_CAT: Record<string, number> = {
  wall: 0xf59e0b, // amber
  floor: 0x3b82f6, // blue
  ceiling: 0x60a5fa, // light blue
  door: 0xef4444, // red when closed
  window: 0x38bdf8, // sky
  railing: 0xfb923c, // orange
  furniture: 0xe879f9, // magenta
  ladder: 0x84cc16, // lime
  prop: 0xc084fc, // violet
};

function appendBoxEdges(
  out: number[],
  colors: number[],
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  hex: number,
): void {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;

  const seg = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
    out.push(x1, y1, z1, x2, y2, z2);
    colors.push(r, g, b, r, g, b);
  };

  // Bottom 4 edges
  seg(minX, minY, minZ, maxX, minY, minZ);
  seg(maxX, minY, minZ, maxX, minY, maxZ);
  seg(maxX, minY, maxZ, minX, minY, maxZ);
  seg(minX, minY, maxZ, minX, minY, minZ);
  // Top 4 edges
  seg(minX, maxY, minZ, maxX, maxY, minZ);
  seg(maxX, maxY, minZ, maxX, maxY, maxZ);
  seg(maxX, maxY, maxZ, minX, maxY, maxZ);
  seg(minX, maxY, maxZ, minX, maxY, minZ);
  // Vertical 4 edges
  seg(minX, minY, minZ, minX, maxY, minZ);
  seg(maxX, minY, minZ, maxX, maxY, minZ);
  seg(maxX, minY, maxZ, maxX, maxY, maxZ);
  seg(minX, minY, maxZ, minX, maxY, maxZ);
}

export function DebugOverlay({ enabled, simRef, cameraRayRef }: DebugOverlayProps) {
  const colliderLinesRef = useRef<THREE.LineSegments>(null);
  const rayLinesRef = useRef<THREE.LineSegments>(null);
  const headroomLinesRef = useRef<THREE.LineSegments>(null);
  const hitMarkerRef = useRef<THREE.Mesh>(null);
  const capsuleRef = useRef<THREE.Group>(null);
  const floorGridRef = useRef<THREE.GridHelper>(null);
  const refreshTimerRef = useRef(0);

  const colliderGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const rayGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const headroomGeo = useMemo(() => new THREE.BufferGeometry(), []);

  useEffect(() => {
    return () => {
      colliderGeo.dispose();
      rayGeo.dispose();
      headroomGeo.dispose();
    };
  }, [colliderGeo, rayGeo, headroomGeo]);

  // Build static stair headroom wireframe + stair ramp slopes once per simulation
  useEffect(() => {
    if (!enabled) return;
    const sim = simRef.current;
    const pos: number[] = [];
    const col: number[] = [];

    for (const h of sim.houses) {
      for (const hr of h.headroomVolumes) {
        appendBoxEdges(
          pos,
          col,
          hr.minX,
          hr.minY,
          hr.minZ,
          hr.maxX,
          hr.maxY,
          hr.maxZ,
          hr.passed ? 0x22d3ee : 0xff2222,
        );
      }
      for (const sr of h.stairRamps) {
        // Highlight walkable stair ramp plane edges in bright yellow
        const c = 0xfacc15;
        const r = ((c >> 16) & 255) / 255;
        const g = ((c >> 8) & 255) / 255;
        const b = (c & 255) / 255;
        const seg = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
          pos.push(x1, y1, z1, x2, y2, z2);
          col.push(r, g, b, r, g, b);
        };
        seg(sr.minX, sr.yStart + 0.04, sr.startCoord, sr.minX, sr.yEnd + 0.04, sr.endCoord);
        seg(sr.maxX, sr.yStart + 0.04, sr.startCoord, sr.maxX, sr.yEnd + 0.04, sr.endCoord);
        seg(sr.minX, sr.yStart + 0.04, sr.startCoord, sr.maxX, sr.yStart + 0.04, sr.startCoord);
        seg(sr.minX, sr.yEnd + 0.04, sr.endCoord, sr.maxX, sr.yEnd + 0.04, sr.endCoord);
      }
    }

    headroomGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    headroomGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    headroomGeo.computeBoundingSphere();
  }, [enabled, headroomGeo, simRef]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const sim = simRef.current;
    const player = sim.getLocalPlayer();
    if (!player) return;

    // 1. Update player capsule wireframe (exact 0.35m radius x 1.65m height)
    if (capsuleRef.current) {
      capsuleRef.current.position.set(player.position.x, player.position.y, player.position.z);
    }

    // 2. Snap 1m x 1m architectural floor grid to player's current floor level
    if (floorGridRef.current) {
      const gridY =
        player.currentFloor === -2
          ? HOUSE_CONSTANTS.SHELTER_Y - 3.2 + 0.02
          : player.inShelter || player.inTunnel || player.currentFloor === -1
            ? HOUSE_CONSTANTS.SHELTER_Y + 0.02
            : player.currentFloor === 2
              ? HOUSE_CONSTANTS.ROOF_Y + 0.02
              : player.currentFloor === 1
                ? HOUSE_CONSTANTS.SECOND_Y + 0.02
                : player.insideHouseId
                  ? HOUSE_CONSTANTS.GROUND_Y + 0.02
                  : 0.03;
      floorGridRef.current.position.set(
        Math.round(player.position.x),
        gridY,
        Math.round(player.position.z),
      );
    }

    // 3. Update live camera collision rays & red hit sphere
    const rayData = cameraRayRef.current;
    const rPos: number[] = [];
    const rCol: number[] = [];
    let firstHit: Vec3 | null = null;
    for (let i = 0; i < rayData.rays.length; i++) {
      const ray = rayData.rays[i];
      const end =
        ray.hit && ray.hitPoint
          ? ray.hitPoint
          : {
              x: ray.from.x + (ray.to.x - ray.from.x) * 0.82,
              y: ray.from.y + (ray.to.y - ray.from.y) * 0.82,
              z: ray.from.z + (ray.to.z - ray.from.z) * 0.82,
            };
      rPos.push(ray.from.x, ray.from.y, ray.from.z, end.x, end.y, end.z);
      if (ray.hit) {
        rCol.push(1, 0.2, 0.2, 1, 0.2, 0.2);
        if (!firstHit && ray.hitPoint) firstHit = ray.hitPoint;
      } else {
        rCol.push(0.2, 1, 0.55, 0.2, 1, 0.55);
      }
    }
    rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
    rayGeo.setAttribute('color', new THREE.Float32BufferAttribute(rCol, 3));
    if (hitMarkerRef.current) {
      if (firstHit) {
        hitMarkerRef.current.visible = true;
        hitMarkerRef.current.position.set(firstHit.x, firstHit.y, firstHit.z);
      } else {
        hitMarkerRef.current.visible = false;
      }
    }

    // 4. Refresh nearby collider wireframes (~5 Hz) using SpatialHashGrid
    refreshTimerRef.current += delta;
    if (refreshTimerRef.current >= 0.2) {
      refreshTimerRef.current = 0;
      const px = player.position.x;
      const pz = player.position.z;
      const near: AABB[] = sim.spatialGrid.queryXZ(px - 28, px + 28, pz - 28, pz + 28);
      const pos: number[] = [];
      const col: number[] = [];
      for (let i = 0; i < near.length; i++) {
        const b = near[i];
        let hex = COLOR_BY_CAT[b.category ?? 'wall'] ?? 0xf59e0b;
        if (b.dynamicDoorId) {
          const d = sim.state.doors[b.dynamicDoorId];
          hex = d?.isOpen ? 0x22c55e : 0xef4444;
        }
        appendBoxEdges(pos, col, b.minX, b.minY, b.minZ, b.maxX, b.maxY, b.maxZ, hex);
      }
      colliderGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      colliderGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      colliderGeo.computeBoundingSphere();
    }
  });

  if (!enabled) return null;

  return (
    <group name="f3_debug_overlay">
      {/* 1m x 1m Floor Grid (40m x 40m centered near player) */}
      <gridHelper ref={floorGridRef} args={[40, 40, '#38bdf8', '#1e3a5f']} />

      {/* Nearby AABB Collision Wireframes */}
      <lineSegments ref={colliderLinesRef} geometry={colliderGeo} renderOrder={30}>
        <lineBasicMaterial vertexColors transparent opacity={0.78} depthTest={true} />
      </lineSegments>

      {/* Stair Headroom Envelopes & Walkable Ramp Slopes */}
      <lineSegments ref={headroomLinesRef} geometry={headroomGeo} renderOrder={31}>
        <lineBasicMaterial vertexColors transparent opacity={0.92} depthTest={false} />
      </lineSegments>

      {/* Live Camera Collision Rays */}
      <lineSegments ref={rayLinesRef} geometry={rayGeo} renderOrder={32}>
        <lineBasicMaterial vertexColors depthTest={false} />
      </lineSegments>
      <mesh ref={hitMarkerRef} visible={false} renderOrder={33}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ff3333" depthTest={false} />
      </mesh>

      {/* Player Capsule Wireframe (r = 0.35m, h = 1.65m) */}
      <group ref={capsuleRef}>
        <mesh position={[0, PHYSICS.CAPSULE_HEIGHT / 2, 0]} renderOrder={32}>
          <cylinderGeometry
            args={[
              PHYSICS.CAPSULE_RADIUS,
              PHYSICS.CAPSULE_RADIUS,
              PHYSICS.CAPSULE_HEIGHT - PHYSICS.CAPSULE_RADIUS * 2,
              14,
              1,
              true,
            ]}
          />
          <meshBasicMaterial color="#22d3ee" wireframe depthTest={false} />
        </mesh>
        <mesh position={[0, PHYSICS.CAPSULE_RADIUS, 0]} renderOrder={32}>
          <sphereGeometry args={[PHYSICS.CAPSULE_RADIUS, 10, 8]} />
          <meshBasicMaterial color="#22d3ee" wireframe depthTest={false} />
        </mesh>
        <mesh position={[0, PHYSICS.CAPSULE_HEIGHT - PHYSICS.CAPSULE_RADIUS, 0]} renderOrder={32}>
          <sphereGeometry args={[PHYSICS.CAPSULE_RADIUS, 10, 8]} />
          <meshBasicMaterial color="#22d3ee" wireframe depthTest={false} />
        </mesh>
      </group>
    </group>
  );
}
