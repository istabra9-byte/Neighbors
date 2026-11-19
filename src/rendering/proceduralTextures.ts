/**
 * Procedural PBR texture generator (zero external files).
 * Generates tileable Color (SRGB), Normal, and Roughness maps via HTML5 2D Canvas
 * with realistic mortar, wood grain, grime, weathering, and subtle corner AO.
 */

import * as THREE from 'three';

export interface ProceduralTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export type SurfaceTextureKind =
  | 'brick'
  | 'siding'
  | 'plaster'
  | 'asphalt'
  | 'concrete'
  | 'grass'
  | 'dirt'
  | 'woodFloor'
  | 'tile'
  | 'roof';

/** Deterministic pseudo-random helper purely for canvas texture noise. */
function hash2d(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Converts a grayscale height canvas into a tangent-space RGB normal map texture. */
function heightCanvasToNormalTexture(
  heightCanvas: HTMLCanvasElement,
  strength: number,
  repeatX: number,
  repeatY: number,
  anisotropy: number,
): THREE.CanvasTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d')!;
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sample = (x: number, y: number) => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return srcData[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hL = sample(x - 1, y);
      const hR = sample(x + 1, y);
      const hU = sample(x, y - 1);
      const hD = sample(x, y + 1);
      const dx = (hL - hR) * strength;
      const dy = (hU - hD) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((dx * invLen * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  outCtx.putImageData(outImg, 0, 0);

  const tex = new THREE.CanvasTexture(outCanvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  anisotropy: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function addSurfaceGrime(ctx: CanvasRenderingContext2D, size: number, seed: number, alpha: number): void {
  for (let i = 0; i < 420; i++) {
    const x = hash2d(i, 1, seed) * size;
    const y = hash2d(i, 2, seed) * size;
    const r = 1.5 + hash2d(i, 3, seed) * 7;
    const dark = hash2d(i, 4, seed) > 0.45;
    ctx.fillStyle = dark
      ? `rgba(22, 18, 15, ${alpha * (0.4 + hash2d(i, 5, seed) * 0.6)})`
      : `rgba(215, 208, 194, ${alpha * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function buildTextureSet(kind: SurfaceTextureKind, anisotropy: number): ProceduralTextureSet {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const c = colorCanvas.getContext('2d')!;

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const h = heightCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const r = roughCanvas.getContext('2d')!;

  let normalStrength = 2.0;
  let repX = 2;
  let repY = 2;

  switch (kind) {
    case 'brick': {
      // Neutral light-greyscale brick so material.color tints cleanly per house palette
      c.fillStyle = '#9c958b';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#404040';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#e0e0e0';
      r.fillRect(0, 0, size, size);

      const rows = 8;
      const cols = 4;
      const rh = size / rows;
      const cw = size / cols;
      const mortar = 3;

      for (let row = 0; row < rows; row++) {
        const offset = (row % 2) * (cw / 2);
        for (let col = -1; col <= cols; col++) {
          const bx = col * cw + offset + mortar / 2;
          const by = row * rh + mortar / 2;
          const bw = cw - mortar;
          const bh = rh - mortar;
          const v = 0.84 + hash2d(col + 10, row + 20, 11) * 0.24;
          const base = Math.round(212 * v);
          c.fillStyle = `rgb(${base}, ${Math.round(base * 0.96)}, ${Math.round(base * 0.92)})`;
          c.fillRect(bx, by, bw, bh);

          // Subtle top highlight + bottom AO edge on each brick
          c.fillStyle = 'rgba(255,255,255,0.08)';
          c.fillRect(bx, by, bw, 2);
          c.fillStyle = 'rgba(20,14,10,0.14)';
          c.fillRect(bx, by + bh - 3, bw, 3);

          const hVal = Math.round(180 + hash2d(col, row, 12) * 55);
          h.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
          h.fillRect(bx, by, bw, bh);

          const rVal = Math.round(170 + hash2d(col, row, 13) * 45);
          r.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
          r.fillRect(bx, by, bw, bh);
        }
      }
      addSurfaceGrime(c, size, 14, 0.08);
      normalStrength = 2.6;
      repX = 3;
      repY = 2;
      break;
    }

    case 'siding': {
      c.fillStyle = '#dcd9d2';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#b0b0b0';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#c8c8c8';
      r.fillRect(0, 0, size, size);

      const planks = 10;
      const ph = size / planks;
      for (let i = 0; i < planks; i++) {
        const y = i * ph;
        const grad = c.createLinearGradient(0, y, 0, y + ph);
        const shade = Math.round(218 + hash2d(i, 2, 21) * 20);
        grad.addColorStop(0, `rgb(${shade},${shade},${shade - 2})`);
        grad.addColorStop(0.84, `rgb(${shade - 12},${shade - 12},${shade - 14})`);
        grad.addColorStop(1, `rgb(${shade - 52},${shade - 52},${shade - 54})`);
        c.fillStyle = grad;
        c.fillRect(0, y, size, ph);

        // Height bevel for horizontal clapboard overlap
        const hGrad = h.createLinearGradient(0, y, 0, y + ph);
        hGrad.addColorStop(0, '#c8c8c8');
        hGrad.addColorStop(0.85, '#f0f0f0');
        hGrad.addColorStop(1, '#303030');
        h.fillStyle = hGrad;
        h.fillRect(0, y, size, ph);

        // Subtle horizontal wood grain streaks
        c.fillStyle = 'rgba(40,35,30,0.05)';
        for (let g = 0; g < 6; g++) {
          const gy = y + hash2d(i, g, 22) * (ph - 4);
          c.fillRect(0, gy, size, 1);
        }
      }
      addSurfaceGrime(c, size, 23, 0.05);
      normalStrength = 2.2;
      repX = 2;
      repY = 2;
      break;
    }

    case 'plaster': {
      c.fillStyle = '#e5e0d6';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#808080';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#dadada';
      r.fillRect(0, 0, size, size);

      for (let i = 0; i < 1600; i++) {
        const x = hash2d(i, 1, 31) * size;
        const y = hash2d(i, 2, 31) * size;
        const rad = 1 + hash2d(i, 3, 31) * 4;
        const lum = Math.round(215 + (hash2d(i, 4, 31) - 0.5) * 32);
        c.fillStyle = `rgba(${lum},${lum - 2},${lum - 6},0.22)`;
        c.fillRect(x, y, rad, rad);

        const hv = Math.round(115 + hash2d(i, 5, 31) * 40);
        h.fillStyle = `rgba(${hv},${hv},${hv},0.35)`;
        h.fillRect(x, y, rad, rad);
      }
      addSurfaceGrime(c, size, 32, 0.07);
      normalStrength = 1.4;
      repX = 2;
      repY = 2;
      break;
    }

    case 'asphalt': {
      c.fillStyle = '#36393d';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#7c7c7c';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#d4d4d4';
      r.fillRect(0, 0, size, size);

      // Mineral grit & aggregate
      for (let i = 0; i < 4500; i++) {
        const x = hash2d(i, 1, 41) * size;
        const y = hash2d(i, 2, 41) * size;
        const v = Math.round(38 + hash2d(i, 3, 41) * 46);
        c.fillStyle = `rgb(${v},${v + 1},${v + 2})`;
        c.fillRect(x, y, 2, 2);

        const hv = Math.round(90 + hash2d(i, 4, 41) * 80);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.fillRect(x, y, 2, 2);
      }
      // Subtle weathered tar cracks
      c.strokeStyle = 'rgba(18, 19, 21, 0.65)';
      c.lineWidth = 1.5;
      h.strokeStyle = '#222222';
      h.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        let px = hash2d(k, 1, 42) * size;
        let py = hash2d(k, 2, 42) * size;
        c.beginPath();
        h.beginPath();
        c.moveTo(px, py);
        h.moveTo(px, py);
        for (let s = 0; s < 10; s++) {
          px += (hash2d(k, s + 10, 42) - 0.5) * 28;
          py += hash2d(k, s + 30, 42) * 22;
          c.lineTo(px, py);
          h.lineTo(px, py);
        }
        c.stroke();
        h.stroke();
      }
      normalStrength = 1.8;
      repX = 16;
      repY = 2;
      break;
    }

    case 'concrete': {
      c.fillStyle = '#a8a59e';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#909090';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#d8d8d8';
      r.fillRect(0, 0, size, size);

      addSurfaceGrime(c, size, 51, 0.08);
      // Expansion seam grid
      c.strokeStyle = 'rgba(42, 40, 38, 0.45)';
      c.lineWidth = 2;
      c.strokeRect(1, 1, size - 2, size - 2);
      c.beginPath();
      c.moveTo(size / 2, 0);
      c.lineTo(size / 2, size);
      c.stroke();

      h.strokeStyle = '#303030';
      h.lineWidth = 3;
      h.strokeRect(1, 1, size - 2, size - 2);
      normalStrength = 1.5;
      repX = 3;
      repY = 3;
      break;
    }

    case 'grass': {
      // Grounded, slightly desaturated suburban lawn (crisp high-frequency blades)
      c.fillStyle = '#586b46';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#7d7d7d';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#ececec';
      r.fillRect(0, 0, size, size);

      // Subtle clover & dry-turf variation
      for (let i = 0; i < 110; i++) {
        const x = hash2d(i, 1, 61) * size;
        const y = hash2d(i, 2, 61) * size;
        const rad = 8 + hash2d(i, 3, 61) * 20;
        c.fillStyle =
          hash2d(i, 4, 61) > 0.48
            ? 'rgba(72, 88, 53, 0.24)'
            : 'rgba(104, 98, 66, 0.16)';
        c.beginPath();
        c.arc(x, y, rad, 0, Math.PI * 2);
        c.fill();
      }
      // Fine high-density grass blades
      for (let i = 0; i < 6500; i++) {
        const x = hash2d(i, 1, 62) * size;
        const y = hash2d(i, 2, 62) * size;
        const g = Math.round(90 + hash2d(i, 3, 62) * 32);
        const rr = Math.round(g * 0.77);
        const bb = Math.round(g * 0.54);
        c.fillStyle = `rgb(${rr},${g},${bb})`;
        c.fillRect(x, y, 1.5, 3);

        const hv = Math.round(95 + hash2d(i, 4, 62) * 70);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.fillRect(x, y, 1.5, 3);
      }
      normalStrength = 1.4;
      repX = 96;
      repY = 96;
      break;
    }

    case 'dirt': {
      c.fillStyle = '#635342';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#757575';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#f0f0f0';
      r.fillRect(0, 0, size, size);
      for (let i = 0; i < 2500; i++) {
        const x = hash2d(i, 1, 71) * size;
        const y = hash2d(i, 2, 71) * size;
        const v = Math.round(68 + hash2d(i, 3, 71) * 45);
        c.fillStyle = `rgb(${v + 14},${v},${v - 14})`;
        c.fillRect(x, y, 2, 2);
        const hv = Math.round(80 + hash2d(i, 4, 71) * 90);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.fillRect(x, y, 2, 2);
      }
      normalStrength = 1.9;
      repX = 3;
      repY = 3;
      break;
    }

    case 'woodFloor': {
      c.fillStyle = '#8b6d50';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#a0a0a0';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#9c9c9c';
      r.fillRect(0, 0, size, size);

      const strips = 8;
      const sw = size / strips;
      for (let i = 0; i < strips; i++) {
        const x = i * sw;
        const tone = 0.88 + hash2d(i, 1, 81) * 0.24;
        c.fillStyle = `rgb(${Math.round(138 * tone)}, ${Math.round(106 * tone)}, ${Math.round(76 * tone)})`;
        c.fillRect(x + 1, 0, sw - 2, size);

        c.fillStyle = 'rgba(42, 28, 16, 0.35)';
        c.fillRect(x, 0, 1.5, size);
        h.fillStyle = '#383838';
        h.fillRect(x, 0, 2, size);

        // Horizontal plank end seam
        const seamY = hash2d(i, 2, 81) * size;
        c.fillRect(x, seamY, sw, 1.5);
        h.fillRect(x, seamY, sw, 2);

        // Subtle grain lines
        c.fillStyle = 'rgba(55,35,18,0.09)';
        for (let g = 0; g < 8; g++) {
          const gx = x + 3 + hash2d(i, g, 82) * (sw - 6);
          c.fillRect(gx, 0, 1, size);
        }
      }
      normalStrength = 1.4;
      repX = 3;
      repY = 3;
      break;
    }

    case 'tile': {
      c.fillStyle = '#b9b6ae';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#404040';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#686868';
      r.fillRect(0, 0, size, size);

      const grid = 6;
      const cell = size / grid;
      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          const v = Math.round(212 + (hash2d(x, y, 91) - 0.5) * 14);
          c.fillStyle = `rgb(${v},${v},${v - 3})`;
          c.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
          h.fillStyle = '#d4d4d4';
          h.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
        }
      }
      normalStrength = 1.6;
      repX = 3;
      repY = 3;
      break;
    }

    case 'roof': {
      c.fillStyle = '#53514e';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#808080';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#dcdcdc';
      r.fillRect(0, 0, size, size);

      for (let i = 0; i < 3000; i++) {
        const x = hash2d(i, 1, 101) * size;
        const y = hash2d(i, 2, 101) * size;
        const v = Math.round(62 + hash2d(i, 3, 101) * 38);
        c.fillStyle = `rgb(${v},${v},${v - 2})`;
        c.fillRect(x, y, 2, 2);
        const hv = Math.round(90 + hash2d(i, 4, 101) * 80);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.fillRect(x, y, 2, 2);
      }
      // Membrane roll seams
      c.fillStyle = 'rgba(30,29,28,0.45)';
      c.fillRect(0, size * 0.5, size, 3);
      h.fillStyle = '#404040';
      h.fillRect(0, size * 0.5, size, 4);
      normalStrength = 1.7;
      repX = 3;
      repY = 3;
      break;
    }
  }

  return {
    map: finalizeTexture(colorCanvas, true, repX, repY, anisotropy),
    normalMap: heightCanvasToNormalTexture(heightCanvas, normalStrength, repX, repY, anisotropy),
    roughnessMap: finalizeTexture(roughCanvas, false, repX, repY, anisotropy),
  };
}

let cachedLibrary: Record<SurfaceTextureKind, ProceduralTextureSet> | null = null;

export function getProceduralTextureLibrary(
  anisotropy: number = 4,
): Record<SurfaceTextureKind, ProceduralTextureSet> {
  if (cachedLibrary) return cachedLibrary;
  const kinds: SurfaceTextureKind[] = [
    'brick',
    'siding',
    'plaster',
    'asphalt',
    'concrete',
    'grass',
    'dirt',
    'woodFloor',
    'tile',
    'roof',
  ];
  const lib = {} as Record<SurfaceTextureKind, ProceduralTextureSet>;
  for (const k of kinds) {
    lib[k] = buildTextureSet(k, anisotropy);
  }
  cachedLibrary = lib;
  return lib;
}

/** Generates a soft radial alpha shadow texture for grounded contact shadows. */
let cachedShadowTex: THREE.CanvasTexture | null = null;
export function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowTex) return cachedShadowTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(10, 12, 14, 0.58)');
  grad.addColorStop(0.55, 'rgba(10, 12, 14, 0.24)');
  grad.addColorStop(1, 'rgba(10, 12, 14, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  cachedShadowTex = tex;
  return tex;
}
