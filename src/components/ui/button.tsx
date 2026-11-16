import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
  {
    variants: {
      variant: {
        gold: "bg-gradient-to-b from-gold-soft to-gold text-ink shadow-[0_8px_28px_rgba(212,175,55,0.22)] hover:brightness-110",
        crimson: "bg-gradient-to-b from-crimson-soft to-crimson text-white shadow-[0_8px_28px_rgba(139,0,0,0.35)] hover:brightness-125",
        outline: "border border-gold/35 bg-gold/[0.04] text-gold hover:border-gold/70 hover:bg-gold/10",
        ghost: "text-parchment/80 hover:bg-white/[0.07] hover:text-parchment",
        glass: "glass text-parchment hover:border-gold/30 hover:bg-white/[0.09]",
        danger: "border border-red-500/35 bg-red-950/40 text-red-300 hover:bg-red-900/50",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: { variant: "gold", size: "default" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
