"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, HeartPulse, Play, Plus, RotateCcw, Skull, Square, Swords, Trash2, Users,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar } from "@/components/dnd/avatar";
import { ConditionChips } from "@/components/dnd/condition-chips";
import { HpBar } from "@/components/dnd/hp-bar";
import { EmptyState } from "@/components/empty-state";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, Input } from "@/components/ui/field";
import { Badge, Metric, Spinner } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import { abilityModifier } from "@/lib/dnd/calculations";
import { rollExpression } from "@/lib/dnd/dice";
import { endCombat, nextTurn, previousTurn, sortCombatants, startCombat, withEvent } from "@/lib/dnd/encounter";
import type { Combatant, EncounterState } from "@/lib/dnd/types";
import { useCombatantHp, useCreateEncounter, useUpdateEncounter } from "@/lib/queries";
import { cn, formatTime } from "@/lib/utils";
import { monsterFormSchema, type MonsterFormInput } from "@/lib/validation";

const PARTY_COLORS = ["#D4AF37", "#6B8E9F", "#B58BD6", "#6FAF7A", "#C97B4A"];

export default function InitiativePage() {
  const { snapshot, campaign, isDm } = useHub();
  const update = useUpdateEncounter();
  const hp = useCombatantHp();
  const createEncounter = useCreateEncounter();
  const [addMonsterOpen, setAddMonsterOpen] = useState(false);
  const [addPartyOpen, setAddPartyOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [encounterName, setEncounterName] = useState("Новое столкновение");
  const [hpAmounts, setHpAmounts] = useState<Record<string, number>>({});
  const monsterForm = useForm<z.input<typeof monsterFormSchema>, unknown, MonsterFormInput>({
    resolver: zodResolver(monsterFormSchema),
    defaultValues: { name: "", hp: 22, ac: 13, initiative: 10, count: 1 },
  });

  if (!snapshot || !campaign) return <PageSkeleton />;
  const encounter = snapshot.encounter;
  const state = encounter?.state;
  const ordered = state ? sortCombatants(state.combatants) : [];
  const active = ordered.find((item) => item.id === state?.activeId);
  const missingCharacters = snapshot.characters.filter((character) => !state?.combatants.some((item) => item.sourceCharacterId === character.id));

  const commit = (next: EncounterState) => {
    if (!encounter) return;
    update.mutate({ id: encounter.id, state: next });
  };

  const makePartyCombatant = (character: (typeof snapshot.characters)[number], index: number): Combatant => {
    const modifier = abilityModifier(character.stats.abilities.dex) + (character.stats.initiativeBonus ?? 0);
    const expression = modifier >= 0 ? `1d20+${modifier}` : `1d20${modifier}`;
    return {
      id: `combat-${character.id}-${crypto.randomUUID().slice(0, 8)}`,
      name: character.name, kind: "character", sourceCharacterId: character.id,
      initiative: rollExpression(expression).total, dexModifier: abilityModifier(character.stats.abilities.dex),
      hp: character.hpCurrent, maxHp: character.hpMax, ac: character.armorClass,
      conditions: character.conditions.map((condition) => condition.id),
      color: PARTY_COLORS[index % PARTY_COLORS.length],
    };
  };

  const addMonster = (data: MonsterFormInput) => {
    if (!state) return;
    const count = data.count ?? 1;
    const created: Combatant[] = Array.from({ length: count }, (_, index) => ({
      id: `monster-${crypto.randomUUID()}`,
      name: count > 1 ? `${data.name} ${index + 1}` : data.name,
      kind: "monster", sourceCharacterId: null, initiative: data.initiative, dexModifier: 0,
      hp: data.hp, maxHp: data.hp, ac: data.ac, conditions: [], color: "#8B0000",
    }));
    commit(withEvent({ ...state, combatants: [...state.combatants, ...created] }, `Добавлено в бой: ${created.map((item) => item.name).join(", ")}.`));
    monsterForm.reset();
    setAddMonsterOpen(false);
  };

  const addParty = (all: boolean, characterId?: string) => {
    if (!state) return;
    const selected = all ? missingCharacters : missingCharacters.filter((character) => character.id === characterId);
    const created = selected.map((character, index) => makePartyCombatant(character, index));
    commit(withEvent({ ...state, combatants: [...state.combatants, ...created] }, `В инициативу добавлены: ${created.map((item) => item.name).join(", ") || "никто"}.`));
    if (all) setAddPartyOpen(false);
  };

  const removeCombatant = (combatant: Combatant) => {
    if (!state) return;
    const combatants = state.combatants.filter((item) => item.id !== combatant.id);
    commit(withEvent({ ...state, combatants, activeId: state.activeId === combatant.id ? null : state.activeId }, `${combatant.name} удалён из боя.`));
  };

  const applyHp = (combatantId: string, mode: "damage" | "heal") => {
    if (!encounter) return;
    const amount = Math.max(0, Number(hpAmounts[combatantId] ?? 5) || 0);
    if (!amount) return;
    hp.mutate({ encounterId: encounter.id, combatantId, amount, mode });
  };

  const createNew = (event: FormEvent) => {
    event.preventDefault();
    createEncounter.mutate({ campaignId: campaign.id, name: encounterName.trim() || "Новое столкновение" }, { onSuccess: () => setNewOpen(false) });
  };

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        eyebrow="Поле боя"
        title={state?.name ?? "Инициатива"}
        description="Сортировка по инициативе и ЛОВ, раунды, текущий ход, состояния и синхронизация HP между устройствами."
        action={<>
          {isDm ? <Button variant="ghost" size="sm" onClick={() => setNewOpen(true)}><RotateCcw className="h-4 w-4" />Новый бой</Button> : null}
          <Button variant="outline" size="sm" onClick={() => setAddPartyOpen(true)} disabled={!state}><Users className="h-4 w-4" />Партия</Button>
          <Button size="sm" onClick={() => setAddMonsterOpen(true)} disabled={!state}><Plus className="h-4 w-4" />Монстр</Button>
        </>}
      />

      {!encounter || !state ? <EmptyState title="Бой ещё не начался" description="Создайте столкновение, добавьте партию и противников — Мастер проведёт ходы, а HP будет обновляться мгновенно." actionLabel={isDm ? "Создать столкновение" : undefined} onAction={isDm ? () => setNewOpen(true) : undefined} icon={Swords} /> : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Раунд" value={state.round} hint={state.active ? "Бой идёт" : "Ожидание старта"} />
            <Metric label="Сейчас ходит" value={<span className="block truncate text-lg">{active?.name ?? "—"}</span>} hint={active ? `Инициатива ${active.initiative}` : "Начните бой"} />
            <Metric label="Участников" value={state.combatants.length} hint={`${state.combatants.filter((item) => item.kind === "monster").length} противников`} />
            <Metric label="HP врагов" value={state.combatants.filter((item) => item.kind === "monster").reduce((sum, item) => sum + item.hp, 0)} hint="Без учёта союзников" />
          </section>

          <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3">
            {!state.active ? <Button onClick={() => commit(startCombat(state))} disabled={!ordered.length}><Play className="h-4 w-4" />Начать бой</Button> : <>
              <Button variant="outline" onClick={() => commit(previousTurn(state))}><ArrowLeft className="h-4 w-4" />Назад</Button>
              <Button onClick={() => commit(nextTurn(state))}>Следующий ход<ArrowRight className="h-4 w-4" /></Button>
              <Button variant="danger" onClick={() => commit(endCombat(state))}><Square className="h-4 w-4" />Завершить</Button>
            </>}
            <span className="ml-auto text-[11px] text-muted-ink">{update.isPending ? "Синхронизация…" : `Событий в журнале: ${state.log.length}`}</span>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <section className="space-y-3 xl:col-span-2">
              {ordered.length ? ordered.map((combatant, index) => {
                const isActive = state.active && state.activeId === combatant.id;
                return (
                  <motion.div layout key={combatant.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn("glass relative overflow-hidden rounded-2xl p-4 transition", isActive && "border-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.12)]")}>
                    {isActive ? <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold-soft to-crimson" /> : null}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/35 font-mono text-xs text-gold">#{index + 1}</span>
                      <Avatar name={combatant.name} size="md" className="rounded-xl" />
                      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-display text-lg text-parchment">{combatant.name}</p><Badge variant={combatant.kind === "monster" ? "crimson" : "gold"}>{combatant.kind === "monster" ? "Монстр" : "Герой"}</Badge>{isActive ? <Badge variant="success" className="pulse-ring">Ход</Badge> : null}</div><p className="text-[11px] text-muted-ink">Иниц. {combatant.initiative} · ЛОВ {combatant.dexModifier >= 0 ? `+${combatant.dexModifier}` : combatant.dexModifier} · КД {combatant.ac}</p></div>
                      <Button variant="ghost" size="icon-sm" aria-label="Убрать из боя" onClick={() => removeCombatant(combatant)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="mt-3"><HpBar current={combatant.hp} max={combatant.maxHp} compact /></div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Input type="number" min={0} className="h-8 w-20 font-mono text-xs" value={hpAmounts[combatant.id] ?? 5} onChange={(event) => setHpAmounts((previous) => ({ ...previous, [combatant.id]: Number(event.target.value) }))} aria-label="Количество HP" />
                      <Button variant="crimson" size="sm" disabled={hp.isPending} onClick={() => applyHp(combatant.id, "damage")}><Skull className="h-3.5 w-3.5" />Урон</Button>
                      <Button variant="outline" size="sm" disabled={hp.isPending} onClick={() => applyHp(combatant.id, "heal")}><HeartPulse className="h-3.5 w-3.5" />Лечение</Button>
                    </div>
                    <div className="mt-3"><ConditionChips conditions={combatant.conditions} /></div>
                  </motion.div>
                );
              }) : <EmptyState compact title="Нет участников боя" description="Добавьте героев из партии или противников, чтобы построить порядок ходов." actionLabel="Добавить партию" onAction={() => setAddPartyOpen(true)} icon={Users} />}
            </section>

            <aside className="glass h-fit rounded-2xl p-4">
              <h2 className="mb-3 font-display text-lg text-parchment">Журнал столкновения</h2>
              {state.log.length ? <div className="thin-scrollbar max-h-[520px] space-y-2 overflow-y-auto pr-1">{state.log.map((event) => <div key={event.id} className="rounded-xl border border-white/[0.06] bg-black/25 p-2.5"><p className="text-xs leading-relaxed text-parchment/80">{event.text}</p><p className="mt-1 text-[10px] text-muted-ink">{formatTime(event.at)}</p></div>)}</div> : <p className="py-8 text-center text-xs text-muted-ink">События появятся после начала боя.</p>}
            </aside>
          </div>
        </>
      )}

      <Dialog open={addMonsterOpen} onOpenChange={setAddMonsterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Добавить противника</DialogTitle><DialogDescription>Можно создать сразу группу одинаковых монстров с отдельными HP.</DialogDescription></DialogHeader>
          <form className="space-y-3" onSubmit={monsterForm.handleSubmit(addMonster)}>
            <FieldGroup label="Название" error={monsterForm.formState.errors.name?.message}><Input placeholder="Тень под мостовой" {...monsterForm.register("name")} /></FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="HP" error={monsterForm.formState.errors.hp?.message}><Input type="number" min={1} {...monsterForm.register("hp")} /></FieldGroup>
              <FieldGroup label="КД" error={monsterForm.formState.errors.ac?.message}><Input type="number" min={1} {...monsterForm.register("ac")} /></FieldGroup>
              <FieldGroup label="Инициатива" error={monsterForm.formState.errors.initiative?.message}><Input type="number" {...monsterForm.register("initiative")} /></FieldGroup>
              <FieldGroup label="Количество" error={monsterForm.formState.errors.count?.message}><Input type="number" min={1} max={8} {...monsterForm.register("count")} /></FieldGroup>
            </div>
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => monsterForm.setValue("initiative", rollExpression("1d20").total)}>Бросить инициативу 1d20</Button>
            <Button type="submit" className="w-full" disabled={update.isPending}>{update.isPending ? <Spinner /> : <Plus className="h-4 w-4" />}Добавить в бой</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addPartyOpen} onOpenChange={setAddPartyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Добавить партию</DialogTitle><DialogDescription>Инициатива каждого героя бросается как 1d20 + ЛОВ + бонус, HP и состояния берутся из листа.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            {missingCharacters.length ? missingCharacters.map((character) => (
              <div key={character.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-2.5"><Avatar name={character.name} src={character.avatarUrl} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm text-parchment">{character.name}</p><p className="text-[10px] text-muted-ink">{character.hpCurrent}/{character.hpMax} HP · КД {character.armorClass}</p></div><Button size="sm" variant="outline" onClick={() => addParty(false, character.id)}>Добавить</Button></div>
            )) : <p className="py-8 text-center text-sm text-muted-ink">Все доступные персонажи уже в бою.</p>}
          </div>
          {missingCharacters.length > 1 ? <Button className="mt-4 w-full" onClick={() => addParty(true)}><Users className="h-4 w-4" />Добавить всю партию</Button> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Новое столкновение</DialogTitle><DialogDescription>Создайте чистый трекер. Предыдущий бой останется в истории базы, но активным станет новый.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={createNew}>
            <FieldGroup label="Название"><Input value={encounterName} onChange={(event) => setEncounterName(event.target.value)} /></FieldGroup>
            <Button type="submit" className="w-full" disabled={createEncounter.isPending}>{createEncounter.isPending ? <Spinner /> : <Swords className="h-4 w-4" />}Создать бой</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
