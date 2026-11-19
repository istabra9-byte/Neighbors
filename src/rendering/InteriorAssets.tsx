/**
 * Detailed multi-part composite interior & porch furniture renderers for Neighborhood Wars.
 * Covers all 50 FurnitureKind types defined in houses.ts, anchored at bottom-center (y = 0)
 * flush with the floor surface, with rich grounded palettes and zero floating parts.
 */

import type { FurnitureSpec } from '../world/houses';

export function FurniturePiece({ spec }: { spec: FurnitureSpec }) {
  switch (spec.kind) {
    case 'rug':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} receiveShadow>
            <planeGeometry args={[3.4, 4.2]} />
            <meshStandardMaterial color="#6e5749" roughness={0.95} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]} receiveShadow>
            <planeGeometry args={[2.9, 3.7]} />
            <meshStandardMaterial color="#876d5b" roughness={0.94} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} receiveShadow>
            <planeGeometry args={[2.1, 2.8]} />
            <meshStandardMaterial color="#5c4b41" roughness={0.95} />
          </mesh>
        </group>
      );

    case 'welcome_mat':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.012, 0]} receiveShadow>
            <boxGeometry args={[1.1, 0.024, 0.65]} />
            <meshStandardMaterial color="#8c6d4a" roughness={0.96} />
          </mesh>
          <mesh position={[0, 0.025, 0]} receiveShadow>
            <boxGeometry args={[0.92, 0.006, 0.48]} />
            <meshStandardMaterial color="#59442e" roughness={0.95} />
          </mesh>
        </group>
      );

    case 'sofa':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {/* Wooden feet */}
          {[-0.96, 0.96].map((fx) =>
            [-0.36, 0.36].map((fz) => (
              <mesh key={`${fx}_${fz}`} position={[fx, 0.05, fz]} castShadow>
                <boxGeometry args={[0.07, 0.1, 0.07]} />
                <meshStandardMaterial color="#3c2c20" roughness={0.75} />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.16, 0.28, 0.9]} />
            <meshStandardMaterial color="#584b44" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.62, -0.34]} castShadow receiveShadow>
            <boxGeometry args={[2.16, 0.52, 0.22]} />
            <meshStandardMaterial color="#51453e" roughness={0.92} />
          </mesh>
          <mesh position={[-0.98, 0.46, 0.04]} castShadow>
            <boxGeometry args={[0.2, 0.36, 0.82]} />
            <meshStandardMaterial color="#4e423b" roughness={0.9} />
          </mesh>
          <mesh position={[0.98, 0.46, 0.04]} castShadow>
            <boxGeometry args={[0.2, 0.36, 0.82]} />
            <meshStandardMaterial color="#4e423b" roughness={0.9} />
          </mesh>
          {/* Seat cushions */}
          {[-0.58, 0, 0.58].map((cx) => (
            <mesh key={cx} position={[cx, 0.44, 0.06]} castShadow receiveShadow>
              <boxGeometry args={[0.56, 0.14, 0.68]} />
              <meshStandardMaterial color="#6a5a50" roughness={0.92} />
            </mesh>
          ))}
          {/* Accent throw pillows */}
          <mesh position={[-0.74, 0.64, -0.14]} rotation={[0.18, 0.3, 0.1]} castShadow>
            <boxGeometry args={[0.36, 0.34, 0.14]} />
            <meshStandardMaterial color="#8f5c47" roughness={0.92} />
          </mesh>
          <mesh position={[0.74, 0.64, -0.14]} rotation={[0.18, -0.28, -0.08]} castShadow>
            <boxGeometry args={[0.36, 0.34, 0.14]} />
            <meshStandardMaterial color="#52686e" roughness={0.92} />
          </mesh>
        </group>
      );

    case 'sectional_sofa':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {/* Main 3-seat back run */}
          <mesh position={[0, 0.24, -0.45]} castShadow receiveShadow>
            <boxGeometry args={[2.55, 0.32, 0.92]} />
            <meshStandardMaterial color="#525b61" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.62, -0.8]} castShadow receiveShadow>
            <boxGeometry args={[2.55, 0.5, 0.22]} />
            <meshStandardMaterial color="#4a5359" roughness={0.92} />
          </mesh>
          <mesh position={[-1.18, 0.46, -0.42]} castShadow>
            <boxGeometry args={[0.18, 0.36, 0.86]} />
            <meshStandardMaterial color="#464f55" roughness={0.9} />
          </mesh>
          {/* Chaise L-extension on right side */}
          <mesh position={[0.8, 0.24, 0.48]} castShadow receiveShadow>
            <boxGeometry args={[0.96, 0.32, 1.04]} />
            <meshStandardMaterial color="#525b61" roughness={0.9} />
          </mesh>
          <mesh position={[1.19, 0.46, 0.12]} castShadow>
            <boxGeometry args={[0.18, 0.36, 1.82]} />
            <meshStandardMaterial color="#464f55" roughness={0.9} />
          </mesh>
          {/* Cushions */}
          {[-0.78, 0.0, 0.78].map((cx) => (
            <mesh key={cx} position={[cx, 0.45, -0.38]} castShadow>
              <boxGeometry args={[0.74, 0.14, 0.68]} />
              <meshStandardMaterial color="#616b72" roughness={0.92} />
            </mesh>
          ))}
          <mesh position={[0.78, 0.45, 0.48]} castShadow>
            <boxGeometry args={[0.74, 0.14, 0.96]} />
            <meshStandardMaterial color="#616b72" roughness={0.92} />
          </mesh>
          {/* Throw pillows */}
          <mesh position={[-0.92, 0.66, -0.58]} rotation={[0.16, 0.3, 0.08]} castShadow>
            <boxGeometry args={[0.38, 0.34, 0.14]} />
            <meshStandardMaterial color="#b38854" roughness={0.9} />
          </mesh>
          <mesh position={[0.88, 0.66, -0.58]} rotation={[0.16, -0.25, -0.06]} castShadow>
            <boxGeometry args={[0.38, 0.34, 0.14]} />
            <meshStandardMaterial color="#8c5848" roughness={0.9} />
          </mesh>
        </group>
      );

    case 'armchair':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {[-0.36, 0.36].map((fx) =>
            [-0.34, 0.34].map((fz) => (
              <mesh key={`${fx}_${fz}`} position={[fx, 0.06, fz]} castShadow>
                <cylinderGeometry args={[0.03, 0.025, 0.12, 8]} />
                <meshStandardMaterial color="#443225" roughness={0.75} />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.32, 0.86]} />
            <meshStandardMaterial color="#705442" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.66, -0.32]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.56, 0.22]} />
            <meshStandardMaterial color="#684e3d" roughness={0.9} />
          </mesh>
          <mesh position={[-0.4, 0.48, 0.04]} castShadow>
            <boxGeometry args={[0.14, 0.34, 0.78]} />
            <meshStandardMaterial color="#614838" roughness={0.88} />
          </mesh>
          <mesh position={[0.4, 0.48, 0.04]} castShadow>
            <boxGeometry args={[0.14, 0.34, 0.78]} />
            <meshStandardMaterial color="#614838" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.48, 0.06]} castShadow>
            <boxGeometry args={[0.64, 0.12, 0.64]} />
            <meshStandardMaterial color="#80624f" roughness={0.92} />
          </mesh>
        </group>
      );

    case 'coffee_table':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.74, 0.06, 1.26]} />
            <meshStandardMaterial color="#5e4431" roughness={0.52} />
          </mesh>
          {/* Lower slatted shelf */}
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.035, 1.1]} />
            <meshStandardMaterial color="#523b2a" roughness={0.62} />
          </mesh>
          {[-0.3, 0.3].map((lx) =>
            [-0.54, 0.54].map((lz) => (
              <mesh key={`${lx}_${lz}`} position={[lx, 0.21, lz]} castShadow>
                <boxGeometry args={[0.06, 0.42, 0.06]} />
                <meshStandardMaterial color="#463122" roughness={0.65} />
              </mesh>
            )),
          )}
          {/* Coffee table books & ceramic mug */}
          <mesh position={[-0.08, 0.495, -0.22]} rotation={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.26, 0.045, 0.34]} />
            <meshStandardMaterial color="#4d6056" roughness={0.85} />
          </mesh>
          <mesh position={[0.12, 0.52, 0.24]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.1, 10]} />
            <meshStandardMaterial color="#d8cfc0" roughness={0.35} />
          </mesh>
        </group>
      );

    case 'tv_stand':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.65, 0.56, 0.48]} />
            <meshStandardMaterial color="#4c3b2e" roughness={0.65} />
          </mesh>
          {/* Media console doors */}
          {[-0.5, 0.5].map((dx) => (
            <mesh key={dx} position={[dx, 0.3, 0.245]}>
              <boxGeometry args={[0.56, 0.44, 0.02]} />
              <meshStandardMaterial color="#5c4738" roughness={0.68} />
            </mesh>
          ))}
          {/* Soundbar */}
          <mesh position={[0, 0.62, 0.1]} castShadow>
            <boxGeometry args={[0.92, 0.07, 0.09]} />
            <meshStandardMaterial color="#2a2d31" roughness={0.45} metalness={0.3} />
          </mesh>
          {/* Flatscreen TV stand + screen */}
          <mesh position={[0, 0.66, -0.02]}>
            <boxGeometry args={[0.38, 0.16, 0.08]} />
            <meshStandardMaterial color="#2a2d31" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.06, -0.02]} castShadow>
            <boxGeometry args={[1.38, 0.78, 0.07]} />
            <meshStandardMaterial color="#23262a" roughness={0.32} metalness={0.28} />
          </mesh>
          <mesh position={[0, 1.06, 0.02]}>
            <planeGeometry args={[1.28, 0.68]} />
            <meshStandardMaterial color="#181e26" roughness={0.1} metalness={0.38} />
          </mesh>
        </group>
      );

    case 'fireplace':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {/* Stone hearth base */}
          <mesh position={[0, 0.08, 0.08]} castShadow receiveShadow>
            <boxGeometry args={[1.88, 0.16, 0.88]} />
            <meshStandardMaterial color="#6e6a64" roughness={0.88} />
          </mesh>
          {/* Left & right brick/stone piers */}
          <mesh position={[-0.64, 0.72, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.48, 1.18, 0.68]} />
            <meshStandardMaterial color="#7d776f" roughness={0.9} />
          </mesh>
          <mesh position={[0.64, 0.72, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.48, 1.18, 0.68]} />
            <meshStandardMaterial color="#7d776f" roughness={0.9} />
          </mesh>
          {/* Firebox back wall */}
          <mesh position={[0, 0.72, -0.26]} receiveShadow>
            <boxGeometry args={[0.88, 1.18, 0.16]} />
            <meshStandardMaterial color="#2c2825" roughness={0.95} />
          </mesh>
          {/* Glowing firewood logs & embers */}
          <mesh position={[0, 0.24, 0.0]} rotation={[0, 0.25, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.56, 8]} />
            <meshStandardMaterial color="#3c281c" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.3, 0.04]} rotation={[0, -0.35, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.48, 8]} />
            <meshStandardMaterial color="#422a1c" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.28, 0.02]}>
            <dodecahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial
              color="#ff9933"
              emissive="#ff6a1a"
              emissiveIntensity={1.6}
              roughness={0.4}
            />
          </mesh>
          {/* Timber mantelpiece */}
          <mesh position={[0, 1.38, 0.04]} castShadow receiveShadow>
            <boxGeometry args={[1.92, 0.14, 0.76]} />
            <meshStandardMaterial color="#58402e" roughness={0.65} />
          </mesh>
          {/* Chimney breast rising above mantel */}
          <mesh position={[0, 2.52, -0.04]} castShadow receiveShadow>
            <boxGeometry args={[1.56, 2.18, 0.58]} />
            <meshStandardMaterial color="#878179" roughness={0.9} />
          </mesh>
          {/* Mantel clock & framed photo */}
          <mesh position={[0, 1.56, 0.1]} castShadow>
            <boxGeometry args={[0.32, 0.22, 0.1]} />
            <meshStandardMaterial color="#3d2c20" roughness={0.6} />
          </mesh>
        </group>
      );

    case 'floor_lamp':
      return (
        <group position={[spec.x, spec.y, spec.z]}>
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.21, 0.08, 12]} />
            <meshStandardMaterial color="#3e3934" metalness={0.5} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.84, 0]} castShadow>
            <cylinderGeometry args={[0.024, 0.028, 1.56, 8]} />
            <meshStandardMaterial color="#4f4842" metalness={0.52} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.66, 0]}>
            <cylinderGeometry args={[0.16, 0.25, 0.32, 12]} />
            <meshStandardMaterial
              color="#ece2ca"
              emissive="#ffcf86"
              emissiveIntensity={0.9}
              roughness={0.75}
            />
          </mesh>
        </group>
      );

    case 'ceiling_lamp':
      return (
        <group position={[spec.x, spec.y, spec.z]}>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.28, 0.3, 0.07, 12]} />
            <meshStandardMaterial color="#42464a" metalness={0.55} roughness={0.42} />
          </mesh>
          <mesh position={[0, -0.09, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 12]} />
            <meshStandardMaterial color="#fff3d6" emissive="#ffd99a" emissiveIntensity={1.4} roughness={0.3} />
          </mesh>
        </group>
      );

    case 'potted_plant':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {/* Terracotta planter pot */}
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.23, 0.17, 0.44, 12]} />
            <meshStandardMaterial color="#9c5c40" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.21, 0.21, 0.04, 12]} />
            <meshStandardMaterial color="#3c2e24" roughness={0.96} />
          </mesh>
          {/* Woody stem & lush layered low-poly leaves */}
          <mesh position={[0, 0.68, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.04, 0.56, 6]} />
            <meshStandardMaterial color="#594330" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.94, 0]} castShadow>
            <icosahedronGeometry args={[0.32, 0]} />
            <meshStandardMaterial color="#466942" roughness={0.86} flatShading />
          </mesh>
          <mesh position={[0.16, 1.12, -0.08]} castShadow>
            <icosahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color="#567d4e" roughness={0.86} flatShading />
          </mesh>
          <mesh position={[-0.14, 1.06, 0.12]} castShadow>
            <icosahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color="#3e5e3a" roughness={0.86} flatShading />
          </mesh>
        </group>
      );

    case 'porch_chair':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {[-0.28, 0.28].map((lx) =>
            [-0.26, 0.26].map((lz) => (
              <mesh key={`${lx}_${lz}`} position={[lx, 0.22, lz]} castShadow>
                <boxGeometry args={[0.055, 0.44, 0.055]} />
                <meshStandardMaterial color="#d2c9ba" roughness={0.76} />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.64, 0.06, 0.58]} />
            <meshStandardMaterial color="#d8d0c2" roughness={0.78} />
          </mesh>
          <mesh position={[0, 0.5, 0.02]} castShadow>
            <boxGeometry args={[0.56, 0.07, 0.5]} />
            <meshStandardMaterial color="#556b64" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.78, -0.26]} rotation={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.62, 0.58, 0.06]} />
            <meshStandardMaterial color="#d8d0c2" roughness={0.78} />
          </mesh>
          {[-0.3, 0.3].map((ax) => (
            <mesh key={ax} position={[ax, 0.62, 0.0]} castShadow>
              <boxGeometry args={[0.07, 0.05, 0.56]} />
              <meshStandardMaterial color="#d2c9ba" roughness={0.78} />
            </mesh>
          ))}
        </group>
      );

    case 'bookshelf':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.98, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.38, 1.96, 0.42]} />
            <meshStandardMaterial color="#5c4635" roughness={0.76} />
          </mesh>
          {[0.38, 0.78, 1.18, 1.58].map((sy, idx) => (
            <group key={sy} position={[0, sy, 0.06]}>
              <mesh position={[0, -0.04, 0]}>
                <boxGeometry args={[1.26, 0.04, 0.34]} />
                <meshStandardMaterial color="#4a3829" roughness={0.78} />
              </mesh>
              <mesh position={[-0.36 + (idx % 2) * 0.1, 0.1, 0.06]}>
                <boxGeometry args={[0.38, 0.24, 0.18]} />
                <meshStandardMaterial color={idx % 2 === 0 ? '#78463b' : '#435a66'} roughness={0.88} />
              </mesh>
              <mesh position={[0.04, 0.08, 0.06]}>
                <boxGeometry args={[0.24, 0.2, 0.18]} />
                <meshStandardMaterial color={idx % 2 === 0 ? '#8c7550' : '#63536b'} roughness={0.88} />
              </mesh>
              <mesh position={[0.34, 0.1, 0.06]}>
                <boxGeometry args={[0.32, 0.22, 0.18]} />
                <meshStandardMaterial color={idx % 2 === 0 ? '#5b684b' : '#7c6548'} roughness={0.88} />
              </mesh>
            </group>
          ))}
        </group>
      );

    case 'picture':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.22, 0.84, 0.05]} />
            <meshStandardMaterial color="#3c2e22" roughness={0.58} />
          </mesh>
          <mesh position={[0, 0, 0.028]}>
            <planeGeometry args={[1.06, 0.68]} />
            <meshStandardMaterial color="#d8d2c4" roughness={0.85} />
          </mesh>
          {/* Minimalist stylized landscape stripes inside frame */}
          <mesh position={[0, 0.12, 0.031]}>
            <planeGeometry args={[0.92, 0.3]} />
            <meshStandardMaterial color="#7d95a3" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.14, 0.031]}>
            <planeGeometry args={[0.92, 0.24]} />
            <meshStandardMaterial color="#5c7252" roughness={0.88} />
          </mesh>
        </group>
      );

    case 'kitchen_counter':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.56, 0.84, 0.66]} />
            <meshStandardMaterial color="#d2cbc0" roughness={0.72} />
          </mesh>
          {/* Cabinet doors & brushed handles */}
          {[-0.92, -0.31, 0.31, 0.92].map((cx) => (
            <group key={cx} position={[cx, 0.42, 0.335]}>
              <mesh>
                <boxGeometry args={[0.54, 0.7, 0.02]} />
                <meshStandardMaterial color="#c4bdb2" roughness={0.72} />
              </mesh>
              <mesh position={[0.18, 0.14, 0.02]}>
                <boxGeometry args={[0.025, 0.14, 0.025]} />
                <meshStandardMaterial color="#6e7378" metalness={0.8} roughness={0.28} />
              </mesh>
            </group>
          ))}
          {/* Granite countertop */}
          <mesh position={[0, 0.865, 0.01]} castShadow receiveShadow>
            <boxGeometry args={[2.62, 0.06, 0.7]} />
            <meshStandardMaterial color="#58544f" roughness={0.36} />
          </mesh>
          {/* Steel sink basin & gooseneck faucet */}
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[0.66, 0.02, 0.44]} />
            <meshStandardMaterial color="#9aa1a6" metalness={0.82} roughness={0.25} />
          </mesh>
          <mesh position={[0, 1.06, -0.22]}>
            <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
            <meshStandardMaterial color="#b4babf" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, 1.2, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.18, 8]} />
            <meshStandardMaterial color="#b4babf" metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Coffee maker on left counter */}
          <mesh position={[-0.92, 1.06, -0.08]} castShadow>
            <boxGeometry args={[0.24, 0.34, 0.26]} />
            <meshStandardMaterial color="#2f3236" roughness={0.4} metalness={0.35} />
          </mesh>
          {/* Cutting board & knife block on right */}
          <mesh position={[0.88, 0.91, 0.02]} castShadow>
            <boxGeometry args={[0.42, 0.03, 0.3]} />
            <meshStandardMaterial color="#a68158" roughness={0.78} />
          </mesh>
        </group>
      );

    case 'kitchen_island':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.43, -0.06]} castShadow receiveShadow>
            <boxGeometry args={[2.1, 0.86, 0.76]} />
            <meshStandardMaterial color="#546066" roughness={0.74} />
          </mesh>
          {/* Overhanging butcher-block / stone top */}
          <mesh position={[0, 0.89, 0.04]} castShadow receiveShadow>
            <boxGeometry args={[2.24, 0.07, 1.02]} />
            <meshStandardMaterial color="#ddd6c8" roughness={0.38} />
          </mesh>
          {/* Two tuck-under barstools */}
          {[-0.55, 0.55].map((sx) => (
            <group key={sx} position={[sx, 0, 0.42]}>
              <mesh position={[0, 0.62, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.18, 0.06, 12]} />
                <meshStandardMaterial color="#6e523a" roughness={0.65} />
              </mesh>
              <mesh position={[0, 0.3, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.04, 0.6, 8]} />
                <meshStandardMaterial color="#383c40" metalness={0.65} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.03, 0]}>
                <cylinderGeometry args={[0.18, 0.2, 0.04, 12]} />
                <meshStandardMaterial color="#383c40" metalness={0.65} roughness={0.4} />
              </mesh>
            </group>
          ))}
          {/* Fruit bowl on island */}
          <mesh position={[0, 0.98, -0.02]} castShadow>
            <cylinderGeometry args={[0.18, 0.11, 0.11, 12]} />
            <meshStandardMaterial color="#c4b8a6" roughness={0.4} />
          </mesh>
        </group>
      );

    case 'upper_cabinets':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 1.98, -0.14]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 0.78, 0.38]} />
            <meshStandardMaterial color="#d2cbc0" roughness={0.72} />
          </mesh>
          {[-0.9, -0.3, 0.3, 0.9].map((cx) => (
            <group key={cx} position={[cx, 1.98, 0.06]}>
              <mesh>
                <boxGeometry args={[0.54, 0.68, 0.02]} />
                <meshStandardMaterial color="#c6bfb4" roughness={0.72} />
              </mesh>
              <mesh position={[0.18, -0.18, 0.02]}>
                <boxGeometry args={[0.022, 0.12, 0.022]} />
                <meshStandardMaterial color="#6e7378" metalness={0.8} roughness={0.28} />
              </mesh>
            </group>
          ))}
        </group>
      );

    case 'stove':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.78, 0.9, 0.74]} />
            <meshStandardMaterial color="#d2cec6" roughness={0.4} metalness={0.25} />
          </mesh>
          <mesh position={[0, 1.02, -0.33]} castShadow>
            <boxGeometry args={[0.78, 0.26, 0.08]} />
            <meshStandardMaterial color="#c4c0b8" roughness={0.42} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0.4, 0.38]}>
            <boxGeometry args={[0.58, 0.44, 0.03]} />
            <meshStandardMaterial color="#25282c" roughness={0.2} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.68, 0.41]}>
            <boxGeometry args={[0.58, 0.03, 0.04]} />
            <meshStandardMaterial color="#9da2a8" metalness={0.85} roughness={0.25} />
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
          <mesh position={[0, 0.96, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.84, 1.92, 0.76]} />
            <meshStandardMaterial color="#cfd2d4" roughness={0.32} metalness={0.32} />
          </mesh>
          {/* French door seam */}
          <mesh position={[0, 1.24, 0.385]}>
            <boxGeometry args={[0.02, 1.2, 0.015]} />
            <meshStandardMaterial color="#585d62" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.62, 0.385]}>
            <boxGeometry args={[0.82, 0.02, 0.015]} />
            <meshStandardMaterial color="#585d62" roughness={0.5} />
          </mesh>
          {[-0.08, 0.08].map((hx) => (
            <mesh key={hx} position={[hx, 1.26, 0.41]}>
              <boxGeometry args={[0.03, 0.48, 0.04]} />
              <meshStandardMaterial color="#878b90" metalness={0.85} roughness={0.24} />
            </mesh>
          ))}
          <mesh position={[0, 0.52, 0.41]}>
            <boxGeometry args={[0.48, 0.03, 0.04]} />
            <meshStandardMaterial color="#878b90" metalness={0.85} roughness={0.24} />
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
            <boxGeometry args={[1.42, 0.07, 1.04]} />
            <meshStandardMaterial color="#6e5038" roughness={0.55} />
          </mesh>
          {[-0.6, 0.6].map((lx) =>
            [-0.42, 0.42].map((lz) => (
              <mesh key={`${lx}_${lz}`} position={[lx, 0.36, lz]} castShadow>
                <boxGeometry args={[0.07, 0.72, 0.07]} />
                <meshStandardMaterial color="#583f2b" roughness={0.68} />
              </mesh>
            )),
          )}
        </group>
      );

    case 'dining_set':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {/* Dining table */}
          <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.68, 0.07, 1.06]} />
            <meshStandardMaterial color="#6e5038" roughness={0.54} />
          </mesh>
          {[-0.72, 0.72].map((lx) =>
            [-0.42, 0.42].map((lz) => (
              <mesh key={`${lx}_${lz}`} position={[lx, 0.37, lz]} castShadow>
                <boxGeometry args={[0.075, 0.74, 0.075]} />
                <meshStandardMaterial color="#583f2b" roughness={0.65} />
              </mesh>
            )),
          )}
          {/* Table runner & centerpiece vase */}
          <mesh position={[0, 0.79, 0]}>
            <boxGeometry args={[1.4, 0.01, 0.32]} />
            <meshStandardMaterial color="#c8bfb0" roughness={0.92} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.22, 10]} />
            <meshStandardMaterial color="#516c70" roughness={0.35} />
          </mesh>
          {/* 4 tuck-in wooden dining chairs */}
          {[
            { x: -0.44, z: -0.68, rot: 0 },
            { x: 0.44, z: -0.68, rot: 0 },
            { x: -0.44, z: 0.68, rot: Math.PI },
            { x: 0.44, z: 0.68, rot: Math.PI },
          ].map((ch, idx) => (
            <group key={idx} position={[ch.x, 0, ch.z]} rotation={[0, ch.rot, 0]}>
              <mesh position={[0, 0.46, 0]} castShadow>
                <boxGeometry args={[0.46, 0.055, 0.44]} />
                <meshStandardMaterial color="#664b36" roughness={0.62} />
              </mesh>
              <mesh position={[0, 0.74, -0.19]} castShadow>
                <boxGeometry args={[0.44, 0.5, 0.05]} />
                <meshStandardMaterial color="#5d4330" roughness={0.64} />
              </mesh>
              {[-0.19, 0.19].map((lx) =>
                [-0.18, 0.18].map((lz) => (
                  <mesh key={`${lx}_${lz}`} position={[lx, 0.22, lz]} castShadow>
                    <boxGeometry args={[0.045, 0.44, 0.045]} />
                    <meshStandardMaterial color="#503a28" roughness={0.68} />
                  </mesh>
                )),
              )}
            </group>
          ))}
        </group>
      );

    case 'sideboard':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.64, 0.78, 0.48]} />
            <meshStandardMaterial color="#644a35" roughness={0.64} />
          </mesh>
          {[-0.72, 0.72].map((lx) =>
            [-0.18, 0.18].map((lz) => (
              <mesh key={`${lx}_${lz}`} position={[lx, 0.05, lz]}>
                <boxGeometry args={[0.06, 0.1, 0.06]} />
                <meshStandardMaterial color="#4a3524" roughness={0.7} />
              </mesh>
            )),
          )}
          {[-0.5, 0, 0.5].map((dx) => (
            <mesh key={dx} position={[dx, 0.46, 0.248]}>
              <boxGeometry args={[0.46, 0.64, 0.02]} />
              <meshStandardMaterial color="#73563e" roughness={0.64} />
            </mesh>
          ))}
          {/* Decorative table lamp & ceramic tray */}
          <mesh position={[-0.52, 0.96, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.12, 0.22, 10]} />
            <meshStandardMaterial color="#c8beac" roughness={0.4} />
          </mesh>
          <mesh position={[-0.52, 1.18, 0]}>
            <cylinderGeometry args={[0.13, 0.18, 0.22, 10]} />
            <meshStandardMaterial color="#ece1c8" emissive="#ffd185" emissiveIntensity={0.6} roughness={0.78} />
          </mesh>
        </group>
      );

    case 'bed_double':
    case 'bed_single': {
      const bw = spec.kind === 'bed_double' ? 1.76 : 1.16;
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[bw, 0.36, 2.04]} />
            <meshStandardMaterial color="#564131" roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.68, -0.98]} castShadow>
            <boxGeometry args={[bw + 0.1, 0.98, 0.09]} />
            <meshStandardMaterial color="#4b382a" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.48, 0.06]} castShadow receiveShadow>
            <boxGeometry args={[bw - 0.08, 0.2, 1.88]} />
            <meshStandardMaterial color="#d8d2c6" roughness={0.92} />
          </mesh>
          <mesh position={[0, 0.51, 0.26]} castShadow>
            <boxGeometry args={[bw - 0.04, 0.18, 1.38]} />
            <meshStandardMaterial
              color={spec.kind === 'bed_double' ? '#4f5f6b' : '#65594b'}
              roughness={0.94}
            />
          </mesh>
          {/* Folded throw blanket at foot of bed */}
          <mesh position={[0, 0.54, 0.72]} castShadow>
            <boxGeometry args={[bw - 0.02, 0.15, 0.44]} />
            <meshStandardMaterial
              color={spec.kind === 'bed_double' ? '#8b6852' : '#506458'}
              roughness={0.94}
            />
          </mesh>
          <mesh position={[spec.kind === 'bed_double' ? -0.4 : 0, 0.62, -0.68]} castShadow>
            <boxGeometry args={[0.62, 0.14, 0.38]} />
            <meshStandardMaterial color="#e5dfd3" roughness={0.9} />
          </mesh>
          {spec.kind === 'bed_double' && (
            <mesh position={[0.4, 0.62, -0.68]} castShadow>
              <boxGeometry args={[0.62, 0.14, 0.38]} />
              <meshStandardMaterial color="#e5dfd3" roughness={0.9} />
            </mesh>
          )}
        </group>
      );
    }

    case 'nightstand':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.31, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.56, 0.62, 0.46]} />
            <meshStandardMaterial color="#5c4635" roughness={0.68} />
          </mesh>
          {[0.18, 0.44].map((dy) => (
            <mesh key={dy} position={[0, dy, 0.24]}>
              <boxGeometry args={[0.46, 0.2, 0.02]} />
              <meshStandardMaterial color="#6b523e" roughness={0.68} />
            </mesh>
          ))}
          {/* Warm bedside lamp */}
          <mesh position={[0, 0.72, -0.02]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.2, 10]} />
            <meshStandardMaterial color="#8f785c" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.9, -0.02]}>
            <cylinderGeometry args={[0.1, 0.15, 0.18, 10]} />
            <meshStandardMaterial color="#f0e4cb" emissive="#ffd188" emissiveIntensity={0.75} roughness={0.78} />
          </mesh>
        </group>
      );

    case 'wardrobe':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.48, 2.1, 0.62]} />
            <meshStandardMaterial color="#594332" roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.12, 0.02]} castShadow>
            <boxGeometry args={[1.56, 0.08, 0.66]} />
            <meshStandardMaterial color="#4b3829" roughness={0.68} />
          </mesh>
          {[-0.35, 0.35].map((dx) => (
            <group key={dx} position={[dx, 1.04, 0.315]}>
              <mesh>
                <boxGeometry args={[0.66, 1.9, 0.02]} />
                <meshStandardMaterial color="#684f3c" roughness={0.68} />
              </mesh>
              <mesh position={[dx > 0 ? -0.24 : 0.24, 0, 0.025]}>
                <boxGeometry args={[0.028, 0.22, 0.028]} />
                <meshStandardMaterial color="#b49a60" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      );

    case 'dresser':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.28, 0.96, 0.52]} />
            <meshStandardMaterial color="#614a37" roughness={0.68} />
          </mesh>
          {[0.24, 0.52, 0.78].map((dy) => (
            <group key={dy} position={[0, dy, 0.27]}>
              <mesh>
                <boxGeometry args={[1.1, 0.2, 0.03]} />
                <meshStandardMaterial color="#523e2d" roughness={0.7} />
              </mesh>
              {[-0.32, 0.32].map((kx) => (
                <mesh key={kx} position={[kx, 0, 0.025]}>
                  <sphereGeometry args={[0.022, 6, 6]} />
                  <meshStandardMaterial color="#c2a765" metalness={0.8} roughness={0.3} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );

    case 'desk':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.3, 0.06, 0.64]} />
            <meshStandardMaterial color="#6a523e" roughness={0.6} />
          </mesh>
          <mesh position={[-0.58, 0.36, 0]} castShadow>
            <boxGeometry args={[0.1, 0.72, 0.58]} />
            <meshStandardMaterial color="#4e3d2f" roughness={0.7} />
          </mesh>
          <mesh position={[0.52, 0.36, 0]} castShadow>
            <boxGeometry args={[0.26, 0.72, 0.58]} />
            <meshStandardMaterial color="#4e3d2f" roughness={0.7} />
          </mesh>
          {/* Desk lamp */}
          <mesh position={[-0.42, 0.94, -0.16]} castShadow>
            <cylinderGeometry args={[0.02, 0.06, 0.34, 8]} />
            <meshStandardMaterial color="#3c4045" metalness={0.65} roughness={0.38} />
          </mesh>
        </group>
      );

    case 'computer_desk':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.46, 0.06, 0.7]} />
            <meshStandardMaterial color="#634d3a" roughness={0.58} />
          </mesh>
          <mesh position={[-0.64, 0.37, 0]} castShadow>
            <boxGeometry args={[0.08, 0.74, 0.62]} />
            <meshStandardMaterial color="#3c4044" metalness={0.5} roughness={0.48} />
          </mesh>
          <mesh position={[0.54, 0.37, 0]} castShadow>
            <boxGeometry args={[0.32, 0.74, 0.62]} />
            <meshStandardMaterial color="#4c3b2d" roughness={0.68} />
          </mesh>
          {/* Ultrawide Monitor + Keyboard + PC Tower */}
          <mesh position={[0, 0.88, -0.14]}>
            <boxGeometry args={[0.16, 0.22, 0.06]} />
            <meshStandardMaterial color="#2f3338" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.06, -0.12]} castShadow>
            <boxGeometry args={[0.76, 0.42, 0.04]} />
            <meshStandardMaterial color="#23262b" roughness={0.35} />
          </mesh>
          <mesh position={[0, 1.06, -0.095]}>
            <planeGeometry args={[0.7, 0.36]} />
            <meshStandardMaterial color="#264054" emissive="#2a5270" emissiveIntensity={0.55} roughness={0.18} />
          </mesh>
          <mesh position={[0, 0.79, 0.14]}>
            <boxGeometry args={[0.42, 0.025, 0.15]} />
            <meshStandardMaterial color="#2c3035" roughness={0.55} />
          </mesh>
          <mesh position={[-0.48, 0.98, -0.08]} castShadow>
            <boxGeometry args={[0.22, 0.42, 0.42]} />
            <meshStandardMaterial color="#2b2f35" metalness={0.45} roughness={0.42} />
          </mesh>
          {/* Swivel desk chair tucked in */}
          <group position={[0, 0, 0.48]}>
            <mesh position={[0, 0.44, 0]} castShadow>
              <boxGeometry args={[0.48, 0.08, 0.46]} />
              <meshStandardMaterial color="#3c444c" roughness={0.82} />
            </mesh>
            <mesh position={[0, 0.76, 0.2]} castShadow>
              <boxGeometry args={[0.46, 0.58, 0.07]} />
              <meshStandardMaterial color="#3c444c" roughness={0.82} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.42, 8]} />
              <meshStandardMaterial color="#303438" metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.26, 0.28, 0.05, 10]} />
              <meshStandardMaterial color="#303438" metalness={0.7} roughness={0.35} />
            </mesh>
          </group>
        </group>
      );

    case 'easel':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {/* A-frame wooden legs */}
          <mesh position={[-0.24, 0.85, 0.12]} rotation={[0.14, 0, -0.1]} castShadow>
            <boxGeometry args={[0.05, 1.72, 0.05]} />
            <meshStandardMaterial color="#876644" roughness={0.78} />
          </mesh>
          <mesh position={[0.24, 0.85, 0.12]} rotation={[0.14, 0, 0.1]} castShadow>
            <boxGeometry args={[0.05, 1.72, 0.05]} />
            <meshStandardMaterial color="#876644" roughness={0.78} />
          </mesh>
          <mesh position={[0, 0.82, -0.28]} rotation={[-0.28, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 1.66, 0.05]} />
            <meshStandardMaterial color="#78593a" roughness={0.78} />
          </mesh>
          {/* Shelf ledge & painted canvas */}
          <mesh position={[0, 0.82, 0.2]} castShadow>
            <boxGeometry args={[0.88, 0.05, 0.12]} />
            <meshStandardMaterial color="#78593a" roughness={0.75} />
          </mesh>
          <mesh position={[0, 1.24, 0.15]} rotation={[-0.14, 0, 0]} castShadow>
            <boxGeometry args={[0.78, 0.82, 0.04]} />
            <meshStandardMaterial color="#ece5d5" roughness={0.86} />
          </mesh>
          <mesh position={[0, 1.24, 0.175]} rotation={[-0.14, 0, 0]}>
            <planeGeometry args={[0.66, 0.68]} />
            <meshStandardMaterial color="#7b968e" roughness={0.88} />
          </mesh>
        </group>
      );

    case 'piano':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {/* Upright piano body */}
          <mesh position={[0, 0.64, -0.14]} castShadow receiveShadow>
            <boxGeometry args={[1.52, 1.28, 0.42]} />
            <meshStandardMaterial color="#2f241d" roughness={0.28} metalness={0.12} />
          </mesh>
          {/* Keybed projection */}
          <mesh position={[0, 0.72, 0.16]} castShadow>
            <boxGeometry args={[1.48, 0.14, 0.34]} />
            <meshStandardMaterial color="#2f241d" roughness={0.28} />
          </mesh>
          {/* Ivory & ebony keyboard strip */}
          <mesh position={[0, 0.795, 0.18]}>
            <boxGeometry args={[1.34, 0.03, 0.22]} />
            <meshStandardMaterial color="#ede8dd" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.815, 0.13]}>
            <boxGeometry args={[1.28, 0.025, 0.1]} />
            <meshStandardMaterial color="#1f2022" roughness={0.3} />
          </mesh>
          {/* Sheet music stand */}
          <mesh position={[0, 1.02, 0.09]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.56, 0.32, 0.02]} />
            <meshStandardMaterial color="#f2eee4" roughness={0.85} />
          </mesh>
          {/* Piano bench */}
          <mesh position={[0, 0.48, 0.66]} castShadow>
            <boxGeometry args={[0.88, 0.08, 0.36]} />
            <meshStandardMaterial color="#382a22" roughness={0.45} />
          </mesh>
          {[-0.36, 0.36].map((bx) =>
            [0.54, 0.78].map((bz) => (
              <mesh key={`${bx}_${bz}`} position={[bx, 0.24, bz]} castShadow>
                <boxGeometry args={[0.055, 0.48, 0.055]} />
                <meshStandardMaterial color="#2f241d" roughness={0.4} />
              </mesh>
            )),
          )}
        </group>
      );

    case 'bathtub':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.88, 0.6, 1.78]} />
            <meshStandardMaterial color="#e2dfd7" roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.44, 0]}>
            <boxGeometry args={[0.68, 0.36, 1.56]} />
            <meshStandardMaterial color="#cac7bf" roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.72, -0.82]}>
            <cylinderGeometry args={[0.025, 0.025, 0.26, 8]} />
            <meshStandardMaterial color="#aeb4b9" metalness={0.85} roughness={0.22} />
          </mesh>
        </group>
      );

    case 'vanity':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.12, 0.84, 0.54]} />
            <meshStandardMaterial color="#cbc5ba" roughness={0.62} />
          </mesh>
          <mesh position={[0, 0.86, 0]}>
            <boxGeometry args={[1.16, 0.05, 0.58]} />
            <meshStandardMaterial color="#e4e0d8" roughness={0.28} />
          </mesh>
          <mesh position={[0, 1.48, -0.24]}>
            <boxGeometry args={[0.92, 0.82, 0.04]} />
            <meshStandardMaterial color="#a6b6bf" metalness={0.85} roughness={0.12} />
          </mesh>
        </group>
      );

    case 'toilet':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.22, 0.06]} castShadow>
            <cylinderGeometry args={[0.2, 0.16, 0.44, 12]} />
            <meshStandardMaterial color="#e5e2da" roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.58, -0.18]} castShadow>
            <boxGeometry args={[0.42, 0.44, 0.22]} />
            <meshStandardMaterial color="#e5e2da" roughness={0.22} />
          </mesh>
        </group>
      );

    case 'hamper':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.52, 0.68, 0.42]} />
            <meshStandardMaterial color="#9e8564" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[0.55, 0.05, 0.45]} />
            <meshStandardMaterial color="#877052" roughness={0.86} />
          </mesh>
        </group>
      );

    case 'workbench':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.06, 0.08, 0.74]} />
            <meshStandardMaterial color="#7d6144" roughness={0.76} />
          </mesh>
          {[-0.92, 0.92].map((lx) => (
            <mesh key={lx} position={[lx, 0.42, 0]} castShadow>
              <boxGeometry args={[0.1, 0.84, 0.66]} />
              <meshStandardMaterial color="#464a4e" metalness={0.5} roughness={0.52} />
            </mesh>
          ))}
          {/* Pegboard back + bench vise */}
          <mesh position={[0, 1.38, -0.34]}>
            <boxGeometry args={[1.94, 0.88, 0.05]} />
            <meshStandardMaterial color="#594a3b" roughness={0.85} />
          </mesh>
          <mesh position={[0.72, 0.96, 0.28]} castShadow>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
            <meshStandardMaterial color="#3c5a70" metalness={0.65} roughness={0.4} />
          </mesh>
        </group>
      );

    case 'tool_chest':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.54, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 1.04, 0.56]} />
            <meshStandardMaterial color="#85392d" metalness={0.45} roughness={0.42} />
          </mesh>
          {[0.24, 0.46, 0.68, 0.9].map((dy) => (
            <mesh key={dy} position={[0, dy, 0.29]}>
              <boxGeometry args={[0.94, 0.04, 0.03]} />
              <meshStandardMaterial color="#b4babf" metalness={0.82} roughness={0.28} />
            </mesh>
          ))}
        </group>
      );

    case 'tires_stack':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {[0.14, 0.41, 0.68].map((ty, idx) => (
            <group key={ty} position={[idx === 2 ? 0.04 : 0, ty, idx === 1 ? -0.03 : 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.36, 0.36, 0.25, 16]} />
                <meshStandardMaterial color="#232528" roughness={0.92} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[0.2, 0.2, 0.26, 12]} />
                <meshStandardMaterial color="#7d848a" metalness={0.75} roughness={0.35} />
              </mesh>
            </group>
          ))}
        </group>
      );

    case 'bicycle':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {/* Front & rear wheels */}
          {[-0.56, 0.56].map((wx) => (
            <mesh key={wx} position={[wx, 0.36, 0]} castShadow>
              <torusGeometry args={[0.33, 0.045, 8, 18]} />
              <meshStandardMaterial color="#242629" roughness={0.9} />
            </mesh>
          ))}
          {/* Tubular frame */}
          <mesh position={[0, 0.58, 0]} rotation={[0, 0, 0.14]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.94, 8]} />
            <meshStandardMaterial color="#426a7a" metalness={0.5} roughness={0.38} />
          </mesh>
          <mesh position={[-0.24, 0.62, 0]} rotation={[0, 0, -0.55]} castShadow>
            <cylinderGeometry args={[0.024, 0.024, 0.72, 8]} />
            <meshStandardMaterial color="#426a7a" metalness={0.5} roughness={0.38} />
          </mesh>
          <mesh position={[0.42, 0.68, 0]} rotation={[0, 0, 0.25]} castShadow>
            <cylinderGeometry args={[0.024, 0.024, 0.74, 8]} />
            <meshStandardMaterial color="#426a7a" metalness={0.5} roughness={0.38} />
          </mesh>
          {/* Handlebars & seat */}
          <mesh position={[0.34, 1.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.54, 8]} />
            <meshStandardMaterial color="#3c4045" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[-0.18, 0.94, 0]}>
            <boxGeometry args={[0.24, 0.06, 0.14]} />
            <meshStandardMaterial color="#342b26" roughness={0.85} />
          </mesh>
        </group>
      );

    case 'shelf':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          {[-0.7, 0.7].map((lx) => (
            <mesh key={lx} position={[lx, 0.92, 0]} castShadow>
              <boxGeometry args={[0.06, 1.84, 0.48]} />
              <meshStandardMaterial color="#494c50" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          {[0.3, 0.86, 1.42, 1.78].map((sy, idx) => (
            <group key={sy} position={[0, sy, 0]}>
              <mesh castShadow>
                <boxGeometry args={[1.44, 0.05, 0.48]} />
                <meshStandardMaterial color="#756048" roughness={0.8} />
              </mesh>
              {idx < 3 && (
                <>
                  <mesh position={[-0.36, 0.18, 0]} castShadow>
                    <boxGeometry args={[0.38, 0.3, 0.34]} />
                    <meshStandardMaterial color={idx === 1 ? '#4a6070' : '#80664a'} roughness={0.85} />
                  </mesh>
                  <mesh position={[0.28, 0.15, 0.02]} castShadow>
                    <cylinderGeometry args={[0.11, 0.11, 0.24, 10]} />
                    <meshStandardMaterial color={idx === 0 ? '#8c4438' : '#58684c'} roughness={0.6} />
                  </mesh>
                </>
              )}
            </group>
          ))}
        </group>
      );

    case 'shelter_hatch':
      // Hinged steel trapdoor lid is rendered directly in HouseView so it animates cleanly with openProgress
      return null;

    case 'safe':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.84, 1.12, 0.8]} />
            <meshStandardMaterial color="#343b42" metalness={0.72} roughness={0.38} />
          </mesh>
          <mesh position={[0, 0.58, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.05, 16]} />
            <meshStandardMaterial color="#c2a058" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      );

    case 'generator':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.22, 0.78, 0.78]} />
            <meshStandardMaterial color="#844e36" metalness={0.4} roughness={0.52} />
          </mesh>
          <mesh position={[-0.36, 0.88, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.14, 0.24, 12]} />
            <meshStandardMaterial color="#383c40" metalness={0.75} roughness={0.38} />
          </mesh>
          <mesh position={[0.42, 0.56, 0.4]}>
            <boxGeometry args={[0.3, 0.24, 0.04]} />
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

    case 'bunker_cot':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.08, 1.98]} />
            <meshStandardMaterial color="#5c624e" roughness={0.92} />
          </mesh>
          {[-0.42, 0.42].map((lx) =>
            [-0.86, 0.86].map((lz) => (
              <mesh key={`${lx}_${lz}`} position={[lx, 0.19, lz]} castShadow>
                <boxGeometry args={[0.05, 0.38, 0.05]} />
                <meshStandardMaterial color="#42464a" metalness={0.6} roughness={0.45} />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.46, -0.72]} castShadow>
            <boxGeometry args={[0.56, 0.12, 0.32]} />
            <meshStandardMaterial color="#c8c2b4" roughness={0.9} />
          </mesh>
        </group>
      );

    case 'supply_locker':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.96, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.96, 1.92, 0.56]} />
            <meshStandardMaterial color="#535d58" metalness={0.55} roughness={0.48} />
          </mesh>
          {[-0.22, 0.22].map((dx) => (
            <group key={dx} position={[dx, 0.96, 0.285]}>
              <mesh>
                <boxGeometry args={[0.42, 1.8, 0.02]} />
                <meshStandardMaterial color="#4a544f" metalness={0.55} roughness={0.48} />
              </mesh>
              <mesh position={[0, 0.56, 0.015]}>
                <boxGeometry args={[0.28, 0.12, 0.01]} />
                <meshStandardMaterial color="#2a2f2c" roughness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      );

    case 'radio_desk':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.38, 0.06, 0.68]} />
            <meshStandardMaterial color="#58544e" metalness={0.4} roughness={0.55} />
          </mesh>
          {[-0.6, 0.6].map((lx) =>
            [-0.26, 0.26].map((lz) => (
              <mesh key={`${lx}_${lz}`} position={[lx, 0.36, lz]} castShadow>
                <boxGeometry args={[0.06, 0.72, 0.06]} />
                <meshStandardMaterial color="#3c4044" metalness={0.6} roughness={0.45} />
              </mesh>
            )),
          )}
          {/* Shortwave radio transceiver with glowing frequency dial */}
          <mesh position={[-0.22, 0.94, -0.06]} castShadow>
            <boxGeometry args={[0.56, 0.34, 0.34]} />
            <meshStandardMaterial color="#35393e" metalness={0.55} roughness={0.42} />
          </mesh>
          <mesh position={[-0.22, 0.98, 0.115]}>
            <planeGeometry args={[0.38, 0.1]} />
            <meshStandardMaterial color="#9cd984" emissive="#6ab854" emissiveIntensity={1.2} roughness={0.25} />
          </mesh>
          {/* Antenna mast */}
          <mesh position={[-0.42, 1.38, -0.14]}>
            <cylinderGeometry args={[0.008, 0.014, 0.62, 6]} />
            <meshStandardMaterial color="#aeb4ba" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Blueprint map scroll */}
          <mesh position={[0.36, 0.785, 0.04]} rotation={[0, 0.2, 0]}>
            <boxGeometry args={[0.44, 0.015, 0.32]} />
            <meshStandardMaterial color="#486e8a" roughness={0.85} />
          </mesh>
        </group>
      );

    case 'water_barrel':
      return (
        <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotationY, 0]}>
          <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.96, 14]} />
            <meshStandardMaterial color="#3c6282" roughness={0.45} metalness={0.12} />
          </mesh>
          {[0.24, 0.72].map((ry) => (
            <mesh key={ry} position={[0, ry, 0]}>
              <cylinderGeometry args={[0.315, 0.315, 0.05, 14]} />
              <meshStandardMaterial color="#2e4f6b" roughness={0.5} />
            </mesh>
          ))}
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
