"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore } from "@/lib/toast";
import { cn } from "@/lib/utils";

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[min(23rem,calc(100vw-1.5rem))] flex-col gap-2 sm:right-5 sm:top-5">
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const Icon = ICONS[item.variant];
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="glass-strong pointer-events-auto flex items-start gap-3 rounded-2xl p-3.5"
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", item.variant === "success" && "text-emerald-400", item.variant === "error" && "text-red-400", item.variant === "info" && "text-gold")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-parchment">{item.title}</p>
                {item.description ? <p className="mt-0.5 text-xs leading-relaxed text-muted-ink">{item.description}</p> : null}
              </div>
              <button type="button" aria-label="Закрыть уведомление" onClick={() => dismiss(item.id)} className="rounded-md p-1 text-muted-ink transition hover:bg-white/10 hover:text-parchment">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
