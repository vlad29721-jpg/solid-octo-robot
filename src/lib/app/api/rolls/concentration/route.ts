import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, characters } from "@/db/schema";
import { savingThrow } from "@/lib/dnd/calculations";
import { rollExpression } from "@/lib/dnd/dice";
import type { Stats } from "@/lib/dnd/types";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { postMessage } from "@/lib/server/board";
import { logRoll } from "@/lib/server/character-ops";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { concentrationRollSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, concentrationRollSchema);
    const { isDm } = await requireCampaignAccess(actor, body.campaignId);
    const result = await db.transaction(async (tx) => {
      const [board] = await tx.select().from(boards).where(eq(boards.campaignId, body.campaignId)).for("update");
      const check = board?.scene.concentration?.find((entry) => entry.id === body.checkId);
      if (!board || !check) throw new HttpError(404, "Проверка концентрации уже выполнена.");
      if (!isDm && check.ownerId !== actor.id) throw new HttpError(403, "Это не ваш персонаж.");
      const [character] = await tx.select().from(characters).where(eq(characters.id, check.characterId)).for("update");
      if (!character) throw new HttpError(404, "Персонаж не найден.");
      const stats = character.stats as Stats;
      const warCaster = (stats.feats ?? []).includes("war-caster");
      const bonus = savingThrow(stats, "con", character.level).total;
      const detail = rollExpression(`${warCaster ? "2d20kh1" : "1d20"}${bonus >= 0 ? "+" : ""}${bonus}`);
      const success = detail.total >= check.dc;
      if (!success) await tx.update(characters).set({ conditions: (character.conditions ?? []).filter((condition) => condition.id !== "concentration"), updatedAt: new Date() }).where(eq(characters.id, character.id));
      await tx.update(boards).set({ scene: { ...board.scene, concentration: (board.scene.concentration ?? []).filter((entry) => entry.id !== check.id) }, updatedAt: new Date() }).where(eq(boards.campaignId, body.campaignId));
      await logRoll(tx, body.campaignId, actor, `${character.name} · концентрация СЛ ${check.dc}`, detail);
      await postMessage({ campaignId: body.campaignId, authorId: actor.id, authorName: actor.displayName, kind: "system", body: success ? `🧠 ${character.name} удержал концентрацию (${detail.total} против СЛ ${check.dc}).` : `💥 ${character.name} потерял концентрацию (${detail.total} против СЛ ${check.dc}).` });
      return { success, total: detail.total, dc: check.dc };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
