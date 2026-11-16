import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignMembers, campaigns } from "@/db/schema";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { campaignDto } from "@/lib/server/serialize";
import { campaignJoinSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, campaignJoinSchema);
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.inviteCode, body.inviteCode)).limit(1);
    if (!campaign) throw new HttpError(404, "Код приглашения не найден. Проверьте регистр и дефисы.", "NOT_FOUND");
    await db.insert(campaignMembers).values({ campaignId: campaign.id, userId: actor.id }).onConflictDoNothing();
    return Response.json({ campaign: campaignDto(campaign) });
  } catch (error) {
    return apiError(error);
  }
}
