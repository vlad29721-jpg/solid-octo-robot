import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { coinsOf } from "@/lib/dnd/rules";
import type { InventoryItem, Stats } from "@/lib/dnd/types";
import { requireActor } from "@/lib/server/auth";
import { postMessage } from "@/lib/server/board";
import { lockCharacter } from "@/lib/server/character-ops";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { transferSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, transferSchema);
    if (body.fromId === body.toId) throw new HttpError(400, "Нельзя передать самому себе.");
    if (!body.itemId && !body.gold) throw new HttpError(400, "Выберите предмет или сумму золота.");
    const text = await db.transaction(async (tx) => {
      const ids = [body.fromId, body.toId].sort();
      const locked: Record<string, Awaited<ReturnType<typeof lockCharacter>>> = {};
      for (const id of ids) locked[id] = await lockCharacter(tx, actor, id, id === body.fromId);
      const from = locked[body.fromId].character;
      const to = locked[body.toId].character;
      if (from.campaignId !== to.campaignId) throw new HttpError(400, "Персонажи из разных кампаний.");
      let fromInventory = [...(from.inventory as InventoryItem[])];
      let toInventory = [...(to.inventory as InventoryItem[])];
      const fromStats = { ...(from.stats as Stats) };
      const toStats = { ...(to.stats as Stats) };
      const parts: string[] = [];
      if (body.itemId) {
        const item = fromInventory.find((entry) => entry.id === body.itemId);
        if (!item) throw new HttpError(404, "Предмет не найден.");
        const quantity = Math.min(item.quantity, body.quantity ?? item.quantity);
        fromInventory = item.quantity - quantity <= 0 ? fromInventory.filter((entry) => entry.id !== item.id) : fromInventory.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity - quantity } : entry);
        const existing = toInventory.find((entry) => entry.name === item.name);
        toInventory = existing ? toInventory.map((entry) => entry.name === item.name ? { ...entry, quantity: entry.quantity + quantity } : entry) : [...toInventory, { ...item, id: `${item.id}-${Date.now().toString(36)}`, quantity, equipped: false }];
        parts.push(`${item.name}${quantity > 1 ? ` ×${quantity}` : ""}`);
      }
      if (body.gold) {
        const fromCoins = coinsOf(fromStats);
        if (fromCoins.gp < body.gold) throw new HttpError(400, `Недостаточно золота: есть ${fromCoins.gp} зм.`);
        fromStats.coins = { ...fromCoins, gp: fromCoins.gp - body.gold };
        const toCoins = coinsOf(toStats);
        toStats.coins = { ...toCoins, gp: toCoins.gp + body.gold };
        parts.push(`${body.gold} зм`);
      }
      await tx.update(characters).set({ inventory: fromInventory, stats: fromStats, updatedAt: new Date() }).where(eq(characters.id, from.id));
      await tx.update(characters).set({ inventory: toInventory, stats: toStats, updatedAt: new Date() }).where(eq(characters.id, to.id));
      const summary = `${from.name} передал ${to.name}: ${parts.join(", ")}`;
      await postMessage({ campaignId: from.campaignId, authorId: actor.id, authorName: actor.displayName, kind: "system", body: `🤝 ${summary}` });
      return summary;
    });
    return Response.json({ ok: true, text });
  } catch (error) {
    return apiError(error);
  }
}
