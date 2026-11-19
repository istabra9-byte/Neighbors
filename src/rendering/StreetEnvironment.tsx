/**
 * Suburban Maple Crescent street environment & neighborhood props.
 * - Punches exact non-overlapping rectangular foundation holes in the lawn ShapeGeometry
 *   under every house & garage so ZERO grass ever appears inside shelter hatches.
 * - Uses world-tiled box UVs on concrete sidewalks so concrete seams stay crisp.
 * - Renders instanced broadleaf oaks + evergreen pines, bushes, fences, flower beds,
 *   backyard patio sets, BBQ grills, garden sheds, planters, birdbaths, street signs,
 *   trash+recycling bin pairs, and 3 distinct vehicle body styles (sedan/pickup/SUV).
 */

import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { StreetPropsBundle } from '../world/streetProps';
import type { HouseBlueprint } from '../world/houses';
import { localToWorld } from '../world/houses';
import { STREET_CONFIG } from '../world/streetLayout';
import { getContactShadowTexture, getProceduralTextureLibrary } from './proceduralTextures';
import { getTiledBoxGeometry } from './tiledGeometry';
import {
  FlowerBedMesh,
  ParkedVehicle,
  StreetSignMesh,
  YardPropMesh,
} from './ExteriorAssets';

interface StreetEnvironmentProps {
  streetProps: StreetPropsBundle;
  houses: readonly HouseBlueprint[];
  roadLength: number;
  isNight: boolean;
}

/** Composite Street Lamp with metal pole, arm, luminaire hood, and warm emissive globe. */
function StreetLamp({
  position,
  rotationY,
  isNight,
}: {
  position: [number, number, number];
  rotationY: number;
  isNight: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.44, 10]} />
        <meshStandardMaterial color="#43484e" metalness={0.55} roughness={0.45} />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.09, 5.7, 10]} />
        <meshStandardMaterial color="#4a5056" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh position={[0, 5.85, 0.72]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.05, 1.5, 8]} />
        <meshStandardMaterial color="#4a5056" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh position={[0, 5.82, 1.45]}>
        <boxGeometry args={[0.36, 0.12, 0.46]} />
        <meshStandardMaterial color="#383d42" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 5.72, 1.45]}>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshStandardMaterial
          color={isNight ? '#ffebbd' : '#d2d6d8'}
          emissive="#ffca72"
          emissiveIntensity={isNight ? 3.2 : 0}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

/**
 * Builds an expansive lawn ShapeGeometry (590 x 590 m) with exact rectangular cutouts
 * beneath every house main footprint and attached garage footprint so ZERO grass ever
 * pokes through open shelter hatches or indoor floor joints.
 */
function buildLawnWithFoundationHoles(houses: readonly HouseBlueprint[]): THREE.ShapeGeometry {
  const half = 295;
  const shape = new THREE.Shape();
  // Outer lawn boundary CCW in shape XY plane
  shape.moveTo(-half, -half);
  shape.lineTo(half, -half);
  shape.lineTo(half, half);
  shape.lineTo(-half, half);
  shape.closePath();

  const pushWorldRectHole = (
    origin: { x: number; y: number; z: number },
    rotY: number,
    minLX: number,
    maxLX: number,
    minLZ: number,
    maxLZ: number,
  ) => {
    const localCorners = [
      { x: minLX, y: 0, z: minLZ },
      { x: maxLX, y: 0, z: minLZ },
      { x: maxLX, y: 0, z: maxLZ },
      { x: minLX, y: 0, z: maxLZ },
    ];
    // Mesh rotates by [-Math.PI/2, 0, 0]: shape (sx, sy) -> world (sx, 0, -sy) => sy = -worldZ!
    const pts = localCorners.map((c) => {
      const w = localToWorld(origin, rotY, c);
      return { x: w.x, y: -w.z };
    });

    // Compute signed area; enforce CW winding (area < 0) for Three.js hole triangulation
    let area2 = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      area2 += a.x * b.y - b.x * a.y;
    }
    if (area2 > 0) pts.reverse();

    const hole = new THREE.Path();
    hole.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      hole.lineTo(pts[i].x, pts[i].y);
    }
    hole.closePath();
    shape.holes.push(hole);
  };

  for (const h of houses) {
    const hw = h.width / 2;
    const hd = h.depth / 2;
    const inset = 0.3;

    // Hole 1: Main house footprint (strictly inside [-hw+inset .. +hw-inset])
    const frontSafeZ = Math.min(h.archetype.westFrontZ, h.archetype.eastFrontZ) - inset;
    pushWorldRectHole(h.worldOrigin, h.rotationY, -hw + inset, hw - inset, -hd + inset, frontSafeZ);

    // Hole 2: Attached garage footprint (strictly outside main house -> ZERO hole overlap!)
    const gMinX = h.garageCenterLocalX - h.garageWidth / 2 + inset;
    const gMaxX = h.garageCenterLocalX + h.garageWidth / 2 - inset;
    pushWorldRectHole(
      h.worldOrigin,
      h.rotationY,
      gMinX,
      gMaxX,
      h.garageMinZ + inset,
      h.garageMaxZ - inset,
    );
  }

  return new THREE.ShapeGeometry(shape);
}

