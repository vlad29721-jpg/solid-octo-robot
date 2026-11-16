"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function DiceVisual({ rolling, value, className }: { rolling: boolean; value?: number | string; className?: string }) {
  return (
    <motion.div
      className={cn("relative grid h-32 w-32 place-items-center sm:h-40 sm:w-40", className)}
      animate={rolling ? { rotate: 360, scale: [1, 1.06, 1] } : { rotate: 0, scale: 1 }}
      transition={rolling ? { rotate: { repeat: Infinity, duration: 0.75, ease: "linear" }, scale: { repeat: Infinity, duration: 0.75 } } : { type: "spring", stiffness: 220, damping: 18 }}
    >
      <div className="absolute inset-3 rounded-full bg-gold/15 blur-2xl" />
      <svg viewBox="0 0 120 120" className="relative h-full w-full drop-shadow-[0_0_18px_rgba(212,175,55,0.35)]" aria-hidden="true">
        <defs>
          <linearGradient id="dice-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f1dc98" />
            <stop offset="55%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#8b0000" />
          </linearGradient>
        </defs>
        <polygon points="60,5 108,32 108,88 60,115 12,88 12,32" fill="rgba(10,10,10,0.82)" stroke="url(#dice-face)" strokeWidth="3" />
        <polygon points="60,5 108,32 60,60 12,32" fill="rgba(212,175,55,0.12)" stroke="rgba(212,175,55,0.5)" strokeWidth="1.4" />
        <polygon points="12,32 60,60 60,115 12,88" fill="rgba(139,0,0,0.14)" stroke="rgba(212,175,55,0.38)" strokeWidth="1.4" />
        <polygon points="108,32 108,88 60,115 60,60" fill="rgba(212,175,55,0.07)" stroke="rgba(212,175,55,0.38)" strokeWidth="1.4" />
        <circle cx="60" cy="60" r="25" fill="#0a0a0a" stroke="#d4af37" strokeWidth="1.5" />
      </svg>
      <span className="absolute font-display text-3xl font-bold tabular-nums text-parchment sm:text-4xl">{rolling ? "…" : value ?? "?"}</span>
    </motion.div>
  );
}
