import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("glass rounded-2xl border-white/[0.08] p-5", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mb-4 flex flex-col gap-1", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("font-display text-xl font-semibold tracking-wide text-parchment", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm leading-relaxed text-muted-ink", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-5 flex items-center gap-2", className)} {...props} />;
}
