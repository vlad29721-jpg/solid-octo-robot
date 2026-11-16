import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignMembers, campaigns } from "@/db/schema";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { campaignDto } from "@/lib/server/serialize";
import { campaignCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    if (actor.role !== "dm") throw new HttpError(403, "Только Мастер может создавать кампанию.", "FORBIDDEN");
    const body = await parseBody(request, campaignCreateSchema);

    let inviteCode = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `HUB-${randomBytes(4).toString("hex").toUpperCase()}`;
      const [existing] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.inviteCode, candidate)).limit(1);
      if (!existing) { inviteCode = candidate; break; }
    }
    if (!inviteCode) throw new HttpError(500, "Не удалось создать уникальный код приглашения.", "INVITE");

    const [campaign] = await db.insert(campaigns).values({
      id: newId("camp"), dmId: actor.id, title: body.title, description: body.description,
      inviteCode, status: body.status,
    }).returning();
    await db.insert(campaignMembers).values({ campaignId: campaign.id, userId: actor.id }).onConflictDoNothing();
    return Response.json({ campaign: campaignDto(campaign) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
