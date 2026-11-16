import { db } from "@/db";
import { sessions } from "@/db/schema";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { sessionDto } from "@/lib/server/serialize";
import { sessionCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, sessionCreateSchema);
    const { isDm } = await requireCampaignAccess(actor, body.campaignId);
    const isDmOnly = body.isDmOnly ?? false;
    if (isDmOnly && !isDm) throw new HttpError(403, "Только Мастер может создавать скрытые заметки.", "FORBIDDEN");
    const sessionDate = body.sessionDate ? new Date(body.sessionDate) : new Date();
    if (Number.isNaN(sessionDate.getTime())) throw new HttpError(400, "Некорректная дата сессии.", "VALIDATION");

    const [session] = await db.insert(sessions).values({
      id: newId("session"), campaignId: body.campaignId, authorId: actor.id,
      title: body.title, notes: body.notes, isDmOnly, sessionDate,
    }).returning();
    return Response.json({ session: sessionDto(session) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
