/**
 * Procedural Web Audio API sound engine for Neighborhood Wars.
 * Lazy-initializes strictly on the first user tap/click (browser autoplay policy).
 * Synthesizes surface-aware footsteps, doors, locks, barricades, jump/land, and climb sounds.
 */

import type { SimSoundEvent } from '../simulation/simulation';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private volume = 0.7;

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.applyGain();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setSettings(muted: boolean, volume: number): void {
    this.muted = muted;
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyGain();
  }

  private applyGain(): void {
    if (!this.masterGain || !this.ctx) return;
    const target = this.muted ? 0 : this.volume * 0.45;
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
  }

  public playEvent(ev: SimSoundEvent): void {
    if (this.muted || !this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const jitter = 0.93 + ((now * 1000) % 14) * 0.01;

    switch (ev.type) {
      case 'footstep':
        this.playFootstep(now, ev.surface ?? 'grass', jitter);
        break;
      case 'jump':
        this.playTone(now, 145 * jitter, 220 * jitter, 0.09, 'triangle', 0.16);
        break;
      case 'land':
        this.playNoiseBurst(now, 0.08, 320, 0.25);
        this.playTone(now, 110, 55, 0.1, 'sine', 0.22);
        break;
      case 'door':
        this.playTone(now, 190 * jitter, 280 * jitter, 0.16, 'sawtooth', 0.09);
        this.playNoiseBurst(now + 0.06, 0.05, 900, 0.14);
        break;
      case 'lock':
        this.playTone(now, 920, 680, 0.05, 'square', 0.12);
        this.playTone(now + 0.055, 1150, 880, 0.04, 'square', 0.1);
        break;
      case 'barricade':
        this.playNoiseBurst(now, 0.09, 600, 0.26);
        this.playTone(now, 180, 95, 0.11, 'triangle', 0.22);
        break;
      case 'climb':
        this.playTone(now, 420, 310, 0.07, 'square', 0.09);
        this.playTone(now + 0.08, 520, 390, 0.07, 'square', 0.09);
        break;
    }
  }

  public playUiClick(): void {
    if (this.muted || !this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    this.playTone(this.ctx.currentTime, 560, 420, 0.045, 'triangle', 0.12);
  }

  private playFootstep(now: number, surface: string, jitter: number): void {
    if (surface === 'grass') {
      this.playNoiseBurst(now, 0.055, 700 * jitter, 0.11);
    } else if (surface === 'wood') {
      this.playTone(now, 145 * jitter, 82 * jitter, 0.06, 'triangle', 0.15);
      this.playNoiseBurst(now, 0.03, 1200, 0.07);
    } else if (surface === 'tile' || surface === 'concrete' || surface === 'asphalt' || surface === 'roof') {
      this.playNoiseBurst(now, 0.04, 1800 * jitter, 0.11);
      this.playTone(now, 190 * jitter, 110 * jitter, 0.04, 'sine', 0.09);
    } else {
      this.playNoiseBurst(now, 0.04, 1400 * jitter, 0.1);
    }
  }

  private playTone(
    start: number,
    freqA: number,
    freqB: number,
    duration: number,
    type: OscillatorType,
    gainVal: number,
  ): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqA, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), start + duration);
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  private playNoiseBurst(start: number, duration: number, cutoffHz: number, gainVal: number): void {
    if (!this.ctx || !this.masterGain) return;
    const sampleCount = Math.max(128, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, start);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(start);
  }
}

export const soundEngine = new SoundEngine();
