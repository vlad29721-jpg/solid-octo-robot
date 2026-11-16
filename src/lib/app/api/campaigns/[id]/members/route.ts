import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignMembers, campaigns, profiles } from "@/db/schema";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { postMessage } from "@/lib/server/board";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { createResetToken } from "@/lib/server/resets";
import { memberActionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const { isDm, campaign } = await requireCampaignAccess(actor, id);
    if (!isDm) throw new HttpError(403, "Участниками управляет Мастер.");
    const body = await parseBody(request, memberActionSchema);
    if (body.action === "regenerate") {
      const inviteCode = `HUB-${randomBytes(4).toString("hex").toUpperCase()}`;
      await db.update(campaigns).set({ inviteCode }).where(eq(campaigns.id, id));
      return Response.json({ ok: true, inviteCode });
    }
    if (!body.userId || body.userId === actor.id) throw new HttpError(400, "Выберите другого участника.");
    const [member] = await db.select({ profile: profiles }).from(campaignMembers).innerJoin(profiles, eq(profiles.id, campaignMembers.userId))
      .where(and(eq(campaignMembers.campaignId, id), eq(campaignMembers.userId, body.userId))).limit(1);
    if (!member) throw new HttpError(404, "Участник не найден.");
    if (body.action === "kick") {
      await db.delete(campaignMembers).where(and(eq(campaignMembers.campaignId, id), eq(campaignMembers.userId, body.userId)));
      await postMessage({ campaignId: id, authorId: actor.id, authorName: actor.displayName, kind: "system", body: `🚪 ${member.profile.displayName} покинул кампанию.` });
      return Response.json({ ok: true });
    }
    if (body.action === "transfer") {
      await db.update(profiles).set({ role: "dm" }).where(eq(profiles.id, body.userId));
      await db.update(campaigns).set({ dmId: body.userId }).where(eq(campaigns.id, id));
      await db.insert(campaignMembers).values({ campaignId: id, userId: actor.id }).onConflictDoNothing();
      await postMessage({ campaignId: id, authorId: actor.id, authorName: actor.displayName, kind: "system", body: `👑 Права Мастера кампании «${campaign.title}» переданы: ${member.profile.displayName}.` });
      return Response.json({ ok: true });
    }
    if (!member.profile.passwordHash) throw new HttpError(400, "У этого участника нет личного аккаунта с паролем.");
    const token = await createResetToken(body.userId, 24);
    return Response.json({ ok: true, link: `/reset?token=${token}` });
  } catch (error) {
    return apiError(error);
  }
}
