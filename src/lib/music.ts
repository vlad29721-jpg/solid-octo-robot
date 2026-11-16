import type { MusicTrack } from "./dnd/types";
import { unlockAudio } from "./sfx";

type TrackDef = { label: string; emoji: string; bpm: number; root: number; scale: number[]; wave: OscillatorType; drone?: boolean; drums?: "light" | "heavy"; birds?: boolean };
export const TRACKS: Record<Exclude<MusicTrack, "custom">, TrackDef> = {
  tavern: { label: "Таверна", emoji: "🍺", bpm: 112, root: 196, scale: [0, 2, 4, 5, 7, 9, 11], wave: "triangle", drums: "light" },
  battle: { label: "Битва", emoji: "⚔️", bpm: 144, root: 110, scale: [0, 2, 3, 5, 7, 8, 10], wave: "sawtooth", drums: "heavy" },
  dungeon: { label: "Подземелье", emoji: "🕯️", bpm: 58, root: 73.4, scale: [0, 1, 3, 5, 7, 8, 10], wave: "sine", drone: true },
  forest: { label: "Лес", emoji: "🌲", bpm: 84, root: 261.6, scale: [0, 2, 4, 7, 9], wave: "sine", birds: true },
  mystery: { label: "Тайна", emoji: "🔮", bpm: 66, root: 146.8, scale: [0, 2, 3, 6, 7, 8, 11], wave: "triangle", drone: true },
};

function rand(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const freq = (root: number, scale: number[], degree: number) => root * Math.pow(2, (scale[((degree % scale.length) + scale.length) % scale.length] + 12 * Math.floor(degree / scale.length)) / 12);

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private drone: OscillatorNode[] = [];
  private audio: HTMLAudioElement | null = null;
  private nextStep = -1;
  private key = "";

  play(track: MusicTrack, startedAt: string, volume: number, customUrl: string | null) {
    const key = `${track}|${startedAt}|${customUrl}`;
    if (key === this.key) { this.setVolume(volume); return; }
    this.stop();
    this.key = key;
    const start = new Date(startedAt).getTime();
    if (track === "custom") {
      if (!customUrl) return;
      const audio = new Audio(customUrl);
      audio.loop = true; audio.crossOrigin = "anonymous"; audio.volume = Math.min(1, volume);
      audio.addEventListener("loadedmetadata", () => { if (audio.duration && Number.isFinite(audio.duration)) audio.currentTime = ((Date.now() - start) / 1000) % audio.duration; });
      void audio.play().catch(() => undefined);
      this.audio = audio;
      return;
    }
    const ctx = unlockAudio();
    if (!ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = volume * 0.35;
    this.master.connect(ctx.destination);
    const def = TRACKS[track];
    const beat = 60 / def.bpm;
    if (def.drone) {
      [def.root / 2, def.root * 0.75].forEach((f0) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = f0; gain.gain.value = 0.18;
        osc.connect(gain).connect(this.master as GainNode); osc.start(); this.drone.push(osc);
      });
    }
    const tick = () => {
      if (!this.ctx || !this.master) return;
      const elapsed = (Date.now() - start) / 1000;
      const step = Math.floor(elapsed / beat);
      if (this.nextStep < step) this.nextStep = step;
      const horizon = elapsed + 0.3;
      while (this.nextStep * beat < horizon) {
        const when = this.ctx.currentTime + Math.max(0, this.nextStep * beat - elapsed);
        this.scheduleStep(def, this.nextStep, when, beat);
        this.nextStep += 1;
      }
    };
    tick();
    this.timer = window.setInterval(tick, 100);
  }

  private note(type: OscillatorType, f: number, when: number, duration: number, peak: number) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, when);
    gain.gain.setValueAtTime(0.0001, when); gain.gain.exponentialRampToValueAtTime(peak, when + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain).connect(this.master); osc.start(when); osc.stop(when + duration + 0.05);
  }

  private hit(when: number, low: boolean, peak: number) {
    if (!this.ctx || !this.master) return;
    if (low) { this.note("sine", 120, when, 0.25, peak); return; }
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource(); const gain = this.ctx.createGain(); gain.gain.value = peak * 0.5;
    src.buffer = buffer; src.connect(gain).connect(this.master); src.start(when);
  }

  private scheduleStep(def: TrackDef, step: number, when: number, beat: number) {
    const bar = Math.floor(step / 4); const inBar = step % 4;
    const chord = [0, 3, 4, 5][Math.floor(rand(bar * 7 + 3) * 4)];
    if (inBar === 0) this.note(def.drone ? "sine" : "triangle", freq(def.root / 2, def.scale, chord), when, beat * 3.6, 0.22);
    if (rand(step * 13 + 1) < (def.drone ? 0.35 : 0.8)) {
      const degree = chord + Math.floor(rand(step * 31 + 5) * 6);
      this.note(def.wave, freq(def.root, def.scale, degree), when, beat * (def.drone ? 2.5 : 0.9), def.wave === "sawtooth" ? 0.07 : 0.14);
    }
    if (def.drums === "heavy") { if (inBar % 2 === 0) this.hit(when, true, 0.6); this.hit(when + beat / 2, false, 0.3); }
    if (def.drums === "light" && inBar === 0) this.hit(when, true, 0.35);
    if (def.drums === "light" && inBar === 2) this.hit(when, false, 0.2);
    if (def.birds && rand(step * 97) < 0.18) { const base = 2200 + rand(step) * 1500; this.note("sine", base, when, 0.08, 0.05); this.note("sine", base * 1.25, when + 0.1, 0.08, 0.05); }
  }

  setVolume(volume: number) {
    if (this.master) this.master.gain.value = volume * 0.35;
    if (this.audio) this.audio.volume = Math.min(1, volume);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.drone.forEach((osc) => { try { osc.stop(); } catch { /* уже остановлен */ } });
    this.drone = [];
    this.master?.disconnect();
    this.master = null;
    this.audio?.pause();
    this.audio = null;
    this.nextStep = -1;
    this.key = "";
  }
}
