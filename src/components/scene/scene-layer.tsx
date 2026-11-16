"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Dices, ShieldAlert, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { ABILITY_LABELS } from "@/lib/dnd/catalog";
import { useGroupSaveRoll } from "@/lib/queries";
import { audioReady, playSfx, unlockAudio } from "@/lib/sfx";
import { toast } from "@/lib/toast";
import type { DiceRollDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LivePrompts } from "./live-prompts";

const TIME_TINT: Record<string, string> = {
  dawn: "bg-[linear-gradient(180deg,rgba(255,150,80,0.12),transparent_60%)]",
  day: "",
  dusk: "bg-[linear-gradient(180deg,rgba(120,40,140,0.16),rgba(255,90,40,0.06))]",
  night: "bg-[radial-gradient(circle_at_50%_30%,transparent_20%,rgba(5,10,40,0.55)_90%)]",
};

export function SceneLayer({ big = false }: { big?: boolean }) {
  const { snapshot, isDm, actor } = useHub();
  const scene = snapshot?.board?.scene;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [needsAudio, setNeedsAudio] = useState(false);
  const [rollShown, setRollShown] = useState<DiceRollDto | null>(null);
  const soundRef = useRef<string | null | undefined>(undefined);
  const rollRef = useRef<string | null | undefined>(undefined);
  const msgRef = useRef<Set<string> | null>(null);
  const groupSave = useGroupSaveRoll();

  useEffect(() => {
    const unlock = () => { unlockAudio(); setNeedsAudio(false); };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    const sound = scene?.sound;
    if (soundRef.current === undefined) { soundRef.current = sound?.id ?? null; return; }
    if (sound && sound.id !== soundRef.current) {
      soundRef.current = sound.id;
      if (Date.now() - new Date(sound.at).getTime() < 20000) {
        if (audioReady()) playSfx(sound.effect); else { setNeedsAudio(true); playSfx(sound.effect); }
      }
    }
  }, [scene?.sound]);

  useEffect(() => {
    const latest = snapshot?.rolls[0];
    if (rollRef.current === undefined) { rollRef.current = latest?.id ?? null; return; }
    if (latest && latest.id !== rollRef.current) {
      rollRef.current = latest.id;
      if (localStorage.getItem("hub-dice-3d") !== "off" && Date.now() - new Date(latest.createdAt).getTime() < 15000) {
        setRollShown(latest);
        window.setTimeout(() => setRollShown((current) => current?.id === latest.id ? null : current), big ? 4200 : 2600);
      }
    }
  }, [snapshot?.rolls, big]);

  useEffect(() => {
    if (!snapshot || !actor) return;
    const ids = new Set(snapshot.messages.map((message) => message.id));
    if (!msgRef.current) { msgRef.current = ids; return; }
    for (const message of snapshot.messages) {
      if (msgRef.current.has(message.id)) continue;
      if (message.recipientId === actor.id && message.authorId !== actor.id) {
        const title = message.kind === "secret" ? "📜 Тайная записка от Мастера" : message.kind === "whisper" ? `🤫 Шёпот: ${message.authorName}` : "🔔 Уведомление";
        toast.info(title, message.body.slice(0, 160));
      }
    }
    msgRef.current = ids;
  }, [snapshot, actor]);

  if (!snapshot || !scene) return null;
  const handout = scene.handout && scene.handout.id !== dismissed ? scene.handout : null;
  const request = scene.groupSave;
  const myPending = !isDm && request ? snapshot.characters.filter((character) => character.ownerId === actor?.id && !request.results.some((entry) => entry.characterId === character.id)) : [];

  return (
    <>
      <div aria-hidden className={cn("pointer-events-none fixed inset-0 z-[15] transition-all duration-1000", TIME_TINT[scene.timeOfDay])} />
      {scene.weather !== "clear" ? <div aria-hidden className={cn("pointer-events-none fixed inset-0 z-[16]", `fx-${scene.weather}`)} /> : null}

      <AnimatePresence>
        {handout ? (
          <motion.div key={handout.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-strong relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-5 text-center">
              <button type="button" onClick={() => setDismissed(handout.id)} className="absolute right-3 top-3 rounded-lg border border-white/10 bg-black/40 p-1.5 text-muted-ink hover:text-gold" aria-label="Закрыть"><X className="h-4 w-4" /></button>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold/80">Мастер показывает</p>
              <h2 className="mt-1 font-display text-3xl text-parchment">{handout.title}</h2>
              {handout.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={handout.imageUrl} alt={handout.title} className="mx-auto mt-4 max-h-[60vh] rounded-2xl border border-gold/20 object-contain" />
              ) : null}
              {handout.text ? <p className="mx-auto mt-4 max-w-xl whitespace-pre-wrap font-display text-lg leading-relaxed text-parchment/85">{handout.text}</p> : null}
              <Button variant="outline" className="mt-5" onClick={() => setDismissed(handout.id)}>Закрыть</Button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {rollShown ? (
          <motion.div key={rollShown.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-[80] flex flex-col items-center justify-center">
            <div className="dice3d-scene" style={{ ["--dice-color" as string]: snapshot.profiles.find((profile) => profile.id === rollShown.actorId)?.prefs?.diceColor ?? "#D4AF37" }}><div className={cn("dice3d-cube", `dice3d-mat-${snapshot.profiles.find((profile) => profile.id === rollShown.actorId)?.prefs?.diceMaterial ?? "gold"}`)}>{["1", "20", "7", "13", "4", "17"].map((face, index) => <div key={face} className={`dice3d-face dice3d-f${index}`}>{face}</div>)}</div></div>
            <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.05, type: "spring", stiffness: 260, damping: 14 }} className="glass-strong mt-6 rounded-3xl px-8 py-4 text-center">
              <p className={cn("font-display font-bold tabular-nums", big ? "text-8xl" : "text-6xl", rollShown.detail.critical ? "text-emerald-300" : rollShown.detail.fumble ? "text-red-400" : "gold-text")}>{rollShown.result}</p>
              <p className="mt-1 text-sm text-parchment/80">{rollShown.actorName} · <span className="font-mono text-gold">{rollShown.expression}</span></p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {myPending.length && request ? (
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-strong fixed bottom-24 left-1/2 z-[70] w-[min(26rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl p-4 md:bottom-6">
          <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-gold" /><p className="text-sm font-semibold text-parchment">Мастер требует спасбросок</p></div>
          <p className="mt-1 text-xs text-muted-ink">{request.label || "Групповой спасбросок"} · {ABILITY_LABELS[request.ability].long}, СЛ {request.dc}</p>
          <div className="mt-3 space-y-2">
            {myPending.map((character) => (
              <Button key={character.id} className="w-full" disabled={groupSave.isPending} onClick={() => groupSave.mutate({ campaignId: request && snapshot.campaign ? snapshot.campaign.id : "", characterId: character.id }, { onSuccess: (data) => toast[data.result.success ? "success" : "error"](data.result.success ? "Спасбросок успешен" : "Спасбросок провален", `${character.name}: ${data.result.total}`) })}>
                <Dices className="h-4 w-4" />Бросить за {character.name}
              </Button>
            ))}
          </div>
        </motion.div>
      ) : null}

      <LivePrompts />
      {needsAudio ? (
        <button type="button" onClick={() => { unlockAudio(); setNeedsAudio(false); }} className="glass-strong fixed bottom-24 right-3 z-[70] flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-gold md:bottom-6">
          <Volume2 className="h-4 w-4" />Включить звуки Мастера
        </button>
      ) : null}
    </>
  );
}
