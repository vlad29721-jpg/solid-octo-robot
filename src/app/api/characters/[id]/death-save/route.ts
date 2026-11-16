import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { rollDeathSave } from "@/lib/dnd/rules";
import type { Stats } from "@/lib/dnd/types";
import { requireActor } from "@/lib/server/auth";
import { postMessage } from "@/lib/server/board";
import { lockCharacter, logRoll } from "@/lib/server/character-ops";
import { apiError, HttpError } from "@/lib/server/http";
import { characterDto } from "@/lib/server/serialize";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const result = await db.transaction(async (tx) => {
      const { character } = await lockCharacter(tx, actor, id);
      if (character.hpCurrent > 0) throw new HttpError(400, "Спасброски от смерти делают только при 0 HP.");
      const stats = character.stats as Stats;
      if (stats.deathSaves?.dead) throw new HttpError(400, "Персонаж уже погиб.");
      if (stats.deathSaves?.stable) throw new HttpError(400, "Персонаж стабилизирован.");
      const save = rollDeathSave(stats.deathSaves);
      const conditions = save.revived ? (character.conditions ?? []).filter((condition) => condition.id !== "unconscious") : character.conditions;
      const [row] = await tx.update(characters).set({ hpCurrent: save.revived ? 1 : 0, stats: { ...stats, deathSaves: save.state }, conditions, updatedAt: new Date() }).where(eq(characters.id, id)).returning();
      await logRoll(tx, character.campaignId, actor, `${character.name} · спасбросок от смерти`, { expression: "1d20", total: save.roll, parts: [{ expression: "1d20", sign: 1, sides: 20, rolls: [save.roll], kept: [save.roll], dropped: [], subtotal: save.roll }], flatModifier: 0, breakdown: save.text, critical: save.roll === 20, fumble: save.roll === 1 });
      await postMessage({ campaignId: character.campaignId, authorId: actor.id, authorName: actor.displayName, kind: "system", body: `💀 ${character.name}: ${save.text} (d20 = ${save.roll})` });
      return { row, save };
    });
    return Response.json({ character: characterDto(result.row), roll: result.save.roll, text: result.save.text });
  } catch (error) {
    return apiError(error);
  }
}
