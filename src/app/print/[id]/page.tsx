"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { ABILITY_KEYS, ABILITY_LABELS, CONDITION_CATALOG, SKILL_DEFS, SKILL_KEYS } from "@/lib/dnd/catalog";
import { abilityModifier, encumbrance, initiativeModifier, passivePerception, proficiencyBonus, savingThrow, signed, skillModifier } from "@/lib/dnd/calculations";
import { coinsOf, COIN_LABELS, weaponAttack } from "@/lib/dnd/rules";
import type { Coins } from "@/lib/dnd/types";
import { classLabel } from "@/lib/utils";

export default function PrintPage() {
  const params = useParams<{ id: string }>();
  const { snapshot } = useHub();
  const character = snapshot?.characters.find((item) => item.id === params.id);
  if (!snapshot) return null;
  if (!character) return <p className="p-10 text-center text-parchment">Персонаж не найден или недоступен.</p>;
  const conditions = character.conditions.map((condition) => condition.id);
  const coins = coinsOf(character.stats);
  const load = encumbrance(character.stats, character.inventory);
  const box = "rounded-lg border border-neutral-400 p-2";

  return (
    <div className="min-h-screen bg-white p-6 text-black print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-4xl justify-end"><Button onClick={() => window.print()}><Printer className="h-4 w-4" />Печать / Сохранить в PDF</Button></div>
      <article className="mx-auto max-w-4xl space-y-4 font-serif text-[13px]">
        <header className="flex items-end justify-between border-b-2 border-black pb-2">
          <div><h1 className="text-3xl font-bold">{character.name}</h1><p>{classLabel(character.classKey)} {character.level} ур. · {character.species}</p></div>
          <p className="text-right text-xs">D&amp;D Master Hub<br />{snapshot.campaign?.title}</p>
        </header>
        <section className="grid grid-cols-6 gap-2 text-center">
          {ABILITY_KEYS.map((key) => <div key={key} className={box}><p className="text-[10px] font-bold">{ABILITY_LABELS[key].long}</p><p className="text-2xl font-bold">{signed(abilityModifier(character.stats.abilities[key]))}</p><p>{character.stats.abilities[key]}</p></div>)}
        </section>
        <section className="grid grid-cols-6 gap-2 text-center">
          {[["КД", character.armorClass], ["HP", `${character.hpCurrent}/${character.hpMax}`], ["Инициатива", signed(initiativeModifier(character.stats, conditions))], ["Владение", signed(proficiencyBonus(character.level))], ["Пасс. внимание", passivePerception(character.stats, character.level, conditions).value], ["Нагрузка", `${load.weight}/${load.capacity}`]].map(([label, value]) => <div key={String(label)} className={box}><p className="text-[10px] font-bold">{label}</p><p className="text-lg font-bold">{value}</p></div>)}
        </section>
        <section className="grid grid-cols-3 gap-4">
          <div className={box}><p className="mb-1 font-bold">Спасброски</p>{ABILITY_KEYS.map((key) => { const save = savingThrow(character.stats, key, character.level); return <p key={key}>{save.proficient ? "●" : "○"} {signed(save.total)} {ABILITY_LABELS[key].long}</p>; })}</div>
          <div className={`${box} col-span-2`}><p className="mb-1 font-bold">Навыки</p><div className="columns-2">{SKILL_KEYS.map((skill) => { const value = skillModifier(character.stats, skill, character.level); return <p key={skill}>{value.expertise ? "◆" : value.proficient ? "●" : "○"} {signed(value.total)} {SKILL_DEFS[skill].label}</p>; })}</div></div>
        </section>
        <section className="grid grid-cols-2 gap-4">
          <div className={box}><p className="mb-1 font-bold">Атаки</p>{character.inventory.filter((item) => item.category === "weapon").map((item) => { const attack = weaponAttack(item, character.stats, character.level); return <p key={item.id}>{item.name}: {signed(attack.toHit)}, {attack.damage} {attack.type}</p>; })}</div>
          <div className={box}><p className="mb-1 font-bold">Ресурсы и монеты</p>{(character.stats.resources ?? []).map((resource) => <p key={resource.id}>{resource.name}: {resource.current}/{resource.max}</p>)}<p className="mt-1">{(Object.keys(COIN_LABELS) as (keyof Coins)[]).map((key) => `${coins[key]} ${COIN_LABELS[key]}`).join(" · ")}</p></div>
        </section>
        <section className={box}><p className="mb-1 font-bold">Снаряжение</p><div className="columns-2">{character.inventory.map((item) => <p key={item.id}>{item.equipped ? "✓ " : ""}{item.name} ×{item.quantity} ({item.weight * item.quantity} фнт.)</p>)}</div></section>
        {character.spellbook.list.length ? <section className={box}><p className="mb-1 font-bold">Заклинания · ячейки: {Object.entries(character.spellbook.slots).map(([level, max]) => `${level} ур. ${Math.max(0, max - (character.spellbook.used[level] ?? 0))}/${max}`).join(", ")}</p>{character.spellbook.list.map((spell) => <p key={spell.id}><b>{spell.name}</b> ({spell.level === 0 ? "заговор" : `${spell.level} круг`}) — {spell.description}</p>)}</section> : null}
        {conditions.length ? <section className={box}><p className="font-bold">Состояния</p><p>{conditions.map((key) => CONDITION_CATALOG[key].label).join(", ")}</p></section> : null}
      </article>
    </div>
  );
}
