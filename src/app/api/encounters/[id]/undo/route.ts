import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, encounters } from "@/db/schema";
import { withEvent } from "@/lib/dnd/encounter";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    await db.transaction(async (tx) => {
      const [encounter] = await tx.select().from(encounters).where(eq(encounters.id, id)).for("update");
      if (!encounter) throw new HttpError(404, "Бой не найден.", "NOT_FOUND");
      const { isDm } = await requireCampaignAccess(actor, encounter.campaignId);
      if (!isDm) throw new HttpError(403, "Отменять действия может только Мастер.", "FORBIDDEN");
      const [previous, ...rest] = encounter.history ?? [];
      if (!previous) throw new HttpError(400, "Нечего отменять.");
      const restored = withEvent(previous, "↩ Мастер отменил последнее действие.");
      await tx.update(encounters).set({ state: restored, history: rest, updatedAt: new Date() }).where(eq(encounters.id, id));
      for (const combatant of restored.combatants) {
        if (combatant.sourceCharacterId) await tx.update(characters).set({ hpCurrent: combatant.hp, updatedAt: new Date() }).where(eq(characters.id, combatant.sourceCharacterId));
      }
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
