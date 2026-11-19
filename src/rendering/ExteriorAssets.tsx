/**
 * Rich composite exterior street & backyard asset renderers for Neighborhood Wars.
 * Includes 3 distinct parked vehicle styles (sedan, pickup, SUV), backyard patio sets
 * with umbrellas, charcoal BBQ grills, garden sheds, raised planters, birdbaths,
 * street signs, flower beds, and trash + recycling bin pairs.
 */

import * as THREE from 'three';
import type {
  FlowerBedProp,
  ParkedCarProp,
  StreetSignProp,
  YardPropSpec,
} from '../world/streetProps';

/** Composite parked vehicle supporting sedan, pickup truck, and SUV silhouettes. */
export function ParkedVehicle({
  car,
  isNight,
  shadowTex,
}: {
  car: ParkedCarProp;
  isNight: boolean;
  shadowTex: THREE.CanvasTexture;
}) {
  const isPickup = car.variant === 'pickup';
  const isSuv = car.variant === 'suv';
  const bodyLen = isPickup ? 4.85 : isSuv ? 4.55 : 4.35;
  const bodyW = isPickup ? 1.94 : 1.88;
  const bodyH = isPickup ? 0.72 : isSuv ? 0.68 : 0.6;
  const wheelY = isPickup || isSuv ? 0.37 : 0.33;
  const wheelR = isPickup || isSuv ? 0.37 : 0.33;
  const axleZ = isPickup ? 1.54 : 1.38;

  return (
    <group position={car.pos} rotation={[0, car.rotY, 0]}>
      {/* Grounded radial contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[bodyW + 0.65, bodyLen + 0.55]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.72} />
      </mesh>

      {/* Main lower chassis */}
      <mesh position={[0, wheelY + bodyH * 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyW, bodyH, bodyLen]} />
        <meshStandardMaterial color={car.color} roughness={0.34} metalness={0.34} />
      </mesh>

      {/* Cabin / Roofline based on vehicle variant */}
      {isPickup ? (
        <>
          {/* Front crew cab */}
          <mesh position={[0, wheelY + bodyH + 0.25, 0.55]} castShadow receiveShadow>
            <boxGeometry args={[bodyW - 0.14, 0.62, 1.72]} />
            <meshStandardMaterial color={car.color} roughness={0.34} metalness={0.34} />
          </mesh>
          {/* Windshield & rear cab glass */}
          <mesh position={[0, wheelY + bodyH + 0.24, 1.42]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[bodyW - 0.28, 0.48, 0.06]} />
            <meshStandardMaterial color="#29343e" roughness={0.1} metalness={0.5} />
          </mesh>
          <mesh position={[0, wheelY + bodyH + 0.24, -0.32]}>
            <boxGeometry args={[bodyW - 0.28, 0.46, 0.05]} />
            <meshStandardMaterial color="#29343e" roughness={0.1} metalness={0.5} />
          </mesh>
          {/* Open dark-lined truck bed */}
          <mesh position={[0, wheelY + bodyH * 0.78, -1.35]} receiveShadow>
            <boxGeometry args={[bodyW - 0.24, 0.12, 1.88]} />
            <meshStandardMaterial color="#2b2e31" roughness={0.88} />
          </mesh>
          {/* Bed side walls */}
          {[-bodyW / 2 + 0.08, bodyW / 2 - 0.08].map((bx) => (
            <mesh key={bx} position={[bx, wheelY + bodyH * 0.92, -1.35]} castShadow>
              <boxGeometry args={[0.14, 0.24, 1.96]} />
              <meshStandardMaterial color={car.color} roughness={0.36} metalness={0.32} />
            </mesh>
          ))}
        </>
      ) : isSuv ? (
        <>
          {/* Long SUV cabin + roof rails */}
          <mesh position={[0, wheelY + bodyH + 0.24, -0.32]} castShadow receiveShadow>
            <boxGeometry args={[bodyW - 0.16, 0.62, 2.86]} />
            <meshStandardMaterial color={car.color} roughness={0.32} metalness={0.35} />
          </mesh>
          <mesh position={[0, wheelY + bodyH + 0.24, 1.12]} rotation={[-0.22, 0, 0]}>
            <boxGeometry args={[bodyW - 0.3, 0.48, 0.06]} />
            <meshStandardMaterial color="#27323b" roughness={0.1} metalness={0.5} />
          </mesh>
          <mesh position={[0, wheelY + bodyH + 0.24, -1.76]} rotation={[0.14, 0, 0]}>
            <boxGeometry args={[bodyW - 0.3, 0.46, 0.06]} />
            <meshStandardMaterial color="#27323b" roughness={0.1} metalness={0.5} />
          </mesh>
          {/* Roof luggage rails */}
          {[-0.66, 0.66].map((rx) => (
            <mesh key={rx} position={[rx, wheelY + bodyH + 0.59, -0.32]}>
              <boxGeometry args={[0.06, 0.07, 2.35]} />
              <meshStandardMaterial color="#383c40" metalness={0.65} roughness={0.38} />
            </mesh>
          ))}
        </>
      ) : (
        <>
          {/* Classic sedan cabin */}
          <mesh position={[0, wheelY + bodyH + 0.2, -0.18]} castShadow receiveShadow>
            <boxGeometry args={[bodyW - 0.22, 0.54, 2.25]} />
            <meshStandardMaterial color={car.color} roughness={0.32} metalness={0.35} />
          </mesh>
          <mesh position={[0, wheelY + bodyH + 0.2, 0.96]} rotation={[-0.24, 0, 0]}>
            <boxGeometry args={[bodyW - 0.34, 0.44, 0.06]} />
            <meshStandardMaterial color="#27323b" roughness={0.1} metalness={0.5} />
          </mesh>
          <mesh position={[0, wheelY + bodyH + 0.2, -1.32]} rotation={[0.24, 0, 0]}>
            <boxGeometry args={[bodyW - 0.36, 0.44, 0.06]} />
            <meshStandardMaterial color="#27323b" roughness={0.1} metalness={0.5} />
          </mesh>
        </>
      )}

      {/* Side windows */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            side * ((isPickup ? bodyW - 0.12 : isSuv ? bodyW - 0.14 : bodyW - 0.2) / 2),
            wheelY + bodyH + 0.22,
            isPickup ? 0.55 : isSuv ? -0.32 : -0.18,
          ]}
        >
          <boxGeometry args={[0.03, 0.42, isPickup ? 1.45 : isSuv ? 2.52 : 1.98]} />
          <meshStandardMaterial color="#27323b" roughness={0.1} metalness={0.5} />
        </mesh>
      ))}

      {/* Bumpers & front grille */}
      <mesh position={[0, wheelY + 0.02, bodyLen / 2 + 0.04]} castShadow>
        <boxGeometry args={[bodyW + 0.04, 0.22, 0.14]} />
        <meshStandardMaterial color="#2f3235" roughness={0.75} />
      </mesh>
      <mesh position={[0, wheelY + 0.02, -bodyLen / 2 - 0.04]} castShadow>
        <boxGeometry args={[bodyW + 0.04, 0.22, 0.14]} />
        <meshStandardMaterial color="#2f3235" roughness={0.75} />
      </mesh>
      <mesh position={[0, wheelY + 0.28, bodyLen / 2 + 0.02]}>
        <boxGeometry args={[0.84, 0.22, 0.04]} />
        <meshStandardMaterial color="#24272a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Headlights & taillights */}
      {[-0.66, 0.66].map((hx) => (
        <mesh key={`hl_${hx}`} position={[hx, wheelY + 0.32, bodyLen / 2 + 0.02]}>
          <boxGeometry args={[0.34, 0.16, 0.05]} />
          <meshStandardMaterial
            color="#f4efd8"
            emissive="#ffe29c"
            emissiveIntensity={isNight ? 1.8 : 0.1}
            roughness={0.15}
          />
        </mesh>
      ))}
      {[-0.68, 0.68].map((hx) => (
        <mesh key={`tl_${hx}`} position={[hx, wheelY + 0.32, -bodyLen / 2 - 0.02]}>
          <boxGeometry args={[0.32, 0.14, 0.05]} />
          <meshStandardMaterial
            color="#8e2c24"
            emissive="#c43225"
            emissiveIntensity={isNight ? 1.4 : 0.1}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* 4 Wheels with alloy rims */}
      {[-bodyW / 2 - 0.02, bodyW / 2 + 0.02].map((wx) =>
        [-axleZ, axleZ].map((wz) => (
          <group key={`w_${wx}_${wz}`} position={[wx, wheelY, wz]} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[wheelR, wheelR, 0.25, 14]} />
              <meshStandardMaterial color="#202224" roughness={0.92} />
            </mesh>
            <mesh>
              <cylinderGeometry args={[wheelR * 0.56, wheelR * 0.56, 0.27, 12]} />
              <meshStandardMaterial color="#8f969c" metalness={0.76} roughness={0.28} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

/** Backyard & side-yard lifestyle props: patio sets, BBQ grills, sheds, planters, birdbaths. */
export function YardPropMesh({ prop }: { prop: YardPropSpec }) {
  switch (prop.kind) {
    case 'patio_set':
      return (
        <group position={[prop.x, 0, prop.z]} rotation={[0, prop.rotY, 0]}>
          {/* Paver patio pad */}
          <mesh position={[0, 0.02, 0]} receiveShadow>
            <cylinderGeometry args={[1.95, 2.0, 0.04, 16]} />
            <meshStandardMaterial color="#b2aca2" roughness={0.88} />
          </mesh>
          {/* Round patio table */}
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.72, 0.72, 0.06, 16]} />
            <meshStandardMaterial color="#68503c" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.37, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.14, 0.72, 10]} />
            <meshStandardMaterial color="#3c4045" metalness={0.6} roughness={0.42} />
          </mesh>
          {/* Market patio umbrella */}
          <mesh position={[0, 1.56, 0]} castShadow>
            <cylinderGeometry args={[0.032, 0.032, 2.38, 8]} />
            <meshStandardMaterial color="#484d52" metalness={0.65} roughness={0.4} />
          </mesh>
          <mesh position={[0, 2.52, 0]} castShadow receiveShadow>
            <coneGeometry args={[1.55, 0.56, 8]} />
            <meshStandardMaterial color={prop.color ?? '#8c4b3c'} roughness={0.86} />
          </mesh>
          {/* 3 patio chairs around table */}
          {[0, 2.1, 4.2].map((ang, idx) => (
            <group
              key={idx}
              position={[Math.sin(ang) * 1.12, 0.04, Math.cos(ang) * 1.12]}
              rotation={[0, ang + Math.PI, 0]}
            >
              <mesh position={[0, 0.44, 0]} castShadow>
                <boxGeometry args={[0.48, 0.055, 0.46]} />
                <meshStandardMaterial color="#735a44" roughness={0.75} />
              </mesh>
              <mesh position={[0, 0.72, -0.2]} rotation={[0.12, 0, 0]} castShadow>
                <boxGeometry args={[0.46, 0.5, 0.05]} />
                <meshStandardMaterial color="#735a44" roughness={0.75} />
              </mesh>
              {[-0.2, 0.2].map((lx) =>
                [-0.18, 0.18].map((lz) => (
                  <mesh key={`${lx}_${lz}`} position={[lx, 0.22, lz]} castShadow>
                    <boxGeometry args={[0.04, 0.44, 0.04]} />
                    <meshStandardMaterial color="#383c40" metalness={0.6} roughness={0.45} />
                  </mesh>
                )),
              )}
            </group>
          ))}
        </group>
      );

    case 'bbq_grill':
      return (
        <group position={[prop.x, 0, prop.z]} rotation={[0, prop.rotY, 0]}>
          {/* Wheeled steel cart frame */}
          {[-0.36, 0.36].map((lx) =>
            [-0.24, 0.24].map((lz) => (
              <mesh key={`${lx}_${lz}`} position={[lx, 0.42, lz]} castShadow>
                <boxGeometry args={[0.045, 0.82, 0.045]} />
                <meshStandardMaterial color="#383c40" metalness={0.65} roughness={0.42} />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.24, 0]} receiveShadow>
            <boxGeometry args={[0.76, 0.04, 0.5]} />
            <meshStandardMaterial color="#383c40" metalness={0.6} roughness={0.45} />
          </mesh>
          {/* Charcoal grill barrel & domed hood */}
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.84, 0.26, 0.54]} />
            <meshStandardMaterial color="#25282c" metalness={0.65} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.06, -0.02]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.82, 12, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#202327" metalness={0.7} roughness={0.35} />
          </mesh>
          {/* Side prep shelves */}
          {[-0.58, 0.58].map((sx) => (
            <mesh key={sx} position={[sx, 0.88, 0]} castShadow>
              <boxGeometry args={[0.32, 0.04, 0.46]} />
              <meshStandardMaterial color="#8c6d4d" roughness={0.76} />
            </mesh>
          ))}
        </group>
      );

    case 'garden_shed':
      return (
        <group position={[prop.x, 0, prop.z]} rotation={[0, prop.rotY, 0]}>
          {/* Concrete pad */}
          <mesh position={[0, 0.04, 0]} receiveShadow>
            <boxGeometry args={[3.4, 0.08, 2.7]} />
            <meshStandardMaterial color="#aca79e" roughness={0.9} />
          </mesh>
          {/* Timber shed walls */}
          <mesh position={[0, 1.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.1, 2.2, 2.4]} />
            <meshStandardMaterial color={prop.color ?? '#7b6650'} roughness={0.86} />
          </mesh>
          {/* Pitched dual-slope roof */}
          <mesh position={[-0.88, 2.54, 0]} rotation={[0, 0, 0.34]} castShadow receiveShadow>
            <boxGeometry args={[1.92, 0.12, 2.72]} />
            <meshStandardMaterial color="#484b4e" roughness={0.86} />
          </mesh>
          <mesh position={[0.88, 2.54, 0]} rotation={[0, 0, -0.34]} castShadow receiveShadow>
            <boxGeometry args={[1.92, 0.12, 2.72]} />
            <meshStandardMaterial color="#484b4e" roughness={0.86} />
          </mesh>
          {/* Double barn doors */}
          {[-0.4, 0.4].map((dx) => (
            <mesh key={dx} position={[dx, 0.98, 1.22]} castShadow>
              <boxGeometry args={[0.74, 1.84, 0.06]} />
              <meshStandardMaterial color="#594635" roughness={0.84} />
            </mesh>
          ))}
          {/* Side shed window */}
          <mesh position={[1.57, 1.38, 0]}>
            <boxGeometry args={[0.06, 0.64, 0.72]} />
            <meshStandardMaterial color="#ded8cb" roughness={0.7} />
          </mesh>
          <mesh position={[1.59, 1.38, 0]}>
            <boxGeometry args={[0.04, 0.52, 0.6]} />
            <meshStandardMaterial color="#58707d" roughness={0.2} metalness={0.3} />
          </mesh>
        </group>
      );

    case 'raised_planter':
      return (
        <group position={[prop.x, 0, prop.z]} rotation={[0, prop.rotY, 0]}>
          <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.1, 0.48, 0.92]} />
            <meshStandardMaterial color="#7b5e42" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.45, 0]} receiveShadow>
            <boxGeometry args={[1.92, 0.08, 0.74]} />
            <meshStandardMaterial color="#47372a" roughness={0.96} />
          </mesh>
          {[-0.65, -0.2, 0.25, 0.68].map((px, idx) => (
            <group key={px} position={[px, 0.54, (idx % 2 === 0 ? 1 : -1) * 0.1]}>
              <mesh castShadow>
                <icosahedronGeometry args={[0.18 + (idx % 2) * 0.04, 0]} />
                <meshStandardMaterial color={idx % 2 === 0 ? '#4d7344' : '#5e854d'} roughness={0.9} flatShading />
              </mesh>
              <mesh position={[0, 0.16, 0]}>
                <dodecahedronGeometry args={[0.075, 0]} />
                <meshStandardMaterial
                  color={['#c95c48', '#d4a644', '#a85a82', '#d47c48'][idx % 4]}
                  roughness={0.85}
                />
              </mesh>
            </group>
          ))}
        </group>
      );

    case 'birdbath':
      return (
        <group position={[prop.x, 0, prop.z]}>
          <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.28, 0.34, 0.16, 10]} />
            <meshStandardMaterial color="#a6a198" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.15, 0.68, 10]} />
            <meshStandardMaterial color="#aba69d" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.38, 0.16, 0.14, 12]} />
            <meshStandardMaterial color="#b3aea5" roughness={0.84} />
          </mesh>
          <mesh position={[0, 0.91, 0]}>
            <cylinderGeometry args={[0.31, 0.31, 0.03, 12]} />
            <meshStandardMaterial color="#6b8ea3" roughness={0.12} metalness={0.25} />
          </mesh>
        </group>
      );
  }
}

