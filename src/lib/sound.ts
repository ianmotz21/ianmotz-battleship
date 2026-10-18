import type { ShotOutcome } from "@/lib/battleMessages";

/**
 * Battle sound effects, synthesized with the Web Audio API so no audio files
 * are needed. Each sound is built from filtered noise (spray, crackle, rumble)
 * and short tones (booms and thuds).
 */

/** Time for the cannonball to land; the board animations use the same delay. */
const IMPACT_DELAY_S = 0.16;
const MUTE_KEY = "bellum-punicum-muted";

let context: AudioContext | null = null;
let output: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

let muted: boolean | null = null;
const muteListeners = new Set<() => void>();

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // Storage can be unavailable (e.g. private mode); the setting just won't persist.
  }
  muteListeners.forEach((listener) => listener());
}

export function subscribeMuted(listener: () => void) {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
}

function getAudio(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!context) {
    const AudioCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }
    context = new AudioCtor();

    const compressor = context.createDynamicsCompressor();
    compressor.connect(context.destination);
    output = context.createGain();
    output.gain.value = 0.5;
    output.connect(compressor);

    noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.random() * 2 - 1;
    }
  }
  if (context.state === "suspended") {
    void context.resume();
  }
  return context;
}

type Envelope = { start: number; duration: number; gain: number; attack?: number; pan: number };

/** Fade a sound in and out, place it left/right, and send it to the speakers. */
function shape(audio: AudioContext, source: AudioNode, { start, duration, gain, attack = 0.005, pan }: Envelope) {
  const volume = audio.createGain();
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + attack);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(volume);

  if (audio.createStereoPanner) {
    const panner = audio.createStereoPanner();
    panner.pan.value = pan;
    volume.connect(panner);
    panner.connect(output!);
  } else {
    volume.connect(output!);
  }
}

function noise(
  audio: AudioContext,
  envelope: Envelope,
  filter: { type: BiquadFilterType; frequency: number; q?: number },
) {
  const source = audio.createBufferSource();
  source.buffer = noiseBuffer;
  const biquad = audio.createBiquadFilter();
  biquad.type = filter.type;
  biquad.frequency.value = filter.frequency;
  biquad.Q.value = filter.q ?? 0.7;
  source.connect(biquad);
  shape(audio, biquad, envelope);
  source.start(envelope.start, Math.random() * 1.5);
  source.stop(envelope.start + envelope.duration + 0.05);
}

function tone(audio: AudioContext, envelope: Envelope, wave: OscillatorType, fromHz: number, toHz: number) {
  const oscillator = audio.createOscillator();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(fromHz, envelope.start);
  oscillator.frequency.exponentialRampToValueAtTime(toHz, envelope.start + envelope.duration);
  shape(audio, oscillator, envelope);
  oscillator.start(envelope.start);
  oscillator.stop(envelope.start + envelope.duration + 0.05);
}

function cannon(audio: AudioContext, start: number, pan: number) {
  tone(audio, { start, duration: 0.6, gain: 0.9, pan }, "sine", 110, 36);
  noise(audio, { start, duration: 0.9, gain: 0.8, pan }, { type: "lowpass", frequency: 900 });
  noise(audio, { start, duration: 0.08, gain: 0.25, pan }, { type: "highpass", frequency: 2500 });
}

function splash(audio: AudioContext, start: number, pan: number) {
  tone(audio, { start, duration: 0.18, gain: 0.22, pan }, "sine", 520, 140);
  noise(audio, { start, duration: 0.7, gain: 0.55, attack: 0.03, pan }, { type: "bandpass", frequency: 1400, q: 0.8 });
  noise(audio, { start: start + 0.05, duration: 0.4, gain: 0.18, attack: 0.02, pan }, { type: "highpass", frequency: 3200 });
}

function woodCrash(audio: AudioContext, start: number, pan: number) {
  tone(audio, { start, duration: 0.35, gain: 0.8, pan }, "triangle", 160, 55);
  noise(audio, { start, duration: 0.25, gain: 0.9, attack: 0.002, pan }, { type: "bandpass", frequency: 900, q: 4 });
  for (let i = 0; i < 4; i++) {
    const at = start + 0.04 + i * 0.05 + Math.random() * 0.03;
    noise(audio, { start: at, duration: 0.06, gain: 0.35, attack: 0.002, pan }, {
      type: "bandpass",
      frequency: 1800 + Math.random() * 2000,
      q: 6,
    });
  }
  noise(audio, { start, duration: 0.9, gain: 0.35, attack: 0.05, pan }, { type: "lowpass", frequency: 400 });
}

/** Cannon fire from the attacker's side, then a splash or a crash on the target's side. */
export function playShot(attacker: "rome" | "carthage", outcome: ShotOutcome) {
  if (isMuted()) {
    return;
  }
  const audio = getAudio();
  if (!audio) {
    return;
  }
  const pan = attacker === "rome" ? -0.45 : 0.45;
  const start = audio.currentTime + 0.01;
  cannon(audio, start, pan);
  (outcome === "hit" ? woodCrash : splash)(audio, start + IMPACT_DELAY_S, -pan);
}

type Crowd = {
  start: number;
  duration: number;
  voices: number;
  gain: number;
  /** Vowel resonances: "ah" for cheers, "oo" for boos. */
  formants: [number, number];
  pitch: [number, number];
  /** How each voice's pitch moves: up for cheers, down for boos. */
  bend: number;
};

