import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { boards, characters } from "@/db/schema";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { getOrCreateBoard } from "@/lib/server/board";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { tokenMoveSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const actor = await requireActor(request);
    const { isDm } = await requireCampaignAccess(actor, campaignId);
    const body = await parseBody(request, tokenMoveSchema);
    await getOrCreateBoard(campaignId);
    await db.transaction(async (tx) => {
      const [board] = await tx.select().from(boards).where(eq(boards.campaignId, campaignId)).for("update");
      const token = board.map.tokens.find((item) => item.id === body.tokenId);
      if (!token) throw new HttpError(404, "Фишка не найдена.", "NOT_FOUND");
      if (!isDm) {
        if (!token.characterId) throw new HttpError(403, "Можно двигать только своего персонажа.", "FORBIDDEN");
        const own = await tx.select({ id: characters.id }).from(characters)
          .where(and(inArray(characters.id, [token.characterId]), eq(characters.ownerId, actor.id)));
        if (!own.length) throw new HttpError(403, "Можно двигать только своего персонажа.", "FORBIDDEN");
      }
      const x = Math.max(0, Math.min(board.map.cols - token.size, Math.round(body.x)));
      const y = Math.max(0, Math.min(board.map.rows - token.size, Math.round(body.y)));
      const map = { ...board.map, tokens: board.map.tokens.map((item) => item.id === token.id ? { ...item, x, y } : item) };
      await tx.update(boards).set({ map, updatedAt: new Date() }).where(eq(boards.campaignId, campaignId));
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
