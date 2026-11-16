"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Dices, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DiceVisual } from "@/components/dnd/dice-visual";
import { useHub } from "@/components/providers/hub-provider";
import { Badge, Spinner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { DICE_PRESETS, parseDiceExpression } from "@/lib/dnd/dice";
import { useRollDice } from "@/lib/queries";
import { useHubStore } from "@/lib/store";
import type { DiceRollDto } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuickRollDialog() {
  const open = useHubStore((state) => state.quickRollOpen);
  const setOpen = useHubStore((state) => state.setQuickRollOpen);
  const { campaign } = useHub();
  const roll = useRollDice();
  const [expression, setExpression] = useState("1d20+5");
  const [localError, setLocalError] = useState("");
  const [result, setResult] = useState<DiceRollDto | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError("");
    try { parseDiceExpression(expression); } catch (error) { setLocalError(error instanceof Error ? error.message : "Неверное выражение."); return; }
    if (!campaign) return;
    roll.mutate({ campaignId: campaign.id, expression: expression.trim() }, {
      onSuccess: (data) => setResult(data.roll),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Быстрый бросок</DialogTitle>
          <DialogDescription>Результат появится в общем журнале кампании и у всех устройств.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center">
          <DiceVisual rolling={roll.isPending} value={result?.result} />
          {result && !roll.isPending ? (
            <motion.div key={result.id} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="mt-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className={cn("font-display text-5xl font-bold tabular-nums", result.detail.critical ? "text-emerald-300" : result.detail.fumble ? "text-red-400" : "gold-text")}>{result.result}</span>
                {result.detail.critical ? <Badge variant="success"><Sparkles className="h-3 w-3" />Крит</Badge> : null}
                {result.detail.fumble ? <Badge variant="crimson">Провал</Badge> : null}
              </div>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-ink">{result.detail.breakdown}</p>
            </motion.div>
          ) : <p className="mt-2 text-sm text-muted-ink">{roll.isPending ? "Кубики летят…" : "Введите выражение и бросьте"}</p>}
        </div>
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <div className="flex gap-2">
            <Input value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="2d6+3" className="font-mono text-base" aria-label="Выражение броска" />
            <Button type="submit" disabled={roll.isPending || !campaign}>{roll.isPending ? <Spinner /> : <Dices className="h-4 w-4" />}Бросить</Button>
          </div>
          {localError ? <p className="text-xs font-medium text-red-400">{localError}</p> : null}
          {roll.isError ? <p className="text-xs font-medium text-red-400">{roll.error.message}</p> : null}
          <div className="thin-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            {DICE_PRESETS.slice(0, 8).map((preset) => (
              <button key={preset.label} type="button" onClick={() => setExpression(preset.expression)} className="shrink-0 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 font-mono text-[11px] text-parchment/75 transition hover:border-gold/40 hover:text-gold">{preset.label}</button>
            ))}
          </div>
        </form>
        <Button asChild variant="ghost" className="mt-4 w-full"><Link href="/dice" onClick={() => setOpen(false)}>Открыть полный лог бросков<ArrowRight className="h-4 w-4" /></Link></Button>
      </DialogContent>
    </Dialog>
  );
}