/** A crowd of men: many slightly different voices, each shaped into a vowel. */
function crowd(audio: AudioContext, { start, duration, voices, gain, formants, pitch, bend }: Crowd) {
  for (let i = 0; i < voices; i++) {
    const at = start + Math.random() * 0.3;
    const length = duration * (0.7 + Math.random() * 0.3);
    const base = pitch[0] + Math.random() * (pitch[1] - pitch[0]);
    const voice = audio.createOscillator();
    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(base, at);
    voice.frequency.linearRampToValueAtTime(base * bend, at + length);

    const wobble = audio.createOscillator();
    const wobbleDepth = audio.createGain();
    wobble.frequency.value = 4 + Math.random() * 3;
    wobbleDepth.gain.value = base * 0.03;
    wobble.connect(wobbleDepth);
    wobbleDepth.connect(voice.frequency);

    const mouth = audio.createGain();
    for (const frequency of formants) {
      const formant = audio.createBiquadFilter();
      formant.type = "bandpass";
      formant.frequency.value = frequency * (0.9 + Math.random() * 0.2);
      formant.Q.value = 5;
      voice.connect(formant);
      formant.connect(mouth);
    }
    shape(audio, mouth, {
      start: at,
      duration: length,
      gain: gain / Math.sqrt(voices),
      attack: 0.15,
      pan: Math.random() * 1.4 - 0.7,
    });
    voice.start(at);
    wobble.start(at);
    voice.stop(at + length + 0.05);
    wobble.stop(at + length + 0.05);
  }
  noise(audio, { start, duration, gain: gain * 0.3, attack: 0.2, pan: 0 }, { type: "bandpass", frequency: 1100, q: 0.6 });
}

function applause(audio: AudioContext, start: number, duration: number, claps: number) {
  for (let i = 0; i < claps; i++) {
    const at = start + Math.random() * duration;
    noise(audio, { start: at, duration: 0.03, gain: 0.12, attack: 0.002, pan: Math.random() * 1.6 - 0.8 }, {
      type: "bandpass",
      frequency: 1500 + Math.random() * 1500,
      q: 1.5,
    });
  }
}

function horn(audio: AudioContext, start: number, notes: [number, number, number][], brightness: number) {
  for (const [frequency, offset, length] of notes) {
    const at = start + offset;
    for (const detune of [-6, 6]) {
      const oscillator = audio.createOscillator();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      const filter = audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = brightness;
      oscillator.connect(filter);
      shape(audio, filter, { start: at, duration: length, gain: 0.16, attack: 0.04, pan: 0 });
      oscillator.start(at);
      oscillator.stop(at + length + 0.05);
    }
  }
}

/** Waits for the hit to land before the crowd reacts. */
const REACTION_DELAY_S = 0.45;

/** The crowd reacts to a ship going down: cheers for Carthage's losses, boos for Rome's. */
export function playShipSunk(sunkSide: "rome" | "carthage") {
  if (isMuted()) {
    return;
  }
  const audio = getAudio();
  if (!audio) {
    return;
  }
  const start = audio.currentTime + REACTION_DELAY_S;
  if (sunkSide === "carthage") {
    crowd(audio, { start, duration: 1.6, voices: 12, gain: 0.7, formants: [750, 1200], pitch: [150, 240], bend: 1.15 });
    applause(audio, start + 0.1, 1.4, 30);
  } else {
    crowd(audio, { start, duration: 1.8, voices: 12, gain: 0.7, formants: [320, 800], pitch: [95, 140], bend: 0.8 });
  }
}

/** A roaring celebration for victory, or a mournful horn and groaning crowd for defeat. */
export function playGameOver(result: "victory" | "defeat") {
  if (isMuted()) {
    return;
  }
  const audio = getAudio();
  if (!audio) {
    return;
  }
  const start = audio.currentTime + REACTION_DELAY_S;
  if (result === "victory") {
    horn(
      audio,
      start,
      [
        [523, 0, 0.18],
        [523, 0.2, 0.18],
        [523, 0.4, 0.18],
        [659, 0.6, 0.35],
        [784, 1.0, 0.35],
        [1047, 1.4, 1.2],
      ],
      2800,
    );
    tone(audio, { start, duration: 0.5, gain: 0.6, pan: 0 }, "sine", 90, 45);
    tone(audio, { start: start + 1.4, duration: 0.8, gain: 0.7, pan: 0 }, "sine", 90, 40);
    crowd(audio, { start: start + 0.2, duration: 3.5, voices: 24, gain: 0.85, formants: [750, 1200], pitch: [140, 260], bend: 1.2 });
    applause(audio, start + 0.3, 3.5, 140);
  } else {
    horn(
      audio,
      start,
      [
        [392, 0, 0.9],
        [311, 0.9, 0.9],
        [262, 1.8, 1.8],
      ],
      900,
    );
    tone(audio, { start, duration: 1.2, gain: 0.6, pan: 0 }, "sine", 70, 35);
    crowd(audio, { start: start + 0.3, duration: 3, voices: 20, gain: 0.75, formants: [400, 750], pitch: [90, 135], bend: 0.7 });
  }
}
