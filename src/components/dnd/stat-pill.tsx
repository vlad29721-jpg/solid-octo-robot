import { ABILITY_LABELS } from "@/lib/dnd/catalog";
import { abilityModifier, signed } from "@/lib/dnd/calculations";
import type { AbilityKey } from "@/lib/dnd/types";
import { cn } from "@/lib/utils";

export function StatPill({ ability, score, className }: { ability: AbilityKey; score: number; className?: string }) {
  const mod = abilityModifier(score);
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-gold/15 bg-black/35 px-2 py-3 text-center", className)}>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold/80">{ABILITY_LABELS[ability].short}</span>
      <span className="mt-1 font-display text-2xl font-semibold tabular-nums text-parchment">{score}</span>
      <span className={cn("mt-1 rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums", mod >= 0 ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-red-400/25 bg-red-400/10 text-red-300")}>{signed(mod)}</span>
    </div>
  );
}
