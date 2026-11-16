import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, characters, encounters, sessions } from "@/db/schema";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const { isDm, campaign } = await requireCampaignAccess(actor, id);
    if (!isDm) throw new HttpError(403, "Экспорт доступен Мастеру.");
    const data = {
      format: "dnd-master-hub", version: 2, exportedAt: new Date().toISOString(),
      campaign: { title: campaign.title, description: campaign.description, status: campaign.status },
      characters: await db.select().from(characters).where(eq(characters.campaignId, id)),
      sessions: await db.select().from(sessions).where(eq(sessions.campaignId, id)),
      encounters: await db.select().from(encounters).where(eq(encounters.campaignId, id)),
      board: (await db.select().from(boards).where(eq(boards.campaignId, id)))[0] ?? null,
    };
    const filename = `campaign-${campaign.title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40)}.json`;
    return new Response(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` } });
  } catch (error) {
    return apiError(error);
  }
}
