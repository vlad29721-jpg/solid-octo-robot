"use client";

import { motion } from "framer-motion";
import { Copy, Dices, Radio, Search, Sparkles } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { DiceVisual } from "@/components/dnd/dice-visual";
import { EmptyState } from "@/components/empty-state";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import { DICE_PRESETS, parseDiceExpression } from "@/lib/dnd/dice";
import { useRollDice } from "@/lib/queries";
import { toast } from "@/lib/toast";
import type { DiceRollDto } from "@/lib/types";
import { cn, copyText, formatTime, relativeTime } from "@/lib/utils";

export default function DicePage() {
  const { snapshot, campaign, actor, realtimeMode, lastSyncAt } = useHub();
  const roll = useRollDice();
  const [expression, setExpression] = useState("2d6+3");
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [localError, setLocalError] = useState("");
  const [result, setResult] = useState<DiceRollDto | null>(null);

  const rolls = useMemo(() => (snapshot?.rolls ?? []).filter((item) => {
    const matches = `${item.expression} ${item.actorName} ${item.result}`.toLowerCase().includes(search.toLowerCase());
    return matches && (!onlyMine || item.actorId === actor?.id);
  }), [snapshot?.rolls, search, onlyMine, actor?.id]);

  if (!snapshot || !campaign) return <PageSkeleton />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError("");
    try { parseDiceExpression(expression); } catch (error) { setLocalError(error instanceof Error ? error.message : "Неверное выражение."); return; }
    roll.mutate({ campaignId: campaign.id, expression: expression.trim() }, { onSuccess: (data) => setResult(data.roll) });
  };

  const copyResult = async () => {
    if (!result) return;
    const ok = await copyText(`${result.expression} → ${result.result} (${result.detail.breakdown})`);
    if (ok) toast.success("Результат скопирован");
  };

  return (
    <div className="space-y-5 pb-4">
      <PageHeader eyebrow="Кости судьбы" title="Броски кубиков" description="Парсер поддерживает 2d6+3, 4d6kh3, преимущество 2d20kh1 и помеху 2d20kl1. Каждый результат попадает в общий лог." action={<Badge variant={realtimeMode === "realtime" ? "success" : "info"} className="normal-case tracking-normal"><Radio className="h-3 w-3" />{realtimeMode === "realtime" ? "Supabase Realtime" : `Live polling · ${relativeTime(lastSyncAt)}`}</Badge>} />

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="glass relative overflow-hidden rounded-3xl p-5 lg:col-span-2">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(212,175,55,0.13),transparent_55%)]" />
          <div className="relative flex flex-col items-center">
            <DiceVisual rolling={roll.isPending} value={result?.result} className="h-40 w-40 sm:h-48 sm:w-48" />
            {result && !roll.isPending ? (
              <motion.div key={result.id} initial={{ opacity: 0, scale: 0.8, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="mt-1 text-center">
                <div className="flex flex-wrap items-center justify-center gap-2"><span className={cn("font-display text-6xl font-bold tabular-nums", result.detail.critical ? "text-emerald-300" : result.detail.fumble ? "text-red-400" : "gold-text")}>{result.result}</span>{result.detail.critical ? <Badge variant="success"><Sparkles className="h-3 w-3" />Критический успех</Badge> : null}{result.detail.fumble ? <Badge variant="crimson">Критический провал</Badge> : null}</div>
                <p className="mt-1 font-mono text-xs text-gold/85">{result.expression}</p>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-ink">{result.detail.breakdown}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">{result.detail.parts.map((part, index) => <Badge key={`${part.expression}-${index}`} variant="outline" className="normal-case tracking-normal">{part.expression}: {part.rolls.join(", ")} → {part.subtotal}</Badge>)}</div>
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => void copyResult()}><Copy className="h-3.5 w-3.5" />Скопировать</Button>
              </motion.div>
            ) : <p className="mt-3 text-sm text-muted-ink">{roll.isPending ? "Кубики в полёте…" : "Введите выражение и испытайте удачу"}</p>}
          </div>
          <form className="relative mt-6 space-y-3" onSubmit={submit}>
            <div className="flex gap-2"><Input value={expression} onChange={(event) => setExpression(event.target.value)} className="font-mono text-base" placeholder="2d6+3" aria-label="Выражение броска" /><Button type="submit" disabled={roll.isPending}>{roll.isPending ? <Spinner /> : <Dices className="h-4 w-4" />}Бросить</Button></div>
            {localError ? <p className="text-xs font-medium text-red-400">{localError}</p> : null}
            {roll.isError ? <p className="text-xs font-medium text-red-400">{roll.error.message}</p> : null}
            <div className="flex flex-wrap gap-1.5">{DICE_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => setExpression(preset.expression)} className={cn("rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition", expression === preset.expression ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 bg-black/30 text-parchment/70 hover:border-gold/35")}>{preset.label}</button>)}</div>
            <p className="text-[11px] leading-relaxed text-muted-ink">kh — оставить высшие кубики, kl — низшие. До 100 костей и 1000 граней за один бросок. Случайность криптографическая на сервере.</p>
          </form>
        </section>

        <section className="glass rounded-3xl p-5 lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl text-parchment">Общий журнал</h2><Badge variant="gold">{rolls.length} бросков</Badge>
            <div className="relative ml-auto min-w-40 flex-1 sm:max-w-56"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-ink" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск…" className="h-9 pl-8 text-xs" /></div>
            <Button variant={onlyMine ? "gold" : "glass"} size="sm" onClick={() => setOnlyMine((value) => !value)}>Мои</Button>
          </div>
          {rolls.length ? (
            <div className="thin-scrollbar max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {rolls.map((item, index) => (
                <motion.div key={item.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index * 0.025, 0.25) }} className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-3">
                  <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl border font-display text-xl font-bold tabular-nums", item.detail.critical ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : item.detail.fumble ? "border-red-400/40 bg-red-400/10 text-red-300" : "border-gold/25 bg-gold/10 text-gold")}>{item.result}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-parchment">{item.actorName}</p><span className="font-mono text-xs text-gold/85">{item.expression}</span>{item.detail.critical ? <Badge variant="success">NAT 20</Badge> : null}{item.detail.fumble ? <Badge variant="crimson">NAT 1</Badge> : null}</div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-ink">{item.detail.breakdown}</p>
                  </div>
                  <div className="shrink-0 text-right"><p className="text-[11px] text-muted-ink">{formatTime(item.createdAt)}</p><p className="text-[10px] text-muted-ink/60">{relativeTime(item.createdAt)}</p></div>
                </motion.div>
              ))}
            </div>
          ) : <EmptyState compact title="В журнале тихо" description="Сделайте первый бросок или измените фильтр. Все участники кампании увидят результат." icon={Dices} />}
        </section>
      </div>
    </div>
  );
}
