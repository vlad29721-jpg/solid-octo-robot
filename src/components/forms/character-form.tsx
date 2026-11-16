"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Dices, Sparkles, UserPlus } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldGroup, Input, Label, Select } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { ABILITY_KEYS, ABILITY_LABELS, CLASS_CATALOG, CLASS_KEYS, SKILL_DEFS, SKILL_KEYS } from "@/lib/dnd/catalog";
import { defaultSpellSlots, passivePerception, proficiencyBonus, signed } from "@/lib/dnd/calculations";
import { rollExpression } from "@/lib/dnd/dice";
import type { SkillKey } from "@/lib/dnd/types";
import { useCreateCharacter } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { characterCreateSchema, type CharacterCreateInput } from "@/lib/validation";

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export function CharacterForm({ campaignId, onSuccess }: { campaignId: string; onSuccess?: () => void }) {
  const { snapshot, isDm } = useHub();
  const create = useCreateCharacter();
  const form = useForm<z.input<typeof characterCreateSchema>, unknown, CharacterCreateInput>({
    resolver: zodResolver(characterCreateSchema),
    defaultValues: {
      campaignId, name: "", classKey: "fighter", species: "Человек", level: 1,
      hpMax: 10, hpCurrent: 10, armorClass: 10, initiativeBonus: 0,
      abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      proficientSkills: ["athletics", "intimidation"], expertiseSkills: [], ownerId: "", avatarUrl: "",
    },
  });
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = form;
  const values = watch();
  const selectedSkills = values.proficientSkills ?? [];
  const selectedExpertise = values.expertiseSkills ?? [];

  useEffect(() => setValue("campaignId", campaignId), [campaignId, setValue]);
  useEffect(() => {
    const subscription = watch((formValues, { name }) => {
      if (name !== "classKey" || !formValues.classKey) return;
      const definition = CLASS_CATALOG[formValues.classKey];
      if (!definition) return;
      setValue("proficientSkills", definition.suggestedSkills.filter((skill) => skill in SKILL_DEFS).slice(0, 2));
      setValue("expertiseSkills", []);
      setValue("hpMax", definition.hitDie);
      setValue("hpCurrent", definition.hitDie);
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  const parsed = characterCreateSchema.safeParse(values);
  const preview = parsed.success ? {
    proficiency: proficiencyBonus(parsed.data.level),
    perception: passivePerception({
      abilities: parsed.data.abilities, proficientSkills: parsed.data.proficientSkills,
      expertiseSkills: parsed.data.expertiseSkills, savingThrowProficiencies: [], initiativeBonus: parsed.data.initiativeBonus ?? 0,
      spellcastingAbility: null,
    }, parsed.data.level).value,
    slots: defaultSpellSlots(parsed.data.classKey, parsed.data.level),
  } : null;

  const toggleSkill = (skill: SkillKey, field: "proficientSkills" | "expertiseSkills") => {
    const current = field === "proficientSkills" ? selectedSkills : selectedExpertise;
    const next = current.includes(skill) ? current.filter((value) => value !== skill) : [...current, skill];
    setValue(field, next, { shouldValidate: true });
    if (field === "proficientSkills" && !next.includes(skill)) setValue("expertiseSkills", selectedExpertise.filter((value) => value !== skill));
    if (field === "expertiseSkills" && !current.includes(skill) && !selectedSkills.includes(skill)) setValue("proficientSkills", [...selectedSkills, skill]);
  };

  const rollAbilities = () => {
    ABILITY_KEYS.forEach((ability) => setValue(`abilities.${ability}`, rollExpression("4d6kh3").total, { shouldValidate: true }));
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit((data) => create.mutate(data, { onSuccess: () => { reset(); onSuccess?.(); } }))}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldGroup label="Имя персонажа" error={errors.name?.message}><Input placeholder="Лиана Тенетень" {...register("name")} /></FieldGroup>
        <FieldGroup label="Происхождение" error={errors.species?.message}><Input placeholder="Полуэльф" {...register("species")} /></FieldGroup>
        <FieldGroup label="Класс" error={errors.classKey?.message}>
          <Select {...register("classKey")}>{CLASS_KEYS.map((key) => <option key={key} value={key}>{CLASS_CATALOG[key].label} · d{CLASS_CATALOG[key].hitDie}</option>)}</Select>
        </FieldGroup>
        {isDm ? <FieldGroup label="Владелец" hint="Игрок увидит только своего персонажа"><Select {...register("ownerId")}><option value="">Мастер (по умолчанию)</option>{snapshot?.profiles.filter((profile) => profile.role === "player").map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</Select></FieldGroup> : null}
        <FieldGroup label="Уровень" error={errors.level?.message}><Input type="number" min={1} max={20} {...register("level")} /></FieldGroup>
        <FieldGroup label="Максимум HP" error={errors.hpMax?.message}><Input type="number" min={1} {...register("hpMax")} /></FieldGroup>
        <FieldGroup label="Текущие HP" error={errors.hpCurrent?.message}><Input type="number" min={0} {...register("hpCurrent")} /></FieldGroup>
        <FieldGroup label="Класс доспеха" error={errors.armorClass?.message}><Input type="number" min={1} {...register("armorClass")} /></FieldGroup>
        <FieldGroup label="Бонус инициативы" error={errors.initiativeBonus?.message}><Input type="number" {...register("initiativeBonus")} /></FieldGroup>
      </div>

      <div className="parchment-panel rounded-2xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Характеристики</p><p className="mt-0.5 text-[11px] text-muted-ink">Модификатор считается автоматически: ⌊(значение − 10) / 2⌋</p></div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => ABILITY_KEYS.forEach((key, index) => setValue(`abilities.${key}`, STANDARD_ARRAY[index]))}><Sparkles className="h-3.5 w-3.5" />Массив</Button>
            <Button type="button" size="sm" variant="outline" onClick={rollAbilities}><Dices className="h-3.5 w-3.5" />4d6kh3</Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITY_KEYS.map((ability) => (
            <label key={ability} className="rounded-xl border border-white/[0.08] bg-black/30 p-2 text-center">
              <span className="block text-[10px] font-bold tracking-wider text-gold/80">{ABILITY_LABELS[ability].short}</span>
              <input type="number" min={1} max={30} className="mt-1 w-full border-0 bg-transparent text-center font-display text-xl font-semibold text-parchment outline-none" {...register(`abilities.${ability}`)} />
              <span className="text-[11px] text-muted-ink">{signed(Math.floor((Number(values.abilities?.[ability]) - 10) / 2))}</span>
              {errors.abilities?.[ability] ? <span className="block text-[10px] text-red-400">1–30</span> : null}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><Label className="mb-0">Владение навыками</Label><Badge variant="gold">{selectedSkills.length} выбрано</Badge></div>
        <div className="thin-scrollbar grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:grid-cols-2">
          {SKILL_KEYS.map((skill) => (
            <label key={skill} className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition", selectedSkills.includes(skill) ? "bg-gold/10 text-parchment" : "text-muted-ink hover:bg-white/5")}>
              <Checkbox checked={selectedSkills.includes(skill)} onChange={() => toggleSkill(skill, "proficientSkills")} />
              <span className="flex-1">{SKILL_DEFS[skill].label}</span>
              <span className="font-mono text-[10px] text-gold/70">{SKILL_DEFS[skill].ability.toUpperCase()}</span>
              <button type="button" title="Экспертиза (удвоенный бонус владения)" onClick={(event) => { event.preventDefault(); toggleSkill(skill, "expertiseSkills"); }} className={cn("rounded border px-1 text-[9px] font-bold", selectedExpertise.includes(skill) ? "border-gold bg-gold text-ink" : "border-white/15 text-muted-ink")}>×2</button>
            </label>
          ))}
        </div>
        {errors.proficientSkills ? <p className="mt-1 text-xs text-red-400">{errors.proficientSkills.message}</p> : null}
      </div>

      {preview ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-2.5 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-ink">Владение</p><p className="font-display text-xl text-gold">{signed(preview.proficiency)}</p></div>
          <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-2.5 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-ink">Пасс. внимание</p><p className="font-display text-xl text-gold">{preview.perception}</p></div>
          <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-2.5 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-ink">Ячеек 1 ур.</p><p className="font-display text-xl text-gold">{preview.slots["1"] ?? 0}</p></div>
          <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-2.5 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-ink">Кость хитов</p><p className="font-display text-xl text-gold">d{CLASS_CATALOG[values.classKey]?.hitDie ?? "?"}</p></div>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? <Spinner /> : <UserPlus className="h-4 w-4" />}Создать лист персонажа</Button>
    </form>
  );
}
