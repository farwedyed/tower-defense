// Procedural Web Audio Sound Manager for Blocky TDS 2D
// All sounds synthesized natively — zero network requests, zero CORS issues.

class SoundManager {
  constructor() {
    this.enabled = true;
    this.masterVolume = 0.5;
    this._ctx = null;

    // Throttle registry: soundKey -> last play timestamp (ms)
    this._lastPlayed = {};

    // Resume AudioContext on first user gesture (browser autoplay policy)
    const resume = () => {
      if (this._ctx && this._ctx.state === 'suspended') {
        this._ctx.resume();
      }
      if (!this._ctx) {
        this._initContext();
      }
    };
    document.addEventListener('click',     resume, { once: false });
    document.addEventListener('touchstart', resume, { once: false, passive: true });
    document.addEventListener('keydown',   resume, { once: false });
  }

  _initContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this._ctx = new AudioContext();
    } catch (e) {
      console.info('[SoundManager] AudioContext unavailable:', e.message);
    }
  }

  _getCtx() {
    if (!this._ctx) this._initContext();
    if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  // Throttle helper — returns true if OK to play, false if too soon
  _canPlay(key, minGapMs = 80) {
    if (!this.enabled) return false;
    const now = performance.now();
    if (this._lastPlayed[key] && now - this._lastPlayed[key] < minGapMs) return false;
    this._lastPlayed[key] = now;
    return true;
  }

  // ── Shared oscillator helper ─────────────────────────────────────────────
  _makeOsc(type, freqStart, freqEnd, duration, gainPeak, gainEnd = 0.0001) {
    const ctx = this._getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 0.01), now + duration);

    const gain = ctx.createGain();
    const vol = gainPeak * this.masterVolume;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(gainEnd * this.masterVolume, 0.0001), now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // ── playPlace: solid wood-like thud ─────────────────────────────────────
  // Sweep 150Hz → near-0 in 0.15s, exponential gain decay
  playPlace() {
    if (!this._canPlay('place', 120)) return;
    this._makeOsc('triangle', 150, 0.01, 0.15, 0.9);
  }

  // ── playUpgrade: cheerful upward retro chime (4 overlapping tones) ───────
  // C4, E4, G4, C5 as quick triangle-wave pings, staggered 55ms apart
  playUpgrade() {
    if (!this._canPlay('upgrade', 200)) return;
    const ctx = this._getCtx();
    if (!ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.055;
      const dur = 0.18;

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const gain = ctx.createGain();
      const vol = 0.55 * this.masterVolume;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    });
  }

  // ── playShoot: fast physical zap ─────────────────────────────────────────
  // Sine sweep 800Hz → 50Hz in 0.08s, low volume to prevent overlap distortion
  playShoot() {
    if (!this._canPlay('shoot', 85)) return;
    this._makeOsc('sine', 800, 50, 0.08, 0.22);
  }

  // ── playCrateDrop: deep bass-heavy rumble thud ────────────────────────────
  // Triangle sweep 90Hz → near-0 in 0.3s
  playCrateDrop() {
    if (!this._canPlay('crateDropAudio', 400)) return;
    this._makeOsc('triangle', 90, 0.01, 0.30, 1.0);
  }

  // ── playCrateReveal: sparkling magic chime sweep ──────────────────────────
  // Sine sweep 440Hz → 1200Hz in 0.4s, smooth volume release
  playCrateReveal() {
    if (!this._canPlay('crateReveal', 400)) return;
    const ctx = this._getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur  = 0.40;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(1200, now + dur); // sweep UP

    const gain = ctx.createGain();
    const vol = 0.55 * this.masterVolume;
    gain.gain.setValueAtTime(vol, now);
    // Hold, then smooth fade at the end
    gain.gain.setValueAtTime(vol, now + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // ── Public toggles ────────────────────────────────────────────────────────
  setEnabled(val) { this.enabled = !!val; }
  setVolume(v)    { this.masterVolume = Math.min(1.0, Math.max(0, v)); }
}

// Global singleton
export const soundManager = new SoundManager();
