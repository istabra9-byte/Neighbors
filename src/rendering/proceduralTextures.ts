/**
 * Procedural PBR texture generator (zero external files).
 * Generates clean, tileable Color (SRGB), Normal, and Roughness maps via HTML5 2D Canvas.
 * Uses fine architectural micro-grain & subtle weathering washes (zero polka-dot blotches)
 * and supports all 8 house architectural finishes + street/underground strata.
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
  | 'boardBatten'
  | 'cedar'
  | 'terracotta'
  | 'stone'
  | 'asphalt'
  | 'concrete'
  | 'grass'
  | 'dirt'
  | 'clay'
  | 'rock'
  | 'woodFloor'
  | 'tile'
  | 'roof';

function hash2d(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

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

/**
 * Adds fine mineral micro-grain & subtle vertical architectural weathering streaks
 * (replaces the old spotted circle grime so plaster & concrete look crisp and grounded).
 */
function addFineWeathering(
  ctx: CanvasRenderingContext2D,
  size: number,
  seed: number,
  intensity: number,
): void {
  // Fine 1-2px mineral speckles
  for (let i = 0; i < 2400; i++) {
    const x = hash2d(i, 1, seed) * size;
    const y = hash2d(i, 2, seed) * size;
    const dark = hash2d(i, 3, seed) > 0.48;
    ctx.fillStyle = dark
      ? `rgba(28, 25, 22, ${intensity * (0.35 + hash2d(i, 4, seed) * 0.45)})`
      : `rgba(242, 238, 230, ${intensity * 0.35})`;
    ctx.fillRect(x, y, 2, 1.5);
  }
  // Very faint vertical rain/weathering wash bands
  for (let s = 0; s < 14; s++) {
    const x = hash2d(s, 7, seed) * size;
    const w = 6 + hash2d(s, 8, seed) * 18;
    const g = ctx.createLinearGradient(x, 0, x, size);
    g.addColorStop(0, `rgba(24, 22, 19, ${intensity * 0.38})`);
    g.addColorStop(0.5, `rgba(24, 22, 19, ${intensity * 0.08})`);
    g.addColorStop(1, `rgba(24, 22, 19, ${intensity * 0.38})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, size);
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

  let normalStrength = 1.8;
  let repX = 1;
  let repY = 1;

  switch (kind) {
    case 'brick': {
      c.fillStyle = '#aba49a';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#383838';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#dcdcdc';
      r.fillRect(0, 0, size, size);

      const rows = 10;
      const cols = 5;
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
          const v = 0.86 + hash2d(col + 10, row + 20, 11) * 0.22;
          const base = Math.round(218 * v);
          c.fillStyle = `rgb(${base}, ${Math.round(base * 0.96)}, ${Math.round(base * 0.92)})`;
          c.fillRect(bx, by, bw, bh);

          c.fillStyle = 'rgba(255,255,255,0.09)';
          c.fillRect(bx, by, bw, 2);
          c.fillStyle = 'rgba(20,14,10,0.14)';
          c.fillRect(bx, by + bh - 2.5, bw, 2.5);

          const hVal = Math.round(182 + hash2d(col, row, 12) * 52);
          h.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
          h.fillRect(bx, by, bw, bh);

          const rVal = Math.round(168 + hash2d(col, row, 13) * 44);
          r.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
          r.fillRect(bx, by, bw, bh);
        }
      }
      addFineWeathering(c, size, 14, 0.055);
      normalStrength = 2.4;
      break;
    }

    case 'siding': {
      c.fillStyle = '#e2dfd8';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#b0b0b0';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#c4c4c4';
      r.fillRect(0, 0, size, size);

      const planks = 12;
      const ph = size / planks;
      for (let i = 0; i < planks; i++) {
        const y = i * ph;
        const grad = c.createLinearGradient(0, y, 0, y + ph);
        const shade = Math.round(224 + hash2d(i, 2, 21) * 16);
        grad.addColorStop(0, `rgb(${shade},${shade},${shade - 2})`);
        grad.addColorStop(0.84, `rgb(${shade - 10},${shade - 10},${shade - 12})`);
        grad.addColorStop(1, `rgb(${shade - 48},${shade - 48},${shade - 50})`);
        c.fillStyle = grad;
        c.fillRect(0, y, size, ph);

        const hGrad = h.createLinearGradient(0, y, 0, y + ph);
        hGrad.addColorStop(0, '#c4c4c4');
        hGrad.addColorStop(0.84, '#f0f0f0');
        hGrad.addColorStop(1, '#2c2c2c');
        h.fillStyle = hGrad;
        h.fillRect(0, y, size, ph);

        c.fillStyle = 'rgba(40,35,30,0.045)';
        for (let g = 0; g < 5; g++) {
          const gy = y + hash2d(i, g, 22) * (ph - 3);
          c.fillRect(0, gy, size, 1);
        }
      }
      addFineWeathering(c, size, 23, 0.035);
      normalStrength = 2.1;
      break;
    }

    case 'boardBatten': {
      // Crisp vertical board-and-batten farmhouse cladding
      c.fillStyle = '#e5e3dd';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#a0a0a0';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#c6c6c6';
      r.fillRect(0, 0, size, size);

      const boards = 8;
      const bw = size / boards;
      for (let i = 0; i < boards; i++) {
        const x = i * bw;
        const shade = Math.round(226 + hash2d(i, 4, 24) * 14);
        c.fillStyle = `rgb(${shade},${shade},${shade - 2})`;
        c.fillRect(x, 0, bw, size);

        // Raised narrow batten strip with cast crease shadow
        c.fillStyle = 'rgba(30,28,25,0.22)';
        c.fillRect(x + bw - 6, 0, 2, size);
        c.fillStyle = `rgb(${shade + 8},${shade + 8},${shade + 6})`;
        c.fillRect(x + bw - 4, 0, 4, size);

        h.fillStyle = '#525252';
        h.fillRect(x + bw - 6, 0, 2, size);
        h.fillStyle = '#f2f2f2';
        h.fillRect(x + bw - 4, 0, 4, size);
      }
      addFineWeathering(c, size, 25, 0.03);
      normalStrength = 2.0;
      break;
    }

    case 'cedar': {
      // Warm Scandinavian vertical tongue-and-groove cedar slats
      c.fillStyle = '#d4cbbd';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#a8a8a8';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#b4b4b4';
      r.fillRect(0, 0, size, size);

      const slats = 12;
      const sw = size / slats;
      for (let i = 0; i < slats; i++) {
        const x = i * sw;
        const tone = 0.88 + hash2d(i, 1, 27) * 0.22;
        const v = Math.round(212 * tone);
        c.fillStyle = `rgb(${v},${Math.round(v * 0.94)},${Math.round(v * 0.87)})`;
        c.fillRect(x + 1, 0, sw - 2, size);

        c.fillStyle = 'rgba(28,18,10,0.34)';
        c.fillRect(x, 0, 1.8, size);
        h.fillStyle = '#2e2e2e';
        h.fillRect(x, 0, 2, size);

        c.fillStyle = 'rgba(52,32,16,0.07)';
        for (let g = 0; g < 6; g++) {
          const gx = x + 2 + hash2d(i, g, 28) * (sw - 4);
          c.fillRect(gx, 0, 1, size);
        }
      }
      normalStrength = 2.0;
      break;
    }

    case 'plaster': {
      // Clean fine-troweled architectural plaster / stucco (NO blotchy spots!)
      c.fillStyle = '#e8e3da';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#848484';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#d6d6d6';
      r.fillRect(0, 0, size, size);

      // Subtle broad trowel tone modulation
      for (let i = 0; i < 65; i++) {
        const x = hash2d(i, 1, 31) * size;
        const y = hash2d(i, 2, 31) * size;
        const w = 22 + hash2d(i, 3, 31) * 44;
        const hh = 12 + hash2d(i, 4, 31) * 26;
        const lum = Math.round(228 + (hash2d(i, 5, 31) - 0.5) * 14);
        c.fillStyle = `rgba(${lum},${lum - 2},${lum - 5},0.14)`;
        c.fillRect(x, y, w, hh);

        const hv = Math.round(124 + (hash2d(i, 6, 31) - 0.5) * 18);
        h.fillStyle = `rgba(${hv},${hv},${hv},0.18)`;
        h.fillRect(x, y, w, hh);
      }
      // Ultra-fine sand plaster grain
      addFineWeathering(c, size, 32, 0.042);
      for (let i = 0; i < 2400; i++) {
        const x = hash2d(i, 1, 33) * size;
        const y = hash2d(i, 2, 33) * size;
        const hv = Math.round(118 + hash2d(i, 3, 33) * 24);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.fillRect(x, y, 1.5, 1.5);
      }
      normalStrength = 0.85;
      break;
    }

    case 'terracotta': {
      // Warm hand-troweled Mediterranean lime stucco with subtle horizontal lime washes
      c.fillStyle = '#e5d9ca';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#828282';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#dadada';
      r.fillRect(0, 0, size, size);

      for (let y = 0; y < size; y += 8) {
        const lum = Math.round(226 + (hash2d(1, y, 36) - 0.5) * 16);
        c.fillStyle = `rgba(${lum},${lum - 6},${lum - 14},0.22)`;
        c.fillRect(0, y, size, 8);
      }
      addFineWeathering(c, size, 37, 0.048);
      normalStrength = 1.0;
      break;
    }

    case 'stone': {
      // Dressed ashlar foundation / column stone
      c.fillStyle = '#928e86';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#404040';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#d4d4d4';
      r.fillRect(0, 0, size, size);

      const rows = 6;
      const rh = size / rows;
      for (let row = 0; row < rows; row++) {
        let x = -((row * 29) % 48);
        let idx = 0;
        while (x < size) {
          const bw = 42 + Math.floor(hash2d(idx, row, 39) * 34);
          const v = Math.round(158 + hash2d(idx + 5, row, 39) * 44);
          c.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
          c.fillRect(x + 2, row * rh + 2, bw - 4, rh - 4);
          h.fillStyle = `rgb(${v + 25},${v + 25},${v + 25})`;
          h.fillRect(x + 2, row * rh + 2, bw - 4, rh - 4);
          x += bw;
          idx++;
        }
      }
      addFineWeathering(c, size, 40, 0.05);
      normalStrength = 2.4;
      break;
    }

    case 'asphalt': {
      c.fillStyle = '#36393d';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#7c7c7c';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#d4d4d4';
      r.fillRect(0, 0, size, size);

      for (let i = 0; i < 4500; i++) {
        const x = hash2d(i, 1, 41) * size;
        const y = hash2d(i, 2, 41) * size;
        const v = Math.round(40 + hash2d(i, 3, 41) * 44);
        c.fillStyle = `rgb(${v},${v + 1},${v + 2})`;
        c.fillRect(x, y, 2, 2);

        const hv = Math.round(90 + hash2d(i, 4, 41) * 80);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.fillRect(x, y, 2, 2);
      }
      c.strokeStyle = 'rgba(18, 19, 21, 0.6)';
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
      normalStrength = 1.7;
      repX = 22;
      repY = 2;
      break;
    }

    case 'concrete': {
      // Clean architectural poured concrete with expansion seams & fine aggregate (NO polka dots!)
      c.fillStyle = '#b4b0a8';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#929292';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#d4d4d4';
      r.fillRect(0, 0, size, size);

      addFineWeathering(c, size, 51, 0.055);
      // 2x2 expansion seam grid
      c.strokeStyle = 'rgba(46, 44, 41, 0.42)';
      c.lineWidth = 2;
      c.strokeRect(1, 1, size - 2, size - 2);
      c.beginPath();
      c.moveTo(size / 2, 0);
      c.lineTo(size / 2, size);
      c.moveTo(0, size / 2);
      c.lineTo(size, size / 2);
      c.stroke();

      h.strokeStyle = '#363636';
      h.lineWidth = 3;
      h.strokeRect(1, 1, size - 2, size - 2);
      h.beginPath();
      h.moveTo(size / 2, 0);
      h.lineTo(size / 2, size);
      h.moveTo(0, size / 2);
      h.lineTo(size, size / 2);
      h.stroke();
      normalStrength = 1.4;
      break;
    }

    case 'grass': {
      // Grounded suburban lawn (world-space meter UVs from ShapeGeometry: 1 tile = ~4.6m)
      c.fillStyle = '#586c46';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#7d7d7d';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#ececec';
      r.fillRect(0, 0, size, size);

      for (let i = 0; i < 95; i++) {
        const x = hash2d(i, 1, 61) * size;
        const y = hash2d(i, 2, 61) * size;
        const rad = 10 + hash2d(i, 3, 61) * 22;
        c.fillStyle =
          hash2d(i, 4, 61) > 0.48
            ? 'rgba(72, 90, 54, 0.22)'
            : 'rgba(102, 98, 66, 0.14)';
        c.beginPath();
        c.arc(x, y, rad, 0, Math.PI * 2);
        c.fill();
      }
      for (let i = 0; i < 6500; i++) {
        const x = hash2d(i, 1, 62) * size;
        const y = hash2d(i, 2, 62) * size;
        const g = Math.round(92 + hash2d(i, 3, 62) * 30);
        const rr = Math.round(g * 0.77);
        const bb = Math.round(g * 0.54);
        c.fillStyle = `rgb(${rr},${g},${bb})`;
        c.fillRect(x, y, 1.5, 3);

        const hv = Math.round(95 + hash2d(i, 4, 62) * 70);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.fillRect(x, y, 1.5, 3);
      }
      normalStrength = 1.3;
      // ShapeGeometry UVs are in world meters, so 0.22 repeats every ~4.55 meters!
      repX = 0.22;
      repY = 0.22;
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
      repX = 2;
      repY = 2;
      break;
    }

    case 'clay': {
      c.fillStyle = '#73533f';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#828282';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#d4d4d4';
      r.fillRect(0, 0, size, size);

      for (let y = 0; y < size; y += 6) {
        const wave = Math.sin(y * 0.14) * 14;
        const v = Math.round(98 + wave + hash2d(1, y, 73) * 26);
        c.fillStyle = `rgb(${v + 18}, ${Math.round(v * 0.78)}, ${Math.round(v * 0.56)})`;
        c.fillRect(0, y, size, 6);
        const hv = Math.round(115 + wave);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.fillRect(0, y, size, 6);
      }
      addFineWeathering(c, size, 74, 0.08);
      normalStrength = 2.0;
      repX = 2;
      repY = 2;
      break;
    }

    case 'rock': {
      c.fillStyle = '#53565a';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#767676';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#e5e5e5';
      r.fillRect(0, 0, size, size);

      for (let i = 0; i < 420; i++) {
        const x = hash2d(i, 1, 76) * size;
        const y = hash2d(i, 2, 76) * size;
        const w = 8 + hash2d(i, 3, 76) * 26;
        const bh = 6 + hash2d(i, 4, 76) * 18;
        const shade = Math.round(68 + hash2d(i, 5, 76) * 42);
        c.fillStyle = `rgba(${shade}, ${shade + 2}, ${shade + 5}, 0.55)`;
        c.fillRect(x, y, w, bh);
        const hv = Math.round(85 + hash2d(i, 6, 76) * 120);
        h.fillStyle = `rgba(${hv},${hv},${hv},0.6)`;
        h.fillRect(x, y, w, bh);
      }
      c.strokeStyle = 'rgba(20, 22, 25, 0.6)';
      c.lineWidth = 1.6;
      h.strokeStyle = '#242424';
      h.lineWidth = 2.4;
      for (let f = 0; f < 10; f++) {
        let px = hash2d(f, 1, 77) * size;
        let py = hash2d(f, 2, 77) * size;
        c.beginPath();
        h.beginPath();
        c.moveTo(px, py);
        h.moveTo(px, py);
        for (let s = 0; s < 6; s++) {
          px += (hash2d(f, s + 5, 77) - 0.5) * 42;
          py += (hash2d(f, s + 15, 77) - 0.2) * 32;
          c.lineTo(px, py);
          h.lineTo(px, py);
        }
        c.stroke();
        h.stroke();
      }
      normalStrength = 2.6;
      repX = 2;
      repY = 2;
      break;
    }

    case 'woodFloor': {
      c.fillStyle = '#927354';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#a0a0a0';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#929292';
      r.fillRect(0, 0, size, size);

      const strips = 8;
      const sw = size / strips;
      for (let i = 0; i < strips; i++) {
        const x = i * sw;
        const tone = 0.90 + hash2d(i, 1, 81) * 0.20;
        c.fillStyle = `rgb(${Math.round(146 * tone)}, ${Math.round(112 * tone)}, ${Math.round(80 * tone)})`;
        c.fillRect(x + 1, 0, sw - 2, size);

        c.fillStyle = 'rgba(42, 28, 16, 0.34)';
        c.fillRect(x, 0, 1.5, size);
        h.fillStyle = '#383838';
        h.fillRect(x, 0, 2, size);

        const seamY = hash2d(i, 2, 81) * size;
        c.fillRect(x, seamY, sw, 1.5);
        h.fillRect(x, seamY, sw, 2);

        c.fillStyle = 'rgba(55,35,18,0.08)';
        for (let g = 0; g < 8; g++) {
          const gx = x + 3 + hash2d(i, g, 82) * (sw - 6);
          c.fillRect(gx, 0, 1, size);
        }
      }
      normalStrength = 1.3;
      break;
    }

    case 'tile': {
      c.fillStyle = '#c1bdb4';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#404040';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#626262';
      r.fillRect(0, 0, size, size);

      const grid = 6;
      const cell = size / grid;
      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          const v = Math.round(216 + (hash2d(x, y, 91) - 0.5) * 14);
          c.fillStyle = `rgb(${v},${v},${v - 4})`;
          c.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
          h.fillStyle = '#d4d4d4';
          h.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
        }
      }
      normalStrength = 1.5;
      break;
    }

    case 'roof': {
      c.fillStyle = '#565451';
      c.fillRect(0, 0, size, size);
      h.fillStyle = '#808080';
      h.fillRect(0, 0, size, size);
      r.fillStyle = '#dcdcdc';
      r.fillRect(0, 0, size, size);

      for (let i = 0; i < 3000; i++) {
        const x = hash2d(i, 1, 101) * size;
        const y = hash2d(i, 2, 101) * size;
        const v = Math.round(64 + hash2d(i, 3, 101) * 36);
        c.fillStyle = `rgb(${v},${v},${v - 2})`;
        c.fillRect(x, y, 2, 2);
        const hv = Math.round(90 + hash2d(i, 4, 101) * 80);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.fillRect(x, y, 2, 2);
      }
      c.fillStyle = 'rgba(30,29,28,0.42)';
      c.fillRect(0, size * 0.5, size, 3);
      h.fillStyle = '#404040';
      h.fillRect(0, size * 0.5, size, 4);
      normalStrength = 1.6;
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
    'boardBatten',
    'cedar',
    'terracotta',
    'stone',
    'asphalt',
    'concrete',
    'grass',
    'dirt',
    'clay',
    'rock',
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

let cachedShadowTex: THREE.CanvasTexture | null = null;
export function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowTex) return cachedShadowTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(10, 12, 14, 0.52)');
  grad.addColorStop(0.55, 'rgba(10, 12, 14, 0.20)');
  grad.addColorStop(1, 'rgba(10, 12, 14, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  cachedShadowTex = tex;
  return tex;
}
