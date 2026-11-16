import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BadgeVariant = "gold" | "crimson" | "outline" | "muted" | "success" | "info";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  gold: "border-gold/35 bg-gold/10 text-gold",
  crimson: "border-red-500/35 bg-crimson/20 text-red-300",
  outline: "border-white/15 bg-white/[0.03] text-parchment/75",
  muted: "border-transparent bg-black/35 text-muted-ink",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-300",
};

export function Badge({ variant = "outline", className, children, ...props }: ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.13em]", BADGE_STYLES[variant], className)} {...props}>{children}</span>;
}

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("skeleton-shimmer rounded-lg", className)} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

export function Metric({ label, value, hint, className }: { label: string; value: ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-black/25 p-4", className)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-ink">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-semibold text-parchment">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-ink">{hint}</p> : null}
    </div>
  );
}
