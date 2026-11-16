"use client";

import Link from "next/link";
import { ArrowLeft, Maximize2 } from "lucide-react";
import { MapBoard } from "@/components/map/map-board";
import { HpBar } from "@/components/dnd/hp-bar";
import { useHub } from "@/components/providers/hub-provider";
import { sortCombatants } from "@/lib/dnd/encounter";
import { cn, formatDate } from "@/lib/utils";

export default function ScreenPage() {
  const { snapshot, campaign } = useHub();
  if (!snapshot || !campaign) return null;
  const state = snapshot.encounter?.state;
  const ordered = state ? sortCombatants(state.combatants) : [];
  const next = snapshot.board?.world.nextSession;

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 lg:p-6">
      <header className="no-print flex items-center gap-3">
        <Link href="/" className="rounded-lg border border-white/10 p-2 text-muted-ink hover:text-gold" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="gold-text font-display text-2xl font-bold lg:text-4xl">{campaign.title}</h1>
        {state?.active ? <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-display text-lg text-gold">Раунд {state.round}</span> : null}
        <button type="button" onClick={() => void document.documentElement.requestFullscreen?.()} className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-muted-ink hover:text-gold"><Maximize2 className="h-4 w-4" />На весь экран</button>
      </header>
      <div className="grid flex-1 gap-4 xl:grid-cols-[1fr_380px]">
        <MapBoard readOnly />
        <aside className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">Порядок ходов</p>
            {ordered.length ? (
              <div className="space-y-2">
                {ordered.map((combatant) => {
                  const active = state?.active && state.activeId === combatant.id;
                  return (
                    <div key={combatant.id} className={cn("rounded-xl border p-2.5", active ? "border-gold/60 bg-gold/15" : "border-white/[0.07] bg-black/30", combatant.hp === 0 && "opacity-40")}>
                      <div className="flex items-center gap-2"><span className="w-8 font-mono text-sm text-gold">{combatant.initiative}</span><span className={cn("flex-1 font-display text-lg", active ? "text-gold" : "text-parchment")}>{combatant.name}</span></div>
                      {combatant.kind === "character" ? <HpBar current={combatant.hp} max={combatant.maxHp} compact className="mt-1" /> : <p className="mt-1 text-[11px] text-muted-ink">{combatant.hp === 0 ? "повержен" : combatant.hp / combatant.maxHp > 0.5 ? "держится" : combatant.hp / combatant.maxHp > 0.25 ? "ранен" : "при смерти"}</p>}
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-muted-ink">Бой не идёт.</p>}
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-gold">Последние броски</p>
            {snapshot.rolls.slice(0, 5).map((roll) => (
              <div key={roll.id} className="flex items-center gap-3 border-b border-white/[0.05] py-1.5 last:border-0">
                <span className={cn("w-12 text-center font-display text-2xl tabular-nums", roll.detail.critical ? "text-emerald-300" : roll.detail.fumble ? "text-red-400" : "text-gold")}>{roll.result}</span>
                <span className="flex-1 truncate text-sm text-parchment/80">{roll.actorName}</span><span className="font-mono text-xs text-muted-ink">{roll.expression}</span>
              </div>
            ))}
          </div>
          {next ? <div className="parchment-panel rounded-2xl p-4 text-center"><p className="text-xs uppercase tracking-[0.2em] text-gold/80">Следующая игра</p><p className="mt-1 font-display text-lg text-parchment">{next.note}</p><p className="text-sm text-muted-ink">{formatDate(next.at, true)}</p></div> : null}
        </aside>
      </div>
    </div>
  );
}
