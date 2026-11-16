"use client";

import Link from "next/link";
import { CloudRain, Eye, EyeOff, ImagePlus, Monitor, ShieldAlert, Sparkles, Volume2, X } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import { EmptyState } from "@/components/empty-state";
import { ABILITY_KEYS, ABILITY_LABELS } from "@/lib/dnd/catalog";
import type { AbilityKey, SceneState, TimeOfDay, Weather } from "@/lib/dnd/types";
import { uploadImage, useBoardPatch } from "@/lib/queries";
import { playSfx, SFX_LIST, unlockAudio } from "@/lib/sfx";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ChecksPanel, MusicPanel, SecretRollPanel } from "@/components/scene/scene-extras";

const WEATHER: { id: Weather; label: string; emoji: string }[] = [
  { id: "clear", label: "Ясно", emoji: "☀️" }, { id: "rain", label: "Дождь", emoji: "🌧️" }, { id: "storm", label: "Гроза", emoji: "⛈️" },
  { id: "snow", label: "Снег", emoji: "❄️" }, { id: "fog", label: "Туман", emoji: "🌫️" },
];
const TIMES: { id: TimeOfDay; label: string; emoji: string }[] = [
  { id: "dawn", label: "Рассвет", emoji: "🌅" }, { id: "day", label: "День", emoji: "🌞" }, { id: "dusk", label: "Закат", emoji: "🌇" }, { id: "night", label: "Ночь", emoji: "🌙" },
];

