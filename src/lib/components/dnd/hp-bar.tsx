"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HpBar({ current, max, compact = false, className }: { current: number; max: number; compact?: boolean; className?: string }) {
  const reduced = useReducedMotion();
  const safeMax = Math.max(1, max);
  const percent = Math.max(0, Math.min(100, (current / safeMax) * 100));
  const color = percent > 55 ? "from-emerald-400 to-emerald-600" : percent > 25 ? "from-gold-soft to-amber-600" : "from-red-400 to-crimson";
  return (
    <div className={cn("w-full", className)}>
      {!compact ? (
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
          <span className="uppercase tracking-[0.14em] text-muted-ink">Очки здоровья</span>
          <span className={cn("tabular-nums", percent <= 25 ? "text-red-300" : "text-parchment")}>{current} / {max}</span>
        </div>
      ) : null}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-white/[0.07] bg-black/55">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_12px_rgba(212,175,55,0.25)]", color)}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 170, damping: 24, mass: 0.7 }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent)]" />
      </div>
      {compact ? <p className="mt-1 text-right text-[10px] tabular-nums text-muted-ink">{current}/{max}</p> : null}
    </div>
  );
}
