/**
 * Modular 3D House renderer built from engineered HouseBlueprint data.
 * Features:
 * - 18x14m main houses + left/right 6.2x7.6m attached garages with 3.50m ceilings
 * - 3 distinct silhouettes: Brick Colonial wide porch, Craftsman L-shape + stone-base porch,
 *   Stucco Modern cantilevered 2F walkable balcony + panoramic glazing
 * - Real baluster stair handrails & horizontal guardrails (wood, metal, tempered glass)
 * - Animated hinged metal garage shelter trapdoor + descending steel bunker ladder
 * - Exterior steel roof ladder positioned directly from blueprint.ladders with parapet grab loops
 * - Working doors (2.32 x 1.24 m, 3.60 x 2.55 m garage), windows, composite furniture, roof deck, shelter
 * - Automatic 3rd-person upper-floor / ceiling hiding when player is indoors on a lower floor
 */

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { HouseBlueprint, FurnitureSpec, RailingSpec } from '../world/houses';
import type { GameSimulation } from '../simulation/simulation';
import type { CameraMode } from '../storage/localSettings';
import { getProceduralTextureLibrary } from './proceduralTextures';
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
  const balusterCount = Math.max(1, Math.floor(horizLen / 0.32));

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

/** Composite multi-part furniture piece anchored at bottom-center flush with the floor. */
function FurniturePiece({ spec }: { spec: FurnitureSpec }) {
  switch (spec.kind) {
    case 'rug':
      return (
        <mesh position={[spec.x, spec.y, spec.z]} rotation={[-Math.PI / 2, 0, spec.rotationY]} receiveShadow>
          <planeGeometry args={[3.2, 4.0]} />
          <meshStandardMaterial color="#6d5648" roughness={0.95} />
        </mesh>
      );

    case 'sofa':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.1, 0.34, 0.88]} />
            <meshStandardMaterial color="#584b44" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.58, -0.34]} castShadow receiveShadow>
            <boxGeometry args={[2.1, 0.48, 0.22]} />
            <meshStandardMaterial color="#52463f" roughness={0.92} />
          </mesh>
          <mesh position={[-0.96, 0.44, 0.04]} castShadow>
            <boxGeometry args={[0.18, 0.36, 0.8]} />
            <meshStandardMaterial color="#4e433c" roughness={0.9} />
          </mesh>
          <mesh position={[0.96, 0.44, 0.04]} castShadow>
            <boxGeometry args={[0.18, 0.36, 0.8]} />
            <meshStandardMaterial color="#4e433c" roughness={0.9} />
          </mesh>
          <mesh position={[-0.44, 0.43, 0.05]} castShadow>
            <boxGeometry args={[0.84, 0.12, 0.68]} />
            <meshStandardMaterial color="#6a5a50" roughness={0.92} />
          </mesh>
          <mesh position={[0.44, 0.43, 0.05]} castShadow>
            <boxGeometry args={[0.84, 0.12, 0.68]} />
            <meshStandardMaterial color="#6a5a50" roughness={0.92} />
          </mesh>
        </group>
      );

    case 'coffee_table':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.68, 0.06, 1.2]} />
            <meshStandardMaterial color="#5c4330" roughness={0.55} />
          </mesh>
          {[-0.26, 0.26].map((lx) =>
            [-0.5, 0.5].map((lz) => (
              <mesh key={`${lx}_${lz}`} position={[lx, 0.2, lz]} castShadow>
                <boxGeometry args={[0.06, 0.4, 0.06]} />
                <meshStandardMaterial color="#4a3525" roughness={0.65} />
              </mesh>
            )),
          )}
        </group>
      );

    case 'tv_stand':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.45, 0.56, 0.46]} />
            <meshStandardMaterial color="#4a3a2d" roughness={0.68} />
          </mesh>
          <mesh position={[0, 0.9, -0.02]} castShadow>
            <boxGeometry args={[1.1, 0.64, 0.08]} />
            <meshStandardMaterial color="#232528" roughness={0.35} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.9, 0.025]}>
            <planeGeometry args={[1.0, 0.56]} />
            <meshStandardMaterial color="#181c22" roughness={0.12} metalness={0.35} />
          </mesh>
        </group>
      );

    case 'floor_lamp':
      return (
        <group position={[spec.x, spec.y, spec.z]}>
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.2, 0.08, 12]} />
            <meshStandardMaterial color="#3d3834" metalness={0.5} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.82, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.028, 1.52, 8]} />
            <meshStandardMaterial color="#4b4540" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.62, 0]}>
            <cylinderGeometry args={[0.16, 0.24, 0.3, 12]} />
            <meshStandardMaterial
              color="#e6dcc4"
              emissive="#ffcf86"
              emissiveIntensity={0.85}
              roughness={0.75}
            />
          </mesh>
        </group>
      );

    case 'bookshelf':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.34, 1.9, 0.42]} />
            <meshStandardMaterial color="#5c4635" roughness={0.76} />
          </mesh>
          {[0.38, 0.78, 1.18, 1.56].map((sy, idx) => (
            <group key={sy} position={[0, sy, 0.06]}>
              <mesh position={[0, -0.04, 0]}>
                <boxGeometry args={[1.22, 0.04, 0.34]} />
                <meshStandardMaterial color="#4a3829" roughness={0.78} />
              </mesh>
              <mesh position={[-0.32 + (idx % 2) * 0.14, 0.1, 0.06]}>
                <boxGeometry args={[0.38, 0.22, 0.18]} />
                <meshStandardMaterial color={idx % 2 === 0 ? '#6e4339' : '#435863'} roughness={0.88} />
              </mesh>
              <mesh position={[0.25, 0.09, 0.06]}>
                <boxGeometry args={[0.42, 0.2, 0.18]} />
                <meshStandardMaterial color={idx % 2 === 0 ? '#5b664b' : '#7a684b'} roughness={0.88} />
              </mesh>
            </group>
          ))}
        </group>
      );

    case 'picture':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh>
            <boxGeometry args={[1.15, 0.78, 0.05]} />
            <meshStandardMaterial color="#3c2e22" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.028]}>
            <planeGeometry args={[1.0, 0.64]} />
            <meshStandardMaterial color="#7d8a7e" roughness={0.85} />
          </mesh>
        </group>
      );

    case 'kitchen_counter':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 0.84, 0.64]} />
            <meshStandardMaterial color="#cfc8bc" roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.86, 0.01]} castShadow receiveShadow>
            <boxGeometry args={[2.56, 0.06, 0.68]} />
            <meshStandardMaterial color="#58544f" roughness={0.38} />
          </mesh>
          <mesh position={[0, 0.895, 0]}>
            <boxGeometry args={[0.62, 0.02, 0.44]} />
            <meshStandardMaterial color="#9aa1a6" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[0, 1.04, -0.22]}>
            <cylinderGeometry args={[0.02, 0.02, 0.26, 8]} />
            <meshStandardMaterial color="#b4babf" metalness={0.85} roughness={0.2} />
          </mesh>
        </group>
      );

    case 'stove':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.76, 0.9, 0.72]} />
            <meshStandardMaterial color="#d2cec6" roughness={0.42} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.4, 0.37]}>
            <boxGeometry args={[0.56, 0.44, 0.03]} />
            <meshStandardMaterial color="#25282c" roughness={0.2} metalness={0.4} />
          </mesh>
          {[-0.18, 0.18].map((bx) =>
            [-0.16, 0.16].map((bz) => (
              <mesh key={`${bx}_${bz}`} position={[bx, 0.91, bz]}>
                <cylinderGeometry args={[0.1, 0.1, 0.02, 12]} />
                <meshStandardMaterial color="#202124" roughness={0.6} />
              </mesh>
            )),
          )}
        </group>
      );

    case 'fridge':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.94, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.78, 1.88, 0.74]} />
            <meshStandardMaterial color="#d7d4cc" roughness={0.34} metalness={0.18} />
          </mesh>
          <mesh position={[0.28, 1.35, 0.39]}>
            <boxGeometry args={[0.03, 0.36, 0.04]} />
            <meshStandardMaterial color="#878b90" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[0.28, 0.62, 0.39]}>
            <boxGeometry args={[0.03, 0.45, 0.04]} />
            <meshStandardMaterial color="#878b90" metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      );

    case 'washer':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.72, 0.92, 0.68]} />
            <meshStandardMaterial color="#d4d1c9" roughness={0.36} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.44, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.04, 14]} />
            <meshStandardMaterial color="#3c4248" metalness={0.65} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.84, 0.34]}>
            <boxGeometry args={[0.64, 0.1, 0.04]} />
            <meshStandardMaterial color="#494d52" roughness={0.5} />
          </mesh>
        </group>
      );

    case 'dining_table':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.36, 0.07, 1.0]} />
            <meshStandardMaterial color="#6e5038" roughness={0.58} />
          </mesh>
          {[-0.58, 0.58].map((lx) =>
            [-0.4, 0.4].map((lz) => (
              <mesh key={`${lx}_${lz}`} position={[lx, 0.36, lz]} castShadow>
                <boxGeometry args={[0.07, 0.72, 0.07]} />
                <meshStandardMaterial color="#583f2b" roughness={0.68} />
              </mesh>
            )),
          )}
        </group>
      );

    case 'bed_double':
    case 'bed_single': {
      const bw = spec.kind === 'bed_double' ? 1.72 : 1.15;
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[bw, 0.36, 2.02]} />
            <meshStandardMaterial color="#564131" roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.64, -0.98]} castShadow>
            <boxGeometry args={[bw + 0.08, 0.9, 0.09]} />
            <meshStandardMaterial color="#4b382a" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.48, 0.06]} castShadow receiveShadow>
            <boxGeometry args={[bw - 0.08, 0.2, 1.88]} />
            <meshStandardMaterial color="#d8d2c6" roughness={0.92} />
          </mesh>
          <mesh position={[0, 0.51, 0.26]} castShadow>
            <boxGeometry args={[bw - 0.04, 0.17, 1.38]} />
            <meshStandardMaterial
              color={spec.kind === 'bed_double' ? '#4f5d66' : '#65594b'}
              roughness={0.94}
            />
          </mesh>
          <mesh position={[spec.kind === 'bed_double' ? -0.38 : 0, 0.62, -0.68]} castShadow>
            <boxGeometry args={[0.62, 0.14, 0.38]} />
            <meshStandardMaterial color="#e5dfd3" roughness={0.9} />
          </mesh>
          {spec.kind === 'bed_double' && (
            <mesh position={[0.38, 0.62, -0.68]} castShadow>
              <boxGeometry args={[0.62, 0.14, 0.38]} />
              <meshStandardMaterial color="#e5dfd3" roughness={0.9} />
            </mesh>
          )}
        </group>
      );
    }

    case 'dresser':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.25, 0.96, 0.52]} />
            <meshStandardMaterial color="#614a37" roughness={0.68} />
          </mesh>
          {[0.24, 0.52, 0.78].map((dy) => (
            <mesh key={dy} position={[0, dy, 0.27]}>
              <boxGeometry args={[1.08, 0.2, 0.03]} />
              <meshStandardMaterial color="#523e2d" roughness={0.7} />
            </mesh>
          ))}
        </group>
      );

    case 'desk':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.26, 0.06, 0.62]} />
            <meshStandardMaterial color="#6a523e" roughness={0.62} />
          </mesh>
          <mesh position={[-0.56, 0.36, 0]} castShadow>
            <boxGeometry args={[0.1, 0.72, 0.56]} />
            <meshStandardMaterial color="#4e3d2f" roughness={0.7} />
          </mesh>
          <mesh position={[0.56, 0.36, 0]} castShadow>
            <boxGeometry args={[0.1, 0.72, 0.56]} />
            <meshStandardMaterial color="#4e3d2f" roughness={0.7} />
          </mesh>
        </group>
      );

    case 'bathtub':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.86, 0.6, 1.76]} />
            <meshStandardMaterial color="#dfdcd4" roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.44, 0]}>
            <boxGeometry args={[0.66, 0.36, 1.54]} />
            <meshStandardMaterial color="#c9c6be" roughness={0.25} />
          </mesh>
        </group>
      );

    case 'vanity':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.08, 0.84, 0.52]} />
            <meshStandardMaterial color="#c9c3b8" roughness={0.65} />
          </mesh>
          <mesh position={[0, 1.45, -0.24]}>
            <boxGeometry args={[0.88, 0.78, 0.04]} />
            <meshStandardMaterial color="#a6b4bc" metalness={0.85} roughness={0.12} />
          </mesh>
        </group>
      );

    case 'toilet':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.22, 0.06]} castShadow>
            <cylinderGeometry args={[0.2, 0.16, 0.44, 12]} />
            <meshStandardMaterial color="#e3e0d8" roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.58, -0.18]} castShadow>
            <boxGeometry args={[0.42, 0.44, 0.22]} />
            <meshStandardMaterial color="#e3e0d8" roughness={0.22} />
          </mesh>
        </group>
      );

    case 'workbench':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.08, 0.72]} />
            <meshStandardMaterial color="#7d6144" roughness={0.78} />
          </mesh>
          {[-0.9, 0.9].map((lx) => (
            <mesh key={lx} position={[lx, 0.42, 0]} castShadow>
              <boxGeometry args={[0.1, 0.84, 0.64]} />
              <meshStandardMaterial color="#46494c" metalness={0.5} roughness={0.55} />
            </mesh>
          ))}
          <mesh position={[0, 1.38, -0.32]}>
            <boxGeometry args={[1.9, 0.85, 0.05]} />
            <meshStandardMaterial color="#594a3b" roughness={0.85} />
          </mesh>
        </group>
      );

    case 'tool_chest':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.08, 1.0, 0.56]} />
            <meshStandardMaterial color="#7e382d" metalness={0.45} roughness={0.44} />
          </mesh>
          {[0.24, 0.46, 0.68, 0.88].map((dy) => (
            <mesh key={dy} position={[0, dy, 0.29]}>
              <boxGeometry args={[0.92, 0.04, 0.03]} />
              <meshStandardMaterial color="#b4babf" metalness={0.82} roughness={0.28} />
            </mesh>
          ))}
        </group>
      );

    case 'shelf':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {[-0.68, 0.68].map((lx) => (
            <mesh key={lx} position={[lx, 0.9, 0]} castShadow>
              <boxGeometry args={[0.06, 1.8, 0.48]} />
              <meshStandardMaterial color="#494c50" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          {[0.3, 0.85, 1.4, 1.76].map((sy) => (
            <mesh key={sy} position={[0, sy, 0]} castShadow>
              <boxGeometry args={[1.42, 0.05, 0.48]} />
              <meshStandardMaterial color="#756048" roughness={0.8} />
            </mesh>
          ))}
        </group>
      );

    case 'shelter_hatch':
      // Animated trapdoor lid is rendered directly in HouseView so it hinges smoothly with openProgress
      return null;

    case 'safe':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.54, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.82, 1.08, 0.78]} />
            <meshStandardMaterial color="#2f353b" metalness={0.72} roughness={0.38} />
          </mesh>
          <mesh position={[0, 0.56, 0.41]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.05, 16]} />
            <meshStandardMaterial color="#b89852" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      );

    case 'generator':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.76, 0.78]} />
            <meshStandardMaterial color="#7d4a34" metalness={0.4} roughness={0.55} />
          </mesh>
          <mesh position={[-0.35, 0.86, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.14, 0.22, 12]} />
            <meshStandardMaterial color="#35383c" metalness={0.75} roughness={0.38} />
          </mesh>
          <mesh position={[0.42, 0.56, 0.4]}>
            <boxGeometry args={[0.28, 0.24, 0.04]} />
            <meshStandardMaterial color="#222528" roughness={0.4} />
          </mesh>
        </group>
      );

    case 'crate':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.76, 0.72, 0.76]} />
            <meshStandardMaterial color="#785f42" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.36, 0.385]}>
            <boxGeometry args={[0.68, 0.1, 0.03]} />
            <meshStandardMaterial color="#5c4730" roughness={0.88} />
          </mesh>
        </group>
      );

    case 'tunnel_hatch':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.45, 1.85, 0.14]} />
            <meshStandardMaterial color="#3c4246" metalness={0.68} roughness={0.48} />
          </mesh>
          <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.24, 0.035, 8, 16]} />
            <meshStandardMaterial color="#a67c32" metalness={0.65} roughness={0.35} />
          </mesh>
        </group>
      );
  }
}

