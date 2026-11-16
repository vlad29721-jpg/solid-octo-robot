"use client";

import { Dices, EyeOff, Music, Square, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Input, Select, Switch } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { ABILITY_KEYS, ABILITY_LABELS, SKILL_DEFS, SKILL_KEYS } from "@/lib/dnd/catalog";
import type { MusicTrack, SceneState } from "@/lib/dnd/types";
import { TRACKS } from "@/lib/music";
import { useBoardPatch, useRollDice } from "@/lib/queries";
import { unlockAudio } from "@/lib/sfx";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function useScene() {
  const { snapshot, campaign } = useHub();
  const patch = useBoardPatch();
  const scene = snapshot?.board?.scene;
  const save = (next: SceneState) => campaign && patch.mutate({ campaignId: campaign.id, patch: { scene: next } });
  return { snapshot, campaign, scene, save };
}

export function ChecksPanel() {
  const { snapshot, scene, save } = useScene();
  const [characterId, setCharacterId] = useState("");
  const [check, setCheck] = useState("skill:perception");
  const [dc, setDc] = useState(15);
  const [secret, setSecret] = useState(true);
  if (!snapshot || !scene) return null;
  const characters = snapshot.characters;
  const target = characters.find((entry) => entry.id === characterId) ?? characters[0];
  const checks = scene.checks ?? [];
  const [kind, key] = check.split(":") as ["skill" | "ability" | "save", string];
  const label = kind === "skill" ? SKILL_DEFS[key as keyof typeof SKILL_DEFS].label : `${kind === "save" ? "Спасбросок" : "Проверка"} ${ABILITY_LABELS[key as keyof typeof ABILITY_LABELS].long}`;
  return (
    <section className="glass space-y-3 rounded-2xl p-5">
      <div className="flex items-center gap-2"><Target className="h-4 w-4 text-gold" /><h2 className="font-display text-xl text-parchment">Проверка у игрока</h2></div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={target?.id ?? ""} onChange={(event) => setCharacterId(event.target.value)}>{characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select>
        <Select value={check} onChange={(event) => setCheck(event.target.value)}>
          <optgroup label="Навыки">{SKILL_KEYS.map((skill) => <option key={skill} value={`skill:${skill}`}>{SKILL_DEFS[skill].label}</option>)}</optgroup>
          <optgroup label="Проверки">{ABILITY_KEYS.map((ability) => <option key={ability} value={`ability:${ability}`}>{ABILITY_LABELS[ability].long}</option>)}</optgroup>
          <optgroup label="Спасброски">{ABILITY_KEYS.map((ability) => <option key={ability} value={`save:${ability}`}>Спасбросок {ABILITY_LABELS[ability].long}</option>)}</optgroup>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-ink">СЛ</span><Input type="number" min={1} max={40} value={dc} onChange={(event) => setDc(Number(event.target.value))} className="h-9 w-20" />
        <label className="flex items-center gap-2 text-xs text-parchment"><Switch checked={secret} onCheckedChange={setSecret} />Тайно (игрок не узнает результат)</label>
      </div>
      <Button className="w-full" disabled={!target} onClick={() => target && save({ ...scene, checks: [...checks, { id: `chk-${Date.now()}`, characterId: target.id, characterName: target.name, ownerId: target.ownerId, kind, key, label, dc: Math.max(1, dc), secret, createdAt: new Date().toISOString(), result: null }].slice(-30) })}><Target className="h-4 w-4" />Попросить: {target?.name} — {label}</Button>
      {checks.length ? (
        <div className="space-y-1.5">
          {[...checks].reverse().map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2 text-xs">
              {entry.secret ? <EyeOff className="h-3.5 w-3.5 text-red-300" /> : null}
              <span className="flex-1 text-parchment">{entry.characterName}: {entry.label} (СЛ {entry.dc})</span>
              {entry.result ? <><span className="font-mono text-muted-ink">d20={entry.result.roll}</span><span className="font-display text-base text-parchment">{entry.result.total}</span><Badge variant={entry.result.success ? "success" : "crimson"}>{entry.result.success ? "Успех" : "Провал"}</Badge></> : <span className="text-muted-ink">ждём…</span>}
              <button type="button" aria-label="Убрать" onClick={() => save({ ...scene, checks: checks.filter((item) => item.id !== entry.id) })}><Trash2 className="h-3.5 w-3.5 text-muted-ink" /></button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function SecretRollPanel() {
  const { campaign } = useScene();
  const roll = useRollDice();
  const [expression, setExpression] = useState("1d20");
  if (!campaign) return null;
  return (
    <section className="glass space-y-3 rounded-2xl p-5">
      <div className="flex items-center gap-2"><EyeOff className="h-4 w-4 text-gold" /><h2 className="font-display text-xl text-parchment">Тайный бросок Мастера</h2></div>
      <p className="text-xs text-muted-ink">Результат увидите только вы — в журнале бросков он помечен замком.</p>
      <div className="flex gap-2">
        <Input value={expression} onChange={(event) => setExpression(event.target.value)} className="font-mono" />
        <Button disabled={roll.isPending} onClick={() => roll.mutate({ campaignId: campaign.id, expression, hidden: true }, { onSuccess: (data) => toast.info(`🔒 ${data.roll.expression} = ${data.roll.result}`, data.roll.detail.breakdown) })}><Dices className="h-4 w-4" />Бросить тайно</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">{["1d20", "1d100", "2d6", "1d20+5", "4d6"].map((preset) => <button key={preset} type="button" onClick={() => setExpression(preset)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 font-mono text-[11px] text-parchment/75">{preset}</button>)}</div>
    </section>
  );
}

export function MusicPanel() {
  const { scene, save } = useScene();
  const [url, setUrl] = useState("");
  if (!scene) return null;
  const music = scene.music;
  const start = (track: MusicTrack, customUrl: string | null = null) => { unlockAudio(); save({ ...scene, music: { track, customUrl, playing: true, volume: music?.volume ?? 0.7, startedAt: new Date().toISOString() } }); };
  return (
    <section className="glass space-y-3 rounded-2xl p-5">
      <div className="flex items-center gap-2"><Music className="h-4 w-4 text-gold" /><h2 className="font-display text-xl text-parchment">Музыка для всех</h2>{music?.playing ? <Badge variant="success" className="ml-auto">Играет</Badge> : null}</div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {(Object.keys(TRACKS) as (keyof typeof TRACKS)[]).map((key) => (
          <button key={key} type="button" onClick={() => start(key)} className={cn("rounded-2xl border p-2.5 text-center", music?.playing && music.track === key ? "border-gold/60 bg-gold/15" : "border-white/10 bg-black/30 hover:border-gold/40")}>
            <span className="text-2xl">{TRACKS[key].emoji}</span><span className="mt-1 block text-[11px] text-parchment">{TRACKS[key].label}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2"><Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Ссылка на свой mp3 (прямая)" className="h-9 text-xs" /><Button size="sm" variant="outline" disabled={!/^https?:\/\//.test(url)} onClick={() => start("custom", url)}>Играть</Button></div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-ink">Громкость для всех</span>
        <input type="range" min={0} max={1} step={0.05} value={music?.volume ?? 0.7} onChange={(event) => music && save({ ...scene, music: { ...music, volume: Number(event.target.value) } })} className="flex-1 accent-[#D4AF37]" />
        <Button size="sm" variant="danger" disabled={!music?.playing} onClick={() => music && save({ ...scene, music: { ...music, playing: false } })}><Square className="h-3.5 w-3.5" />Стоп</Button>
      </div>
      <p className="text-[11px] text-muted-ink">Мелодии генерируются прямо в браузере, ноты совпадают у всех. Каждый игрок может убавить громкость у себя.</p>
    </section>
  );
}
