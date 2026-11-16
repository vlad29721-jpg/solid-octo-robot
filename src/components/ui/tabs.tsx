"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabItem<T extends string> = { value: T; label: string; icon?: LucideIcon };

type TabsProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  items: TabItem<T>[];
  className?: string;
};

export function Tabs<T extends string>({ value, onValueChange, items, className }: TabsProps<T>) {
  return (
    <div className={cn("thin-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/30 p-1", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onValueChange(item.value)}
            className={cn("relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:text-sm", active ? "text-ink" : "text-muted-ink hover:text-parchment")}
          >
            {active ? <motion.span layoutId={`tab-${items.map((entry) => entry.value).join("-")}`} className="absolute inset-0 rounded-xl bg-gradient-to-b from-gold-soft to-gold" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
            <span className="relative z-10 flex items-center gap-1.5">
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