/** Timber-edged front flower bed with varied blossoms. */
export function FlowerBedMesh({ bed }: { bed: FlowerBedProp }) {
  return (
    <group position={[bed.x, 0, bed.z]} rotation={[0, bed.rotY, 0]}>
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[bed.width, 0.18, 0.82]} />
        <meshStandardMaterial color="#6e543d" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <boxGeometry args={[bed.width - 0.14, 0.08, 0.66]} />
        <meshStandardMaterial color="#463628" roughness={0.96} />
      </mesh>
      {Array.from({ length: Math.max(3, Math.floor(bed.width / 0.55)) }).map((_, idx, arr) => {
        const t = arr.length === 1 ? 0 : idx / (arr.length - 1) - 0.5;
        const fx = t * (bed.width - 0.48);
        const fz = (idx % 2 === 0 ? 1 : -1) * 0.12;
        const blossomColors = ['#c95446', '#d9ad48', '#b5638e', '#e0864a', '#7c6bb0'];
        return (
          <group key={idx} position={[fx, 0.26, fz]}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.17, 0]} />
              <meshStandardMaterial color="#4c7042" roughness={0.92} flatShading />
            </mesh>
            <mesh position={[0, 0.14, 0]}>
              <dodecahedronGeometry args={[0.085, 0]} />
              <meshStandardMaterial color={blossomColors[(idx + bed.colorIndex) % blossomColors.length]} roughness={0.82} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Neighborhood street signs (stop sign & green Maple Crescent name blades). */
export function StreetSignMesh({ sign }: { sign: StreetSignProp }) {
  return (
    <group position={[sign.x, 0.14, sign.z]} rotation={[0, sign.rotY, 0]}>
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.038, 0.042, 3.1, 8]} />
        <meshStandardMaterial color="#72787e" metalness={0.7} roughness={0.38} />
      </mesh>
      {sign.kind === 'stop' ? (
        <mesh position={[0, 2.55, 0.05]} rotation={[Math.PI / 2, Math.PI / 8, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.04, 8]} />
          <meshStandardMaterial color="#a63228" roughness={0.45} metalness={0.2} />
        </mesh>
      ) : (
        <>
          <mesh position={[0, 2.86, 0]} castShadow>
            <boxGeometry args={[0.96, 0.2, 0.04]} />
            <meshStandardMaterial color="#2f6b47" roughness={0.48} metalness={0.18} />
          </mesh>
          <mesh position={[0, 3.04, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[0.84, 0.18, 0.04]} />
            <meshStandardMaterial color="#2f6b47" roughness={0.48} metalness={0.18} />
          </mesh>
        </>
      )}
    </group>
  );
}
