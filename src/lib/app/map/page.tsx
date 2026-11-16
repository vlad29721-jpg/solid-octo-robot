"use client";

import { Eye, EyeOff, ImagePlus, Monitor, Plus, Trash2, Users, Swords } from "lucide-react";
import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { MAP_TOOLS, MapBoard, type MapTool, type TemplateShape } from "@/components/map/map-board";
import { BookCopy, Flame, Save } from "lucide-react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Switch } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import type { MapState, MapToken } from "@/lib/dnd/types";
import { uploadImage, useBoardPatch } from "@/lib/queries";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const COLORS = ["#D4AF37", "#6B8E9F", "#B58BD6", "#6FAF7A", "#C97B4A", "#8B0000", "#4A6FA5", "#9A6B4F"];

export default function MapPage() {
  const { snapshot, campaign, isDm, actor } = useHub();
  const patch = useBoardPatch();
  const [tool, setTool] = useState<MapTool>("move");
  const [brush, setBrush] = useState(3);
  const [radius, setRadius] = useState(20);
  const [selected, setSelected] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [shape, setShape] = useState<TemplateShape>("circle");
  const [drawColor, setDrawColor] = useState("#D4AF37");
  const [mapName, setMapName] = useState("");

  if (!snapshot || !campaign || !snapshot.board) return <PageSkeleton />;
  const map = snapshot.board.map;
  const save = (next: MapState) => patch.mutate({ campaignId: campaign.id, patch: { map: next } });
  const selectedToken = map.tokens.find((token) => token.id === selected) ?? null;
  const freeCell = (index: number) => ({ x: Math.min(map.cols - 1, 1 + (index % 6) * 2), y: Math.min(map.rows - 1, 1 + Math.floor(index / 6) * 2) });

  const addTokens = (tokens: MapToken[]) => {
    if (!tokens.length) { toast.info("Все уже на карте"); return; }
    save({ ...map, tokens: [...map.tokens, ...tokens].slice(0, 100) });
    toast.success("Фишки добавлены", tokens.map((token) => token.name).join(", "));
  };
  const addParty = () => addTokens(snapshot.characters.filter((character) => !map.tokens.some((token) => token.characterId === character.id)).map((character, index) => ({
    id: `token-${crypto.randomUUID()}`, name: character.name, ...freeCell(map.tokens.length + index), color: COLORS[index % 5], size: 1, kind: "character",
    characterId: character.id, combatantId: snapshot.encounter?.state.combatants.find((item) => item.sourceCharacterId === character.id)?.id ?? null, hidden: false,
  })));
  const addCombatants = () => addTokens((snapshot.encounter?.state.combatants ?? []).filter((combatant) => !map.tokens.some((token) => token.combatantId === combatant.id)).map((combatant, index): MapToken | null => {
    const linked = combatant.sourceCharacterId ? map.tokens.find((token) => token.characterId === combatant.sourceCharacterId) : undefined;
    return linked ? null : {
      id: `token-${crypto.randomUUID()}`, name: combatant.name, ...freeCell(map.tokens.length + index), color: combatant.kind === "monster" ? "#8B0000" : combatant.color, size: 1,
      kind: combatant.kind === "monster" ? "monster" as const : "character" as const, characterId: combatant.sourceCharacterId, combatantId: combatant.id, hidden: false,
    };
  }).filter((token): token is MapToken => token !== null));
  const updateToken = (id: string, changes: Partial<MapToken>) => save({ ...map, tokens: map.tokens.map((token) => token.id === id ? { ...token, ...changes } : token) });

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try { save({ ...map, imageUrl: await uploadImage(campaign.id, file) }); toast.success("Карта загружена"); }
    catch (error) { toast.error("Не удалось загрузить", error instanceof Error ? error.message : ""); }
    finally { setUploading(false); }
  };

  const myTokens = map.tokens.filter((token) => token.characterId && snapshot.characters.some((character) => character.id === token.characterId && character.ownerId === actor?.id));

  return (
    <div className="space-y-4 pb-4">
      <PageHeader eyebrow="Поле боя" title="Боевая карта" description={isDm ? "Перетаскивайте фишки, открывайте туман кистью, ставьте зоны заклинаний. Игроки видят изменения через 1–2 секунды." : "Двигайте своего героя по карте. Линейка показывает расстояние в футах."}
        action={isDm ? <Button asChild variant="outline" size="sm"><Link href="/screen" target="_blank"><Monitor className="h-4 w-4" />ТВ-экран</Link></Button> : undefined} />

      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-2.5">
        {MAP_TOOLS.filter((item) => !item.dmOnly || isDm).map((item) => {
          const Icon = item.icon;
          return <Button key={item.id} size="sm" variant={tool === item.id ? "gold" : "glass"} onClick={() => setTool(item.id)}><Icon className="h-3.5 w-3.5" />{item.label}</Button>;
        })}
        {isDm && (tool === "reveal" || tool === "hide") ? <Select value={brush} onChange={(event) => setBrush(Number(event.target.value))} className="h-8 w-28 text-xs"><option value={1}>Кисть 1×1</option><option value={3}>Кисть 3×3</option><option value={5}>Кисть 5×5</option></Select> : null}
        {isDm && tool === "template" ? <Select value={shape} onChange={(event) => setShape(event.target.value as TemplateShape)} className="h-8 w-28 text-xs"><option value="circle">Круг</option><option value="cone">Конус</option><option value="line">Линия</option></Select> : null}
        {(tool === "draw" || tool === "arrow" || tool === "text") ? <span className="flex gap-1">{["#D4AF37", "#ef4444", "#60a5fa", "#4ade80", "#ffffff"].map((color) => <button key={color} type="button" aria-label="Цвет" onClick={() => setDrawColor(color)} className={cn("h-6 w-6 rounded-full border-2", drawColor === color ? "border-white" : "border-transparent")} style={{ background: color }} />)}</span> : null}
        {isDm && tool === "template" ? <Select value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="h-8 w-32 text-xs">{[5, 10, 15, 20, 30, 40, 60].map((value) => <option key={value} value={value}>Радиус {value} фт</option>)}</Select> : null}
        <span className="ml-auto text-[11px] text-muted-ink">{map.cols}×{map.rows} клеток · {map.feetPerCell} фт</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          <MapBoard tool={tool} brush={brush} templateRadius={radius} templateShape={shape} drawColor={drawColor} selectedTokenId={selected} onSelectToken={setSelected} />
          <p className="text-[11px] text-muted-ink">Двойной щелчок — указка для всех. {map.lighting ? "Включено освещение: игроки видят только освещённое и в радиусе тёмного зрения." : ""} {map.name ? `Карта: «${map.name}»` : ""}</p>
        </div>

        <aside className="space-y-3">
          {selectedToken ? (
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2"><p className="font-display text-lg text-parchment">{selectedToken.name}</p><Badge variant={selectedToken.kind === "monster" ? "crimson" : "gold"}>{selectedToken.kind === "monster" ? "Монстр" : selectedToken.kind === "npc" ? "NPC" : "Герой"}</Badge></div>
              <p className="mt-1 text-[11px] text-muted-ink">Клетка {selectedToken.x + 1}:{selectedToken.y + 1}</p>
              {isDm ? (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1.5">{COLORS.map((color) => <button key={color} type="button" aria-label="Цвет" onClick={() => updateToken(selectedToken.id, { color })} className={cn("h-6 w-6 rounded-full border-2", selectedToken.color === color ? "border-white" : "border-transparent")} style={{ background: color }} />)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    <Select value={selectedToken.size} onChange={(event) => updateToken(selectedToken.id, { size: Number(event.target.value) })} className="h-8 w-28 text-xs"><option value={1}>Средний</option><option value={2}>Большой</option><option value={3}>Огромный</option><option value={4}>Громадный</option></Select>
                    <Button size="sm" variant="glass" onClick={() => updateToken(selectedToken.id, { hidden: !selectedToken.hidden })}>{selectedToken.hidden ? <><Eye className="h-3.5 w-3.5" />Показать</> : <><EyeOff className="h-3.5 w-3.5" />Скрыть</>}</Button>
                    <Button size="sm" variant="danger" onClick={() => { save({ ...map, tokens: map.tokens.filter((token) => token.id !== selectedToken.id) }); setSelected(null); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="🔥 Свет, фт"><Select value={selectedToken.light ?? 0} onChange={(event) => updateToken(selectedToken.id, { light: Number(event.target.value) })} className="h-8 text-xs">{[0, 10, 20, 30, 40, 60].map((value) => <option key={value} value={value}>{value ? `${value} фт${value === 20 ? " (факел)" : ""}` : "нет"}</option>)}</Select></FieldGroup>
                    <FieldGroup label="👁 Тёмное зрение"><Select value={selectedToken.darkvision ?? 0} onChange={(event) => updateToken(selectedToken.id, { darkvision: Number(event.target.value) })} className="h-8 text-xs">{[0, 30, 60, 120].map((value) => <option key={value} value={value}>{value ? `${value} фт` : "нет"}</option>)}</Select></FieldGroup>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {isDm ? (
            <>
              <div className="glass space-y-2 rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Фишки</p>
                <Button size="sm" variant="outline" className="w-full" onClick={addParty}><Users className="h-3.5 w-3.5" />Добавить партию</Button>
                <Button size="sm" variant="outline" className="w-full" onClick={addCombatants} disabled={!snapshot.encounter}><Swords className="h-3.5 w-3.5" />Добавить участников боя</Button>
                <div className="flex gap-2">
                  <Input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="NPC или монстр" className="h-9 text-xs" />
                  <Button size="sm" disabled={customName.trim().length < 2} onClick={() => { addTokens([{ id: `token-${crypto.randomUUID()}`, name: customName.trim(), ...freeCell(map.tokens.length), color: "#9A6B4F", size: 1, kind: "npc", characterId: null, combatantId: null, hidden: false }]); setCustomName(""); }}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="glass space-y-3 rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Настройки карты</p>
                <label className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gold/35 bg-gold/5 p-3 text-xs font-semibold text-gold", uploading && "opacity-60")}>
                  {uploading ? <Spinner /> : <ImagePlus className="h-4 w-4" />}Загрузить изображение карты
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => void onUpload(event)} />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <FieldGroup label="Ширина"><Input type="number" min={4} max={60} defaultValue={map.cols} onBlur={(event) => save({ ...map, cols: Math.max(4, Math.min(60, Number(event.target.value) || map.cols)) })} className="h-9" /></FieldGroup>
                  <FieldGroup label="Высота"><Input type="number" min={4} max={60} defaultValue={map.rows} onBlur={(event) => save({ ...map, rows: Math.max(4, Math.min(60, Number(event.target.value) || map.rows)) })} className="h-9" /></FieldGroup>
                  <FieldGroup label="Фт/клетка"><Input type="number" min={1} max={100} defaultValue={map.feetPerCell} onBlur={(event) => save({ ...map, feetPerCell: Math.max(1, Number(event.target.value) || 5) })} className="h-9" /></FieldGroup>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/25 p-2.5"><span className="flex items-center gap-1 text-xs text-parchment"><Flame className="h-3.5 w-3.5 text-orange-300" />Динамическое освещение</span><Switch checked={Boolean(map.lighting)} onCheckedChange={(checked) => save({ ...map, lighting: checked })} /></div>
                <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/25 p-2.5"><span className="text-xs text-parchment">Туман войны</span><Switch checked={map.fogEnabled} onCheckedChange={(checked) => save({ ...map, fogEnabled: checked })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="glass" onClick={() => save({ ...map, revealed: Array.from({ length: map.cols * map.rows }, (_, i) => `${i % map.cols}:${Math.floor(i / map.cols)}`) })}>Открыть всё</Button>
                  <Button size="sm" variant="glass" onClick={() => save({ ...map, revealed: [] })}>Скрыть всё</Button>
                  <Button size="sm" variant="glass" onClick={() => save({ ...map, templates: [] })}>Убрать зоны</Button>
                  <Button size="sm" variant="danger" onClick={() => save({ ...map, imageUrl: null })}>Убрать фон</Button>
                  <Button size="sm" variant="glass" onClick={() => save({ ...map, drawings: [] })}>Стереть рисунки</Button>
                  <Button size="sm" variant="glass" onClick={() => save({ ...map, walls: [] })}>Убрать стены</Button>
                </div>
              </div>
              <div className="glass space-y-2 rounded-2xl p-4">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-gold"><BookCopy className="h-3.5 w-3.5" />Библиотека карт</p>
                {(snapshot.board.world.maps ?? []).map((saved) => (
                  <div key={saved.id} className={cn("flex items-center gap-2 rounded-xl border p-2", saved.name === map.name ? "border-gold/50 bg-gold/10" : "border-white/[0.07] bg-black/25")}>
                    <span className="flex-1 truncate text-xs text-parchment">{saved.name}</span>
                    <Button size="sm" variant="glass" className="h-7 text-[11px]" disabled={saved.name === map.name} onClick={() => {
                      const library = (snapshot.board?.world.maps ?? []).map((entry) => entry.name === map.name ? { ...entry, state: map } : entry);
                      patch.mutate({ campaignId: campaign.id, patch: { map: saved.state, world: { ...snapshot.board!.world, maps: library } } });
                      toast.success(`Открыта карта «${saved.name}»`);
                    }}>Открыть</Button>
                    <button type="button" aria-label="Удалить" onClick={() => patch.mutate({ campaignId: campaign.id, patch: { world: { ...snapshot.board!.world, maps: (snapshot.board?.world.maps ?? []).filter((entry) => entry.id !== saved.id) } } })}><Trash2 className="h-3.5 w-3.5 text-muted-ink" /></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input value={mapName} onChange={(event) => setMapName(event.target.value)} placeholder={map.name ?? "Таверна, Подземелье…"} className="h-9 text-xs" />
                  <Button size="sm" disabled={!(mapName.trim() || map.name)} onClick={() => {
                    const name = (mapName.trim() || map.name || "Карта").slice(0, 80);
                    const state = { ...map, name };
                    const library = snapshot.board?.world.maps ?? [];
                    const exists = library.some((entry) => entry.name === name);
                    const maps = exists ? library.map((entry) => entry.name === name ? { ...entry, state } : entry) : [...library, { id: `map-${Date.now()}`, name, state }].slice(-15);
                    patch.mutate({ campaignId: campaign.id, patch: { map: state, world: { ...snapshot.board!.world, maps } } });
                    setMapName(""); toast.success(exists ? "Карта обновлена" : "Карта сохранена в библиотеку");
                  }}><Save className="h-3.5 w-3.5" /></Button>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => {
                  const library = (snapshot.board?.world.maps ?? []).map((entry) => entry.name === map.name ? { ...entry, state: map } : entry);
                  patch.mutate({ campaignId: campaign.id, patch: { map: { imageUrl: null, cols: 24, rows: 16, feetPerCell: 5, fogEnabled: false, revealed: [], tokens: [], templates: [], walls: [], drawings: [], name: `Новая карта ${library.length + 1}` }, world: { ...snapshot.board!.world, maps: library } } });
                }}><Plus className="h-3.5 w-3.5" />Новая пустая карта</Button>
              </div>
            </>
          ) : (
            <div className="glass rounded-2xl p-4 text-xs leading-relaxed text-muted-ink">
              <p className="mb-2 text-sm font-semibold text-parchment">Ваши фишки</p>
              {myTokens.length ? myTokens.map((token) => <p key={token.id}>• {token.name} — клетка {token.x + 1}:{token.y + 1}</p>) : <p>Мастер ещё не поставил вашего героя на карту.</p>}
              <p className="mt-3">Включите «Двигать» и перетащите свою фишку. Тёмные области скрыты туманом войны.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
