import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, characters } from "@/db/schema";
import { coinsOf } from "@/lib/dnd/rules";
import type { InventoryItem, Stats } from "@/lib/dnd/types";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { getOrCreateBoard, postMessage } from "@/lib/server/board";
import { lockCharacter } from "@/lib/server/character-ops";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { chestActionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, chestActionSchema);
    const { isDm } = await requireCampaignAccess(actor, body.campaignId);
    await getOrCreateBoard(body.campaignId);
    const text = await db.transaction(async (tx) => {
      const [board] = await tx.select().from(boards).where(eq(boards.campaignId, body.campaignId)).for("update");
      const chest = { items: [...(board.world.chest?.items ?? [])], gold: board.world.chest?.gold ?? 0 };
      let summary = "";
      if (body.action === "split" || body.action === "addLoot" || body.action === "discard") {
        if (!isDm) throw new HttpError(403, "Это действие доступно Мастеру.");
        if (body.action === "addLoot") {
          chest.gold += body.gold;
          chest.items.push(...body.items);
          summary = `🎁 В сундук добавлено: ${body.gold} зм${body.items.length ? `, ${body.items.map((item) => item.name).join(", ")}` : ""}`;
        } else if (body.action === "discard") {
          chest.items = chest.items.filter((item) => item.id !== body.itemId);
        } else {
          const party = await tx.select().from(characters).where(eq(characters.campaignId, body.campaignId)).for("update");
          if (!party.length) throw new HttpError(400, "В кампании нет персонажей.");
          const share = Math.floor(chest.gold / party.length);
          if (!share) throw new HttpError(400, "Слишком мало золота для деления.");
          for (const member of party) {
            const stats = member.stats as Stats;
            const coins = coinsOf(stats);
            await tx.update(characters).set({ stats: { ...stats, coins: { ...coins, gp: coins.gp + share } }, updatedAt: new Date() }).where(eq(characters.id, member.id));
          }
          chest.gold -= share * party.length;
          summary = `⚖️ Золото поделено: по ${share} зм каждому из ${party.length}`;
        }
      } else {
        const { character } = await lockCharacter(tx, actor, body.characterId);
        let inventory = [...(character.inventory as InventoryItem[])];
        const stats = character.stats as Stats;
        const coins = coinsOf(stats);
        let nextStats = stats;
        if (body.action === "deposit") {
          const item = inventory.find((entry) => entry.id === body.itemId);
          if (!item) throw new HttpError(404, "Предмет не найден.");
          inventory = inventory.filter((entry) => entry.id !== item.id);
          chest.items.push({ ...item, equipped: false, attuned: false });
          summary = `📦 ${character.name} положил в сундук: ${item.name} ×${item.quantity}`;
        } else if (body.action === "take") {
          const item = chest.items.find((entry) => entry.id === body.itemId);
          if (!item) throw new HttpError(404, "Предмета уже нет в сундуке.");
          chest.items = chest.items.filter((entry) => entry.id !== item.id);
          const existing = inventory.find((entry) => entry.name === item.name && !entry.charges);
          inventory = existing ? inventory.map((entry) => entry.id === existing.id ? { ...entry, quantity: entry.quantity + item.quantity } : entry) : [...inventory, item];
          summary = `🤲 ${character.name} взял из сундука: ${item.name} ×${item.quantity}`;
        } else {
          if (body.amount > 0 && coins.gp < body.amount) throw new HttpError(400, `У персонажа только ${coins.gp} зм.`);
          if (body.amount < 0 && chest.gold < -body.amount) throw new HttpError(400, `В сундуке только ${chest.gold} зм.`);
          chest.gold += body.amount;
          nextStats = { ...stats, coins: { ...coins, gp: coins.gp - body.amount } };
          summary = body.amount > 0 ? `💰 ${character.name} положил в сундук ${body.amount} зм` : `💰 ${character.name} взял из сундука ${-body.amount} зм`;
        }
        await tx.update(characters).set({ inventory, stats: nextStats, updatedAt: new Date() }).where(eq(characters.id, character.id));
      }
      await tx.update(boards).set({ world: { ...board.world, chest }, updatedAt: new Date() }).where(eq(boards.campaignId, body.campaignId));
      if (summary) await postMessage({ campaignId: body.campaignId, authorId: actor.id, authorName: actor.displayName, kind: "system", body: summary });
      return summary;
    });
    return Response.json({ ok: true, text });
  } catch (error) {
    return apiError(error);
  }
}
