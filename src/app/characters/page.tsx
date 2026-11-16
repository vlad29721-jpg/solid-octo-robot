"use client";

import { motion } from "framer-motion";
import { Eye, Plus, Search, Users, Weight } from "lucide-react";
import { useMemo, useState } from "react";
import { CharacterSheet } from "@/components/characters/character-sheet";
import { CharacterForm } from "@/components/forms/character-form";
import { Avatar } from "@/components/dnd/avatar";
import { ConditionChips } from "@/components/dnd/condition-chips";
import { HpBar } from "@/components/dnd/hp-bar";
import { EmptyState } from "@/components/empty-state";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import { CLASS_CATALOG, CLASS_KEYS } from "@/lib/dnd/catalog";
import { encumbrance, passivePerception, proficiencyBonus, signed } from "@/lib/dnd/calculations";
import { classLabel, formatDate } from "@/lib/utils";

export default function CharactersPage() {
  const { snapshot, campaign, isDm } = useHub();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const characters = snapshot?.characters ?? [];
  const filtered = useMemo(() => characters.filter((character) => {
    const matchesSearch = `${character.name} ${character.species} ${classLabel(character.classKey)}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (classFilter === "all" || character.classKey === classFilter);
  }), [characters, search, classFilter]);
  const selected = characters.find((character) => character.id === selectedId) ?? null;

  if (!snapshot || !campaign) return <PageSkeleton />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        eyebrow="Кодекс героев"
        title="Листы персонажей"
        description={isDm ? "Полные листы партии: характеристики, владение, пассивная внимательность, вес, ячейки и состояния." : "Вы видите только свои листы. Скрытые заметки Мастера и чужие персонажи недоступны."}
        action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Новый персонаж</Button>}
      />

      <div className="glass flex flex-col gap-2 rounded-2xl p-3 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-ink" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по имени, расе или классу…" className="pl-9" /></div>
        <Select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="sm:w-56"><option value="all">Все классы</option>{CLASS_KEYS.map((key) => <option key={key} value={key}>{CLASS_CATALOG[key].label}</option>)}</Select>
        <Badge variant="gold" className="h-10 items-center justify-center px-3 normal-case tracking-normal">{filtered.length} из {characters.length}</Badge>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((character, index) => {
            const perception = passivePerception(character.stats, character.level, character.conditions.map((condition) => condition.id));
            const load = encumbrance(character.stats, character.inventory);
            return (
              <motion.button key={character.id} type="button" onClick={() => setSelectedId(character.id)} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.3) }} className="glass group rounded-2xl p-5 text-left transition hover:-translate-y-1 hover:border-gold/35">
                <div className="flex items-start gap-3">
                  <Avatar name={character.name} src={character.avatarUrl} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><h2 className="truncate font-display text-xl font-semibold text-parchment">{character.name}</h2><Badge variant="gold">Ур. {character.level}</Badge></div>
                    <p className="mt-0.5 text-xs text-muted-ink">{classLabel(character.classKey)} · {character.species}</p>
                  </div>
                </div>
                <div className="mt-4"><HpBar current={character.hpCurrent} max={character.hpMax} /></div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/[0.07] bg-black/25 p-2 text-center"><p className="text-[9px] uppercase tracking-wider text-muted-ink">КД</p><p className="font-display text-lg text-parchment">{character.armorClass}</p></div>
                  <div className="rounded-xl border border-white/[0.07] bg-black/25 p-2 text-center"><p className="text-[9px] uppercase tracking-wider text-muted-ink">Внимание</p><p className="font-display text-lg text-parchment">{perception.value}</p></div>
                  <div className="rounded-xl border border-white/[0.07] bg-black/25 p-2 text-center"><p className="text-[9px] uppercase tracking-wider text-muted-ink">Владение</p><p className="font-display text-lg text-gold">{signed(proficiencyBonus(character.level))}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5"><Badge variant="outline"><Weight className="h-3 w-3" />{load.weight}/{load.capacity} фнт.</Badge><Badge variant="outline"><Eye className="h-3 w-3" />{character.inventory.length} предметов</Badge>{character.spellbook.list.length ? <Badge variant="info">{character.spellbook.list.length} заклинаний</Badge> : null}</div>
                <div className="mt-3"><ConditionChips conditions={character.conditions.map((condition) => condition.id)} /></div>
                <p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] text-muted-ink">Изменён {formatDate(character.updatedAt, true)} · нажмите, чтобы открыть лист</p>
              </motion.button>
            );
          })}
        </div>
      ) : <EmptyState title={characters.length ? "Никого не нашли" : "Партия ещё не собралась"} description={characters.length ? "Измените поиск или фильтр класса." : "Создайте первого героя: стандартный массив или 4d6kh3, навыки класса и расчёт всех модификаторов уже готовы."} actionLabel={characters.length ? undefined : "Создать лист"} onAction={characters.length ? undefined : () => setCreateOpen(true)} icon={Users} />}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Новый лист персонажа</DialogTitle><DialogDescription>Характеристики и владение рассчитываются сразу; инвентарь, заклинания и состояния можно дополнить потом.</DialogDescription></DialogHeader>
          <CharacterForm campaignId={campaign.id} onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <CharacterSheet character={selected} open={Boolean(selectedId)} onOpenChange={(open) => { if (!open) setSelectedId(null); }} />
    </div>
  );
}
