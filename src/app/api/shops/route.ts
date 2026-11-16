import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, characters } from "@/db/schema";
import type { InventoryItem, Stats } from "@/lib/dnd/types";
import { requireActor } from "@/lib/server/auth";
import { getOrCreateBoard, postMessage } from "@/lib/server/board";
import { lockCharacter } from "@/lib/server/character-ops";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { adjustGold } from "@/lib/server/money";
import { shopActionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const parsed = await parseBody(request, shopActionSchema);
    const body = { ...parsed, quantity: parsed.quantity ?? 1 };
    await getOrCreateBoard(body.campaignId);
    const text = await db.transaction(async (tx) => {
      const { character, isDm } = await lockCharacter(tx, actor, body.characterId);
      if (character.campaignId !== body.campaignId) throw new HttpError(400, "Персонаж из другой кампании.");
      const [board] = await tx.select().from(boards).where(eq(boards.campaignId, body.campaignId)).for("update");
      const shops = board.world.shops ?? [];
      const shop = shops.find((entry) => entry.id === body.shopId);
      if (!shop || (!shop.open && !isDm)) throw new HttpError(404, "Лавка закрыта.");
      let inventory = [...(character.inventory as InventoryItem[])];
      let stats = character.stats as Stats;
      let summary = "";
      let nextShops = shops;
      if (body.action === "buy") {
        const entry = shop.items.find((item) => item.id === body.itemId);
        if (!entry) throw new HttpError(404, "Товар не найден.");
        if (entry.stock !== -1 && entry.stock < body.quantity) throw new HttpError(400, `В наличии только ${entry.stock}.`);
        const cost = entry.price * body.quantity;
        const paid = adjustGold(stats, -cost);
        if (!paid) throw new HttpError(400, `Не хватает денег: нужно ${cost} зм.`);
        stats = paid;
        const existing = inventory.find((item) => item.name === entry.item.name);
        inventory = existing ? inventory.map((item) => item.name === entry.item.name ? { ...item, quantity: item.quantity + body.quantity } : item) : [...inventory, { ...entry.item, id: `${entry.item.id}-${Date.now().toString(36)}`, quantity: body.quantity, equipped: false }];
        nextShops = shops.map((item) => item.id === shop.id ? { ...item, items: item.items.map((good) => good.id === entry.id && good.stock !== -1 ? { ...good, stock: good.stock - body.quantity } : good) } : item);
        summary = `🛒 ${character.name} купил в «${shop.name}»: ${entry.item.name} ×${body.quantity} за ${cost} зм`;
      } else {
        const item = inventory.find((entry) => entry.id === body.itemId);
        if (!item) throw new HttpError(404, "Предмет не найден.");
        const quantity = Math.min(item.quantity, body.quantity);
        const income = Math.round(item.costGp * shop.sellRate * quantity * 100) / 100;
        stats = adjustGold(stats, income) ?? stats;
        inventory = item.quantity - quantity <= 0 ? inventory.filter((entry) => entry.id !== item.id) : inventory.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity - quantity } : entry);
        summary = `💰 ${character.name} продал в «${shop.name}»: ${item.name} ×${quantity} за ${income} зм`;
      }
      await tx.update(characters).set({ inventory, stats, updatedAt: new Date() }).where(eq(characters.id, character.id));
      if (nextShops !== shops) await tx.update(boards).set({ world: { ...board.world, shops: nextShops }, updatedAt: new Date() }).where(eq(boards.campaignId, body.campaignId));
      await postMessage({ campaignId: body.campaignId, authorId: actor.id, authorName: actor.displayName, kind: "system", body: summary });
      return summary;
    });
    return Response.json({ ok: true, text });
  } catch (error) {
    return apiError(error);
  }
}
