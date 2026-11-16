"use client";

import { Lock, Plus, Star, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { CLASS_CONTENT, FEATS } from "@/lib/dnd/content";
import { useUpdateCharacter } from "@/lib/queries";
import type { CharacterDto } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CharacterAbilities({ character }: { character: CharacterDto }) {
  const update = useUpdateCharacter();
  const content = CLASS_CONTENT[character.classKey];
  const [featKey, setFeatKey] = useState(FEATS[0].key);
  if (!content) return <p className="text-sm text-muted-ink">Для этого класса пока нет описаний.</p>;
  const subclass = content.subclasses.find((entry) => entry.key === character.stats.subclass);
  const feats = character.stats.feats ?? [];
  const features = [...content.features.map((feature) => ({ ...feature, source: "Класс" })), ...(subclass?.features ?? []).map((feature) => ({ ...feature, source: subclass?.name ?? "" }))].sort((a, b) => a.level - b.level);
  const save = (patch: Partial<CharacterDto["stats"]>) => update.mutate({ id: character.id, patch: { stats: { ...character.stats, ...patch } } });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gold">Подкласс (с {content.subclassLevel} уровня)</p>
        <Select value={character.stats.subclass ?? ""} disabled={character.level < content.subclassLevel} onChange={(event) => save({ subclass: event.target.value || undefined })}>
          <option value="">{character.level < content.subclassLevel ? `Доступно с ${content.subclassLevel} уровня` : "Выберите подкласс…"}</option>
          {content.subclasses.map((entry) => <option key={entry.key} value={entry.key}>{entry.name}</option>)}
        </Select>
      </div>

      <div className="space-y-2">
        {features.map((feature) => {
          const unlocked = feature.level <= character.level;
          return (
            <div key={`${feature.source}-${feature.name}`} className={cn("flex gap-3 rounded-xl border p-3", unlocked ? "border-white/[0.08] bg-black/25" : "border-dashed border-white/[0.06] opacity-45")}>
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-sm", unlocked ? "bg-gold/15 text-gold" : "bg-black/30 text-muted-ink")}>{unlocked ? feature.level : <Lock className="h-3.5 w-3.5" />}</span>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-parchment">{feature.name}</p><Badge variant={feature.source === "Класс" ? "outline" : "gold"}>{feature.source}</Badge>{!unlocked ? <span className="text-[10px] text-muted-ink">с {feature.level} уровня</span> : null}</div><p className="mt-0.5 text-xs leading-relaxed text-muted-ink">{feature.text}</p></div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <div className="mb-2 flex items-center gap-2"><Star className="h-4 w-4 text-gold" /><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Черты</p></div>
        <div className="space-y-1.5">
          {feats.map((key) => { const feat = FEATS.find((entry) => entry.key === key); return feat ? (
            <div key={key} className="flex items-start gap-2 rounded-lg bg-black/25 p-2"><div className="flex-1"><p className="text-sm text-parchment">{feat.name}</p><p className="text-[11px] text-muted-ink">{feat.text}</p></div><button type="button" onClick={() => save({ feats: feats.filter((entry) => entry !== key) })} aria-label="Убрать"><X className="h-4 w-4 text-muted-ink" /></button></div>
          ) : null; })}
          {!feats.length ? <p className="text-xs text-muted-ink">Черт нет. Обычно их берут вместо увеличения характеристик на 4, 8, 12, 16 и 19 уровнях.</p> : null}
        </div>
        <div className="mt-3 flex gap-2">
          <Select value={featKey} onChange={(event) => setFeatKey(event.target.value)} className="h-9 text-xs">{FEATS.filter((feat) => !feats.includes(feat.key)).map((feat) => <option key={feat.key} value={feat.key}>{feat.name}</option>)}</Select>
          <Button size="sm" variant="outline" disabled={feats.includes(featKey)} onClick={() => save({ feats: [...feats, featKey] })}><Plus className="h-3.5 w-3.5" />Взять</Button>
        </div>
      </div>
    </div>
  );
}
