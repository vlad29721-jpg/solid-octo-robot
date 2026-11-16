"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Skeleton } from "./primitives";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, action, className }: { eyebrow: string; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-gold/80">
          <span className="h-px w-6 bg-gold/60" />{eyebrow}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-parchment sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-ink">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </motion.header>
  );
}

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6" aria-label="Загрузка данных">
      <div className="space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-10 w-64" /><Skeleton className="h-4 w-full max-w-lg" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
