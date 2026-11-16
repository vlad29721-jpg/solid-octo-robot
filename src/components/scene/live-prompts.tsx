"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, Dices, Music, Target, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { MusicEngine } from "@/lib/music";
import { formatDuration, musicPosition } from "@/lib/playlist";
import { useCheckRoll, useConcentrationRoll } from "@/lib/queries";
import { audioReady, playHeartbeat, unlockAudio } from "@/lib/sfx";
import { toast } from "@/lib/toast";

export function LivePrompts() {
  const { snapshot, actor } = useHub();
  const checkRoll = useCheckRoll();
  const concentration = useConcentrationRoll();
  const scene = snapshot?.board?.scene;
  const engine = useRef<MusicEngine | null>(null);
  const [localVolume, setLocalVolume] = useState(() => (typeof window === "undefined" ? 0.7 : Number(localStorage.getItem("hub-music-volume") ?? 0.7)));
  const [muted, setMuted] = useState(() => typeof window !== "undefined" && localStorage.getItem("hub-music-muted") === "1");
  const [needsTap, setNeedsTap] = useState(false);
  const [dying, setDying] = useState(false);
  const hpRef = useRef<Record<string, number> | null>(null);

  const music = scene?.music;
  useEffect(() => {
    engine.current ??= new MusicEngine();
    if (!music?.playing || muted) { engine.current.stop(); return; }
    if (!audioReady() && !music.timeline?.length) setNeedsTap(true);
    engine.current.playState(music, localVolume, () => setNeedsTap(true));
  }, [music, localVolume, muted]);
  useEffect(() => {
    const unlock = () => { unlockAudio(); engine.current?.resume(); setNeedsTap(false); };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  useEffect(() => () => engine.current?.stop(), []);

  useEffect(() => {
    if (!snapshot || !actor) return;
    const mine = snapshot.characters.filter((character) => character.ownerId === actor.id);
    const current = Object.fromEntries(mine.map((character) => [character.id, character.hpCurrent]));
    if (hpRef.current) {
      for (const character of mine) {
        if ((hpRef.current[character.id] ?? 0) > 0 && character.hpCurrent === 0) {
          setDying(true); playHeartbeat();
          document.body.classList.add("hub-shake");
          window.setTimeout(() => { setDying(false); document.body.classList.remove("hub-shake"); }, 2800);
          toast.error(`${character.name} без сознания!`, "Делайте спасброски от смерти во вкладке «Действия».");
        }
      }
    }
    hpRef.current = current;
  }, [snapshot, actor]);

  if (!snapshot || !scene || !actor || !snapshot.campaign) return null;
  const campaignId = snapshot.campaign.id;
  const checks = (scene.checks ?? []).filter((check) => check.ownerId === actor.id && !check.result);
  const conc = (scene.concentration ?? []).filter((entry) => entry.ownerId === actor.id);
  const timeline = music?.timeline ?? [];
  const pos = music?.playing && timeline.length ? musicPosition(timeline, music.startedAt, music.offset ?? 0, music.loop ?? false) : null;
  const currentSong = pos && !pos.finished ? timeline[pos.index] : timeline[0];
  const trackLabel = music ? (timeline.length ? `🎵 ${currentSong?.title ?? music.title ?? "Песенник"}` : music.title ?? "Встроенная тема") : "";

  return (
    <>
      <AnimatePresence>{dying ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0.5, 0.85, 0] }} exit={{ opacity: 0 }} transition={{ duration: 2.8 }} className="pointer-events-none fixed inset-0 z-[95] bg-[radial-gradient(circle,transparent_25%,rgba(160,0,0,0.85)_100%)]" /> : null}</AnimatePresence>

      {(checks.length || conc.length) ? (
        <div className="fixed bottom-24 left-1/2 z-[72] w-[min(26rem,calc(100vw-1.5rem))] -translate-x-1/2 space-y-2 md:bottom-6">
          {conc.map((entry) => (
            <motion.div key={entry.id} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-strong rounded-2xl border-sky-400/30 p-4">
              <div className="flex items-center gap-2"><Brain className="h-5 w-5 text-sky-300" /><p className="text-sm font-semibold text-parchment">Концентрация: {entry.characterName}</p></div>
              <p className="mt-1 text-xs text-muted-ink">Получено {entry.damage} урона. Спасбросок ТЕЛ, СЛ {entry.dc}. Провал — заклинание прерывается.</p>
              <Button className="mt-3 w-full" disabled={concentration.isPending} onClick={() => concentration.mutate({ campaignId, checkId: entry.id }, { onSuccess: (data) => toast[data.success ? "success" : "error"](data.success ? "Концентрация удержана" : "Концентрация потеряна", `${data.total} против СЛ ${data.dc}`) })}><Dices className="h-4 w-4" />Бросить спасбросок ТЕЛ</Button>
            </motion.div>
          ))}
          {checks.map((check) => (
            <motion.div key={check.id} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-strong rounded-2xl p-4">
              <div className="flex items-center gap-2"><Target className="h-5 w-5 text-gold" /><p className="text-sm font-semibold text-parchment">Мастер просит проверку</p></div>
              <p className="mt-1 text-xs text-muted-ink">{check.characterName}: {check.label}{check.secret ? " · результат узнает только Мастер" : ` · СЛ ${check.dc}`}</p>
              <Button className="mt-3 w-full" disabled={checkRoll.isPending} onClick={() => checkRoll.mutate({ characterId: check.characterId, kind: check.kind, key: check.key, advantage: "normal", useInspiration: false, checkId: check.id }, {
                onSuccess: (data) => data.secret ? toast.info("Бросок отправлен Мастеру", "Вы не знаете, удалось ли…") : toast[data.success ? "success" : "error"](data.success ? "Проверка пройдена" : "Проверка провалена", `${data.total} против СЛ ${data.dc}`),
              })}><Dices className="h-4 w-4" />Бросить: {check.label}</Button>
            </motion.div>
          ))}
        </div>
      ) : null}

      {music?.playing ? (
        <div className="glass-strong fixed bottom-[5.5rem] left-3 z-[60] flex items-center gap-2 rounded-full px-3 py-1.5 md:bottom-4 md:left-[288px]">
          <Music className="h-3.5 w-3.5 text-gold" /><span className="text-[11px] font-semibold text-parchment">{trackLabel}</span>
          {pos && currentSong ? <span className="font-mono text-[10px] text-muted-ink">{formatDuration(pos.position)} / {formatDuration(currentSong.duration)}</span> : null}
          {needsTap ? <button type="button" onClick={() => { unlockAudio(); engine.current?.resume(); setNeedsTap(false); }} className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">Включить звук</button> : null}
          <input type="range" min={0} max={1} step={0.05} value={localVolume} onChange={(event) => { setLocalVolume(Number(event.target.value)); localStorage.setItem("hub-music-volume", event.target.value); }} className="w-16 accent-[#D4AF37]" aria-label="Громкость" />
          <button type="button" onClick={() => { const next = !muted; setMuted(next); localStorage.setItem("hub-music-muted", next ? "1" : "0"); }} aria-label="Звук">{muted ? <VolumeX className="h-4 w-4 text-red-300" /> : <Volume2 className="h-4 w-4 text-gold" />}</button>
        </div>
      ) : null}
    </>
  );
}