export function HouseView({ blueprint, simRef, cameraMode, isNight }: HouseViewProps) {
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
  const windowSashRefs = useRef<Record<string, THREE.Mesh | null>>({});

  const textures = useMemo(
    () => getProceduralTextureLibrary(Math.min(4, gl.capabilities.getMaxAnisotropy())),
    [gl],
  );

  // Shared per-house PBR materials (grounded, slightly desaturated)
  const mats = useMemo(() => {
    const extTex = textures[blueprint.palette.exteriorTexture];
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
        color: '#dad4c8',
        map: textures.plaster.map,
        normalMap: textures.plaster.normalMap,
        roughness: 0.9,
      }),
      garage: new THREE.MeshStandardMaterial({
        color: '#b6b1a8',
        map: textures.concrete.map,
        normalMap: textures.concrete.normalMap,
        roughness: 0.92,
      }),
      shelter: new THREE.MeshStandardMaterial({
        color: '#888682',
        map: textures.concrete.map,
        normalMap: textures.concrete.normalMap,
        roughness: 0.94,
      }),
      trim: new THREE.MeshStandardMaterial({
        color: blueprint.palette.trimColor,
        roughness: 0.65,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: blueprint.palette.accentColor,
        roughness: 0.72,
      }),
      woodFloor: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: textures.woodFloor.map,
        normalMap: textures.woodFloor.normalMap,
        roughnessMap: textures.woodFloor.roughnessMap,
        roughness: 0.72,
      }),
      tileFloor: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: textures.tile.map,
        normalMap: textures.tile.normalMap,
        roughnessMap: textures.tile.roughnessMap,
        roughness: 0.5,
      }),
      concreteFloor: new THREE.MeshStandardMaterial({
        color: '#c2bfb8',
        map: textures.concrete.map,
        normalMap: textures.concrete.normalMap,
        roughness: 0.88,
      }),
      roofFloor: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: textures.roof.map,
        normalMap: textures.roof.normalMap,
        roughnessMap: textures.roof.roughnessMap,
        roughness: 0.9,
      }),
      door: new THREE.MeshStandardMaterial({
        color: blueprint.palette.doorColor,
        roughness: 0.62,
      }),
      shutter: new THREE.MeshStandardMaterial({
        color: blueprint.palette.shutterColor,
        roughness: 0.76,
      }),
      metalDark: new THREE.MeshStandardMaterial({
        color: '#34383c',
        metalness: 0.72,
        roughness: 0.42,
      }),
      railingGlass: new THREE.MeshStandardMaterial({
        color: '#7a94a3',
        roughness: 0.14,
        metalness: 0.25,
        transparent: true,
        opacity: 0.42,
      }),
      glassDay: new THREE.MeshStandardMaterial({
        color: '#6e8494',
        roughness: 0.14,
        metalness: 0.25,
        transparent: true,
        opacity: 0.52,
      }),
      glassNight: new THREE.MeshStandardMaterial({
        color: '#d8be89',
        emissive: '#f2b863',
        emissiveIntensity: 1.35,
        roughness: 0.2,
        transparent: true,
        opacity: 0.82,
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

  // Dynamic frame updates: keep full house structure ALWAYS loaded, animate doors/hatch/windows
  useFrame(() => {
    const sim = simRef.current;
    const player = sim.getLocalPlayer();
    if (!player) return;

    const isPlayerInThisHouse = player.insideHouseId === blueprint.houseId;
    const distSq =
      (player.position.x - blueprint.worldOrigin.x) ** 2 +
      (player.position.z - blueprint.worldOrigin.z) ** 2;

    // Keep Ground Floor, Second Floor, and Roof Deck ALWAYS visible & fully loaded
    // (3.80 m tall ceilings + collision-aware 3P camera keep indoor views solid and immersive!)
    if (floor1GroupRef.current) floor1GroupRef.current.visible = true;
    if (floor2GroupRef.current) floor2GroupRef.current.visible = true;
    if (roofGroupRef.current) roofGroupRef.current.visible = true;
    if (shelterGroupRef.current) {
      shelterGroupRef.current.visible = isPlayerInThisHouse || distSq < 32 * 32;
    }
    if (interiorLightGroupRef.current) {
      interiorLightGroupRef.current.visible = isPlayerInThisHouse;
    }

    // Generous distance-based interior furniture visibility
    if (interiorFurnRef.current) {
      interiorFurnRef.current.visible = isPlayerInThisHouse || distSq < 68 * 68;
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

    // Sync interactive window sash & barricade planks
    for (const w of blueprint.windows) {
      const live = sim.state.windows[w.id];
      const bar = windowBarricadeRefs.current[w.id];
      if (live && bar) {
        bar.visible = live.isBarricaded;
      }
      const sash = windowSashRefs.current[w.id];
      if (live && sash) {
        sash.position.y = live.isOpen ? 0.38 : 0;
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
  const porch = blueprint.porch;
  const isModern = blueprint.lot.houseType === 'stucco_modern';
  const isCraftsman = blueprint.lot.houseType === 'craftsman_clapboard';

  // Shelter light position centered inside the bunker beneath garage/utility
  const shelterCenterLocalX = (blueprint.garageCenterLocalX - mirror * (blueprint.garageWidth / 2)) - mirror * 0.6;
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
            material={slabMaterialFor(s.surface)}
            receiveShadow
          >
            <boxGeometry args={[s.sx, s.thickness, s.sz]} />
          </mesh>
        ))}

        {wallsByFloor[0].map((w) => (
          <mesh
            key={w.id}
            position={[w.x, w.y, w.z]}
            material={wallMaterialFor(w.material)}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w.sx, w.sy, w.sz]} />
          </mesh>
        ))}

        {/* Archetype-specific Front Porch Canopy, Columns & Warm Entrance Sconce */}
        <group>
          {/* Porch overhang roof (Modern uses the 2F balcony slab itself, Colonial/Craftsman get dedicated roof canopy) */}
          {!isModern && (
            <>
              <mesh
                position={[porch.x, porch.roofY + 0.14, porch.z + 0.08]}
                material={mats.roofFloor}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[porch.width + 0.5, 0.24, porch.depth + 0.4]} />
              </mesh>
              <mesh
                position={[porch.x, porch.roofY, porch.z + porch.depth / 2 + 0.22]}
                material={mats.trim}
                castShadow
              >
                <boxGeometry args={[porch.width + 0.56, 0.16, 0.12]} />
              </mesh>
            </>
          )}

          {/* Porch Columns (Craftsman has tapered stone plinth bases) */}
          {porch.columnLocalXs.map((cx, idx) => {
            const colH = porch.roofY - blueprint.groundFloorY;
            const colZ = porch.z + porch.depth / 2 - 0.18;
            return (
              <group key={idx} position={[cx, blueprint.groundFloorY, colZ]}>
                {porch.hasStoneBases && (
                  <mesh position={[0, 0.62, 0]} material={mats.concreteFloor} castShadow receiveShadow>
                    <boxGeometry args={[0.42, 1.24, 0.42]} />
                  </mesh>
                )}
                <mesh
                  position={[0, colH / 2, 0]}
                  material={isModern ? mats.metalDark : mats.trim}
                  castShadow
                >
                  <boxGeometry args={[isModern ? 0.16 : 0.22, colH, isModern ? 0.16 : 0.22]} />
                </mesh>
              </group>
            );
          })}

          {/* Warm entrance porch sconce beside front door */}
          <mesh
            position={[
              blueprint.frontDoorLocalX + 0.92,
              blueprint.groundFloorY + 2.45,
              blueprint.frontDoorLocalZ + 0.18,
            ]}
          >
            <boxGeometry args={[0.2, 0.28, 0.2]} />
            <meshStandardMaterial
              color="#f2e6ca"
              emissive="#ffbd6b"
              emissiveIntensity={isNight ? 2.5 : 0.22}
              roughness={0.35}
            />
          </mesh>
        </group>

        {/* Ground-to-2F Walkable Interior Stairs (21 steps, 1.36 m wide) */}
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
                      material={mats.woodFloor}
                      castShadow
                      receiveShadow
                    >
                      <boxGeometry args={[st.width, stepH + 0.02, Math.abs(stepD) + 0.025]} />
                    </mesh>
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

        {/* Animated Hinged Metal Shelter Trapdoor in Garage */}
        {shelterLadderLocal && (
          <group position={[shelterLadderLocal.x, blueprint.groundFloorY, shelterLadderLocal.z]}>
            {/* Recessed iron collar rim around shaft cutout */}
            <mesh position={[0, 0.02, -0.68]} material={mats.metalDark} receiveShadow>
              <boxGeometry args={[1.44, 0.06, 0.12]} />
            </mesh>
            <mesh position={[0, 0.02, 0.68]} material={mats.metalDark} receiveShadow>
              <boxGeometry args={[1.44, 0.06, 0.12]} />
            </mesh>
            <mesh position={[-0.68, 0.02, 0]} material={mats.metalDark} receiveShadow>
              <boxGeometry args={[0.12, 0.06, 1.24]} />
            </mesh>
            <mesh position={[0.68, 0.02, 0]} material={mats.metalDark} receiveShadow>
              <boxGeometry args={[0.12, 0.06, 1.24]} />
            </mesh>
            {/* Dark shaft interior lining */}
            <mesh position={[0, -0.35, -0.62]} material={mats.shelter}>
              <boxGeometry args={[1.28, 0.72, 0.08]} />
            </mesh>
            <mesh position={[0, -0.35, 0.62]} material={mats.shelter}>
              <boxGeometry args={[1.28, 0.72, 0.08]} />
            </mesh>
            {/* Hinged steel trapdoor lid pivoted on the -Z back edge */}
            <group ref={shelterHatchPivotRef} position={[0, 0.05, -0.64]}>
              <mesh position={[0, 0.02, 0.64]} castShadow receiveShadow>
                <boxGeometry args={[1.26, 0.06, 1.26]} />
                <meshStandardMaterial color="#585d61" metalness={0.58} roughness={0.52} />
              </mesh>
              {/* Hazard handle bar */}
              <mesh position={[0, 0.065, 1.08]}>
                <boxGeometry args={[0.42, 0.045, 0.08]} />
                <meshStandardMaterial color="#b98f32" roughness={0.5} />
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

        {/* Warm architectural ceiling light fixtures on 1F (flush under 2F slab) */}
        {[
          { x: mirror * -7.2, z: 4.4 },
          { x: mirror * -7.2, z: -4.4 },
          { x: mirror * 0.2, z: 4.8 },
          { x: mirror * 0.2, z: -4.8 },
          { x: mirror * 7.8, z: 4.4 },
          { x: mirror * 7.8, z: -4.4 },
          { x: blueprint.garageCenterLocalX, z: 1.8 },
        ].map((lamp, idx) => (
          <group key={`c1_${idx}`} position={[lamp.x, blueprint.groundFloorY + blueprint.ceilingHeight - 0.05, lamp.z]}>
            <mesh material={mats.metalDark}>
              <cylinderGeometry args={[0.32, 0.34, 0.06, 12]} />
            </mesh>
            <mesh position={[0, -0.04, 0]}>
              <cylinderGeometry args={[0.26, 0.26, 0.04, 12]} />
              <meshStandardMaterial color="#fff3d6" emissive="#ffd99a" emissiveIntensity={1.6} roughness={0.3} />
            </mesh>
          </group>
        ))}

        {/* Active warm residential interior fill lights (enabled only while inside this house) */}
        <group ref={interiorLightGroupRef} visible={false}>
          <pointLight position={[mirror * -6.5, blueprint.groundFloorY + 3.2, 1.5]} color="#fff0d4" intensity={18} distance={24} decay={1.6} />
          <pointLight position={[mirror * 3.5, blueprint.groundFloorY + 3.2, 0.5]} color="#fff0d4" intensity={18} distance={24} decay={1.6} />
          <pointLight position={[blueprint.garageCenterLocalX, blueprint.groundFloorY + 3.2, 1.8]} color="#eef3ff" intensity={14} distance={18} decay={1.7} />
          <pointLight position={[mirror * -5.5, blueprint.secondFloorY + 3.2, 1.0]} color="#fff0d4" intensity={18} distance={24} decay={1.6} />
          <pointLight position={[mirror * 4.5, blueprint.secondFloorY + 3.2, 1.0]} color="#fff0d4" intensity={18} distance={24} decay={1.6} />
        </group>

        {/* Exterior gutters & downspouts anchored flush on non-garage outer corners */}
        <mesh
          position={[
            blueprint.lot.garageSide === 'left' ? hw + 0.12 : -hw - 0.12,
            blueprint.roofDeckY / 2,
            (isCraftsman ? hd - 1.6 : hd) - 0.18,
          ]}
          material={mats.metalDark}
          castShadow
        >
          <cylinderGeometry args={[0.048, 0.048, blueprint.roofDeckY, 8]} />
        </mesh>
        <mesh
          position={[
            blueprint.lot.garageSide === 'left' ? hw + 0.12 : -hw - 0.12,
            blueprint.roofDeckY / 2,
            -hd + 0.18,
          ]}
          material={mats.metalDark}
          castShadow
        >
          <cylinderGeometry args={[0.048, 0.048, blueprint.roofDeckY, 8]} />
        </mesh>

        {/* Exterior Climbable Steel Roof Ladder (placed directly from blueprint.ladders) */}
        {roofLadderLocal && (
          <group
            position={[roofLadderLocal.x, 0, roofLadderLocal.z]}
            rotation={[0, roofLadderLocal.rotY, 0]}
          >
            {/* Side Rails extending +0.95m above roof parapet as safety grab handles */}
            <mesh position={[-0.24, (roofLadderLocal.height + 0.95) / 2, -0.16]} material={mats.metalDark} castShadow>
              <cylinderGeometry args={[0.032, 0.032, roofLadderLocal.height + 0.95, 8]} />
            </mesh>
            <mesh position={[0.24, (roofLadderLocal.height + 0.95) / 2, -0.16]} material={mats.metalDark} castShadow>
              <cylinderGeometry args={[0.032, 0.032, roofLadderLocal.height + 0.95, 8]} />
            </mesh>
            {/* Top parapet return grab loops */}
            <mesh position={[-0.24, roofLadderLocal.height + 0.95, -0.34]} rotation={[Math.PI / 2, 0, 0]} material={mats.metalDark}>
              <cylinderGeometry args={[0.03, 0.03, 0.38, 8]} />
            </mesh>
            <mesh position={[0.24, roofLadderLocal.height + 0.95, -0.34]} rotation={[Math.PI / 2, 0, 0]} material={mats.metalDark}>
              <cylinderGeometry args={[0.03, 0.03, 0.38, 8]} />
            </mesh>
            {/* Wall standoffs */}
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
            {/* Horizontal Rungs spaced every 0.35 m */}
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
      </group>

      {/* ==================== SECOND FLOOR (Level 1) ==================== */}
      <group ref={floor2GroupRef}>
        {slabsByFloor[1].map((s) => (
          <mesh
            key={s.id}
            position={[s.x, s.y - s.thickness / 2, s.z]}
            material={slabMaterialFor(s.surface)}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[s.sx, s.thickness, s.sz]} />
          </mesh>
        ))}

        {wallsByFloor[1].map((w) => (
          <mesh
            key={w.id}
            position={[w.x, w.y, w.z]}
            material={wallMaterialFor(w.material)}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w.sx, w.sy, w.sz]} />
          </mesh>
        ))}

        {/* Architectural belt-course trim between 1F and 2F */}
        <mesh position={[0, blueprint.secondFloorY - 0.1, -hd - 0.08]} material={mats.trim}>
          <boxGeometry args={[blueprint.width + 0.32, 0.18, 0.12]} />
        </mesh>
        {!isCraftsman && (
          <mesh position={[0, blueprint.secondFloorY - 0.1, hd + 0.08]} material={mats.trim}>
            <boxGeometry args={[blueprint.width + 0.32, 0.18, 0.12]} />
          </mesh>
        )}

        {/* Modern 2F Cantilevered Balcony Architectural Fascia */}
        {blueprint.balcony && (
          <mesh
            position={[blueprint.balcony.x, blueprint.balcony.floorY - 0.14, blueprint.balcony.z + blueprint.balcony.depth / 2 + 0.04]}
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
                      material={mats.woodFloor}
                      castShadow
                      receiveShadow
                    >
                      <boxGeometry args={[st.width, stepH + 0.02, Math.abs(stepD) + 0.025]} />
                    </mesh>
                  );
                })}
              </group>
            );
          })}

        {/* 2F Real Baluster Railings (Stairwell Guardrails, Roof Stair Handrails, Modern Glass Balcony Railings) */}
        {railingsByFloor[1].map((r) => (
          <RailingPiece
            key={r.id}
            spec={r}
            woodMat={mats.accent}
            metalMat={mats.metalDark}
            glassMat={mats.railingGlass}
          />
        ))}

        {/* Warm architectural ceiling light fixtures on 2F (flush under Roof slab) */}
        {[
          { x: mirror * -7.2, z: 4.4 },
          { x: mirror * -7.2, z: -4.4 },
          { x: mirror * 0.2, z: 4.8 },
          { x: mirror * 0.2, z: -5.4 },
          { x: mirror * 8.2, z: 5.2 },
          { x: mirror * 8.2, z: -5.6 },
        ].map((lamp, idx) => (
          <group key={`c2_${idx}`} position={[lamp.x, blueprint.secondFloorY + blueprint.ceilingHeight - 0.05, lamp.z]}>
            <mesh material={mats.metalDark}>
              <cylinderGeometry args={[0.32, 0.34, 0.06, 12]} />
            </mesh>
            <mesh position={[0, -0.04, 0]}>
              <cylinderGeometry args={[0.26, 0.26, 0.04, 12]} />
              <meshStandardMaterial color="#fff3d6" emissive="#ffd99a" emissiveIntensity={1.6} roughness={0.3} />
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
            material={slabMaterialFor(s.surface)}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[s.sx, s.thickness, s.sz]} />
          </mesh>
        ))}

        {wallsByFloor[2].map((w) => (
          <mesh
            key={w.id}
            position={[w.x, w.y, w.z]}
            material={wallMaterialFor(w.material)}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w.sx, w.sy, w.sz]} />
          </mesh>
        ))}

        {/* Roof Parapet Coping Trim */}
        <mesh position={[0, blueprint.roofDeckY + 1.04, -hd]} material={mats.trim} castShadow>
          <boxGeometry args={[blueprint.width + 0.36, 0.1, 0.34]} />
        </mesh>
        {!isCraftsman && (
          <mesh position={[0, blueprint.roofDeckY + 1.04, hd]} material={mats.trim} castShadow>
            <boxGeometry args={[blueprint.width + 0.36, 0.1, 0.34]} />
          </mesh>
        )}

        {/* Brick/Stucco Chimney */}
        <group position={[mirror * (-hw + 1.3), blueprint.roofDeckY + 1.4, -hd + 1.3]}>
          <mesh material={mats.exterior} castShadow receiveShadow>
            <boxGeometry args={[1.15, 2.8, 1.15]} />
          </mesh>
          <mesh position={[0, 1.45, 0]} material={mats.concreteFloor} castShadow>
            <boxGeometry args={[1.34, 0.16, 1.34]} />
          </mesh>
          <mesh position={[0, 1.66, 0]} material={mats.metalDark}>
            <cylinderGeometry args={[0.22, 0.24, 0.38, 10]} />
          </mesh>
        </group>

        {/* Roof Vent (future ninja robber entry anchor) */}
        <group position={[mirror * -4.5, blueprint.roofDeckY + 0.24, -2.2]}>
          <mesh material={mats.metalDark} castShadow>
            <boxGeometry args={[1.05, 0.48, 1.05]} />
          </mesh>
          <mesh position={[0, 0.3, 0]} material={mats.trim}>
            <boxGeometry args={[1.18, 0.08, 1.18]} />
          </mesh>
        </group>

        {/* Subtle staging pads for future Cannon, Antenna, and Missile Pad */}
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
            material={mats.shelter}
            receiveShadow
          >
            <boxGeometry args={[s.sx, s.thickness, s.sz]} />
          </mesh>
        ))}
        {wallsByFloor[-1].map((w) => (
          <mesh key={w.id} position={[w.x, w.y, w.z]} material={mats.shelter} receiveShadow>
            <boxGeometry args={[w.sx, w.sy, w.sz]} />
          </mesh>
        ))}
        {/* Hanging bunker work light */}
        <pointLight
          position={[shelterCenterLocalX, blueprint.shelterFloorY + 3.0, shelterCenterLocalZ]}
          color="#ffe1ad"
          intensity={18}
          distance={14}
          decay={2}
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

      {/* ==================== INTERACTIVE DOORS ==================== */}
      {blueprint.doors.map((d) => {
        const localPos = worldToLocal(blueprint.worldOrigin, blueprint.rotationY, d.position);
        const localRot = d.rotationY - blueprint.rotationY;
        const isGarage = d.kind === 'garage';
        return (
          <group key={d.id} position={[localPos.x, localPos.y, localPos.z]} rotation={[0, localRot, 0]}>
            {/* Door jambs & lintel */}
            <mesh position={[-d.width / 2 - 0.05, d.height / 2, 0]} material={mats.trim}>
              <boxGeometry args={[0.1, d.height + 0.08, 0.28]} />
            </mesh>
            <mesh position={[d.width / 2 + 0.05, d.height / 2, 0]} material={mats.trim}>
              <boxGeometry args={[0.1, d.height + 0.08, 0.28]} />
            </mesh>
            <mesh position={[0, d.height + 0.05, 0]} material={mats.trim}>
              <boxGeometry args={[d.width + 0.2, 0.1, 0.28]} />
            </mesh>

            {/* Hinged / Overhead Door Leaf */}
            <group
              ref={(el) => {
                doorPivotRefs.current[d.id] = el;
              }}
              position={[isGarage ? 0 : -d.width / 2, 0, 0]}
            >
              <mesh
                position={[isGarage ? 0 : d.width / 2, d.height / 2, 0]}
                material={isGarage ? mats.trim : mats.door}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[d.width - 0.04, d.height - 0.04, 0.09]} />
              </mesh>
              {/* Garage horizontal panel grooves */}
              {isGarage &&
                [0.65, 1.3, 1.95].map((gy) => (
                  <mesh key={gy} position={[0, gy, 0.055]} material={mats.metalDark}>
                    <boxGeometry args={[d.width - 0.16, 0.03, 0.02]} />
                  </mesh>
                ))}
              {/* Brass door handle */}
              {!isGarage && (
                <mesh position={[d.width - 0.18, 1.05, 0.07]}>
                  <sphereGeometry args={[0.045, 8, 8]} />
                  <meshStandardMaterial color="#c4a259" metalness={0.85} roughness={0.25} />
                </mesh>
              )}
              {/* Lock indicator deadbolt (visible when locked) */}
              <mesh
                ref={(el) => {
                  doorLockRefs.current[d.id] = el;
                }}
                position={[isGarage ? 0 : d.width - 0.18, 1.22, 0.08]}
                visible={false}
              >
                <boxGeometry args={[0.08, 0.08, 0.05]} />
                <meshStandardMaterial color="#b84a39" emissive="#8f2c1f" emissiveIntensity={0.6} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* ==================== INTERACTIVE WINDOWS ==================== */}
      {blueprint.windows.map((w) => {
        const localPos = worldToLocal(blueprint.worldOrigin, blueprint.rotationY, w.position);
        const localRot = w.rotationY - blueprint.rotationY;
        return (
          <group key={w.id} position={[localPos.x, localPos.y, localPos.z]} rotation={[0, localRot, 0]}>
            <mesh position={[0, -w.height / 2 - 0.04, 0.06]} material={mats.trim} castShadow>
              <boxGeometry args={[w.width + 0.24, 0.1, 0.34]} />
            </mesh>
            <mesh position={[0, w.height / 2 + 0.04, 0.02]} material={mats.trim}>
              <boxGeometry args={[w.width + 0.2, 0.1, 0.28]} />
            </mesh>
            <mesh position={[-w.width / 2 - 0.04, 0, 0]} material={mats.trim}>
              <boxGeometry args={[0.09, w.height, 0.26]} />
            </mesh>
            <mesh position={[w.width / 2 + 0.04, 0, 0]} material={mats.trim}>
              <boxGeometry args={[0.09, w.height, 0.26]} />
            </mesh>
            {!isModern && (
              <>
                <mesh position={[-w.width / 2 - 0.26, 0, 0.13]} material={mats.shutter} castShadow>
                  <boxGeometry args={[0.32, w.height, 0.05]} />
                </mesh>
                <mesh position={[w.width / 2 + 0.26, 0, 0.13]} material={mats.shutter} castShadow>
                  <boxGeometry args={[0.32, w.height, 0.05]} />
                </mesh>
              </>
            )}
            <mesh
              ref={(el) => {
                windowSashRefs.current[w.id] = el;
              }}
              material={isNight ? mats.glassNight : mats.glassDay}
            >
              <boxGeometry args={[w.width - 0.08, w.height - 0.08, 0.04]} />
            </mesh>
            <mesh material={mats.trim}>
              <boxGeometry args={[0.05, w.height, 0.07]} />
            </mesh>
            <mesh material={mats.trim}>
              <boxGeometry args={[w.width, 0.05, 0.07]} />
            </mesh>
            <group
              ref={(el) => {
                windowBarricadeRefs.current[w.id] = el;
              }}
              visible={false}
              position={[0, 0, 0.15]}
            >
              {[-0.38, 0, 0.38].map((by, idx) => (
                <mesh
                  key={by}
                  position={[0, by, 0]}
                  rotation={[0, 0, idx === 1 ? 0.08 : -0.05]}
                  material={mats.barricadeWood}
                  castShadow
                >
                  <boxGeometry args={[w.width + 0.22, 0.18, 0.05]} />
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
