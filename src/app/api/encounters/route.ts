import { db } from "@/db";
import { encounters } from "@/db/schema";
import { createEncounterState } from "@/lib/dnd/encounter";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { encounterDto } from "@/lib/server/serialize";
import { encounterCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, encounterCreateSchema);
    const { isDm } = await requireCampaignAccess(actor, body.campaignId);
    if (!isDm) throw new HttpError(403, "Создавать столкновения может только Мастер.", "FORBIDDEN");
    const [encounter] = await db.insert(encounters).values({
      id: newId("encounter"), campaignId: body.campaignId,
      state: createEncounterState(body.name ?? "Новое столкновение"),
    }).returning();
    return Response.json({ encounter: encounterDto(encounter) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
