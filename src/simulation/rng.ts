/**
 * Deterministic seeded PRNG (Mulberry32) used for ALL gameplay randomness.
 * Never use Math.random() in simulation, world generation, AI, or schedulers.
 */

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  /** Returns the current internal 32-bit state for lossless save/load serialization. */
  getState(): number {
    return this.state >>> 0;
  }

  /** Restores exact internal 32-bit state from a serialized save. */
  setState(state: number): void {
    this.state = state >>> 0 || 0x6d2b79f5;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Deterministic element pick from non-empty array. */
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

/** Deterministic string-to-uint32 hash for lot/prop sub-seeds. */
export function hashSeed(base: number, salt: string): number {
  let h = (base ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < salt.length; i++) {
    h ^= salt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
