import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, characters, diceRolls } from "@/db/schema";
import { conditionEffects, savingThrow } from "@/lib/dnd/calculations";
import { rollExpression } from "@/lib/dnd/dice";
import type { Stats } from "@/lib/dnd/types";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { groupSaveRollSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const actor = await requireActor(request);
    const { isDm } = await requireCampaignAccess(actor, campaignId);
    const body = await parseBody(request, groupSaveRollSchema);
    const [character] = await db.select().from(characters).where(eq(characters.id, body.characterId)).limit(1);
    if (!character || character.campaignId !== campaignId) throw new HttpError(404, "Персонаж не найден.", "NOT_FOUND");
    if (!isDm && character.ownerId !== actor.id) throw new HttpError(403, "Бросать можно только за своего персонажа.", "FORBIDDEN");
    const result = await db.transaction(async (tx) => {
      const [board] = await tx.select().from(boards).where(eq(boards.campaignId, campaignId)).for("update");
      const request = board?.scene.groupSave;
      if (!board || !request) throw new HttpError(404, "Мастер не запрашивал спасбросок.", "NOT_FOUND");
      if (request.results.some((entry) => entry.characterId === character.id)) throw new HttpError(409, "Этот персонаж уже бросил.", "DUPLICATE");
      const stats = character.stats as Stats;
      const bonus = savingThrow(stats, request.ability, character.level).total;
      const autoFail = conditionEffects((character.conditions ?? []).map((condition) => condition.id)).autoFailSaves.includes(request.ability);
      const detail = rollExpression(bonus >= 0 ? `1d20+${bonus}` : `1d20${bonus}`);
      const natural = detail.parts[0]?.rolls[0] ?? 0;
      const entry = { characterId: character.id, name: character.name, roll: natural, total: detail.total, success: !autoFail && detail.total >= request.dc };
      const scene = { ...board.scene, groupSave: { ...request, results: [...request.results, entry] } };
      await tx.update(boards).set({ scene, updatedAt: new Date() }).where(eq(boards.campaignId, campaignId));
      await tx.insert(diceRolls).values({ id: newId("roll"), campaignId, actorId: actor.id, actorName: `${character.name} · спасбросок`, expression: detail.expression, result: detail.total, detail });
      return entry;
    });
    return Response.json({ result });
  } catch (error) {
    return apiError(error);
  }
}