export function StreetEnvironment({
  streetProps,
  houses,
  roadLength,
  isNight,
}: StreetEnvironmentProps) {
  const { gl } = useThree();
  const textures = useMemo(
    () => getProceduralTextureLibrary(Math.min(4, gl.capabilities.getMaxAnisotropy())),
    [gl],
  );
  const shadowTex = useMemo(() => getContactShadowTexture(), []);

  const lawnGeometry = useMemo(() => buildLawnWithFoundationHoles(houses), [houses]);
  useEffect(() => {
    return () => {
      lawnGeometry.dispose();
    };
  }, [lawnGeometry]);

  const oakTrees = useMemo(() => streetProps.trees.filter((t) => t.kind === 'oak'), [streetProps.trees]);
  const pineTrees = useMemo(() => streetProps.trees.filter((t) => t.kind === 'pine'), [streetProps.trees]);

  const oakTrunkRef = useRef<THREE.InstancedMesh>(null);
  const oakCrownARef = useRef<THREE.InstancedMesh>(null);
  const oakCrownBRef = useRef<THREE.InstancedMesh>(null);
  const pineTrunkRef = useRef<THREE.InstancedMesh>(null);
  const pineTier1Ref = useRef<THREE.InstancedMesh>(null);
  const pineTier2Ref = useRef<THREE.InstancedMesh>(null);
  const pineTier3Ref = useRef<THREE.InstancedMesh>(null);
  const bushRef = useRef<THREE.InstancedMesh>(null);
  const fencePostRef = useRef<THREE.InstancedMesh>(null);
  const fenceRailRef = useRef<THREE.InstancedMesh>(null);

  // Populate InstancedMeshes directly from streetProps (exact 1:1 match with physics colliders)
  useEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    if (oakTrunkRef.current && oakCrownARef.current && oakCrownBRef.current) {
      oakTrees.forEach((t, i) => {
        dummy.position.set(t.x, 1.65 * t.s, t.z);
        dummy.rotation.set(0, t.rot, 0);
        dummy.scale.set(t.s, t.s, t.s);
        dummy.updateMatrix();
        oakTrunkRef.current!.setMatrixAt(i, dummy.matrix);

        dummy.position.set(t.x, 3.85 * t.s, t.z);
        dummy.scale.set(t.s * 1.16, t.s * 0.96, t.s * 1.16);
        dummy.updateMatrix();
        oakCrownARef.current!.setMatrixAt(i, dummy.matrix);
        color.set(t.tint);
        oakCrownARef.current!.setColorAt(i, color);

        dummy.position.set(t.x + 0.55 * t.s, 4.72 * t.s, t.z - 0.35 * t.s);
        dummy.scale.set(t.s * 0.84, t.s * 0.78, t.s * 0.84);
        dummy.updateMatrix();
        oakCrownBRef.current!.setMatrixAt(i, dummy.matrix);
        color.set(t.tint).offsetHSL(0, 0, 0.04);
        oakCrownBRef.current!.setColorAt(i, color);
      });
      oakTrunkRef.current.instanceMatrix.needsUpdate = true;
      oakCrownARef.current.instanceMatrix.needsUpdate = true;
      oakCrownBRef.current.instanceMatrix.needsUpdate = true;
      if (oakCrownARef.current.instanceColor) oakCrownARef.current.instanceColor.needsUpdate = true;
      if (oakCrownBRef.current.instanceColor) oakCrownBRef.current.instanceColor.needsUpdate = true;
      oakTrunkRef.current.computeBoundingSphere();
      oakCrownARef.current.computeBoundingSphere();
      oakCrownBRef.current.computeBoundingSphere();
    }

    if (pineTrunkRef.current && pineTier1Ref.current && pineTier2Ref.current && pineTier3Ref.current) {
      pineTrees.forEach((t, i) => {
        dummy.position.set(t.x, 1.35 * t.s, t.z);
        dummy.rotation.set(0, t.rot, 0);
        dummy.scale.set(t.s, t.s, t.s);
        dummy.updateMatrix();
        pineTrunkRef.current!.setMatrixAt(i, dummy.matrix);

        dummy.position.set(t.x, 2.75 * t.s, t.z);
        dummy.scale.set(t.s, t.s, t.s);
        dummy.updateMatrix();
        pineTier1Ref.current!.setMatrixAt(i, dummy.matrix);
        color.set(t.tint);
        pineTier1Ref.current!.setColorAt(i, color);

        dummy.position.set(t.x, 4.25 * t.s, t.z);
        dummy.scale.set(t.s * 0.8, t.s * 0.85, t.s * 0.8);
        dummy.updateMatrix();
        pineTier2Ref.current!.setMatrixAt(i, dummy.matrix);
        color.set(t.tint).offsetHSL(0, 0, 0.03);
        pineTier2Ref.current!.setColorAt(i, color);

        dummy.position.set(t.x, 5.55 * t.s, t.z);
        dummy.scale.set(t.s * 0.56, t.s * 0.72, t.s * 0.56);
        dummy.updateMatrix();
        pineTier3Ref.current!.setMatrixAt(i, dummy.matrix);
        color.set(t.tint).offsetHSL(0, 0, 0.05);
        pineTier3Ref.current!.setColorAt(i, color);
      });
      pineTrunkRef.current.instanceMatrix.needsUpdate = true;
      pineTier1Ref.current.instanceMatrix.needsUpdate = true;
      pineTier2Ref.current.instanceMatrix.needsUpdate = true;
      pineTier3Ref.current.instanceMatrix.needsUpdate = true;
      if (pineTier1Ref.current.instanceColor) pineTier1Ref.current.instanceColor.needsUpdate = true;
      if (pineTier2Ref.current.instanceColor) pineTier2Ref.current.instanceColor.needsUpdate = true;
      if (pineTier3Ref.current.instanceColor) pineTier3Ref.current.instanceColor.needsUpdate = true;
      pineTrunkRef.current.computeBoundingSphere();
      pineTier1Ref.current.computeBoundingSphere();
      pineTier2Ref.current.computeBoundingSphere();
      pineTier3Ref.current.computeBoundingSphere();
    }

    if (bushRef.current) {
      streetProps.bushes.forEach((b, i) => {
        dummy.position.set(b.x, 0.42 * b.s, b.z);
        dummy.rotation.set(0, i * 1.1, 0);
        dummy.scale.set(b.s * 1.2, b.s * 0.85, b.s * 1.0);
        dummy.updateMatrix();
        bushRef.current!.setMatrixAt(i, dummy.matrix);
        color.set(b.tint);
        bushRef.current!.setColorAt(i, color);
      });
      bushRef.current.instanceMatrix.needsUpdate = true;
      if (bushRef.current.instanceColor) bushRef.current.instanceColor.needsUpdate = true;
      bushRef.current.computeBoundingSphere();
    }

    if (fencePostRef.current) {
      streetProps.fencePosts.forEach((p, i) => {
        dummy.position.set(p.x, 0.78, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        fencePostRef.current!.setMatrixAt(i, dummy.matrix);
      });
      fencePostRef.current.instanceMatrix.needsUpdate = true;
      fencePostRef.current.computeBoundingSphere();
    }

    if (fenceRailRef.current) {
      streetProps.fenceRails.forEach((r, i) => {
        dummy.position.set(r.x, 0.72, r.z);
        dummy.rotation.set(0, r.rotY, 0);
        dummy.scale.set(r.len, 1, 1);
        dummy.updateMatrix();
        fenceRailRef.current!.setMatrixAt(i, dummy.matrix);
      });
      fenceRailRef.current.instanceMatrix.needsUpdate = true;
      fenceRailRef.current.computeBoundingSphere();
    }
  }, [oakTrees, pineTrees, streetProps]);

  const halfRoad = roadLength / 2;
  const dashCount = Math.floor(roadLength / 9);
  const powerWireSpan = 256;

  return (
    <group name="street_environment">
      {/* Expansive Suburban Lawn with Exact Holes Under Every House & Garage (ZERO grass in hatches!) */}
      <mesh
        geometry={lawnGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#ffffff"
          map={textures.grass.map}
          normalMap={textures.grass.normalMap}
          roughnessMap={textures.grass.roughnessMap}
          roughness={0.95}
        />
      </mesh>

      {/* Asphalt Street (offset +0.02m Y to prevent Z-fighting) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[roadLength + 60, STREET_CONFIG.roadWidth]} />
        <meshStandardMaterial
          color="#ffffff"
          map={textures.asphalt.map}
          normalMap={textures.asphalt.normalMap}
          roughnessMap={textures.asphalt.roughnessMap}
          roughness={0.86}
        />
      </mesh>

      {/* Dashed muted yellow center road lines */}
      {Array.from({ length: dashCount }).map((_, i) => {
        const x = -halfRoad + 4 + i * 9;
        return (
          <mesh key={`dash_${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.032, 0]}>
            <planeGeometry args={[4.2, 0.16]} />
            <meshStandardMaterial color="#b99c4e" roughness={0.85} />
          </mesh>
        );
      })}

      {/* Crosswalk zebra stripes */}
      {[-16, 16].map((cx) =>
        Array.from({ length: 6 }).map((_, si) => (
          <mesh
            key={`cw_${cx}_${si}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[cx, 0.032, -3.6 + si * 1.44]}
          >
            <planeGeometry args={[2.2, 0.62]} />
            <meshStandardMaterial color="#c9c6be" roughness={0.85} />
          </mesh>
        )),
      )}

      {/* Iron Street Manholes */}
      {[-84, -32, 6, 44, 96].map((mx) => (
        <mesh key={`mh_${mx}`} position={[mx, 0.035, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 16]} />
          <meshStandardMaterial color="#404448" metalness={0.65} roughness={0.5} />
        </mesh>
      ))}

      {/* Raised Concrete Sidewalks & Curbs (world-tiled concrete UVs!) */}
      {[-1, 1].map((sign) => (
        <mesh
          key={`sw_${sign}`}
          position={[
            0,
            STREET_CONFIG.sidewalkHeight / 2,
            sign * (STREET_CONFIG.roadWidth / 2 + STREET_CONFIG.sidewalkWidth / 2),
          ]}
          geometry={getTiledBoxGeometry(
            roadLength + 60,
            STREET_CONFIG.sidewalkHeight,
            STREET_CONFIG.sidewalkWidth,
            2.4,
          )}
          receiveShadow
          castShadow
        >
          <meshStandardMaterial
            color="#c7c3bb"
            map={textures.concrete.map}
            normalMap={textures.concrete.normalMap}
            roughness={0.88}
          />
        </mesh>
      ))}

      {/* Per-house concrete driveways, front walkways, mailboxes, and trash+recycling bin pairs */}
      {streetProps.lotProps.map((lp) => (
        <group key={`lot_props_${lp.houseId}`}>
          <mesh
            position={[lp.driveCenter.x, 0.014, lp.driveCenter.z]}
            geometry={getTiledBoxGeometry(lp.driveWidth, 0.028, lp.driveLength, 2.4)}
            receiveShadow
          >
            <meshStandardMaterial
              color="#bcb8af"
              map={textures.concrete.map}
              normalMap={textures.concrete.normalMap}
              roughness={0.89}
            />
          </mesh>
          <mesh
            position={[lp.walkCenter.x, 0.017, lp.walkCenter.z]}
            geometry={getTiledBoxGeometry(1.85, 0.032, lp.walkLength, 1.8)}
            receiveShadow
          >
            <meshStandardMaterial
              color="#c4bfb6"
              map={textures.concrete.map}
              normalMap={textures.concrete.normalMap}
              roughness={0.87}
            />
          </mesh>

          {/* Mailbox */}
          <group position={[lp.mailboxPos.x, 0, lp.mailboxPos.z]} rotation={[0, lp.rotationY, 0]}>
            <mesh position={[0, 0.56, 0]} castShadow>
              <boxGeometry args={[0.1, 1.12, 0.1]} />
              <meshStandardMaterial color="#594738" roughness={0.85} />
            </mesh>
            <mesh position={[0, 1.16, 0.05]} castShadow>
              <boxGeometry args={[0.24, 0.22, 0.46]} />
              <meshStandardMaterial color="#3c4248" metalness={0.55} roughness={0.45} />
            </mesh>
            <mesh position={[0.135, 1.22, 0.12]}>
              <boxGeometry args={[0.02, 0.16, 0.06]} />
              <meshStandardMaterial color="#a63c2e" roughness={0.55} />
            </mesh>
          </group>

          {/* Wheeled Suburban Trash Bin + Blue Recycling Bin Pair */}
          <group position={[lp.binPos.x, 0, lp.binPos.z]} rotation={[0, lp.rotationY, 0]}>
            <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.56, 0.94, 0.54]} />
              <meshStandardMaterial color="#3d4b41" roughness={0.64} />
            </mesh>
            <mesh position={[0, 0.98, 0]} castShadow>
              <boxGeometry args={[0.6, 0.08, 0.58]} />
              <meshStandardMaterial color="#303932" roughness={0.6} />
            </mesh>
            {/* Blue Recycling Bin neatly beside trash bin */}
            <mesh position={[0, 0.45, -0.66]} castShadow receiveShadow>
              <boxGeometry args={[0.52, 0.88, 0.5]} />
              <meshStandardMaterial color="#355a78" roughness={0.62} />
            </mesh>
            <mesh position={[0, 0.92, -0.66]} castShadow>
              <boxGeometry args={[0.56, 0.07, 0.54]} />
              <meshStandardMaterial color="#2b4a63" roughness={0.6} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Front Flower Beds */}
      {streetProps.flowerBeds.map((bed) => (
        <FlowerBedMesh key={bed.id} bed={bed} />
      ))}

      {/* Backyard & Side-Yard Lifestyle Props (Patio Sets, BBQ Grills, Sheds, Planters, Birdbaths) */}
      {streetProps.yardProps.map((prop) => (
        <YardPropMesh key={prop.id} prop={prop} />
      ))}

      {/* Neighborhood Street Signs & Stop Signs */}
      {streetProps.streetSigns.map((sign) => (
        <StreetSignMesh key={sign.id} sign={sign} />
      ))}

      {/* Distant Rolling Suburban Horizon Hills */}
      {[
        { pos: [-115, -2.5, -132] as [number, number, number], s: [86, 12, 46] as [number, number, number] },
        { pos: [15, -3.0, -142] as [number, number, number], s: [96, 14, 48] as [number, number, number] },
        { pos: [135, -2.5, -126] as [number, number, number], s: [82, 11, 44] as [number, number, number] },
        { pos: [-95, -2.8, 134] as [number, number, number], s: [88, 12, 46] as [number, number, number] },
        { pos: [65, -2.8, 136] as [number, number, number], s: [94, 13, 48] as [number, number, number] },
      ].map((hill, idx) => (
        <mesh key={`hill_${idx}`} position={hill.pos} scale={hill.s}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#58694a" roughness={0.96} />
        </mesh>
      ))}

      {/* Fire Hydrants */}
      {streetProps.hydrants.map((hx) => (
        <group key={`hyd_${hx}`} position={[hx, 0.14, 5.55]}>
          <mesh position={[0, 0.34, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.17, 0.68, 10]} />
            <meshStandardMaterial color="#9e3529" roughness={0.45} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow>
            <sphereGeometry args={[0.15, 10, 8]} />
            <meshStandardMaterial color="#9e3529" roughness={0.45} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.48, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.065, 0.065, 0.42, 8]} />
            <meshStandardMaterial color="#878b90" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      ))}

      {/* Street Park Benches */}
      {streetProps.benches.map((b, i) => (
        <group key={`bench_${i}`} position={[b.x, 0.14, b.z]} rotation={[0, b.rotY, 0]}>
          <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.08, 0.52]} />
            <meshStandardMaterial color="#6e543d" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.78, -0.22]} rotation={[0.15, 0, 0]} castShadow>
            <boxGeometry args={[1.8, 0.34, 0.07]} />
            <meshStandardMaterial color="#6e543d" roughness={0.82} />
          </mesh>
          {[-0.75, 0.75].map((lx) => (
            <mesh key={lx} position={[lx, 0.24, 0]} castShadow>
              <boxGeometry args={[0.1, 0.48, 0.48]} />
              <meshStandardMaterial color="#3c4146" metalness={0.58} roughness={0.45} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Wooden Power Poles + Crossarms */}
      {streetProps.poles.map((px) => (
        <group key={`pole_${px}`} position={[px, 0, -8.3]}>
          <mesh position={[0, 4.4, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.16, 8.8, 10]} />
            <meshStandardMaterial color="#59493b" roughness={0.92} />
          </mesh>
          <mesh position={[0, 8.2, 0]} castShadow>
            <boxGeometry args={[2.1, 0.12, 0.14]} />
            <meshStandardMaterial color="#524336" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 8.22, -8.3]}>
        <boxGeometry args={[powerWireSpan, 0.035, 0.035]} />
        <meshBasicMaterial color="#1f2124" />
      </mesh>
      <mesh position={[0, 8.14, -8.0]}>
        <boxGeometry args={[powerWireSpan, 0.03, 0.03]} />
        <meshBasicMaterial color="#1f2124" />
      </mesh>

      {/* Street Lamps */}
      {streetProps.lamps.map((l, i) => (
        <StreetLamp key={`lamp_${i}`} position={l.pos} rotationY={l.rotY} isNight={isNight} />
      ))}

      {/* Varied Parked Vehicles (Sedans, Pickup Trucks, SUVs) */}
      {streetProps.cars.map((c) => (
        <ParkedVehicle key={c.id} car={c} isNight={isNight} shadowTex={shadowTex} />
      ))}

      {/* Instanced Deciduous Broadleaf Oak Trees */}
      {oakTrees.length > 0 && (
        <>
          <instancedMesh
            ref={oakTrunkRef}
            args={[undefined, undefined, oakTrees.length]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.18, 0.34, 3.3, 7]} />
            <meshStandardMaterial color="#574637" roughness={0.94} />
          </instancedMesh>
          <instancedMesh
            ref={oakCrownARef}
            args={[undefined, undefined, oakTrees.length]}
            castShadow
            receiveShadow
          >
            <icosahedronGeometry args={[2.0, 0]} />
            <meshStandardMaterial color="#ffffff" roughness={0.92} flatShading />
          </instancedMesh>
          <instancedMesh
            ref={oakCrownBRef}
            args={[undefined, undefined, oakTrees.length]}
            castShadow
          >
            <icosahedronGeometry args={[1.55, 0]} />
            <meshStandardMaterial color="#ffffff" roughness={0.92} flatShading />
          </instancedMesh>
        </>
      )}

      {/* Instanced Multi-Tier Evergreen Pine Trees */}
      {pineTrees.length > 0 && (
        <>
          <instancedMesh
            ref={pineTrunkRef}
            args={[undefined, undefined, pineTrees.length]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.14, 0.26, 2.7, 7]} />
            <meshStandardMaterial color="#4e3d2f" roughness={0.94} />
          </instancedMesh>
          <instancedMesh
            ref={pineTier1Ref}
            args={[undefined, undefined, pineTrees.length]}
            castShadow
            receiveShadow
          >
            <coneGeometry args={[1.95, 2.6, 7]} />
            <meshStandardMaterial color="#ffffff" roughness={0.92} flatShading />
          </instancedMesh>
          <instancedMesh
            ref={pineTier2Ref}
            args={[undefined, undefined, pineTrees.length]}
            castShadow
          >
            <coneGeometry args={[1.75, 2.35, 7]} />
            <meshStandardMaterial color="#ffffff" roughness={0.92} flatShading />
          </instancedMesh>
          <instancedMesh
            ref={pineTier3Ref}
            args={[undefined, undefined, pineTrees.length]}
            castShadow
          >
            <coneGeometry args={[1.45, 2.0, 7]} />
            <meshStandardMaterial color="#ffffff" roughness={0.92} flatShading />
          </instancedMesh>
        </>
      )}

      {/* Instanced Bushes */}
      <instancedMesh
        ref={bushRef}
        args={[undefined, undefined, streetProps.bushes.length]}
        castShadow
        receiveShadow
      >
        <icosahedronGeometry args={[0.64, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.94} flatShading />
      </instancedMesh>

      {/* Instanced Wooden Perimeter Fence Posts & Rails */}
      <instancedMesh
        ref={fencePostRef}
        args={[undefined, undefined, streetProps.fencePosts.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.12, 1.56, 0.12]} />
        <meshStandardMaterial color="#685644" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={fenceRailRef}
        args={[undefined, undefined, streetProps.fenceRails.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.0, 1.38, 0.05]} />
        <meshStandardMaterial color="#73604c" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}
