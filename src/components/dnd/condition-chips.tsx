"use client";

import { X } from "lucide-react";
import { CONDITION_CATALOG } from "@/lib/dnd/catalog";
import type { ConditionKey } from "@/lib/dnd/types";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function ConditionChips({ conditions, onRemove, className }: { conditions: ConditionKey[]; onRemove?: (key: ConditionKey) => void; className?: string }) {
  if (!conditions.length) return <p className="text-xs text-muted-ink">Состояний нет — персонаж в ясном рассудке и на ногах.</p>;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {conditions.map((key) => {
        const definition = CONDITION_CATALOG[key];
        if (!definition) return null;
        return (
          <Badge key={key} variant={definition.tone === "helpful" ? "success" : definition.tone === "neutral" ? "info" : "crimson"} title={definition.description} className="gap-1.5 normal-case tracking-normal">
            {definition.label}
            {onRemove ? <button type="button" aria-label={`Снять ${definition.label}`} onClick={() => onRemove(key)} className="rounded-full p-0.5 transition hover:bg-white/15"><X className="h-3 w-3" /></button> : null}
          </Badge>
        );
      })}
    </div>
  );
}
