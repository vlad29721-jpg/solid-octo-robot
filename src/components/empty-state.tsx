"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title, description, actionLabel, onAction, href, icon: Icon, compact = false, className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  icon?: LucideIcon;
  compact?: boolean;
  className?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn("glass relative flex flex-col items-center overflow-hidden rounded-3xl px-6 py-10 text-center", compact ? "py-7" : "py-12", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(212,175,55,0.12),transparent_55%)]" />
      <div className={cn("relative mb-4 overflow-hidden rounded-3xl border border-gold/15 bg-black/30", compact ? "h-28 w-28" : "h-40 w-40")}>
        <Image src="/images/empty-scroll.png" alt="Пустой свиток, компас и перо" fill sizes="(max-width: 640px) 112px, 160px" className="object-cover opacity-85 mix-blend-lighten" />
      </div>
      {Icon ? <Icon className="relative mb-2 h-5 w-5 text-gold/80" /> : null}
      <h3 className="relative font-display text-2xl font-semibold text-parchment">{title}</h3>
      <p className="relative mt-2 max-w-md text-sm leading-relaxed text-muted-ink">{description}</p>
      {actionLabel && (onAction || href) ? (
        <div className="relative mt-6">
          {href ? <Button asChild variant="outline"><Link href={href}>{actionLabel}</Link></Button> : <Button variant="outline" onClick={onAction}>{actionLabel}</Button>}
        </div>
      ) : null}
    </motion.div>
  );
}
