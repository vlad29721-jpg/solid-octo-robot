"use client";

import { PawPrint, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { BACKGROUNDS } from "@/lib/dnd/content";
import type { Companion, Personality } from "@/lib/dnd/types";
import { useUpdateCharacter } from "@/lib/queries";
import type { CharacterDto } from "@/lib/types";

const EMPTY: Personality = { background: "", traits: "", ideals: "", bonds: "", flaws: "", backstory: "" };
const FIELDS: { key: keyof Personality; label: string; placeholder: string; long?: boolean }[] = [
  { key: "traits", label: "Черты характера", placeholder: "Я цитирую священные тексты в любой ситуации…" },
  { key: "ideals", label: "Идеалы", placeholder: "Свобода. Цепи созданы, чтобы их рвать." },
  { key: "bonds", label: "Привязанности", placeholder: "Я защищаю приют, где вырос." },
  { key: "flaws", label: "Слабости", placeholder: "Не могу устоять перед азартной игрой." },
  { key: "backstory", label: "Предыстория", placeholder: "Откуда герой, что с ним случилось и чего он ищет…", long: true },
];

export function CharacterPersonality({ character }: { character: CharacterDto }) {
  const update = useUpdateCharacter();
  const personality = { ...EMPTY, ...(character.stats.personality ?? {}) };
  const companions = character.stats.companions ?? [];
  const [draft, setDraft] = useState({ name: "", kind: "", hp: 10, ac: 12, attack: "" });
  const savePersonality = (patch: Partial<Personality>) => update.mutate({ id: character.id, patch: { stats: { ...character.stats, personality: { ...personality, ...patch } } } });
  const saveCompanions = (next: Companion[]) => update.mutate({ id: character.id, patch: { stats: { ...character.stats, companions: next } } });
  const background = BACKGROUNDS.find((entry) => entry.key === personality.background);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Предыстория: {background?.name ?? (personality.background || "не выбрана")}</p>
        {background ? <p className="mt-1 text-xs text-muted-ink">{background.feature}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <FieldGroup key={field.key} label={field.label} className={field.long ? "sm:col-span-2" : ""}>
            <Textarea key={`${field.key}-${personality[field.key].length}`} defaultValue={personality[field.key]} placeholder={field.placeholder} className={field.long ? "min-h-32" : "min-h-20"} onBlur={(event) => event.target.value !== personality[field.key] && savePersonality({ [field.key]: event.target.value })} />
          </FieldGroup>
        ))}
      </div>
      <p className="text-[11px] text-muted-ink">Поля сохраняются автоматически, когда вы переходите к другому полю.</p>

      <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <div className="mb-3 flex items-center gap-2"><PawPrint className="h-4 w-4 text-gold" /><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Спутники и фамильяры</p></div>
        <div className="grid gap-2 sm:grid-cols-2">
          {companions.map((companion) => (
            <div key={companion.id} className="rounded-xl border border-white/[0.08] bg-black/30 p-3">
              <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-parchment">{companion.name}</p><p className="text-[11px] text-muted-ink">{companion.kind} · КД {companion.ac}</p></div><button type="button" onClick={() => saveCompanions(companions.filter((entry) => entry.id !== companion.id))} aria-label="Удалить"><Trash2 className="h-3.5 w-3.5 text-muted-ink" /></button></div>
              <div className="mt-2 flex items-center gap-2">
                <Button size="icon-sm" variant="crimson" onClick={() => saveCompanions(companions.map((entry) => entry.id === companion.id ? { ...entry, hp: Math.max(0, entry.hp - 1) } : entry))}>−</Button>
                <span className="flex-1 text-center font-display text-lg tabular-nums text-parchment">{companion.hp}/{companion.maxHp} HP</span>
                <Button size="icon-sm" variant="outline" onClick={() => saveCompanions(companions.map((entry) => entry.id === companion.id ? { ...entry, hp: Math.min(entry.maxHp, entry.hp + 1) } : entry))}>+</Button>
              </div>
              {companion.attack ? <p className="mt-2 text-[11px] text-gold/85">⚔ {companion.attack}</p> : null}
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_70px_70px]">
          <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Имя: Уголёк" className="h-9" />
          <Input value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value })} placeholder="Кто: кот-фамильяр" className="h-9" />
          <Input type="number" value={draft.hp} onChange={(event) => setDraft({ ...draft, hp: Number(event.target.value) })} placeholder="HP" className="h-9" />
          <Input type="number" value={draft.ac} onChange={(event) => setDraft({ ...draft, ac: Number(event.target.value) })} placeholder="КД" className="h-9" />
          <Input value={draft.attack} onChange={(event) => setDraft({ ...draft, attack: event.target.value })} placeholder="Атака: Когти +4, 1d4+2" className="h-9 sm:col-span-3" />
          <Button size="sm" disabled={!draft.name.trim()} onClick={() => { saveCompanions([...companions, { id: `comp-${Date.now()}`, name: draft.name.trim(), kind: draft.kind || "Спутник", hp: Math.max(1, draft.hp), maxHp: Math.max(1, draft.hp), ac: Math.max(1, draft.ac), attack: draft.attack, notes: "" }]); setDraft({ name: "", kind: "", hp: 10, ac: 12, attack: "" }); }}><Plus className="h-3.5 w-3.5" />Добавить</Button>
        </div>
      </div>
    </div>
  );
}
