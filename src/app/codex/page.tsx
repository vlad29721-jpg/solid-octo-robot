"use client";

import { motion } from "framer-motion";
import { Backpack, BookOpen, Plus, Search, Sparkles, Weight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { CLASS_CATALOG, ITEM_CATALOG, SPELL_CATALOG } from "@/lib/dnd/catalog";
import { defaultSpellSlots, encumbrance, inventoryWeight } from "@/lib/dnd/calculations";
import type { InventoryItem } from "@/lib/dnd/types";
import { useInventoryOp, useUpdateCharacter } from "@/lib/queries";
import { toast } from "@/lib/toast";

type CodexTab = "items" | "spells" | "slots";
const TAB_ITEMS: TabItem<CodexTab>[] = [
  { value: "items", label: "Предметы", icon: Backpack },
  { value: "spells", label: "Заклинания", icon: BookOpen },
  { value: "slots", label: "Ячейки", icon: Sparkles },
];

export default function CodexPage() {
  const { snapshot, campaign } = useHub();
  const update = useUpdateCharacter();
  const inventoryOp = useInventoryOp();
  const [tab, setTab] = useState<CodexTab>("items");
  const [characterId, setCharacterId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");

  const characters = snapshot?.characters ?? [];
  useEffect(() => {
    if (!characters.some((character) => character.id === characterId)) setCharacterId(characters[0]?.id ?? "");
  }, [characters, characterId]);
  const character = characters.find((entry) => entry.id === characterId) ?? null;

  const items = useMemo(() => ITEM_CATALOG.filter((item) =>
    `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase()) && (category === "all" || item.category === category),
  ), [search, category]);
  const spells = useMemo(() => SPELL_CATALOG.filter((spell) =>
    `${spell.name} ${spell.description} ${spell.school}`.toLowerCase().includes(search.toLowerCase()) && (level === "all" || String(spell.level) === level),
  ), [search, level]);

  if (!snapshot || !campaign) return <PageSkeleton />;

  const addItem = (source: InventoryItem) => {
    if (!character) return;
    inventoryOp.mutate({ characterId: character.id, operation: { op: "add", item: { ...source, id: `${source.id}-${crypto.randomUUID().slice(0, 8)}`, quantity: 1, equipped: false } } });
    toast.success("Предмет добавлен", `${source.name} → инвентарь ${character.name}`);
  };

  const addSpell = (spell: (typeof SPELL_CATALOG)[number]) => {
    if (!character) return;
    if (character.spellbook.list.some((entry) => entry.name === spell.name)) { toast.info("Уже в книге", spell.name); return; }
    update.mutate({ id: character.id, patch: { spellbook: { ...character.spellbook, list: [...character.spellbook.list, { ...spell, prepared: true }] } } });
    toast.success("Заклинание добавлено", `${spell.name} → книга ${character.name}`);
  };

  const setSlot = (slotLevel: string, restore: boolean) => {
    if (!character) return;
    const max = character.spellbook.slots[slotLevel] ?? 0;
    const current = character.spellbook.used[slotLevel] ?? 0;
    if (!restore && current >= max) { toast.error("Ячейки исчерпаны", `Уровень ${slotLevel}: ${current}/${max}`); return; }
    update.mutate({ id: character.id, patch: { spellbook: { ...character.spellbook, used: { ...character.spellbook.used, [slotLevel]: restore ? Math.max(0, current - 1) : current + 1 } } } });
  };

  const load = character ? encumbrance(character.stats, character.inventory) : null;
  const classInfo = character ? CLASS_CATALOG[character.classKey] : null;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader eyebrow="Арсенал и гримуар" title="Кодекс предметов и магии" description="База снаряжения с весом и стоимостью, заклинания 5e и ячейки выбранного персонажа. Изменения мгновенно попадают в лист." action={<Select value={characterId} onChange={(event) => setCharacterId(event.target.value)} className="w-48 sm:w-64">{characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select>} />

      {!character ? <EmptyState title="Некому нести сумку" description="Сначала создайте персонажа, затем добавляйте предметы, заклинания и распределяйте ячейки." actionLabel="Создать персонажа" href="/characters" icon={Backpack} /> : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="glass rounded-2xl p-3"><p className="text-[10px] uppercase tracking-wider text-muted-ink">В инвентаре</p><p className="font-display text-2xl text-parchment">{character.inventory.length}</p></div>
            <div className="glass rounded-2xl p-3"><p className="text-[10px] uppercase tracking-wider text-muted-ink">Вес</p><p className="font-display text-2xl text-parchment">{inventoryWeight(character.inventory)}<span className="text-sm text-muted-ink"> фнт.</span></p></div>
            <div className="glass rounded-2xl p-3"><p className="text-[10px] uppercase tracking-wider text-muted-ink">Лимит (СИЛ×15)</p><p className="font-display text-2xl text-parchment">{load?.capacity ?? 0}</p></div>
            <div className="glass rounded-2xl p-3"><p className="text-[10px] uppercase tracking-wider text-muted-ink">В книге</p><p className="font-display text-2xl text-gold">{character.spellbook.list.length}</p></div>
          </section>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Tabs value={tab} onValueChange={setTab} items={TAB_ITEMS} className="lg:flex-1" />
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1 lg:w-56"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-ink" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск…" className="h-10 pl-8 text-xs" /></div>
              {tab === "items" ? <Select value={category} onChange={(event) => setCategory(event.target.value)} className="w-32"><option value="all">Всё</option><option value="weapon">Оружие</option><option value="armor">Броня</option><option value="shield">Щиты</option><option value="gear">Снаряжение</option><option value="consumable">Расходники</option><option value="treasure">Сокровища</option></Select> : null}
              {tab === "spells" ? <Select value={level} onChange={(event) => setLevel(event.target.value)} className="w-32"><option value="all">Все круги</option>{Array.from({ length: 6 }, (_, index) => <option key={index} value={String(index)}>{index === 0 ? "Заговоры" : `${index} круг`}</option>)}</Select> : null}
            </div>
          </div>

          {tab === "items" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item, index) => {
                const owned = character.inventory.find((entry) => entry.name === item.name);
                return <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.3) }} className="glass flex flex-col rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2"><h3 className="font-display text-lg text-parchment">{item.name}</h3><Badge variant={item.rarity === "rare" || item.rarity === "very rare" ? "gold" : "outline"}>{item.rarity ?? "обычный"}</Badge></div>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-ink">{item.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5"><Badge variant="outline"><Weight className="h-3 w-3" />{item.weight} фнт.</Badge><Badge variant="outline">{item.costGp} зм</Badge>{item.damage ? <Badge variant="crimson">{item.damage}</Badge> : null}{item.armor ? <Badge variant="info">КД {item.armor.base}</Badge> : null}</div>
                  <Button className="mt-4 w-full" size="sm" variant={owned ? "glass" : "outline"} onClick={() => addItem(item)}><Plus className="h-3.5 w-3.5" />{owned ? `В сумке ×${owned.quantity} · ещё` : "Добавить в инвентарь"}</Button>
                </motion.div>;
              })}
              {!items.length ? <div className="sm:col-span-2 xl:col-span-3"><EmptyState compact title="Предметы не найдены" description="Измените поиск или фильтр категории." icon={Search} /></div> : null}
            </div>
          ) : null}

          {tab === "spells" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {spells.map((spell, index) => {
                const known = character.spellbook.list.some((entry) => entry.name === spell.name);
                return <motion.div key={spell.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.3) }} className="parchment-panel flex flex-col rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2"><h3 className="font-display text-lg text-parchment">{spell.name}</h3><Badge variant="gold">{spell.level === 0 ? "Заговор" : `${spell.level} круг`}</Badge></div>
                  <p className="mt-1 text-[11px] text-gold/85">{spell.school} · {spell.castingTime} · {spell.range} · {spell.components}</p>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-ink">{spell.description}</p>
                  <Button className="mt-4 w-full" size="sm" variant={known ? "glass" : "outline"} onClick={() => addSpell(spell)}><Plus className="h-3.5 w-3.5" />{known ? "Уже в книге" : "Добавить в книгу"}</Button>
                </motion.div>;
              })}
              {!spells.length ? <div className="sm:col-span-2 xl:col-span-3"><EmptyState compact title="Заклинания не найдены" description="Измените поиск или круг заклинаний." icon={BookOpen} /></div> : null}
            </div>
          ) : null}

          {tab === "slots" ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="glass rounded-2xl p-5 lg:col-span-2">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-display text-xl text-parchment">Ячейки заклинаний</h2><p className="text-xs text-muted-ink">{classInfo?.label ?? character.classKey} · ур. {character.level} · базовая характеристика: {classInfo?.spellcastingAbility?.toUpperCase() ?? "—"}</p></div><Button variant="outline" size="sm" onClick={() => update.mutate({ id: character.id, patch: { spellbook: { ...character.spellbook, slots: defaultSpellSlots(character.classKey, character.level), used: {} } } })}>Пересчитать по классу</Button></div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                  {Array.from({ length: 9 }, (_, index) => index + 1).map((slotLevel) => {
                    const max = character.spellbook.slots[String(slotLevel)] ?? 0;
                    const used = character.spellbook.used[String(slotLevel)] ?? 0;
                    return <div key={slotLevel} className={cnSlot(max)}><p className="text-[10px] text-muted-ink">Ур. {slotLevel}</p><p className="font-display text-2xl text-gold">{Math.max(0, max - used)}<span className="text-xs text-muted-ink">/{max}</span></p><div className="mt-2 flex justify-center gap-1"><Button variant="crimson" size="icon-sm" disabled={!max || used >= max} onClick={() => setSlot(String(slotLevel), false)}>−</Button><Button variant="outline" size="icon-sm" disabled={!max || used <= 0} onClick={() => setSlot(String(slotLevel), true)}>+</Button></div></div>;
                  })}
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/45"><motion.div className="h-full rounded-full bg-gradient-to-r from-gold to-crimson" animate={{ width: `${load?.percent ?? 0}%` }} /></div>
                <p className="mt-2 text-[11px] text-muted-ink">Занято {load?.weight ?? 0} из {load?.capacity ?? 0} фнт. ({load?.percent ?? 0}% переносимого веса){load?.speedPenalty ? ` · штраф скорости ${load.speedPenalty} фт.` : ""}</p>
              </div>
              <div className="parchment-panel rounded-2xl p-5">
                <h3 className="font-display text-lg text-parchment">Известные заклинания</h3>
                <div className="mt-3 space-y-2">{character.spellbook.list.length ? character.spellbook.list.map((spell) => <div key={spell.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-black/25 p-2.5"><div><p className="text-xs font-semibold text-parchment">{spell.name}</p><p className="text-[10px] text-muted-ink">{spell.level === 0 ? "Заговор" : `${spell.level} круг`} · {spell.school}</p></div><Badge variant={spell.prepared ? "gold" : "muted"}>{spell.prepared ? "Готово" : "Книга"}</Badge></div>) : <p className="py-6 text-center text-xs text-muted-ink">Книга пока пуста.</p>}</div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function cnSlot(max: number) {
  return `rounded-2xl border p-2 text-center ${max > 0 ? "border-gold/25 bg-gold/[0.05]" : "border-white/[0.06] bg-black/25 opacity-60"}`;
}
