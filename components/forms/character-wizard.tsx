"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Dices, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { ABILITY_KEYS, ABILITY_LABELS, CLASS_CATALOG, CLASS_KEYS, SKILL_DEFS } from "@/lib/dnd/catalog";
import { abilityModifier, signed } from "@/lib/dnd/calculations";
import { BACKGROUNDS, CLASS_CONTENT, POINT_BUY_COST, RACES } from "@/lib/dnd/content";
import { rollExpression } from "@/lib/dnd/dice";
import type { AbilityKey, SkillKey } from "@/lib/dnd/types";
import { useCreateCharacter } from "@/lib/queries";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const STEPS = ["Раса", "Класс", "Предыстория", "Характеристики", "Навыки", "Личность"];
const STANDARD = [15, 14, 13, 12, 10, 8];
type Method = "standard" | "pointbuy" | "roll";

export function CharacterWizard({ campaignId, onSuccess }: { campaignId: string; onSuccess?: () => void }) {
  const { snapshot, isDm } = useHub();
  const create = useCreateCharacter();
  const [step, setStep] = useState(0);
  const [race, setRace] = useState("human");
  const [classKey, setClassKey] = useState("fighter");
  const [background, setBackground] = useState("soldier");
  const [method, setMethod] = useState<Method>("standard");
  const [base, setBase] = useState<Record<AbilityKey, number>>({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
  const [rolled, setRolled] = useState<number[]>([]);
  const [classSkills, setClassSkills] = useState<SkillKey[]>([]);
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [subclass, setSubclass] = useState("");
  const [personality, setPersonality] = useState({ traits: "", ideals: "", bonds: "", flaws: "", backstory: "" });

  const raceDef = RACES.find((entry) => entry.key === race) ?? RACES[0];
  const classDef = CLASS_CATALOG[classKey];
  const backgroundDef = BACKGROUNDS.find((entry) => entry.key === background) ?? BACKGROUNDS[0];
  const content = CLASS_CONTENT[classKey];
  const finalScores = useMemo(() => Object.fromEntries(ABILITY_KEYS.map((key) => [key, Math.min(20, base[key] + (raceDef.bonuses[key] ?? 0))])) as Record<AbilityKey, number>, [base, raceDef]);
  const pointsUsed = ABILITY_KEYS.reduce((sum, key) => sum + (POINT_BUY_COST[base[key]] ?? 99), 0);
  const hp = Math.max(1, classDef.hitDie + abilityModifier(finalScores.con));
  const skillPool = Object.keys(SKILL_DEFS).filter((skill) => !backgroundDef.skills.includes(skill as SkillKey)) as SkillKey[];
  const allSkills = [...new Set([...backgroundDef.skills, ...classSkills])];

  const setMethodAndReset = (next: Method) => {
    setMethod(next);
    if (next === "pointbuy") setBase({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
    if (next === "standard") setBase({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
    if (next === "roll") { const values = Array.from({ length: 6 }, () => rollExpression("4d6kh3").total).sort((a, b) => b - a); setRolled(values); setBase(Object.fromEntries(ABILITY_KEYS.map((key, index) => [key, values[index]])) as Record<AbilityKey, number>); }
  };
  const swap = (key: AbilityKey, value: number) => {
    const other = ABILITY_KEYS.find((entry) => entry !== key && base[entry] === value);
    setBase((prev) => ({ ...prev, [key]: value, ...(other ? { [other]: prev[key] } : {}) }));
  };
  const canNext = [true, true, true, method !== "pointbuy" || pointsUsed <= 27, classSkills.length === 2, name.trim().length >= 2][step];

  const submit = () => {
    create.mutate({
      campaignId, name: name.trim(), classKey, species: raceDef.name, level: 1, hpMax: hp, hpCurrent: hp,
      armorClass: 10 + abilityModifier(finalScores.dex), abilities: finalScores, proficientSkills: allSkills, expertiseSkills: [],
      initiativeBonus: 0, ownerId: ownerId || undefined, race, subclass: subclass || undefined, bonusGold: backgroundDef.gold,
      personality: { background, ...personality },
    }, { onSuccess: () => { toast.success("Герой готов к приключениям!", `${name} · ${raceDef.name} ${classDef.label}`); onSuccess?.(); } });
  };

  return (
    <div>
      <div className="mb-5 flex gap-1">
        {STEPS.map((label, index) => (
          <button key={label} type="button" onClick={() => index < step && setStep(index)} className="flex-1 text-center">
            <div className={cn("h-1.5 rounded-full", index <= step ? "bg-gold" : "bg-white/10")} />
            <span className={cn("mt-1 hidden text-[10px] sm:block", index === step ? "text-gold" : "text-muted-ink")}>{label}</span>
          </button>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="min-h-[340px]">
        {step === 0 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {RACES.map((entry) => (
              <button key={entry.key} type="button" onClick={() => setRace(entry.key)} className={cn("rounded-2xl border p-3 text-left transition", race === entry.key ? "border-gold/60 bg-gold/10" : "border-white/10 bg-black/25 hover:border-gold/30")}>
                <p className="font-display text-base text-parchment">{entry.name}</p>
                <p className="mt-0.5 text-[11px] text-gold">{Object.entries(entry.bonuses).map(([key, value]) => `${ABILITY_LABELS[key as AbilityKey].short} +${value}`).join(", ")}</p>
                <p className="mt-1 text-[10px] leading-snug text-muted-ink">{entry.traits}</p>
              </button>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CLASS_KEYS.map((key) => (
                <button key={key} type="button" onClick={() => { setClassKey(key); setClassSkills([]); setSubclass(""); }} className={cn("rounded-xl border p-2.5 text-left", classKey === key ? "border-gold/60 bg-gold/10" : "border-white/10 bg-black/25")}>
                  <p className="text-sm font-semibold text-parchment">{CLASS_CATALOG[key].label}</p><p className="text-[10px] text-muted-ink">d{CLASS_CATALOG[key].hitDie} · {CLASS_CATALOG[key].spellcastingAbility ? "заклинатель" : "воин"}</p>
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-black/25 p-3 text-xs text-muted-ink">
              <p className="text-parchment">Спасброски: {classDef.saveProficiencies.map((key) => ABILITY_LABELS[key].long).join(", ")}</p>
              <p className="mt-1">{content?.features.filter((feature) => feature.level === 1).map((feature) => `${feature.name} — ${feature.text}`).join(" · ")}</p>
            </div>
            {content?.subclassLevel === 1 ? (
              <FieldGroup label="Подкласс (выбирается на 1 уровне)"><Select value={subclass} onChange={(event) => setSubclass(event.target.value)}><option value="">Выберите…</option>{content.subclasses.map((entry) => <option key={entry.key} value={entry.key}>{entry.name}</option>)}</Select></FieldGroup>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {BACKGROUNDS.map((entry) => (
              <button key={entry.key} type="button" onClick={() => { setBackground(entry.key); setClassSkills((prev) => prev.filter((skill) => !entry.skills.includes(skill))); }} className={cn("rounded-2xl border p-3 text-left", background === entry.key ? "border-gold/60 bg-gold/10" : "border-white/10 bg-black/25")}>
                <p className="font-display text-base text-parchment">{entry.name}</p>
                <p className="text-[11px] text-gold">{entry.skills.map((skill) => SKILL_DEFS[skill].label).join(", ")} · {entry.gold} зм</p>
                <p className="mt-1 text-[10px] text-muted-ink">{entry.feature}</p>
              </button>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/30 p-1">
              {([["standard", "Стандартный массив"], ["pointbuy", "Покупка очков"], ["roll", "Бросок 4d6"]] as [Method, string][]).map(([key, label]) => <button key={key} type="button" onClick={() => setMethodAndReset(key)} className={cn("rounded-lg py-1.5 text-xs font-semibold", method === key ? "bg-gold text-ink" : "text-muted-ink")}>{label}</button>)}
            </div>
            {method === "pointbuy" ? <p className={cn("text-center text-sm", pointsUsed > 27 ? "text-red-400" : "text-gold")}>Потрачено очков: {pointsUsed} / 27</p> : null}
            {method === "roll" ? <div className="flex items-center justify-center gap-2 text-xs text-muted-ink">Выпало: {rolled.join(", ")}<Button size="sm" variant="ghost" onClick={() => setMethodAndReset("roll")}><Dices className="h-3.5 w-3.5" />Перебросить</Button></div> : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ABILITY_KEYS.map((key) => (
                <div key={key} className="rounded-xl border border-white/[0.08] bg-black/25 p-3">
                  <p className="text-[11px] font-bold text-gold">{ABILITY_LABELS[key].long}</p>
                  {method === "pointbuy" ? (
                    <div className="mt-1 flex items-center gap-2"><Button size="icon-sm" variant="glass" disabled={base[key] <= 8} onClick={() => setBase({ ...base, [key]: base[key] - 1 })}>−</Button><span className="w-6 text-center font-display text-xl">{base[key]}</span><Button size="icon-sm" variant="glass" disabled={base[key] >= 15} onClick={() => setBase({ ...base, [key]: base[key] + 1 })}>+</Button></div>
                  ) : (
                    <Select value={base[key]} onChange={(event) => swap(key, Number(event.target.value))} className="mt-1 h-9">{(method === "standard" ? STANDARD : rolled).map((value, index) => <option key={`${value}-${index}`} value={value}>{value}</option>)}</Select>
                  )}
                  <p className="mt-1 text-[11px] text-muted-ink">Итог {finalScores[key]}{raceDef.bonuses[key] ? ` (раса +${raceDef.bonuses[key]})` : ""} · <span className="text-parchment">{signed(abilityModifier(finalScores[key]))}</span></p>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-ink">HP на 1 уровне: <span className="text-gold">{hp}</span> (d{classDef.hitDie} + ТЕЛ)</p>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-ink">От предыстории: <span className="text-gold">{backgroundDef.skills.map((skill) => SKILL_DEFS[skill].label).join(", ")}</span>. Выберите ещё 2 навыка класса:</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {skillPool.map((skill) => {
                const active = classSkills.includes(skill);
                const suggested = classDef.suggestedSkills.includes(skill);
                return <button key={skill} type="button" onClick={() => setClassSkills((prev) => active ? prev.filter((entry) => entry !== skill) : prev.length < 2 ? [...prev, skill] : prev)} className={cn("rounded-lg border px-2 py-1.5 text-left text-xs", active ? "border-gold/60 bg-gold/15 text-parchment" : "border-white/10 bg-black/25 text-muted-ink")}>{SKILL_DEFS[skill].label}{suggested ? " ★" : ""}</button>;
              })}
            </div>
            <p className="text-[11px] text-muted-ink">★ — рекомендовано для класса. Снаряжение класса и {backgroundDef.gold + 15} зм выдадутся автоматически.</p>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldGroup label="Имя героя"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Лиана Тенетень" autoFocus /></FieldGroup>
              {isDm ? <FieldGroup label="Чей персонаж"><Select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}><option value="">Мой</option>{snapshot?.profiles.filter((profile) => profile.role === "player").map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</Select></FieldGroup> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([["traits", "Черта характера"], ["ideals", "Идеал"], ["bonds", "Привязанность"], ["flaws", "Слабость"]] as const).map(([key, label]) => <FieldGroup key={key} label={label}><Input value={personality[key]} onChange={(event) => setPersonality({ ...personality, [key]: event.target.value })} /></FieldGroup>)}
            </div>
            <FieldGroup label="Предыстория (по желанию)"><Textarea value={personality.backstory} onChange={(event) => setPersonality({ ...personality, backstory: event.target.value })} /></FieldGroup>
            <div className="parchment-panel rounded-2xl p-3 text-xs text-parchment/85">
              <p className="font-display text-base text-gold">{name || "Безымянный герой"}</p>
              <p>{raceDef.name} · {classDef.label} · {backgroundDef.name} · {hp} HP</p>
              <p className="mt-1">{ABILITY_KEYS.map((key) => `${ABILITY_LABELS[key].short} ${finalScores[key]}`).join(" · ")}</p>
              <p className="mt-1 text-muted-ink">Навыки: {allSkills.map((skill) => SKILL_DEFS[skill].label).join(", ")}</p>
            </div>
          </div>
        ) : null}
      </motion.div>

      <div className="mt-5 flex justify-between gap-2">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" />Назад</Button>
        <Badge variant="outline" className="self-center">{step + 1} / {STEPS.length}</Badge>
        {step < STEPS.length - 1
          ? <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Далее<ArrowRight className="h-4 w-4" /></Button>
          : <Button disabled={!canNext || create.isPending} onClick={submit}>{create.isPending ? <Spinner /> : <Check className="h-4 w-4" />}Создать героя</Button>}
      </div>
      {step === 4 && classSkills.length !== 2 ? <p className="mt-2 text-center text-[11px] text-muted-ink"><Sparkles className="mr-1 inline h-3 w-3" />Выберите ровно 2 навыка</p> : null}
    </div>
  );
}
