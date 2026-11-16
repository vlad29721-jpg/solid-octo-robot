import { db } from "@/db";
import { diceRolls } from "@/db/schema";
import { rollExpression } from "@/lib/dnd/dice";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { diceRollDto } from "@/lib/server/serialize";
import { diceRollSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, diceRollSchema);
    const { isDm } = await requireCampaignAccess(actor, body.campaignId);
    let detail;
    try {
      detail = rollExpression(body.expression);
    } catch (error) {
      throw new HttpError(400, error instanceof Error ? error.message : "Неверное выражение броска.", "DICE");
    }
    const [roll] = await db.insert(diceRolls).values({
      id: newId("roll"), campaignId: body.campaignId, actorId: actor.id, actorName: actor.displayName,
      expression: body.expression, result: detail.total, detail, hidden: isDm && body.hidden ? true : null,
    }).returning();
    return Response.json({ roll: diceRollDto(roll) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
