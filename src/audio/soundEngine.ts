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
      case 'dig_hit':
        if (ev.soil === 'rock') {
          this.playTone(now, 640 * jitter, 280 * jitter, 0.07, 'triangle', 0.2);
          this.playNoiseBurst(now, 0.06, 2200, 0.18);
        } else if (ev.soil === 'water') {
          this.playNoiseBurst(now, 0.11, 950 * jitter, 0.2);
          this.playTone(now, 240, 140, 0.08, 'sine', 0.14);
        } else {
          this.playNoiseBurst(now, 0.09, ev.soil === 'clay' ? 680 : 880, 0.22);
          this.playTone(now, 150 * jitter, 72, 0.09, 'triangle', 0.16);
        }
        break;
      case 'dig_complete':
        this.playNoiseBurst(now, 0.18, 950, 0.28);
        this.playTone(now, 125, 58, 0.18, 'triangle', 0.24);
        this.playTone(now + 0.08, 290, 410, 0.09, 'sine', 0.12);
        break;
      case 'timber':
        this.playNoiseBurst(now, 0.08, 750, 0.22);
        this.playTone(now, 210, 110, 0.12, 'triangle', 0.24);
        this.playTone(now + 0.09, 240, 140, 0.1, 'triangle', 0.18);
        break;
      case 'lantern':
        this.playTone(now, 680, 960, 0.07, 'sine', 0.15);
        this.playTone(now + 0.06, 980, 1240, 0.06, 'triangle', 0.11);
        break;
      case 'vent':
        this.playTone(now, 480, 320, 0.09, 'sawtooth', 0.08);
        this.playNoiseBurst(now + 0.05, 0.16, 1500, 0.14);
        break;
      case 'pump':
        this.playTone(now, 160, 260, 0.14, 'sawtooth', 0.12);
        this.playNoiseBurst(now + 0.04, 0.22, 1100, 0.18);
        break;
      case 'water_seep':
        this.playNoiseBurst(now, 0.14, 1200 * jitter, 0.14);
        this.playTone(now, 310 * jitter, 180, 0.08, 'sine', 0.09);
        break;
      case 'cave_in':
        this.playNoiseBurst(now, 0.42, 340, 0.36);
        this.playTone(now, 92, 34, 0.44, 'sawtooth', 0.28);
        break;
      case 'shot':
        this.playTone(now, 420 * jitter, 140 * jitter, 0.09, 'triangle', 0.22);
        this.playNoiseBurst(now, 0.06, 1900, 0.16);
        break;
      case 'hit':
        this.playNoiseBurst(now, 0.07, 1100 * jitter, 0.24);
        this.playTone(now, 240, 88, 0.09, 'sawtooth', 0.16);
        break;
      case 'trap':
        this.playTone(now, 740, 210, 0.08, 'square', 0.22);
        this.playNoiseBurst(now, 0.09, 2400, 0.25);
        break;
      case 'explosion':
        this.playNoiseBurst(now, 0.34, 480, 0.34);
        this.playTone(now, 130, 38, 0.32, 'sawtooth', 0.26);
        break;
      case 'bark':
        this.playTone(now, 290 * jitter, 460 * jitter, 0.06, 'sawtooth', 0.2);
        this.playTone(now + 0.055, 420 * jitter, 210 * jitter, 0.08, 'sawtooth', 0.18);
        break;
      case 'siren':
        this.playTone(now, 640, 920, 0.18, 'sine', 0.14);
        this.playTone(now + 0.18, 920, 640, 0.18, 'sine', 0.14);
        break;
      case 'cash':
        this.playTone(now, 880, 1180, 0.07, 'sine', 0.16);
        this.playTone(now + 0.075, 1180, 1560, 0.1, 'sine', 0.16);
        break;
      case 'phone':
        this.playTone(now, 740, 980, 0.06, 'triangle', 0.12);
        this.playTone(now + 0.065, 980, 1240, 0.07, 'triangle', 0.1);
        break;
      case 'alert':
        this.playTone(now, 520, 680, 0.11, 'square', 0.14);
        this.playTone(now + 0.13, 520, 680, 0.11, 'square', 0.14);
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
