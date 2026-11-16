import { initials, cn } from "@/lib/utils";

const PALETTE = [
  "from-gold/70 to-amber-900", "from-crimson-soft/80 to-red-950",
  "from-sky-500/60 to-indigo-950", "from-emerald-500/60 to-emerald-950",
  "from-violet-500/60 to-purple-950", "from-orange-500/60 to-stone-900",
];

export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const gradient = PALETTE[hash % PALETTE.length];
  const sizes = { sm: "h-8 w-8 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-14 w-14 text-lg", xl: "h-20 w-20 text-2xl" };
  return (
    <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br font-display font-bold text-parchment shadow-lg", gradient, sizes[size], className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : initials(name)}
    </div>
  );
}
