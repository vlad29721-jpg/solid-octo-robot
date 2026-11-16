"use client";

import { motion } from "framer-motion";
import {
  Backpack, BookOpen, HeartPulse, Plus, Shield, Skull, Sparkles, Swords, Trash2,
} from "lucide-react";
import { CharacterActions } from "./character-actions";
import { CharacterAbilities } from "./character-abilities";
import { CharacterPersonality } from "./character-personality";
import { Dices, Feather, Gem, Star } from "lucide-react";
import { MAGIC_ITEMS, xpProgress } from "@/lib/dnd/content";
import { uploadImage, useCheckRoll } from "@/lib/queries";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/dnd/avatar";
import { ConditionChips } from "@/components/dnd/condition-chips";
import { HpBar } from "@/components/dnd/hp-bar";
import { StatPill } from "@/components/dnd/stat-pill";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  ABILITY_KEYS, ABILITY_LABELS, CLASS_CATALOG, CONDITION_CATALOG, CONDITION_KEYS,
  ITEM_CATALOG, SKILL_DEFS, SKILL_KEYS, SPELL_CATALOG,
} from "@/lib/dnd/catalog";
import {
  armorClass, conditionEffects, defaultSpellSlots, encumbrance, initiativeModifier,
  passivePerception, proficiencyBonus, savingThrow, signed, skillModifier,
} from "@/lib/dnd/calculations";
import type { ConditionKey, InventoryItem, SkillKey, Spellbook } from "@/lib/dnd/types";
import { useDeleteCharacter, useInventoryOp, useUpdateCharacter } from "@/lib/queries";
import { toast } from "@/lib/toast";
import type { CharacterDto } from "@/lib/types";
import type { CharacterPatchInput } from "@/lib/validation";
import { classLabel, cn, formatDate } from "@/lib/utils";

type TabKey = "overview" | "actions" | "skills" | "abilities" | "inventory" | "spells" | "conditions" | "personality";
const TAB_ITEMS: TabItem<TabKey>[] = [
  { value: "overview", label: "Обзор", icon: Shield },
  { value: "actions", label: "Действия", icon: Swords },
  { value: "skills", label: "Навыки", icon: Sparkles },
  { value: "abilities", label: "Способности", icon: Star },
  { value: "inventory", label: "Инвентарь", icon: Backpack },
  { value: "spells", label: "Магия", icon: BookOpen },
  { value: "conditions", label: "Состояния", icon: HeartPulse },
  { value: "personality", label: "Личность", icon: Feather },
];

