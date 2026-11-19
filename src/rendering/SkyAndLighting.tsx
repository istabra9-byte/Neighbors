/**
 * Continuous Day/Night cycle sky dome, sun & moon orbs, RoomEnvironment PBR reflections,
 * warm directional sun/moon light with player-following soft shadow frustum,
 * cool hemisphere fill, and sharp far-distance horizon fog.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { GameSimulation } from '../simulation/simulation';
import type { QualityPreset } from '../storage/localSettings';

interface SkyAndLightingProps {
  simRef: React.MutableRefObject<GameSimulation>;
  quality: QualityPreset;
  isSoftwareGl: boolean;
}

const _zenith = new THREE.Color();
const _horizon = new THREE.Color();
const _sunColor = new THREE.Color();
const _hemiSky = new THREE.Color();
const _hemiGround = new THREE.Color();

const DAY_ZENITH = new THREE.Color('#5a86b3');
const DAY_HORIZON = new THREE.Color('#c7d5de');
const DUSK_ZENITH = new THREE.Color('#34425c');
const DUSK_HORIZON = new THREE.Color('#c8855c');
const NIGHT_ZENITH = new THREE.Color('#0c1220');
const NIGHT_HORIZON = new THREE.Color('#1d2738');

const SUN_NOON = new THREE.Color('#fff4df');
const SUN_GOLDEN = new THREE.Color('#f5a664');
const MOON_LIGHT = new THREE.Color('#8baad6');

export function SkyAndLighting({ simRef, quality, isSoftwareGl }: SkyAndLightingProps) {
  const { scene, gl } = useThree();
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const interiorFillRef = useRef<THREE.PointLight>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);

  // Studio PBR environment reflection via RoomEnvironment (runs on GPU & software WebGL)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.54;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      envRT.dispose();
    };
  }, [gl, scene]);

  // Configure far-distance fog so near & midground stay razor sharp
  useEffect(() => {
    scene.fog = new THREE.Fog('#c7d5de', 120, 275);
    scene.background = new THREE.Color('#c7d5de');
  }, [scene]);

  const skyShader = useMemo(
    () => ({
      uniforms: {
        uZenith: { value: DAY_ZENITH.clone() },
        uHorizon: { value: DAY_HORIZON.clone() },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        varying vec3 vWorldDir;
        void main() {
          float h = clamp(vWorldDir.y, 0.0, 1.0);
          float blend = pow(h, 0.52);
          vec3 col = mix(uHorizon, uZenith, blend);
          float band = sin(vWorldDir.x * 7.0 + vWorldDir.z * 5.0) * sin(vWorldDir.z * 9.0 - vWorldDir.x * 4.0);
          float cloudMask = smoothstep(0.45, 0.88, band) * smoothstep(0.08, 0.25, h) * (1.0 - smoothstep(0.45, 0.78, h));
          col = mix(col, mix(uHorizon, vec3(0.95, 0.94, 0.91), 0.55), cloudMask * 0.24);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
    [],
  );

  const shadowMapSize = quality === 'high' ? 2048 : quality === 'medium' ? 1024 : 512;

  useFrame((_, delta) => {
    const sim = simRef.current;
    const t = sim.state.timeOfDay; // 0..24
    const player = sim.getLocalPlayer();

    // Sun angle: 06:00 sunrise (0), 12:00 zenith (PI/2), 18:00 sunset (PI)
    const sunAngle = ((t - 6) / 24) * Math.PI * 2;
    const sunElevation = Math.sin(sunAngle); // -1..1
    const sunHorizontal = Math.cos(sunAngle);
    const orbitR = 185;

    const sx = sunHorizontal * orbitR;
    const sy = sunElevation * orbitR;
    const sz = -48;

    if (sunMeshRef.current) {
      sunMeshRef.current.position.set(sx, sy, sz);
      sunMeshRef.current.visible = sunElevation > -0.08;
    }
    if (moonMeshRef.current) {
      moonMeshRef.current.position.set(-sx, -sy, 48);
      moonMeshRef.current.visible = sunElevation < 0.1;
    }

    const dayFactor = THREE.MathUtils.smoothstep(sunElevation, -0.1, 0.28);
    const duskFactor = Math.exp(-Math.pow((sunElevation - 0.05) / 0.18, 2));

    _zenith.copy(NIGHT_ZENITH).lerp(DAY_ZENITH, dayFactor).lerp(DUSK_ZENITH, duskFactor * 0.65);
    _horizon.copy(NIGHT_HORIZON).lerp(DAY_HORIZON, dayFactor).lerp(DUSK_HORIZON, duskFactor * 0.72);

    if (skyMatRef.current) {
      skyMatRef.current.uniforms.uZenith.value.copy(_zenith);
      skyMatRef.current.uniforms.uHorizon.value.copy(_horizon);
    }
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(_horizon);
    }
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(_horizon);
    }

    // Attenuate surface daylight inside underground tunnels so lanterns & headlamp pop
    const undergroundTunnel = Boolean(player && player.inTunnel && !player.inShelter);
    const surfaceMult = undergroundTunnel ? 0.12 : 1.0;

    // Update Directional Key Light (follows player smoothly with crisp, acne-free shadow bias)
    const dir = dirLightRef.current;
    if (dir && player) {
      const useSun = sunElevation >= 0;
      const lx = useSun ? sunHorizontal * 48 : -sunHorizontal * 44;
      const ly = Math.max(16, Math.abs(sunElevation) * 56 + 14);
      const lz = useSun ? -26 : 26;

      dir.position.set(player.position.x + lx, ly, player.position.z + lz);
      dir.target.position.set(player.position.x, 0, player.position.z);
      dir.target.updateMatrixWorld();

      if (useSun) {
        _sunColor.copy(SUN_GOLDEN).lerp(SUN_NOON, THREE.MathUtils.smoothstep(sunElevation, 0.02, 0.4));
        dir.color.copy(_sunColor);
        dir.intensity = THREE.MathUtils.lerp(0.75, 2.45, dayFactor) * surfaceMult;
      } else {
        dir.color.copy(MOON_LIGHT);
        dir.intensity = 0.58 * surfaceMult;
      }

      if (dir.shadow.mapSize.width !== shadowMapSize) {
        dir.shadow.mapSize.set(shadowMapSize, shadowMapSize);
        dir.shadow.map?.dispose();
        dir.shadow.map = null;
      }
    }

    // Cool sky / warm ground hemisphere fill (lifted ground fill prevents black porch posts & harsh corners)
    const hemi = hemiLightRef.current;
    if (hemi) {
      _hemiSky.set('#b4cee3').lerp(_zenith, 0.42);
      _hemiGround.set('#62594d').lerp(NIGHT_ZENITH, (1 - dayFactor) * 0.62);
      hemi.color.copy(_hemiSky);
      hemi.groundColor.copy(_hemiGround);
      hemi.intensity = undergroundTunnel ? 0.24 : THREE.MathUtils.lerp(0.42, 0.96, dayFactor);
    }

    // Soft warm interior architectural fill when player walks indoors (non-shadow-casting, 1 light budget)
    const fill = interiorFillRef.current;
    if (fill && player) {
      const indoors = Boolean(player.insideHouseId && !player.inShelter && !player.inTunnel && player.currentFloor <= 1);
      const targetIntensity = indoors ? THREE.MathUtils.lerp(2.4, 1.35, dayFactor) : 0;
      fill.intensity += (targetIntensity - fill.intensity) * Math.min(1, delta * 6);
      fill.position.set(player.position.x, player.position.y + 2.45, player.position.z);
      fill.visible = fill.intensity > 0.02;
    }

    scene.environmentIntensity = undergroundTunnel ? 0.14 : THREE.MathUtils.lerp(0.24, 0.56, dayFactor);
  });

  return (
    <group>
      {/* Gradient Sky Dome */}
      <mesh scale={[270, 270, 270]} frustumCulled={false}>
        <sphereGeometry args={[1, 24, 16]} />
        <shaderMaterial
          ref={skyMatRef}
          args={[skyShader]}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* Sun Disc */}
      <mesh ref={sunMeshRef}>
        <sphereGeometry args={[7.5, 16, 16]} />
        <meshBasicMaterial color="#fff1c4" fog={false} />
      </mesh>

      {/* Moon Disc */}
      <mesh ref={moonMeshRef}>
        <sphereGeometry args={[5.2, 16, 16]} />
        <meshBasicMaterial color="#d8e3f2" fog={false} />
      </mesh>

      {/* Primary Key Light (shadows follow player tightly with crisp acne-free bias) */}
      <directionalLight
        ref={dirLightRef}
        castShadow={!isSoftwareGl}
        intensity={2.2}
        color="#fff3de"
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-near={2}
        shadow-camera-far={145}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.00025}
        shadow-normalBias={0.038}
      />

      {/* Cool Sky / Warm Ground Hemisphere Fill */}
      <hemisphereLight ref={hemiLightRef} args={['#b4cee3', '#62594d', 0.92]} />

      {/* Warm Interior Room Bounce Fill (active only inside houses) */}
      <pointLight
        ref={interiorFillRef}
        color="#ffedd4"
        intensity={0}
        distance={18}
        decay={1.8}
        visible={false}
      />
    </group>
  );
}
