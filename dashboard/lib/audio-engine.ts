// Web Audio API Equalizer & Algorithmic Reverb DSP Engine for VH Music

export type EQPresetKey =
  | "flat"
  | "bass-boost"
  | "vocal"
  | "edm"
  | "rock"
  | "lofi"
  | "acoustic"
  | "treble-air";

export interface EQPresetInfo {
  id: EQPresetKey;
  name: string;
  badge: string;
  description: string;
  gains: [number, number, number, number, number]; // [60Hz, 300Hz, 1kHz, 3.5kHz, 10kHz]
}

export const EQ_PRESETS: Record<EQPresetKey, EQPresetInfo> = {
  flat: {
    id: "flat",
    name: "Pure Flat",
    badge: "HI-FI",
    description: "Original master balance without coloration",
    gains: [0, 0, 0, 0, 0],
  },
  "bass-boost": {
    id: "bass-boost",
    name: "Bass Boost",
    badge: "BASS",
    description: "Deep punchy sub-bass & warm low-end weight",
    gains: [6.5, 4.0, 0, 1.0, 2.0],
  },
  vocal: {
    id: "vocal",
    name: "Vocal Clarity",
    badge: "VOCAL",
    description: "Enhanced vocal presence and speech intelligibility",
    gains: [-2.0, 1.0, 5.5, 3.5, 1.5],
  },
  edm: {
    id: "edm",
    name: "Electronic / EDM",
    badge: "CLUB",
    description: "V-shaped curve: punchy kicks & sparkling synths",
    gains: [6.0, 2.5, -2.0, 3.5, 6.0],
  },
  rock: {
    id: "rock",
    name: "Rock & Power",
    badge: "ROCK",
    description: "Punchy electric guitars & driving dynamic rhythm",
    gains: [4.0, 3.0, -1.0, 3.5, 4.5],
  },
  lofi: {
    id: "lofi",
    name: "Lo-Fi Warmth",
    badge: "LO-FI",
    description: "Vintage tape saturation with rolled-off highs",
    gains: [4.5, 2.5, 1.0, -3.0, -6.5],
  },
  acoustic: {
    id: "acoustic",
    name: "Acoustic Live",
    badge: "LIVE",
    description: "Natural organic resonance for strings and piano",
    gains: [2.0, 1.5, 2.5, 3.0, 2.0],
  },
  "treble-air": {
    id: "treble-air",
    name: "Treble Air",
    badge: "AIR",
    description: "Silky, open and crystal-clear upper harmonics",
    gains: [-1.5, 0, 1.5, 4.5, 7.5],
  },
};

export const REVERB_PRESETS = [
  { label: "Dry", percent: 0, desc: "0% Pure studio direct sound" },
  { label: "Room", percent: 20, desc: "20% Intimate acoustic room" },
  { label: "Studio", percent: 40, desc: "40% Warm studio live chamber" },
  { label: "Concert", percent: 65, desc: "65% Spacious concert auditorium" },
  { label: "Cathedral", percent: 85, desc: "85% Grand ambient hall decay" },
  { label: "Cosmic", percent: 100, desc: "100% Infinite immersive spatial tail" },
];

// Helper to generate a realistic studio impulse response with stereo decorrelation and HF damping
function generateStudioImpulseResponse(
  ctx: AudioContext,
  duration = 2.4,
  decay = 2.2,
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  let filterL = 0;
  let filterR = 0;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;

    // Realistic pre-delay (12ms of direct sound before reflections hit)
    if (t < 0.012) {
      left[i] = 0;
      right[i] = 0;
      continue;
    }

    // Natural air absorption: high frequencies decay faster than lows
    const damping = Math.max(0.08, 1 - (t / duration) * 0.75);
    const env = Math.exp(-t * decay);

    const rawL = (Math.random() * 2 - 1) * env;
    const rawR = (Math.random() * 2 - 1) * env;

    filterL = filterL + damping * (rawL - filterL);
    filterR = filterR + damping * (rawR - filterR);

    left[i] = filterL;
    right[i] = filterR;
  }

  return impulse;
}

class AudioFXEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private convolver: ConvolverNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private connectedElement: HTMLAudioElement | null = null;

  public activeEQ: EQPresetKey = "flat";
  public activeReverbPercent = 40;
  public isInitialized = false;

  public init(audioElement: HTMLAudioElement, initialEQ: EQPresetKey | string = "flat", initialReverb = 40): boolean {
    if (typeof window === "undefined") return false;

    // If already connected to this element, just update params
    if (this.isInitialized && this.connectedElement === audioElement) {
      this.setEQ(initialEQ);
      this.setReverb(initialReverb);
      return true;
    }

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtxClass) {
        console.warn("Web Audio API not supported in this browser.");
        return false;
      }

      if (!this.ctx || this.ctx.state === "closed") {
        this.ctx = new AudioCtxClass();
      }

      // Ensure audio element allows CORS for media element source
      audioElement.crossOrigin = "anonymous";

      // Create or reuse source node
      if (!this.sourceNode || this.connectedElement !== audioElement) {
        this.sourceNode = this.ctx.createMediaElementSource(audioElement);
        this.connectedElement = audioElement;
      }

      // 5-band Equalizer Nodes
      // Band 1: 60 Hz Low Shelf (Sub & Kick)
      const b1 = this.ctx.createBiquadFilter();
      b1.type = "lowshelf";
      b1.frequency.value = 60;

      // Band 2: 300 Hz Peaking (Low Mid / Warmth)
      const b2 = this.ctx.createBiquadFilter();
      b2.type = "peaking";
      b2.frequency.value = 300;
      b2.Q.value = 1.0;

      // Band 3: 1000 Hz Peaking (Mid / Vocals)
      const b3 = this.ctx.createBiquadFilter();
      b3.type = "peaking";
      b3.frequency.value = 1000;
      b3.Q.value = 1.0;

      // Band 4: 3500 Hz Peaking (High Mid / Clarity)
      const b4 = this.ctx.createBiquadFilter();
      b4.type = "peaking";
      b4.frequency.value = 3500;
      b4.Q.value = 1.0;

      // Band 5: 10000 Hz High Shelf (Treble Air)
      const b5 = this.ctx.createBiquadFilter();
      b5.type = "highshelf";
      b5.frequency.value = 10000;

      this.filters = [b1, b2, b3, b4, b5];

      // Chain the 5 filter bands in series
      b1.connect(b2);
      b2.connect(b3);
      b3.connect(b4);
      b4.connect(b5);

      // Algorithmic Convolver (Reverb)
      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = generateStudioImpulseResponse(this.ctx);

      // Dry / Wet Gain Nodes for Reverb Mix
      this.dryGain = this.ctx.createGain();
      this.wetGain = this.ctx.createGain();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;

      // Source -> First EQ Band
      this.sourceNode.connect(b1);

      // Last EQ Band -> Dry Path & Wet Reverb Path
      b5.connect(this.dryGain);
      b5.connect(this.convolver);
      this.convolver.connect(this.wetGain);

      // Dry + Wet -> Master Gain -> Destination
      this.dryGain.connect(this.masterGain);
      this.wetGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.isInitialized = true;

      // Apply initial settings
      this.setEQ(initialEQ);
      this.setReverb(initialReverb);

      return true;
    } catch (err) {
      console.warn("Failed to initialize Web Audio FX Engine:", err);
      return false;
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  public setEQ(presetKey: EQPresetKey | string): void {
    const key = (presetKey in EQ_PRESETS ? presetKey : "flat") as EQPresetKey;
    this.activeEQ = key;

    const preset = EQ_PRESETS[key];
    if (!preset || this.filters.length !== 5 || !this.ctx) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const targetGain = preset.gains[i];
      // Smooth parameter transition over 50ms to prevent audio popping
      this.filters[i].gain.setTargetAtTime(targetGain, now, 0.05);
    }
  }

  public setReverb(percent: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    this.activeReverbPercent = clamped;

    if (!this.dryGain || !this.wetGain || !this.ctx) return;

    const now = this.ctx.currentTime;
    const ratio = clamped / 100;

    if (clamped === 0) {
      this.dryGain.gain.setTargetAtTime(1.0, now, 0.03);
      this.wetGain.gain.setTargetAtTime(0.0, now, 0.03);
    } else {
      // Natural equal-power curve: keeps vocal clarity intact while blending ambient space
      const dryVal = Math.cos(ratio * 0.45 * Math.PI);
      const wetVal = Math.sin(ratio * 0.45 * Math.PI) * 0.9;
      this.dryGain.gain.setTargetAtTime(dryVal, now, 0.03);
      this.wetGain.gain.setTargetAtTime(wetVal, now, 0.03);
    }
  }
}

export const audioFXEngine = new AudioFXEngine();