export function CharacterSheet({ character, open, onOpenChange }: { character: CharacterDto | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { snapshot } = useHub();
  const update = useUpdateCharacter();
  const remove = useDeleteCharacter();
  const inventoryOp = useInventoryOp();
  const checkRoll = useCheckRoll();
  const [rollMode, setRollMode] = useState<"normal" | "advantage" | "disadvantage">("normal");
  const [spendInspiration, setSpendInspiration] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const [hpAmount, setHpAmount] = useState(5);
  const [selectedItem, setSelectedItem] = useState(ITEM_CATALOG[0]?.id ?? "");
  const [selectedSpell, setSelectedSpell] = useState(SPELL_CATALOG[0]?.id ?? "");
  const [selectedCondition, setSelectedCondition] = useState<ConditionKey>("poisoned");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const derived = useMemo(() => {
    if (!character) return null;
    const conditionIds = character.conditions.map((condition) => condition.id);
    return {
      conditionIds,
      armor: armorClass(character.stats, character.inventory, character.armorClass),
      encumbrance: encumbrance(character.stats, character.inventory),
      perception: passivePerception(character.stats, character.level, conditionIds),
      initiative: initiativeModifier(character.stats, conditionIds),
      effects: conditionEffects(conditionIds),
      proficiency: proficiencyBonus(character.level),
    };
  }, [character]);

  if (!character || !derived) return null;

  const owner = snapshot?.profiles.find((profile) => profile.id === character.ownerId);
  const isDmView = Boolean(snapshot?.campaign && snapshot.actor.id === snapshot.campaign.dmId);
  const xp = xpProgress(character.level, character.stats.xp ?? 0);
  const roll = (kind: "skill" | "ability" | "save", key: string) => checkRoll.mutate({ characterId: character.id, kind, key, advantage: rollMode, useInspiration: spendInspiration }, {
    onSuccess: (data) => {
      if (data.inspired) setSpendInspiration(false);
      toast[data.autoFail ? "error" : "success"](`${data.label}: ${data.total}`, `${data.mode === "advantage" ? "Преимущество · " : data.mode === "disadvantage" ? "Помеха (с учётом состояний) · " : ""}${data.autoFail ? "Автопровал из-за состояния" : data.breakdown ?? ""}`);
    },
  });
  const rollBar = (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-black/25 p-2">
      <Dices className="h-4 w-4 text-gold" />
      {(["normal", "advantage", "disadvantage"] as const).map((mode) => <Button key={mode} size="sm" variant={rollMode === mode ? "gold" : "glass"} onClick={() => setRollMode(mode)}>{mode === "normal" ? "Обычно" : mode === "advantage" ? "Преимущество" : "Помеха"}</Button>)}
      <label className={cn("ml-auto flex items-center gap-1.5 text-xs", character.stats.inspiration ? "text-gold" : "text-muted-ink")}><input type="checkbox" disabled={!character.stats.inspiration} checked={spendInspiration} onChange={(event) => setSpendInspiration(event.target.checked)} className="accent-[#D4AF37]" />Потратить вдохновение</label>
      {derived.effects.disadvantageAbilityChecks ? <span className="w-full text-[11px] text-red-300">⚠ Состояния дают помеху на проверки — учитывается автоматически.</span> : null}
    </div>
  );
  const FRAME: Record<string, string> = { barbarian: "#b45309", bard: "#db2777", cleric: "#facc15", druid: "#16a34a", fighter: "#9ca3af", monk: "#0ea5e9", paladin: "#fde68a", ranger: "#15803d", rogue: "#4b5563", sorcerer: "#dc2626", warlock: "#7c3aed", wizard: "#2563eb" };
  const patch = (value: CharacterPatchInput) => update.mutate({ id: character.id, patch: value });

  const changeHp = (mode: "damage" | "heal") => {
    const amount = Math.max(0, Number(hpAmount) || 0);
    const next = mode === "damage"
      ? Math.max(0, character.hpCurrent - amount)
      : Math.min(character.hpMax, character.hpCurrent + amount);
    patch({ hpCurrent: next });
  };

  const toggleProficiency = (skill: SkillKey, expertise = false) => {
    const stats = { ...character.stats };
    if (expertise) {
      const active = stats.expertiseSkills.includes(skill);
      stats.expertiseSkills = active ? stats.expertiseSkills.filter((value) => value !== skill) : [...stats.expertiseSkills, skill];
      if (!active && !stats.proficientSkills.includes(skill)) stats.proficientSkills = [...stats.proficientSkills, skill];
    } else {
      const active = stats.proficientSkills.includes(skill);
      stats.proficientSkills = active ? stats.proficientSkills.filter((value) => value !== skill) : [...stats.proficientSkills, skill];
      if (active) stats.expertiseSkills = stats.expertiseSkills.filter((value) => value !== skill);
    }
    patch({ stats });
  };

  const addItem = () => {
    const source = [...ITEM_CATALOG, ...MAGIC_ITEMS].find((entry) => entry.id === selectedItem);
    if (!source) return;
    inventoryOp.mutate({ characterId: character.id, operation: { op: "add", item: { ...source, id: `${source.id}-${crypto.randomUUID().slice(0, 8)}`, quantity: 1, equipped: false } satisfies InventoryItem } });
    toast.success("Предмет добавлен", `${source.name} · ${source.weight} фнт.`);
  };

  const changeItem = (id: string, changes: Partial<InventoryItem>) => {
    const item = character.inventory.find((entry) => entry.id === id);
    if (!item || changes.quantity === undefined) return;
    const delta = changes.quantity - item.quantity;
    if (delta) inventoryOp.mutate({ characterId: character.id, operation: { op: "quantity", itemId: id, delta } });
  };
  const removeItem = (id: string) => inventoryOp.mutate({ characterId: character.id, operation: { op: "remove", itemId: id } });
  const equipItem = (id: string) => inventoryOp.mutate({ characterId: character.id, operation: { op: "equip", itemId: id } });

  const spellbook = character.spellbook;
  const setSpellbook = (next: Spellbook) => patch({ spellbook: next });
  const addSpell = () => {
    const source = SPELL_CATALOG.find((entry) => entry.id === selectedSpell);
    if (!source) return;
    if (spellbook.list.some((entry) => entry.name === source.name)) { toast.info("Заклинание уже в книге", source.name); return; }
    setSpellbook({ ...spellbook, list: [...spellbook.list, { ...source, prepared: true }] });
  };
  const useSlot = (level: string, restore = false) => {
    const max = spellbook.slots[level] ?? 0;
    const current = spellbook.used[level] ?? 0;
    if (!restore && current >= max) { toast.error("Ячейки исчерпаны", `Уровень ${level}: ${current}/${max}`); return; }
    const used = restore ? Math.max(0, current - 1) : current + 1;
    setSpellbook({ ...spellbook, used: { ...spellbook.used, [level]: used } });
  };
  const addCondition = () => {
    if (derived.conditionIds.includes(selectedCondition)) return;
    patch({ conditions: [...character.conditions, { id: selectedCondition, name: CONDITION_CATALOG[selectedCondition].label, appliedAt: new Date().toISOString() }] });
  };
  const removeCondition = (id: ConditionKey) => patch({ conditions: character.conditions.filter((condition) => condition.id !== id) });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex flex-wrap items-start gap-4">
              <label className="relative cursor-pointer rounded-2xl p-[3px]" style={{ background: `conic-gradient(from 210deg, ${FRAME[character.classKey] ?? "#D4AF37"}, #D4AF37, ${FRAME[character.classKey] ?? "#D4AF37"})` }} title="Загрузить портрет">
                <Avatar name={character.name} src={character.avatarUrl} size="xl" />
                <input type="file" accept="image/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file || !snapshot?.campaign) return; try { patch({ avatarUrl: await uploadImage(snapshot.campaign.id, file) }); toast.success("Портрет обновлён"); } catch (error) { toast.error("Ошибка загрузки", error instanceof Error ? error.message : ""); } }} />
              </label>
              <div className="min-w-0 flex-1">
                <DialogTitle>{character.name}</DialogTitle>
                <DialogDescription>{classLabel(character.classKey)} · {character.species} · уровень {character.level} · {owner?.displayName ?? "неизвестный игрок"}</DialogDescription>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="gold">Владение {signed(derived.proficiency)}</Badge>
                  <Badge variant="outline">КД {derived.armor.value}</Badge>
                  <Badge variant="outline">Иниц. {signed(derived.initiative)}</Badge>
                  <Badge variant="info">Пасс. внимание {derived.perception.value}</Badge>
                  {derived.perception.shift !== 0 ? <Badge variant="crimson">{signed(derived.perception.shift)} от состояния</Badge> : null}
                  <button type="button" disabled={!isDmView && !character.stats.inspiration} onClick={() => isDmView && patch({ stats: { ...character.stats, inspiration: !character.stats.inspiration } })} title={isDmView ? "Выдать или забрать вдохновение" : "Вдохновение"}>
                    <Badge variant={character.stats.inspiration ? "gold" : "muted"}>{character.stats.inspiration ? "✨ Вдохновение" : isDmView ? "Дать вдохновение" : "Нет вдохновения"}</Badge>
                  </button>
                </div>
                <div className="mt-2 max-w-sm">
                  <div className="flex justify-between text-[10px] text-muted-ink"><span>Опыт: {character.stats.xp ?? 0} XP</span><span>{xp.next ? `до ${character.level + 1} ур.: ${xp.next}` : "максимум"}</span></div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-black/50"><motion.div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-gold" animate={{ width: `${xp.percent}%` }} /></div>
                  {xp.canLevel ? <p className="mt-1 text-[11px] font-semibold text-gold">⬆ Можно повысить уровень — вкладка «Действия»</p> : null}
                  {isDmView ? <div className="mt-1 flex gap-1">{[50, 100, 300].map((amount) => <button key={amount} type="button" onClick={() => patch({ stats: { ...character.stats, xp: (character.stats.xp ?? 0) + amount } })} className="rounded border border-white/10 px-1.5 text-[10px] text-muted-ink hover:text-gold">+{amount} XP</button>)}</div> : null}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="parchment-panel mb-4 rounded-2xl p-4">
            <HpBar current={character.hpCurrent} max={character.hpMax} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input type="number" min={0} max={999} value={hpAmount} onChange={(event) => setHpAmount(Number(event.target.value))} className="h-9 w-20 font-mono" aria-label="Количество HP" />
              <Button size="sm" variant="crimson" onClick={() => changeHp("damage")}><Skull className="h-3.5 w-3.5" />Урон</Button>
              <Button size="sm" variant="outline" onClick={() => changeHp("heal")}><HeartPulse className="h-3.5 w-3.5" />Лечение</Button>
              <span className="ml-auto text-[11px] text-muted-ink">Обновлено {formatDate(character.updatedAt, true)}</span>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} items={TAB_ITEMS} className="mb-4" />

          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="min-h-64">
            {tab === "overview" ? (
              <div className="space-y-4">
                {rollBar}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{ABILITY_KEYS.map((ability) => <button type="button" key={ability} onClick={() => roll("ability", ability)} title="Бросить проверку" className="rounded-2xl transition hover:ring-2 hover:ring-gold/50"><StatPill ability={ability} score={character.stats.abilities[ability]} /></button>)}</div>
                <p className="text-[11px] text-muted-ink">Нажмите на характеристику или спасбросок, чтобы бросить. Результат появится в общем журнале.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-gold">Спасброски</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ABILITY_KEYS.map((ability) => {
                        const save = savingThrow(character.stats, ability, character.level);
                        return <button type="button" key={ability} onClick={() => roll("save", ability)} title="Бросить спасбросок" className={cn("flex items-center justify-between rounded-lg border px-2 py-1.5 text-xs transition hover:border-gold/60", save.proficient ? "border-gold/30 bg-gold/[0.07]" : "border-white/[0.07]")}><span className="text-muted-ink">{ABILITY_LABELS[ability].short}</span><span className="font-bold tabular-nums text-parchment">{signed(save.total)}</span></button>;
                      })}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-gold">Механика</p>
                    <dl className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><dt className="text-muted-ink">Кость хитов</dt><dd className="text-parchment">d{CLASS_CATALOG[character.classKey]?.hitDie ?? 8}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-ink">Броня</dt><dd className="text-parchment">{derived.armor.armorName} · {derived.armor.base}{derived.armor.dexBonus ? ` ${signed(derived.armor.dexBonus)} ЛОВ` : ""}{derived.armor.shield ? " +2 щит" : ""}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-ink">Нагрузка</dt><dd className={cn(derived.encumbrance.tier !== "none" ? "text-amber-300" : "text-parchment")}>{derived.encumbrance.weight} / {derived.encumbrance.capacity} фнт.</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-ink">Штраф скорости</dt><dd className="text-parchment">{derived.encumbrance.speedPenalty || "нет"}</dd></div>
                    </dl>
                    {derived.effects.notes.length ? <p className="mt-3 text-[11px] leading-relaxed text-amber-200/80">{derived.effects.notes.slice(0, 3).join(" · ")}</p> : null}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "actions" ? <CharacterActions character={character} /> : null}

            {tab === "skills" ? (
              <>{rollBar}<div className="grid gap-1.5 sm:grid-cols-2">
                {SKILL_KEYS.map((skill) => {
                  const value = skillModifier(character.stats, skill, character.level);
                  const expert = character.stats.expertiseSkills.includes(skill);
                  return (
                    <div key={skill} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2", value.proficient ? "border-gold/25 bg-gold/[0.05]" : "border-white/[0.06] bg-black/20")}>
                      <Checkbox checked={value.proficient} onChange={() => toggleProficiency(skill)} aria-label={`Владение ${SKILL_DEFS[skill].label}`} />
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-parchment">{SKILL_DEFS[skill].label}</p><p className="text-[10px] uppercase text-muted-ink">{SKILL_DEFS[skill].ability} {signed(value.base)}{value.prof ? ` · владение ${signed(value.prof)}` : ""}</p></div>
                      <button type="button" title="Экспертиза" onClick={() => toggleProficiency(skill, true)} className={cn("rounded border px-1 text-[9px] font-bold", expert ? "border-gold bg-gold text-ink" : "border-white/15 text-muted-ink")}>×2</button>
                      <button type="button" onClick={() => roll("skill", skill)} disabled={checkRoll.isPending} className="flex items-center gap-1 rounded-lg border border-gold/25 bg-gold/[0.06] px-2 py-1 font-display text-lg font-semibold tabular-nums text-gold transition hover:bg-gold/20" title={`Бросить ${SKILL_DEFS[skill].label}`}><Dices className="h-3.5 w-3.5" />{signed(value.total)}</button>
                    </div>
                  );
                })}
              </div></>
            ) : null}
            {tab === "abilities" ? <CharacterAbilities character={character} /> : null}
            {tab === "personality" ? <CharacterPersonality character={character} /> : null}

            {tab === "inventory" ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-3">
                  <div className="flex justify-between text-xs"><span className="text-muted-ink">Вес снаряжения</span><span className="font-bold text-parchment">{derived.encumbrance.weight} / {derived.encumbrance.capacity} фнт.</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/50"><motion.div className="h-full rounded-full bg-gradient-to-r from-gold to-crimson" animate={{ width: `${derived.encumbrance.percent}%` }} transition={{ type: "spring", stiffness: 180, damping: 24 }} /></div>
                  {derived.encumbrance.tier !== "none" ? <p className="mt-2 text-[11px] text-amber-300">Вариант «Нагрузка»: штраф скорости {derived.encumbrance.speedPenalty} фт.</p> : null}
                </div>
                <div className="flex gap-2"><Select value={selectedItem} onChange={(event) => setSelectedItem(event.target.value)}>{[...ITEM_CATALOG, ...MAGIC_ITEMS].map((item) => <option key={item.id} value={item.id}>{item.magic ? "✨ " : ""}{item.name} · {item.weight} фнт.</option>)}</Select><Button variant="outline" onClick={addItem}><Plus className="h-4 w-4" />Добавить</Button></div>
                <div className="thin-scrollbar max-h-72 space-y-2 overflow-y-auto">
                  {character.inventory.length ? character.inventory.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-black/25 p-2.5">
                      <div className="min-w-[140px] flex-1"><p className="text-xs font-semibold text-parchment">{item.name} <span className="text-muted-ink">×{item.quantity}</span></p><p className="text-[10px] leading-snug text-muted-ink">{item.description}</p></div>
                      <Badge variant="outline">{item.weight * item.quantity} фнт.</Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="glass" size="icon-sm" onClick={() => changeItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}>−</Button>
                        <Button variant="glass" size="icon-sm" onClick={() => changeItem(item.id, { quantity: item.quantity + 1 })}>+</Button>
                        {item.charges ? <span className="flex items-center gap-0.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-1 text-[11px] text-sky-200"><button type="button" onClick={() => inventoryOp.mutate({ characterId: character.id, operation: { op: "charge", itemId: item.id, delta: -1 } })}>−</button>⚡{item.charges.current}/{item.charges.max}<button type="button" onClick={() => inventoryOp.mutate({ characterId: character.id, operation: { op: "charge", itemId: item.id, delta: 1 } })}>+</button></span> : null}
                        {item.requiresAttunement ? <Button size="sm" variant={item.attuned ? "gold" : "glass"} onClick={() => inventoryOp.mutate({ characterId: character.id, operation: { op: "attune", itemId: item.id } })} title="Настройка (максимум 3)"><Gem className="h-3 w-3" />{item.attuned ? "Настроен" : "Настроить"}</Button> : null}
                        <Button variant={item.equipped ? "gold" : "ghost"} size="sm" onClick={() => equipItem(item.id)}>{item.equipped ? "Надето" : "Надеть"}</Button>
                        <Button variant="danger" size="icon-sm" aria-label="Удалить предмет" onClick={() => removeItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  )) : <p className="py-8 text-center text-sm text-muted-ink">Сумка пуста. Добавьте предмет из кодекса.</p>}
                </div>
              </div>
            ) : null}

            {tab === "spells" ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Ячейки заклинаний</p><Button size="sm" variant="ghost" onClick={() => setSpellbook({ ...spellbook, slots: defaultSpellSlots(character.classKey, character.level), used: {} })}>Пересчитать по классу</Button></div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                    {Object.keys(spellbook.slots).length ? Array.from({ length: 9 }, (_, index) => index + 1).filter((level) => (spellbook.slots[String(level)] ?? 0) > 0).map((level) => {
                      const max = spellbook.slots[String(level)] ?? 0; const used = spellbook.used[String(level)] ?? 0;
                      return <div key={level} className="rounded-xl border border-white/[0.08] bg-black/30 p-2 text-center"><p className="text-[10px] text-muted-ink">Ур. {level}</p><p className="font-display text-lg text-gold">{Math.max(0, max - used)}<span className="text-xs text-muted-ink">/{max}</span></p><div className="mt-1 flex justify-center gap-1"><button type="button" onClick={() => useSlot(String(level))} className="rounded border border-crimson/40 px-1.5 text-[10px] text-red-300">−</button><button type="button" onClick={() => useSlot(String(level), true)} className="rounded border border-emerald-400/30 px-1.5 text-[10px] text-emerald-300">+</button></div></div>;
                    }) : <p className="col-span-full py-3 text-center text-xs text-muted-ink">У этого класса нет обычных ячеек. Нажмите «Пересчитать по классу».</p>}
                  </div>
                </div>
                <div className="flex gap-2"><Select value={selectedSpell} onChange={(event) => setSelectedSpell(event.target.value)}>{SPELL_CATALOG.map((spell) => <option key={spell.id} value={spell.id}>{spell.level === 0 ? "Заговор" : `${spell.level} ур.`} · {spell.name}</option>)}</Select><Button variant="outline" onClick={addSpell}><Plus className="h-4 w-4" />В книгу</Button></div>
                <div className="thin-scrollbar max-h-72 space-y-2 overflow-y-auto">
                  {spellbook.list.length ? spellbook.list.map((spell) => (
                    <div key={spell.id} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-3">
                      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-parchment">{spell.name}</p><Badge variant={spell.prepared ? "gold" : "muted"}>{spell.prepared ? "Подготовлено" : "В книге"}</Badge><Badge variant="outline">{spell.level === 0 ? "Заговор" : `${spell.level} круг`}</Badge></div><p className="mt-1 text-[11px] text-muted-ink">{spell.school} · {spell.castingTime} · {spell.range} · {spell.components}</p><p className="mt-1 text-xs leading-relaxed text-parchment/75">{spell.description}</p></div>
                      <div className="flex flex-col gap-1"><Button size="sm" variant={spell.prepared ? "outline" : "glass"} onClick={() => setSpellbook({ ...spellbook, list: spellbook.list.map((entry) => entry.id === spell.id ? { ...entry, prepared: !entry.prepared } : entry) })}>{spell.prepared ? "Снять" : "Подготовить"}</Button><Button size="sm" variant="danger" onClick={() => setSpellbook({ ...spellbook, list: spellbook.list.filter((entry) => entry.id !== spell.id) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                    </div>
                  )) : <p className="py-8 text-center text-sm text-muted-ink">Книга заклинаний пуста.</p>}
                </div>
              </div>
            ) : null}

            {tab === "conditions" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4"><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gold">Активные состояния</p><ConditionChips conditions={derived.conditionIds} onRemove={removeCondition} /></div>
                <div className="flex gap-2"><Select value={selectedCondition} onChange={(event) => setSelectedCondition(event.target.value as ConditionKey)}>{CONDITION_KEYS.map((key) => <option key={key} value={key}>{CONDITION_CATALOG[key].label}</option>)}</Select><Button variant="outline" onClick={addCondition}><Plus className="h-4 w-4" />Наложить</Button></div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {derived.conditionIds.map((key) => {
                    const definition = CONDITION_CATALOG[key];
                    return <div key={key} className={cn("rounded-xl border p-3", definition.tone === "helpful" ? "border-emerald-400/25 bg-emerald-400/[0.05]" : "border-crimson/35 bg-crimson/[0.07]")}><p className="text-sm font-semibold text-parchment">{definition.label}</p><p className="mt-1 text-xs leading-relaxed text-muted-ink">{definition.description}</p><p className="mt-2 text-[11px] text-gold/85">{definition.effects.join(" · ")}</p></div>;
                  })}
                </div>
              </div>
            ) : null}
          </motion.div>

          <DialogFooter>
            <Button variant="danger" onClick={() => { onOpenChange(false); setConfirmOpen(true); }}><Trash2 className="h-4 w-4" />Удалить лист</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
            {update.isPending ? <span className="flex items-center gap-1 text-xs text-gold"><Spinner className="h-3 w-3" />Сохраняем…</span> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Удалить персонажа?"
        description={`${character.name} исчезнет из кампании и трекера инициативы. Это действие нельзя отменить.`}
        confirmLabel="Удалить навсегда"
        pending={remove.isPending}
        onConfirm={() => remove.mutate(character.id, { onSuccess: () => setConfirmOpen(false) })}
      />
    </>
  );
}
