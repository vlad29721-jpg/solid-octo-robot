"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, BookOpen, Bot, Copy, Dices, Eye, Radio, ScrollText, Swords, Users, WandSparkles,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/dnd/avatar";
import { HpBar } from "@/components/dnd/hp-bar";
import { EmptyState } from "@/components/empty-state";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Badge, Metric } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/ui/page-header";
import { passivePerception, proficiencyBonus } from "@/lib/dnd/calculations";
import { toast } from "@/lib/toast";
import { classLabel, cn, copyText, formatTime, relativeTime } from "@/lib/utils";

const QUICK_ACTIONS = [
  { href: "/initiative", label: "Трекер боя", detail: "Ходы и HP", icon: Swords, color: "text-red-300" },
  { href: "/dice", label: "Бросить кубики", detail: "Общий лог", icon: Dices, color: "text-gold" },
  { href: "/ai", label: "ИИ-Мастер", detail: "NPC и события", icon: Bot, color: "text-emerald-300" },
  { href: "/journal", label: "Журнал", detail: "Заметки партии", icon: ScrollText, color: "text-sky-300" },
];

export default function DashboardPage() {
  const { snapshot, campaign, actor, isDm, realtimeMode, lastSyncAt } = useHub();
  const [copied, setCopied] = useState(false);
  if (!snapshot || !campaign) return <PageSkeleton />;

  const active = snapshot.encounter?.state.combatants.find((item) => item.id === snapshot.encounter?.state.activeId);
  const lastRoll = snapshot.rolls[0];
  const hiddenNotes = snapshot.sessions.filter((session) => session.isDmOnly).length;
  const totalPartyHp = snapshot.characters.reduce((sum, character) => sum + character.hpCurrent, 0);
  const totalPartyMax = snapshot.characters.reduce((sum, character) => sum + character.hpMax, 0);

  const copyInvite = async () => {
    const ok = await copyText(campaign.inviteCode);
    setCopied(ok);
    if (ok) toast.success("Код приглашения скопирован", campaign.inviteCode);
  };

  return (
    <div className="space-y-7 pb-4">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass relative min-h-[260px] overflow-hidden rounded-3xl p-5 sm:min-h-[300px] sm:p-8">
        <Image src="/images/hero-banner.png" alt="" fill priority sizes="(max-width: 768px) 100vw, 1200px" className="object-cover object-center opacity-65" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.97)_0%,rgba(10,10,10,0.82)_48%,rgba(10,10,10,0.25)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(10,10,10,0.85),transparent_60%)]" />
        <div className="relative z-10 flex h-full min-h-[220px] max-w-2xl flex-col justify-end">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="gold"><WandSparkles className="h-3 w-3" />Активная хроника</Badge>
            <Badge variant="outline">{isDm ? "Мастер видит все заметки" : "Открытые заметки партии"}</Badge>
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-parchment sm:text-5xl">{campaign.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-parchment/70 sm:text-base">{campaign.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild><Link href="/initiative">{snapshot.encounter?.state.active ? "Продолжить бой" : "Открыть трекер"}<ArrowRight className="h-4 w-4" /></Link></Button>
            <Button variant="glass" onClick={() => void copyInvite()}><Copy className="h-4 w-4" />{copied ? "Скопировано" : campaign.inviteCode}</Button>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Партия" value={snapshot.characters.length} hint={`${totalPartyHp}/${totalPartyMax} HP`} />
        <Metric label="Раунд" value={snapshot.encounter?.state.round ?? "—"} hint={active ? `Ход: ${active.name}` : "Бой не идёт"} />
        <Metric label="Заметки" value={snapshot.sessions.length} hint={isDm ? `Скрытых: ${hiddenNotes}` : "Только открытые"} />
        <Metric label="Последний бросок" value={lastRoll?.result ?? "—"} hint={lastRoll ? `${lastRoll.expression} · ${lastRoll.actorName}` : "Кубики ещё не летали"} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-xl text-parchment">Быстрый переход</h2>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-ink"><Radio className={cn("h-3 w-3", realtimeMode === "realtime" ? "text-emerald-400" : "text-gold")} />{realtimeMode === "realtime" ? "Supabase Realtime" : "Live polling"} · {relativeTime(lastSyncAt)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div key={action.href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
                <Link href={action.href} className="glass group flex h-full items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-gold/35">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/35"><Icon className={cn("h-5 w-5", action.color)} /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-parchment">{action.label}</p><p className="text-[11px] text-muted-ink">{action.detail}</p></div>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-ink transition group-hover:translate-x-0.5 group-hover:text-gold" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="space-y-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-2"><h2 className="font-display text-xl text-parchment">Партия</h2><Button asChild variant="ghost" size="sm"><Link href="/characters">Все листы<ArrowRight className="h-3.5 w-3.5" /></Link></Button></div>
          {snapshot.characters.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {snapshot.characters.map((character, index) => {
                const perception = passivePerception(character.stats, character.level, character.conditions.map((condition) => condition.id));
                return (
                  <motion.div key={character.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
                    <Link href="/characters" className="glass block rounded-2xl p-4 transition hover:border-gold/30">
                      <div className="flex items-center gap-3">
                        <Avatar name={character.name} src={character.avatarUrl} size="lg" />
                        <div className="min-w-0 flex-1"><p className="truncate font-display text-lg text-parchment">{character.name}</p><p className="text-xs text-muted-ink">{classLabel(character.classKey)} · ур. {character.level} · {character.species}</p></div>
                        {character.conditions.length ? <Badge variant="crimson">{character.conditions.length}</Badge> : null}
                      </div>
                      <div className="mt-3"><HpBar current={character.hpCurrent} max={character.hpMax} /></div>
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-muted-ink">
                        <Badge variant="outline">КД {character.armorClass}</Badge>
                        <Badge variant="outline"><Eye className="h-3 w-3" />{perception.value}</Badge>
                        <Badge variant="outline">Владение +{proficiencyBonus(character.level)}</Badge>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : <EmptyState compact title="Партия ещё не собралась" description="Создайте первого персонажа — модификаторы, навыки, инвентарь и ячейки заклинаний рассчитаются автоматически." actionLabel="Создать лист" href="/characters" icon={Users} />}

          <div className="flex items-center justify-between gap-2"><h2 className="font-display text-xl text-parchment">Последние заметки</h2><Button asChild variant="ghost" size="sm"><Link href="/journal">Открыть журнал<ArrowRight className="h-3.5 w-3.5" /></Link></Button></div>
          <div className="space-y-2.5">
            {snapshot.sessions.slice(0, 3).map((session) => (
              <div key={session.id} className="parchment-panel rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2"><p className="font-display text-lg text-parchment">{session.title}</p>{session.isDmOnly ? <Badge variant="crimson">Только DM</Badge> : <Badge variant="success">Партия</Badge>}<span className="ml-auto text-[11px] text-muted-ink">{relativeTime(session.sessionDate)}</span></div>
                <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-ink">{session.notes}</p>
              </div>
            ))}
            {!snapshot.sessions.length ? <p className="rounded-2xl border border-dashed border-gold/20 p-6 text-center text-sm text-muted-ink">Журнал пока чист. Первая сессия ждёт своей хроники.</p> : null}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-display text-lg text-parchment">Журнал бросков</h2><Badge variant={realtimeMode === "realtime" ? "success" : "info"}><Radio className="h-3 w-3" />LIVE</Badge></div>
            {snapshot.rolls.length ? (
              <div className="thin-scrollbar max-h-[430px] space-y-2 overflow-y-auto pr-1">
                {snapshot.rolls.slice(0, 14).map((roll) => (
                  <motion.div key={roll.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/25 p-2.5">
                    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border font-display text-base font-bold tabular-nums", roll.detail.critical ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : roll.detail.fumble ? "border-red-400/40 bg-red-400/10 text-red-300" : "border-gold/25 bg-gold/10 text-gold")}>{roll.result}</div>
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-parchment">{roll.actorName} <span className="font-mono text-gold/80">{roll.expression}</span></p><p className="truncate text-[10px] text-muted-ink">{roll.detail.breakdown}</p></div>
                    <span className="shrink-0 text-[10px] text-muted-ink">{formatTime(roll.createdAt)}</span>
                  </motion.div>
                ))}
              </div>
            ) : <EmptyState compact title="Кубики молчат" description="Первый бросок появится здесь и у всех игроков кампании." actionLabel="Бросить d20" href="/dice" icon={Dices} />}
          </div>
          <div className="parchment-panel rounded-2xl p-4">
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-gold" /><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">За столом</p></div>
            <div className="mt-3 flex items-center gap-3"><Avatar name={actor?.displayName ?? "Мастер"} src={actor?.avatarUrl} size="lg" /><div><p className="text-sm font-semibold text-parchment">{actor?.displayName}</p><p className="text-[11px] text-muted-ink">{isDm ? "Мастер кампании" : "Игрок"}</p></div></div>
            <p className="mt-3 text-xs leading-relaxed text-muted-ink">Профиль определяет видимость заметок и листов. Переключитесь на игрока в аккаунте, чтобы проверить правила доступа.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
