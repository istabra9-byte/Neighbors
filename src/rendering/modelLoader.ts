/**
 * Optional glTF/GLB + Draco asset override loader.
 * Allows swapping procedural characters, vehicles, or furniture with downloaded CC0 GLB models
 * later without changing gameplay code. Always falls back seamlessly to procedural meshes.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export type AssetSlotKey =
  | 'character_player'
  | 'character_neighbor'
  | 'vehicle_sedan'
  | 'vehicle_wagon'
  | 'furniture_sofa'
  | 'furniture_bed';

const overrideUrls = new Map<AssetSlotKey, string>();
const loadedCache = new Map<string, THREE.Group>();
const failedCache = new Set<string>();

let sharedLoader: GLTFLoader | null = null;

function getGltfLoader(): GLTFLoader {
  if (!sharedLoader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const gltf = new GLTFLoader();
    gltf.setDRACOLoader(draco);
    sharedLoader = gltf;
  }
  return sharedLoader;
}

/** Register an optional CC0 .glb/.gltf URL to replace a procedural mesh slot. */
export function registerModelOverride(key: AssetSlotKey, url: string): void {
  overrideUrls.set(key, url);
}

/** Loads a registered GLB override if configured; returns null to trigger procedural fallback. */
export async function loadOptionalModel(key: AssetSlotKey): Promise<THREE.Group | null> {
  const url = overrideUrls.get(key);
  if (!url || failedCache.has(url)) return null;

  const cached = loadedCache.get(url);
  if (cached) return cached.clone(true);

  try {
    const loader = getGltfLoader();
    const gltf = await loader.loadAsync(url);
    const root = gltf.scene;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    loadedCache.set(url, root);
    return root.clone(true);
  } catch {
    failedCache.add(url);
    return null;
  }
}
