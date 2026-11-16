import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { characters, encounters } from "@/db/schema";
import type { Stats } from "@/lib/dnd/types";
import { xpProgress } from "@/lib/dnd/content";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { postMessage } from "@/lib/server/board";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { awardXpSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const body = await parseBody(request, awardXpSchema);
    const [encounter] = await db.select().from(encounters).where(eq(encounters.id, id)).limit(1);
    if (!encounter) throw new HttpError(404, "Бой не найден.");
    const { isDm } = await requireCampaignAccess(actor, encounter.campaignId);
    if (!isDm) throw new HttpError(403, "Опыт раздаёт Мастер.");
    const rows = await db.select().from(characters).where(and(eq(characters.campaignId, encounter.campaignId), inArray(characters.id, body.characterIds)));
    if (!rows.length) throw new HttpError(400, "Нет персонажей для награды.");
    const share = Math.floor(body.total / rows.length);
    const ready: string[] = [];
    for (const row of rows) {
      const stats = row.stats as Stats;
      const xp = (stats.xp ?? 0) + share;
      if (xpProgress(row.level, xp).canLevel) ready.push(row.name);
      await db.update(characters).set({ stats: { ...stats, xp }, updatedAt: new Date() }).where(eq(characters.id, row.id));
    }
    await postMessage({ campaignId: encounter.campaignId, authorId: actor.id, authorName: actor.displayName, kind: "system", body: `⭐ Опыт за бой: ${body.total} XP — по ${share} каждому (${rows.map((row) => row.name).join(", ")}).${ready.length ? ` Готовы к новому уровню: ${ready.join(", ")}!` : ""}` });
    return Response.json({ ok: true, share, ready });
  } catch (error) {
    return apiError(error);
  }
}
