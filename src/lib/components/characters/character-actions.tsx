"use client";

import Link from "next/link";
import { ArrowUpCircle, Coins as CoinsIcon, Crosshair, Gift, Moon, Printer, Skull, Sun, Swords } from "lucide-react";
import { useState } from "react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { CLASS_CATALOG } from "@/lib/dnd/catalog";
import { abilityModifier, signed } from "@/lib/dnd/calculations";
import { damageTypeOf } from "@/lib/dnd/content";
import { COIN_LABELS, coinsInGold, coinsOf, defaultResources, EMPTY_DEATH, weaponAttack } from "@/lib/dnd/rules";
import type { Coins } from "@/lib/dnd/types";
import { useAttack, useDeathSave, useLevelUp, useRest, useTransfer, useUpdateCharacter } from "@/lib/queries";
import { toast } from "@/lib/toast";
import type { CharacterDto } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CharacterActions({ character }: { character: CharacterDto }) {
  const { snapshot } = useHub();
  const update = useUpdateCharacter();
  const attack = useAttack();
  const levelUp = useLevelUp();
  const rest = useRest();
  const deathSave = useDeathSave();
  const transfer = useTransfer();
  const encounter = snapshot?.encounter;
  const targets = (encounter?.state.combatants ?? []).filter((item) => item.sourceCharacterId !== character.id);
  const weapons = character.inventory.filter((item) => item.category === "weapon");
  const [targetId, setTargetId] = useState("");
  const [advantage, setAdvantage] = useState<"normal" | "advantage" | "disadvantage">("normal");
  const [hitDice, setHitDice] = useState(1);
  const [toId, setToId] = useState("");
  const [itemId, setItemId] = useState("");
  const [gold, setGold] = useState(0);
  const coins = coinsOf(character.stats);
  const death = { ...EMPTY_DEATH, ...(character.stats.deathSaves ?? {}) };
  const resources = character.stats.resources ?? [];
  const hitDie = CLASS_CATALOG[character.classKey]?.hitDie ?? 8;
  const availableHitDice = Math.max(0, character.level - (character.stats.hitDiceUsed ?? 0));
  const others = (snapshot?.characters ?? []).filter((item) => item.id !== character.id);
  const target = targets.find((item) => item.id === targetId) ?? targets[0];

  const doAttack = (name: string, toHit: number, damage: string, type?: string) => {
    if (!encounter || !target) { toast.error("Нет цели", "Добавьте противников в трекер боя."); return; }
    attack.mutate({ encounterId: encounter.id, targetId: target.id, attackerName: character.name, attackName: name, toHit, damage, advantage, damageType: damageTypeOf(type) }, {
      onSuccess: (result) => toast[result.hit ? "success" : "info"](result.crit ? "💥 Критическое попадание!" : result.hit ? "Попадание!" : "Промах", result.verdict),
    });
  };
  const setCoins = (key: keyof Coins, value: number) => update.mutate({ id: character.id, patch: { stats: { ...character.stats, coins: { ...coins, [key]: Math.max(0, Math.floor(value) || 0) } } } });
  const setResource = (id: string, delta: number) => update.mutate({ id: character.id, patch: { stats: { ...character.stats, resources: resources.map((item) => item.id === id ? { ...item, current: Math.max(0, Math.min(item.max, item.current + delta)) } : item) } } });

  return (
    <div className="space-y-4">
      {character.hpCurrent === 0 ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skull className="h-6 w-6 text-red-300" />
            <div className="flex-1"><p className="font-display text-lg text-red-100">Спасброски от смерти</p><p className="text-[11px] text-red-200/70">10+ — успех, 1 — два провала, 20 — встать с 1 HP.</p></div>
            <div className="flex gap-3 text-xs">
              <div><p className="text-emerald-300">Успехи</p><div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={cn("h-4 w-4 rounded-full border border-emerald-400", i < death.successes && "bg-emerald-400")} />)}</div></div>
              <div><p className="text-red-300">Провалы</p><div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={cn("h-4 w-4 rounded-full border border-red-400", i < death.failures && "bg-red-500")} />)}</div></div>
            </div>
          </div>
          {death.dead ? <p className="mt-3 text-sm font-semibold text-red-300">☠ Персонаж погиб.</p> : death.stable ? <p className="mt-3 text-sm font-semibold text-emerald-300">Персонаж стабилизирован.</p> : (
            <Button variant="crimson" className="mt-3 w-full" disabled={deathSave.isPending} onClick={() => deathSave.mutate(character.id, { onSuccess: (data) => toast.info(`d20 = ${data.roll}`, data.text) })}><Skull className="h-4 w-4" />Бросить спасбросок от смерти</Button>
          )}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2"><Swords className="h-4 w-4 text-gold" /><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Атака</p>
          {targets.length ? (
            <>
              <Select value={target?.id ?? ""} onChange={(event) => setTargetId(event.target.value)} className="ml-auto h-8 w-44 text-xs">{targets.map((item) => <option key={item.id} value={item.id}>{item.name} · КД {item.ac}</option>)}</Select>
              <Select value={advantage} onChange={(event) => setAdvantage(event.target.value as typeof advantage)} className="h-8 w-36 text-xs"><option value="normal">Обычно</option><option value="advantage">Преимущество</option><option value="disadvantage">Помеха</option></Select>
            </>
          ) : <span className="ml-auto text-[11px] text-muted-ink">В трекере боя нет целей</span>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {weapons.map((item) => {
            const stats = weaponAttack(item, character.stats, character.level);
            return (
              <button key={item.id} type="button" disabled={!target || attack.isPending} onClick={() => doAttack(item.name, stats.toHit, stats.damage, stats.type)} className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/[0.04] p-3 text-left transition hover:border-gold/50 disabled:opacity-50">
                <Crosshair className="h-5 w-5 shrink-0 text-gold" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-parchment">{item.name}</p><p className="text-[11px] text-muted-ink">{signed(stats.toHit)} к попаданию · {stats.damage} {stats.type} · {stats.ability}</p></div>
              </button>
            );
          })}
          {!weapons.length ? <p className="text-xs text-muted-ink">В инвентаре нет оружия.</p> : null}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gold">Отдых</p>
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={availableHitDice} value={hitDice} onChange={(event) => setHitDice(Number(event.target.value))} className="h-9 w-16" />
            <Button size="sm" variant="outline" className="flex-1" disabled={rest.isPending} onClick={() => rest.mutate({ characterId: character.id, type: "short", hitDice }, { onSuccess: (data) => toast.success("Короткий отдых", `+${data.summary.healed} HP${data.summary.rolls.length ? ` (кости: ${data.summary.rolls.join(", ")})` : ""}`) })}><Sun className="h-3.5 w-3.5" />Короткий</Button>
          </div>
          <p className="mt-1 text-[10px] text-muted-ink">Кости хитов: {availableHitDice}/{character.level} × d{hitDie} {signed(abilityModifier(character.stats.abilities.con))}</p>
          <Button size="sm" className="mt-2 w-full" disabled={rest.isPending} onClick={() => rest.mutate({ characterId: character.id, type: "long", hitDice: 0 }, { onSuccess: (data) => toast.success("Долгий отдых", `+${data.summary.healed} HP, ячейки и способности восстановлены`) })}><Moon className="h-3.5 w-3.5" />Долгий отдых</Button>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gold">Повышение уровня</p>
          <p className="text-[11px] text-muted-ink">Уровень {character.level} → {Math.min(20, character.level + 1)}. Пересчитаются HP, ячейки и ресурсы.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["average", "roll"] as const).map((mode) => (
              <Button key={mode} size="sm" variant={mode === "average" ? "outline" : "gold"} disabled={levelUp.isPending || character.level >= 20} onClick={() => levelUp.mutate({ characterId: character.id, mode }, { onSuccess: (data) => toast.success(`🎉 Уровень ${character.level + 1}!`, `+${data.summary.gain} HP · владение +${data.summary.proficiency}${data.summary.asi ? " · Увеличение характеристик!" : ""}`) })}>
                <ArrowUpCircle className="h-3.5 w-3.5" />{mode === "average" ? "Среднее HP" : `Бросить d${hitDie}`}
              </Button>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Ресурсы класса</p>
          <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: character.id, patch: { stats: { ...character.stats, resources: defaultResources(character.classKey, character.level, character.stats) } } })}>Сбросить по классу</Button></div>
        {resources.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {resources.map((resource) => (
              <div key={resource.id} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/30 p-2.5">
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-parchment">{resource.name}</p><p className="text-[10px] text-muted-ink">{resource.recharge === "short" ? "короткий отдых" : "долгий отдых"}</p></div>
                <Button size="icon-sm" variant="crimson" onClick={() => setResource(resource.id, -1)}>−</Button>
                <span className="w-14 text-center font-display text-lg tabular-nums text-gold">{resource.current}/{resource.max}</span>
                <Button size="icon-sm" variant="outline" onClick={() => setResource(resource.id, 1)}>+</Button>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-ink">Нет ресурсов. Нажмите «Сбросить по классу», чтобы добавить стандартные.</p>}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <div className="mb-2 flex items-center gap-2"><CoinsIcon className="h-4 w-4 text-gold" /><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Кошель</p><Badge variant="gold" className="ml-auto">≈ {coinsInGold(coins)} зм</Badge></div>
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(COIN_LABELS) as (keyof Coins)[]).map((key) => (
            <label key={key} className="text-center"><span className="text-[10px] font-bold text-muted-ink">{COIN_LABELS[key]}</span>
              <Input key={`${key}-${coins[key]}`} type="number" min={0} defaultValue={coins[key]} onBlur={(event) => Number(event.target.value) !== coins[key] && setCoins(key, Number(event.target.value))} className="h-9 px-1 text-center" />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <div className="mb-2 flex items-center gap-2"><Gift className="h-4 w-4 text-gold" /><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Передать союзнику</p></div>
        {others.length ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_90px_auto]">
            <Select value={toId} onChange={(event) => setToId(event.target.value)} className="h-9 text-xs"><option value="">Кому…</option>{others.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
            <Select value={itemId} onChange={(event) => setItemId(event.target.value)} className="h-9 text-xs"><option value="">Без предмета</option>{character.inventory.map((item) => <option key={item.id} value={item.id}>{item.name} ×{item.quantity}</option>)}</Select>
            <Input type="number" min={0} value={gold} onChange={(event) => setGold(Number(event.target.value))} placeholder="зм" className="h-9" />
            <Button size="sm" disabled={!toId || (!itemId && !gold) || transfer.isPending} onClick={() => transfer.mutate({ fromId: character.id, toId, itemId: itemId || undefined, quantity: 1, gold: gold || undefined }, { onSuccess: (data) => { toast.success("Передано", data.text); setItemId(""); setGold(0); } })}>Передать</Button>
          </div>
        ) : <p className="text-xs text-muted-ink">Другие персонажи кампании вам не видны. Передать может Мастер.</p>}
        <p className="mt-1 text-[10px] text-muted-ink">Предметы передаются по одному. Получатель увидит уведомление в чате.</p>
      </section>

      <Button asChild variant="glass" className="w-full"><Link href={`/print/${character.id}`} target="_blank"><Printer className="h-4 w-4" />Лист для печати / PDF</Link></Button>
    </div>
  );
}
