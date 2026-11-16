import { db } from "@/db";
import { campaignMembers, diceRolls } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { rollExpression } from "@/lib/dnd/dice";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { postMessage } from "@/lib/server/board";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { messageDto } from "@/lib/server/serialize";
import { messageCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, messageCreateSchema);
    const { isDm, campaign } = await requireCampaignAccess(actor, body.campaignId);
    const command = body.body.match(/^\/(?:roll|r|бросок)\s+(.+)$/i);
    if (command) {
      let detail;
      try { detail = rollExpression(command[1]); } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : "Неверное выражение.", "DICE"); }
      await db.insert(diceRolls).values({ id: newId("roll"), campaignId: body.campaignId, actorId: actor.id, actorName: actor.displayName, expression: detail.expression, result: detail.total, detail });
      const row = await postMessage({ campaignId: body.campaignId, authorId: actor.id, authorName: actor.displayName, kind: "roll", body: `${detail.expression} → ${detail.total}`, data: { total: detail.total, breakdown: detail.breakdown, critical: detail.critical, fumble: detail.fumble } });
      return Response.json({ message: messageDto(row) }, { status: 201 });
    }
    let recipientId = body.recipientId ?? null;
    let kind = body.kind ?? "chat";
    if (kind === "secret" && !isDm) throw new HttpError(403, "Тайные записки отправляет только Мастер.", "FORBIDDEN");
    if (recipientId) {
      const isMember = recipientId === campaign.dmId || (await db.select().from(campaignMembers).where(and(eq(campaignMembers.campaignId, body.campaignId), eq(campaignMembers.userId, recipientId))).limit(1)).length > 0;
      if (!isMember) throw new HttpError(400, "Получатель не состоит в кампании.", "VALIDATION");
      if (kind === "chat") kind = "whisper";
    } else {
      if (kind !== "chat") throw new HttpError(400, "Выберите получателя.", "VALIDATION");
      recipientId = null;
    }
    const row = await postMessage({ campaignId: body.campaignId, authorId: actor.id, authorName: actor.displayName, recipientId, kind, body: body.body });
    return Response.json({ message: messageDto(row) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
