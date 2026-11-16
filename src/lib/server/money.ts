import type { Coins } from "@/lib/dnd/types";
import { coinsOf } from "@/lib/dnd/rules";
import type { Stats } from "@/lib/dnd/types";

export function toCopper(coins: Coins) { return coins.pp * 1000 + coins.gp * 100 + coins.ep * 50 + coins.sp * 10 + coins.cp; }
export function fromCopper(total: number): Coins { return { pp: 0, gp: Math.floor(total / 100), ep: 0, sp: Math.floor((total % 100) / 10), cp: total % 10 }; }
export function adjustGold(stats: Stats, deltaGp: number): Stats | null {
  const total = toCopper(coinsOf(stats)) + Math.round(deltaGp * 100);
  if (total < 0) return null;
  return { ...stats, coins: deltaGp < 0 ? fromCopper(total) : { ...coinsOf(stats), gp: coinsOf(stats).gp + Math.floor(deltaGp), cp: coinsOf(stats).cp + Math.round((deltaGp % 1) * 100) } };
}