export default function ScenePage() {
  const { snapshot, campaign, isDm } = useHub();
  const patch = useBoardPatch();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ability, setAbility] = useState<AbilityKey>("dex");
  const [dc, setDc] = useState(13);
  const [label, setLabel] = useState("");
  const [dice3d, setDice3d] = useState(() => typeof window === "undefined" || localStorage.getItem("hub-dice-3d") !== "off");

  if (!snapshot || !campaign || !snapshot.board) return <PageSkeleton />;
  if (!isDm) return <EmptyState title="Панель Мастера" description="Этот раздел доступен только Мастеру кампании." icon={Sparkles} />;
  const scene = snapshot.board.scene;
  const save = (next: SceneState) => patch.mutate({ campaignId: campaign.id, patch: { scene: next } });

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try { setImageUrl(await uploadImage(campaign.id, file)); } catch (error) { toast.error("Ошибка загрузки", error instanceof Error ? error.message : ""); } finally { setUploading(false); }
  };

  const results = scene.groupSave?.results ?? [];
  const players = snapshot.characters;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader eyebrow="Ширма Мастера" title="Сцена и атмосфера" description="Всё, что вы делаете здесь, мгновенно появляется у игроков: картинки, звуки, погода и требования спасбросков."
        action={<Button asChild variant="outline" size="sm"><Link href="/screen" target="_blank"><Monitor className="h-4 w-4" />Открыть ТВ-экран</Link></Button>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass space-y-3 rounded-2xl p-5">
          <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-gold" /><h2 className="font-display text-xl text-parchment">Показать игрокам</h2>{scene.handout ? <Badge variant="success" className="ml-auto">Показано: {scene.handout.title}</Badge> : null}</div>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Заголовок: Письмо от барона, Портрет незнакомца…" />
          <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Текст письма, надпись на стене, описание…" />
          <label className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gold/35 bg-gold/5 p-3 text-xs font-semibold text-gold", uploading && "opacity-60")}>
            {uploading ? <Spinner /> : <ImagePlus className="h-4 w-4" />}{imageUrl ? "Изображение загружено ✓ (заменить)" : "Добавить изображение"}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => void onUpload(event)} />
          </label>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="max-h-40 rounded-xl border border-white/10" />
          ) : null}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!title.trim() && !imageUrl && !text.trim()} onClick={() => { save({ ...scene, handout: { id: `h-${Date.now()}`, title: title.trim() || "Без названия", text, imageUrl, shownAt: new Date().toISOString() } }); toast.success("Показано всем игрокам"); }}><Eye className="h-4 w-4" />Показать всем</Button>
            {scene.handout ? <Button variant="ghost" onClick={() => save({ ...scene, handout: null })}><EyeOff className="h-4 w-4" />Убрать</Button> : null}
          </div>
        </section>

        <section className="glass space-y-3 rounded-2xl p-5">
          <div className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-gold" /><h2 className="font-display text-xl text-parchment">Звуковые эффекты</h2></div>
          <p className="text-xs text-muted-ink">Звук прозвучит у всех игроков, которые хотя бы раз нажали на сайт (так требуют браузеры).</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SFX_LIST.map((sfx) => (
              <button key={sfx.id} type="button" onClick={() => { unlockAudio(); playSfx(sfx.id); save({ ...scene, sound: { id: `s-${Date.now()}`, effect: sfx.id, at: new Date().toISOString() } }); }}
                className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center transition hover:border-gold/50 hover:bg-gold/10 active:scale-95">
                <span className="text-2xl">{sfx.emoji}</span><span className="mt-1 block text-[11px] font-semibold text-parchment">{sfx.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/25 p-2.5">
            <span className="text-xs text-parchment">3D-кубики на этом устройстве</span>
            <Switch checked={dice3d} onCheckedChange={(checked) => { setDice3d(checked); localStorage.setItem("hub-dice-3d", checked ? "on" : "off"); }} />
          </div>
        </section>

        <section className="glass space-y-3 rounded-2xl p-5">
          <div className="flex items-center gap-2"><CloudRain className="h-4 w-4 text-gold" /><h2 className="font-display text-xl text-parchment">Погода и время суток</h2></div>
          <div className="grid grid-cols-5 gap-2">
            {WEATHER.map((item) => <button key={item.id} type="button" onClick={() => save({ ...scene, weather: item.id })} className={cn("rounded-xl border p-2 text-center text-[11px]", scene.weather === item.id ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 bg-black/30 text-parchment/75")}><span className="block text-xl">{item.emoji}</span>{item.label}</button>)}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {TIMES.map((item) => <button key={item.id} type="button" onClick={() => save({ ...scene, timeOfDay: item.id })} className={cn("rounded-xl border p-2 text-center text-[11px]", scene.timeOfDay === item.id ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 bg-black/30 text-parchment/75")}><span className="block text-xl">{item.emoji}</span>{item.label}</button>)}
          </div>
        </section>

        <section className="glass space-y-3 rounded-2xl p-5">
          <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-gold" /><h2 className="font-display text-xl text-parchment">Групповой спасбросок</h2></div>
          {scene.groupSave ? (
            <>
              <div className="flex flex-wrap items-center gap-2"><Badge variant="gold">{ABILITY_LABELS[scene.groupSave.ability].long} · СЛ {scene.groupSave.dc}</Badge><span className="text-xs text-muted-ink">{scene.groupSave.label}</span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => save({ ...scene, groupSave: null })}><X className="h-3.5 w-3.5" />Закрыть</Button></div>
              <div className="space-y-1.5">
                {players.map((character) => {
                  const result = results.find((entry) => entry.characterId === character.id);
                  return (
                    <div key={character.id} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2 text-sm">
                      <span className="flex-1 text-parchment">{character.name}</span>
                      {result ? <><span className="font-mono text-xs text-muted-ink">d20={result.roll}</span><span className="font-display text-lg tabular-nums text-parchment">{result.total}</span><Badge variant={result.success ? "success" : "crimson"}>{result.success ? "Успех" : "Провал"}</Badge></> : <span className="text-xs text-muted-ink">ждём броска…</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-ink">Успехов: {results.filter((entry) => entry.success).length} из {results.length}. Вы можете бросить за персонажа из его листа или подождать игроков.</p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <FieldGroup label="Характеристика"><Select value={ability} onChange={(event) => setAbility(event.target.value as AbilityKey)}>{ABILITY_KEYS.map((key) => <option key={key} value={key}>{ABILITY_LABELS[key].long}</option>)}</Select></FieldGroup>
                <FieldGroup label="Сложность (СЛ)"><Input type="number" min={1} max={40} value={dc} onChange={(event) => setDc(Number(event.target.value))} /></FieldGroup>
              </div>
              <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Причина: Огненный шар, обвал потолка…" />
              <Button className="w-full" onClick={() => save({ ...scene, groupSave: { id: `gs-${Date.now()}`, ability, dc: Math.max(1, dc || 10), label, createdAt: new Date().toISOString(), results: [] } })}><ShieldAlert className="h-4 w-4" />Потребовать от всех</Button>
            </>
          )}
        </section>
        <ChecksPanel />
        <MusicPanel />
        <SecretRollPanel />
      </div>
      <p className="text-center text-xs text-muted-ink">Тайные записки отдельным игрокам отправляются из <Link href="/chat" className="text-gold underline">чата</Link>: выберите получателя и отметьте «Тайная записка».</p>
    </div>
  );
}
