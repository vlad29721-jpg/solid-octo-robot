"use client";

import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Circle, Eye, EyeOff, ImagePlus, MapPin, Plus, ScrollText, Trash2, Users, XCircle } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import { Avatar } from "@/components/dnd/avatar";
import { EmptyState } from "@/components/empty-state";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import type { LocationEntry, NpcEntry, Quest, WorldState } from "@/lib/dnd/types";
import { uploadImage, useBoardPatch } from "@/lib/queries";
import { toast } from "@/lib/toast";
import { cn, formatDate } from "@/lib/utils";
import { AttendancePanel, ChroniclePanel, PollsPanel } from "@/components/world/world-extras";
import { useTelegramRemind } from "@/lib/queries";
import { BookOpenText, ClipboardCheck, Send, Vote } from "lucide-react";

type Tab = "quests" | "npcs" | "map" | "calendar" | "polls" | "attendance" | "chronicle";
const TABS: TabItem<Tab>[] = [
  { value: "quests", label: "Квесты", icon: ScrollText },
  { value: "npcs", label: "NPC", icon: Users },
  { value: "map", label: "Карта мира", icon: MapPin },
  { value: "calendar", label: "Календарь", icon: CalendarDays },
  { value: "polls", label: "Голосования", icon: Vote },
  { value: "attendance", label: "Посещения", icon: ClipboardCheck },
  { value: "chronicle", label: "Хроника", icon: BookOpenText },
];
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const ATTITUDE = { friendly: { label: "Друг", variant: "success" as const }, neutral: { label: "Нейтрален", variant: "outline" as const }, hostile: { label: "Враг", variant: "crimson" as const } };

