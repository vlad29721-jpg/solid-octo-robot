import type { SoundEffect } from "./dnd/types";

let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  ctx ??= new AudioCtor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function audioReady() {
  return Boolean(ctx && ctx.state === "running");
}

function noise(audio: AudioContext, seconds: number) {
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * seconds), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  return source;
}

function envelope(audio: AudioContext, peak: number, attack: number, release: number, start = audio.currentTime) {
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
  gain.connect(audio.destination);
  return gain;
}

function tone(audio: AudioContext, type: OscillatorType, from: number, to: number, start: number, duration: number, peak: number) {
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
  osc.connect(envelope(audio, peak, 0.01, duration, start));
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playSfx(effect: SoundEffect) {
  const audio = unlockAudio();
  if (!audio) return;
  const now = audio.currentTime;
  if (effect === "thunder") {
    const source = noise(audio, 3.5);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 3);
    source.connect(filter).connect(envelope(audio, 0.9, 0.05, 3.2));
    source.start(now);
  } else if (effect === "scream") {
    tone(audio, "sawtooth", 500, 1400, now, 0.25, 0.25);
    tone(audio, "sawtooth", 1400, 380, now + 0.25, 0.9, 0.25);
  } else if (effect === "swords") {
    [0, 0.35, 0.6].forEach((delay) => {
      tone(audio, "square", 2800, 1900, now + delay, 0.18, 0.12);
      tone(audio, "triangle", 4200, 3100, now + delay, 0.3, 0.1);
    });
  } else if (effect === "door") {
    tone(audio, "sawtooth", 90, 160, now, 1.2, 0.18);
    const knock = noise(audio, 0.2);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 300;
    knock.connect(filter).connect(envelope(audio, 0.8, 0.005, 0.2, now + 1.25));
    knock.start(now + 1.25);
  } else if (effect === "magic") {
    [523, 659, 784, 1047, 1319].forEach((freq, index) => tone(audio, "sine", freq, freq * 1.02, now + index * 0.08, 0.9, 0.12));
  } else if (effect === "drum") {
    [0, 0.5, 1, 1.25, 1.5].forEach((delay) => tone(audio, "sine", 140, 45, now + delay, 0.35, 0.7));
  } else if (effect === "bell") {
    [220, 440, 663, 880].forEach((freq) => tone(audio, "sine", freq, freq, now, 3.2, 0.15));
  } else if (effect === "growl") {
    const source = noise(audio, 1.8);
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass"; filter.frequency.value = 120; filter.Q.value = 3;
    source.connect(filter).connect(envelope(audio, 1, 0.2, 1.5));
    source.start(now);
    tone(audio, "sawtooth", 70, 55, now, 1.6, 0.15);
  }
}

export const SFX_LIST: { id: SoundEffect; label: string; emoji: string }[] = [
  { id: "thunder", label: "Гром", emoji: "⛈️" },
  { id: "scream", label: "Крик", emoji: "😱" },
  { id: "swords", label: "Звон мечей", emoji: "⚔️" },
  { id: "door", label: "Скрип двери", emoji: "🚪" },
  { id: "magic", label: "Магия", emoji: "✨" },
  { id: "drum", label: "Барабаны", emoji: "🥁" },
  { id: "bell", label: "Колокол", emoji: "🔔" },
  { id: "growl", label: "Рычание", emoji: "🐺" },
];

export function playHeartbeat() {
  const audio = unlockAudio();
  if (!audio) return;
  const now = audio.currentTime;
  [0, 0.25, 1, 1.25, 2, 2.25].forEach((delay, index) => {
    const osc = audio.createOscillator(); const gain = audio.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(index % 2 ? 50 : 62, now + delay);
    gain.gain.setValueAtTime(0.0001, now + delay); gain.gain.exponentialRampToValueAtTime(0.9, now + delay + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.22);
    osc.connect(gain).connect(audio.destination); osc.start(now + delay); osc.stop(now + delay + 0.3);
  });
}
