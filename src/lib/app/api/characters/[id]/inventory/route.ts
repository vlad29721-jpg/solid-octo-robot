import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/schema";
import type { InventoryItem } from "@/lib/dnd/types";
import { requireActor } from "@/lib/server/auth";
import { postMessage } from "@/lib/server/board";
import { lockCharacter } from "@/lib/server/character-ops";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { characterDto } from "@/lib/server/serialize";
import { inventoryOpSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const body = await parseBody(request, inventoryOpSchema);
    const updated = await db.transaction(async (tx) => {
      const { character } = await lockCharacter(tx, actor, id);
      let inventory = [...(character.inventory as InventoryItem[])];
      let notice = "";
      if (body.op === "add") {
        const existing = inventory.find((item) => item.name === body.item.name);
        inventory = existing
          ? inventory.map((item) => item.name === body.item.name ? { ...item, quantity: item.quantity + body.item.quantity } : item)
          : [...inventory, body.item];
        notice = `Мастер выдал: ${body.item.name}${body.item.quantity > 1 ? ` ×${body.item.quantity}` : ""}`;
      } else {
        const target = inventory.find((item) => item.id === body.itemId);
        if (!target) throw new HttpError(404, "Предмет уже удалён.", "NOT_FOUND");
        if (body.op === "remove") {
          inventory = inventory.filter((item) => item.id !== body.itemId);
          notice = `Мастер забрал: ${target.name}`;
        } else if (body.op === "quantity") {
          const quantity = target.quantity + body.delta;
          inventory = quantity <= 0 ? inventory.filter((item) => item.id !== body.itemId) : inventory.map((item) => item.id === body.itemId ? { ...item, quantity: Math.min(999, quantity) } : item);
          notice = body.delta < 0 ? `Мастер забрал: ${target.name} ×${-body.delta}` : `Мастер выдал: ${target.name} ×${body.delta}`;
        } else if (body.op === "attune") {
          const attuned = inventory.filter((item) => item.attuned && item.id !== target.id).length;
          if (!target.attuned && attuned >= 3) throw new HttpError(400, "Можно настроиться максимум на 3 предмета.", "ATTUNE_LIMIT");
          inventory = inventory.map((item) => item.id === target.id ? { ...item, attuned: !item.attuned } : item);
        } else if (body.op === "charge") {
          if (!target.charges) throw new HttpError(400, "У предмета нет зарядов.");
          const charges = target.charges;
          inventory = inventory.map((item) => item.id === target.id ? { ...item, charges: { max: charges.max, current: Math.max(0, Math.min(charges.max, charges.current + body.delta)) } } : item);
        } else {
          inventory = inventory.map((item) => ({
            ...item,
            equipped: item.id === target.id ? !item.equipped : target.armor && item.armor?.type === target.armor.type && item.armor.type !== "shield" ? false : item.equipped,
          }));
        }
      }
      const [row] = await tx.update(characters).set({ inventory, updatedAt: new Date() }).where(eq(characters.id, id)).returning();
      if (notice && character.ownerId !== actor.id) {
        await postMessage({ campaignId: character.campaignId, authorId: actor.id, authorName: actor.displayName, recipientId: character.ownerId, kind: "system", body: `${notice} (${character.name})` });
      }
      return row;
    });
    return Response.json({ character: characterDto(updated) });
  } catch (error) {
    return apiError(error);
  }
}