function Countdown({ at }: { at: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const diff = new Date(at).getTime() - now;
  if (diff <= 0) return <p className="font-display text-3xl text-emerald-300">Игра началась!</p>;
  const d = Math.floor(diff / 86400000); const h = Math.floor(diff / 3600000) % 24; const m = Math.floor(diff / 60000) % 60; const s = Math.floor(diff / 1000) % 60;
  return (
    <div className="flex justify-center gap-3">
      {[[d, "дн"], [h, "ч"], [m, "мин"], [s, "сек"]].map(([value, label]) => (
        <div key={label} className="glass min-w-16 rounded-2xl px-3 py-2 text-center"><p className="font-display text-3xl tabular-nums text-gold">{String(value).padStart(2, "0")}</p><p className="text-[10px] uppercase text-muted-ink">{label}</p></div>
      ))}
    </div>
  );
}

export default function WorldPage() {
  const { snapshot, campaign, isDm } = useHub();
  const patch = useBoardPatch();
  const remind = useTelegramRemind();
  const [tab, setTab] = useState<Tab>("quests");
  const [quest, setQuest] = useState({ title: "", description: "", reward: "" });
  const [npc, setNpc] = useState({ name: "", role: "", description: "", relations: "", secret: "", attitude: "neutral" as NpcEntry["attitude"] });
  const [location, setLocation] = useState({ name: "", description: "" });
  const [placing, setPlacing] = useState<string | null>(null);
  const [sessionAt, setSessionAt] = useState("");
  const [sessionNote, setSessionNote] = useState("");

  if (!snapshot || !campaign || !snapshot.board) return <PageSkeleton />;
  const world = snapshot.board.world;
  const save = (next: WorldState) => patch.mutate({ campaignId: campaign.id, patch: { world: next } });
  const setQuests = (quests: Quest[]) => save({ ...world, quests });
  const setNpcs = (npcs: NpcEntry[]) => save({ ...world, npcs });
  const setLocations = (locations: LocationEntry[]) => save({ ...world, locations });

  const upload = async (event: ChangeEvent<HTMLInputElement>, apply: (url: string) => void) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try { apply(await uploadImage(campaign.id, file)); toast.success("Изображение загружено"); }
    catch (error) { toast.error("Ошибка загрузки", error instanceof Error ? error.message : ""); }
  };

  const statusIcon = { active: Circle, done: CheckCircle2, failed: XCircle };
  const nextStatus: Record<Quest["status"], Quest["status"]> = { active: "done", done: "failed", failed: "active" };

  return (
    <div className="space-y-5 pb-4">
      <PageHeader eyebrow="Летопись мира" title="Мир кампании" description={isDm ? "Скрытые записи (значок глаза) игроки не видят. Тайны NPC видны только вам." : "Всё, что открыл Мастер: задания, знакомые лица и места."} />
      <Tabs value={tab} onValueChange={setTab} items={TABS} />

      {tab === "quests" ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-2.5 lg:col-span-2">
            {world.quests.length ? (["active", "done", "failed"] as const).map((status) => {
              const list = world.quests.filter((item) => item.status === status);
              if (!list.length) return null;
              return (
                <div key={status} className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{status === "active" ? "Активные" : status === "done" ? "Выполненные" : "Проваленные"}</p>
                  {list.map((item) => {
                    const Icon = statusIcon[item.status];
                    return (
                      <motion.div key={item.id} layout className={cn("parchment-panel flex gap-3 rounded-2xl p-4", item.status !== "active" && "opacity-70", item.hidden && "border-dashed")}>
                        <button type="button" disabled={!isDm} onClick={() => setQuests(world.quests.map((entry) => entry.id === item.id ? { ...entry, status: nextStatus[entry.status] } : entry))} title="Сменить статус"><Icon className={cn("h-5 w-5", item.status === "done" ? "text-emerald-400" : item.status === "failed" ? "text-red-400" : "text-gold")} /></button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><p className={cn("font-display text-lg text-parchment", item.status === "done" && "line-through")}>{item.title}</p>{item.hidden ? <Badge variant="crimson">Скрыт</Badge> : null}</div>
                          <p className="mt-1 text-sm leading-relaxed text-parchment/75">{item.description}</p>
                          {item.reward ? <p className="mt-1 text-xs text-gold">Награда: {item.reward}</p> : null}
                        </div>
                        {isDm ? <div className="flex flex-col gap-1"><Button size="icon-sm" variant="glass" onClick={() => setQuests(world.quests.map((entry) => entry.id === item.id ? { ...entry, hidden: !entry.hidden } : entry))}>{item.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</Button><Button size="icon-sm" variant="danger" onClick={() => setQuests(world.quests.filter((entry) => entry.id !== item.id))}><Trash2 className="h-3.5 w-3.5" /></Button></div> : null}
                      </motion.div>
                    );
                  })}
                </div>
              );
            }) : <EmptyState compact title="Квестов пока нет" description="Мастер добавит задания по ходу истории." icon={ScrollText} />}
          </div>
          {isDm ? (
            <div className="glass h-fit space-y-3 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Новый квест</p>
              <Input value={quest.title} onChange={(event) => setQuest({ ...quest, title: event.target.value })} placeholder="Название" />
              <Textarea value={quest.description} onChange={(event) => setQuest({ ...quest, description: event.target.value })} placeholder="Описание задания" />
              <Input value={quest.reward} onChange={(event) => setQuest({ ...quest, reward: event.target.value })} placeholder="Награда" />
              <Button className="w-full" disabled={!quest.title.trim()} onClick={() => { setQuests([...world.quests, { id: uid("q"), ...quest, title: quest.title.trim(), status: "active", hidden: false }]); setQuest({ title: "", description: "", reward: "" }); }}><Plus className="h-4 w-4" />Добавить</Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "npcs" ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
            {world.npcs.length ? world.npcs.map((item) => (
              <div key={item.id} className={cn("glass rounded-2xl p-4", item.hidden && "border-dashed opacity-80")}>
                <div className="flex items-start gap-3">
                  <label className={cn(isDm && "cursor-pointer")}>
                    <Avatar name={item.name} src={item.portraitUrl} size="lg" />
                    {isDm ? <input type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event, (url) => setNpcs(world.npcs.map((entry) => entry.id === item.id ? { ...entry, portraitUrl: url } : entry)))} /> : null}
                  </label>
                  <div className="min-w-0 flex-1"><p className="font-display text-lg text-parchment">{item.name}</p><p className="text-xs text-muted-ink">{item.role}</p><div className="mt-1 flex gap-1"><Badge variant={ATTITUDE[item.attitude].variant}>{ATTITUDE[item.attitude].label}</Badge>{item.hidden ? <Badge variant="crimson">Скрыт</Badge> : null}</div></div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-parchment/75">{item.description}</p>
                {item.relations ? <p className="mt-2 text-[11px] text-sky-200/80">🔗 {item.relations}</p> : null}
                {isDm && item.secret ? <p className="mt-2 rounded-lg border border-crimson/30 bg-crimson/10 p-2 text-[11px] text-red-200">🤫 {item.secret}</p> : null}
                {isDm ? (
                  <div className="mt-3 flex gap-1.5">
                    <Select value={item.attitude} onChange={(event) => setNpcs(world.npcs.map((entry) => entry.id === item.id ? { ...entry, attitude: event.target.value as NpcEntry["attitude"] } : entry))} className="h-8 flex-1 text-xs"><option value="friendly">Друг</option><option value="neutral">Нейтрален</option><option value="hostile">Враг</option></Select>
                    <Button size="icon-sm" variant="glass" onClick={() => setNpcs(world.npcs.map((entry) => entry.id === item.id ? { ...entry, hidden: !entry.hidden } : entry))}>{item.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</Button>
                    <Button size="icon-sm" variant="danger" onClick={() => setNpcs(world.npcs.filter((entry) => entry.id !== item.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : null}
              </div>
            )) : <div className="sm:col-span-2"><EmptyState compact title="Пока ни с кем не знакомы" description="Мастер откроет NPC, когда партия их встретит." icon={Users} /></div>}
          </div>
          {isDm ? (
            <div className="glass h-fit space-y-2.5 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Новый NPC</p>
              <Input value={npc.name} onChange={(event) => setNpc({ ...npc, name: event.target.value })} placeholder="Имя" />
              <Input value={npc.role} onChange={(event) => setNpc({ ...npc, role: event.target.value })} placeholder="Роль (трактирщик, барон…)" />
              <Select value={npc.attitude} onChange={(event) => setNpc({ ...npc, attitude: event.target.value as NpcEntry["attitude"] })}><option value="friendly">Друг</option><option value="neutral">Нейтрален</option><option value="hostile">Враг</option></Select>
              <Textarea value={npc.description} onChange={(event) => setNpc({ ...npc, description: event.target.value })} placeholder="Внешность и характер" />
              <Input value={npc.relations} onChange={(event) => setNpc({ ...npc, relations: event.target.value })} placeholder="Связи: кто кому враг или друг" />
              <Textarea value={npc.secret} onChange={(event) => setNpc({ ...npc, secret: event.target.value })} placeholder="Тайна (видна только Мастеру)" className="min-h-16" />
              <Button className="w-full" disabled={!npc.name.trim()} onClick={() => { setNpcs([...world.npcs, { id: uid("n"), ...npc, name: npc.name.trim(), portraitUrl: null, hidden: true }]); setNpc({ name: "", role: "", description: "", relations: "", secret: "", attitude: "neutral" }); toast.info("NPC добавлен скрытым", "Откройте его игрокам кнопкой с глазом."); }}><Plus className="h-4 w-4" />Добавить</Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "map" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="glass overflow-hidden rounded-2xl p-2">
            {world.worldMapUrl ? (
              <div className={cn("relative", placing && "cursor-crosshair")} onClick={(event) => {
                if (!placing || !isDm) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const x = Math.round(((event.clientX - rect.left) / rect.width) * 1000) / 10;
                const y = Math.round(((event.clientY - rect.top) / rect.height) * 1000) / 10;
                setLocations(world.locations.map((entry) => entry.id === placing ? { ...entry, x, y } : entry));
                setPlacing(null);
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={world.worldMapUrl} alt="Карта мира" className="w-full rounded-xl" draggable={false} />
                {world.locations.filter((entry) => entry.x !== null && entry.y !== null).map((entry) => (
                  <div key={entry.id} className="group absolute -translate-x-1/2 -translate-y-full" style={{ left: `${entry.x}%`, top: `${entry.y}%` }}>
                    <MapPin className={cn("h-7 w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]", entry.hidden ? "text-white/40" : entry.visited ? "text-gold" : "text-red-400")} fill="currentColor" />
                    <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-ink/90 px-1.5 py-0.5 text-[10px] font-semibold text-parchment">{entry.name}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState compact title="Карта мира не загружена" description={isDm ? "Загрузите изображение карты справа." : "Мастер ещё не показал карту мира."} icon={MapPin} />}
            {placing ? <p className="mt-2 text-center text-xs text-gold">Нажмите на карту, чтобы поставить метку</p> : null}
          </div>
          <div className="space-y-3">
            {isDm ? (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gold/35 bg-gold/5 p-3 text-xs font-semibold text-gold">
                <ImagePlus className="h-4 w-4" />Загрузить карту мира
                <input type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event, (url) => save({ ...world, worldMapUrl: url }))} />
              </label>
            ) : null}
            <div className="glass space-y-2 rounded-2xl p-3">
              {world.locations.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-white/[0.07] bg-black/25 p-2.5">
                  <div className="flex items-center gap-2"><MapPin className={cn("h-4 w-4", entry.visited ? "text-gold" : "text-red-400")} /><p className="flex-1 text-sm text-parchment">{entry.name}</p>{entry.hidden ? <Badge variant="crimson">Скрыто</Badge> : null}{entry.visited ? <Badge variant="gold">Посещено</Badge> : null}</div>
                  <p className="mt-1 text-[11px] text-muted-ink">{entry.description}</p>
                  {isDm ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button size="sm" variant={placing === entry.id ? "gold" : "glass"} className="h-7 text-[11px]" onClick={() => setPlacing(placing === entry.id ? null : entry.id)}>На карту</Button>
                      <Button size="sm" variant="glass" className="h-7 text-[11px]" onClick={() => setLocations(world.locations.map((item) => item.id === entry.id ? { ...item, visited: !item.visited } : item))}>{entry.visited ? "Не посещено" : "Посещено"}</Button>
                      <Button size="icon-sm" variant="glass" className="h-7" onClick={() => setLocations(world.locations.map((item) => item.id === entry.id ? { ...item, hidden: !item.hidden } : item))}>{entry.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</Button>
                      <Button size="icon-sm" variant="danger" className="h-7" onClick={() => setLocations(world.locations.filter((item) => item.id !== entry.id))}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ) : null}
                </div>
              ))}
              {!world.locations.length ? <p className="py-4 text-center text-xs text-muted-ink">Локаций пока нет.</p> : null}
            </div>
            {isDm ? (
              <div className="glass space-y-2 rounded-2xl p-3">
                <Input value={location.name} onChange={(event) => setLocation({ ...location, name: event.target.value })} placeholder="Новая локация" />
                <Input value={location.description} onChange={(event) => setLocation({ ...location, description: event.target.value })} placeholder="Описание" />
                <Button size="sm" className="w-full" disabled={!location.name.trim()} onClick={() => { const id = uid("l"); setLocations([...world.locations, { id, name: location.name.trim(), description: location.description, visited: false, hidden: false, x: null, y: null }]); setLocation({ name: "", description: "" }); setPlacing(id); }}><Plus className="h-4 w-4" />Добавить и поставить</Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "polls" ? <PollsPanel /> : null}
      {tab === "attendance" ? <AttendancePanel /> : null}
      {tab === "chronicle" ? <ChroniclePanel /> : null}

      {tab === "calendar" ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="parchment-panel rounded-3xl p-6 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-gold" />
            {world.nextSession ? (
              <>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gold/80">Следующая игра</p>
                <p className="mt-1 font-display text-2xl text-parchment">{world.nextSession.note || "Сессия"}</p>
                <p className="mt-1 text-sm text-muted-ink">{formatDate(world.nextSession.at, true)}</p>
                <div className="mt-5"><Countdown at={world.nextSession.at} /></div>
              </>
            ) : <p className="mt-3 text-sm text-muted-ink">Дата следующей сессии ещё не назначена.</p>}
          </div>
          {isDm ? (
            <div className="glass space-y-3 rounded-2xl p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldGroup label="Дата и время"><Input type="datetime-local" value={sessionAt} onChange={(event) => setSessionAt(event.target.value)} /></FieldGroup>
                <FieldGroup label="Подпись"><Input value={sessionNote} onChange={(event) => setSessionNote(event.target.value)} placeholder="Сессия 6: Катакомбы" /></FieldGroup>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" disabled={!sessionAt} onClick={() => { save({ ...world, nextSession: { at: new Date(sessionAt).toISOString(), note: sessionNote } }); toast.success("Сессия назначена", "Игроки увидят обратный отсчёт."); }}>Назначить</Button>
                {world.nextSession ? <Button variant="ghost" onClick={() => save({ ...world, nextSession: null })}>Снять</Button> : null}
                {world.nextSession ? <Button variant="outline" disabled={remind.isPending || !snapshot.capabilities.telegram} title={snapshot.capabilities.telegram ? "" : "Нужен TELEGRAM_BOT_TOKEN"} onClick={() => remind.mutate({ campaignId: campaign.id })}><Send className="h-4 w-4" />Напомнить в Telegram</Button> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
