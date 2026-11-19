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
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);

  // Studio PBR environment reflection via RoomEnvironment (runs on GPU & software WebGL)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.45;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      envRT.dispose();
    };
  }, [gl, scene]);

  // Configure far-distance fog so near & midground stay razor sharp
  useEffect(() => {
    scene.fog = new THREE.Fog('#c7d5de', 105, 240);
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
          // Subtle high-altitude atmospheric wisps (never hazy)
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

  useFrame(() => {
    const sim = simRef.current;
    const t = sim.state.timeOfDay; // 0..24
    const player = sim.getLocalPlayer();

    // Sun angle: 06:00 sunrise (0), 12:00 zenith (PI/2), 18:00 sunset (PI)
    const sunAngle = ((t - 6) / 24) * Math.PI * 2;
    const sunElevation = Math.sin(sunAngle); // -1..1
    const sunHorizontal = Math.cos(sunAngle);
    const orbitR = 175;

    const sx = sunHorizontal * orbitR;
    const sy = sunElevation * orbitR;
    const sz = -45;

    if (sunMeshRef.current) {
      sunMeshRef.current.position.set(sx, sy, sz);
      sunMeshRef.current.visible = sunElevation > -0.08;
    }
    if (moonMeshRef.current) {
      moonMeshRef.current.position.set(-sx, -sy, 45);
      moonMeshRef.current.visible = sunElevation < 0.1;
    }

    // Smooth day / dusk / night color blend
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

    // Update Directional Key Light (follows player smoothly for crisp shadow resolution)
    const dir = dirLightRef.current;
    if (dir && player) {
      const useSun = sunElevation >= 0;
      const lx = useSun ? sunHorizontal * 46 : -sunHorizontal * 42;
      const ly = Math.max(12, Math.abs(sunElevation) * 52 + 10);
      const lz = useSun ? -22 : 22;

      dir.position.set(player.position.x + lx, ly, player.position.z + lz);
      dir.target.position.set(player.position.x, 0, player.position.z);
      dir.target.updateMatrixWorld();

      if (useSun) {
        _sunColor.copy(SUN_GOLDEN).lerp(SUN_NOON, THREE.MathUtils.smoothstep(sunElevation, 0.02, 0.4));
        dir.color.copy(_sunColor);
        dir.intensity = THREE.MathUtils.lerp(0.65, 2.35, dayFactor);
      } else {
        dir.color.copy(MOON_LIGHT);
        dir.intensity = 0.52;
      }

      if (dir.shadow.mapSize.width !== shadowMapSize) {
        dir.shadow.mapSize.set(shadowMapSize, shadowMapSize);
        dir.shadow.map?.dispose();
        dir.shadow.map = null;
      }
    }

    // Cool sky / warm ground hemisphere fill
    const hemi = hemiLightRef.current;
    if (hemi) {
      _hemiSky.set('#a8c4dc').lerp(_zenith, 0.45);
      _hemiGround.set('#4c4439').lerp(NIGHT_ZENITH, (1 - dayFactor) * 0.65);
      hemi.color.copy(_hemiSky);
      hemi.groundColor.copy(_hemiGround);
      hemi.intensity = THREE.MathUtils.lerp(0.32, 0.85, dayFactor);
    }

    scene.environmentIntensity = THREE.MathUtils.lerp(0.18, 0.46, dayFactor);
  });

  return (
    <group>
      {/* Gradient Sky Dome */}
      <mesh scale={[240, 240, 240]} frustumCulled={false}>
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

      {/* Primary Key Light (shadows follow player tightly) */}
      <directionalLight
        ref={dirLightRef}
        castShadow={!isSoftwareGl}
        intensity={2.1}
        color="#fff2dc"
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-near={2}
        shadow-camera-far={130}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.0005}
        shadow-normalBias={0.025}
      />

      {/* Cool Sky / Ground Fill */}
      <hemisphereLight ref={hemiLightRef} args={['#9ec0dc', '#4c4439', 0.8]} />
    </group>
  );
}
