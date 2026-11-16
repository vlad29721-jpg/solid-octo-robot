import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CLASS_CATALOG, CONDITION_CATALOG } from "./dnd/catalog";
import type { ConditionKey } from "./dnd/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function formatDate(value: string | Date, withTime = false): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function formatTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function relativeTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const diff = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("ru-RU", { numeric: "auto" });
  if (Math.abs(diff) < 60) return formatter.format(diff, "second");
  if (Math.abs(diff) < 3600) return formatter.format(Math.round(diff / 60), "minute");
  if (Math.abs(diff) < 86400) return formatter.format(Math.round(diff / 3600), "hour");
  return formatter.format(Math.round(diff / 86400), "day");
}

export function classLabel(key: string): string {
  return CLASS_CATALOG[key]?.label ?? key;
}

export function conditionLabel(key: ConditionKey): string {
  return CONDITION_CATALOG[key]?.label ?? key;
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
