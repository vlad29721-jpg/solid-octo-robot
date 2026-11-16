"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("field", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("field min-h-24 resize-y leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn("field cursor-pointer appearance-none bg-[length:14px] bg-[right_0.8rem_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23D4AF37' stroke-width='1.6' fill='none'/%3E%3C/svg%3E\")" }} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-ink", className)} {...props} />;
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return <input type="checkbox" className={cn("h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-black/40 accent-gold", className)} {...props} />;
}

export function Switch({ checked, onCheckedChange, disabled, className }: { checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-45", checked ? "border-gold/60 bg-gold/35" : "border-white/15 bg-black/45", className)}
    >
      <motion.span
        className={cn("absolute top-[3px] h-4 w-4 rounded-full shadow", checked ? "bg-gold" : "bg-parchment/60")}
        animate={{ left: checked ? 22 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

export function FieldGroup({ label, hint, error, children, className }: { label?: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {hint ? <p className="mt-1 text-[11px] leading-snug text-muted-ink/80">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs font-medium text-red-400">{error}</p> : null}
    </div>
  );
}
