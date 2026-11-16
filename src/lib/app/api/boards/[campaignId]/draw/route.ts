import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards } from "@/db/schema";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { getOrCreateBoard } from "@/lib/server/board";
import { apiError, parseBody } from "@/lib/server/http";
import { drawSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const actor = await requireActor(request);
    await requireCampaignAccess(actor, campaignId);
    const body = await parseBody(request, drawSchema);
    await getOrCreateBoard(campaignId);
    await db.transaction(async (tx) => {
      const [board] = await tx.select().from(boards).where(eq(boards.campaignId, campaignId)).for("update");
      const drawings = [...(board.map.drawings ?? []), { ...body.drawing, by: actor.displayName }].slice(-80);
      await tx.update(boards).set({ map: { ...board.map, drawings }, updatedAt: new Date() }).where(eq(boards.campaignId, campaignId));
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
