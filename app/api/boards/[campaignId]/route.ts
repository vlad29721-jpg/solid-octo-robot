import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, characters } from "@/db/schema";
import { notifyUsers } from "@/lib/server/telegram";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { getOrCreateBoard } from "@/lib/server/board";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { boardDto } from "@/lib/server/serialize";
import { boardPatchSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ campaignId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const actor = await requireActor(request);
    const { isDm } = await requireCampaignAccess(actor, campaignId);
    if (!isDm) throw new HttpError(403, "Изменять карту, сцену и мир может только Мастер.", "FORBIDDEN");
    const body = await parseBody(request, boardPatchSchema);
    const current = await getOrCreateBoard(campaignId);
    if (body.scene) {
      const serverChecks = current.scene.checks ?? [];
      body.scene.checks = (body.scene.checks ?? []).map((check) => serverChecks.find((entry) => entry.id === check.id && entry.result) ?? check);
      body.scene.concentration = (body.scene.concentration ?? []).filter((entry) => (current.scene.concentration ?? []).some((item) => item.id === entry.id));
      if (body.scene.groupSave && current.scene.groupSave?.id === body.scene.groupSave.id) {
        const merged = [...current.scene.groupSave.results];
        for (const result of body.scene.groupSave.results) if (!merged.some((entry) => entry.characterId === result.characterId)) merged.push(result);
        body.scene.groupSave = { ...body.scene.groupSave, results: merged };
      }
      const newChecks = (body.scene.checks ?? []).filter((check) => !serverChecks.some((entry) => entry.id === check.id));
      if (newChecks.length) void notifyUsers(newChecks.map((check) => check.ownerId), `🎯 Мастер просит проверку: ${newChecks.map((check) => `${check.characterName} — ${check.label}`).join("; ")}`);
      if (body.scene.groupSave && current.scene.groupSave?.id !== body.scene.groupSave.id) {
        const owners = (await db.select({ ownerId: characters.ownerId }).from(characters).where(eq(characters.campaignId, campaignId))).map((row) => row.ownerId);
        void notifyUsers(owners, `🛡 Групповой спасбросок: ${body.scene.groupSave.label || body.scene.groupSave.ability.toUpperCase()}, СЛ ${body.scene.groupSave.dc}`);
      }
    }
    if (body.world) {
      body.world.chest = current.world.chest ?? { items: [], gold: 0 };
      body.world.polls = (body.world.polls ?? []).map((poll) => {
        const server = (current.world.polls ?? []).find((entry) => entry.id === poll.id);
        return server ? { ...poll, options: poll.options.map((option) => ({ ...option, votes: server.options.find((entry) => entry.id === option.id)?.votes ?? [] })) } : poll;
      });
    }
    const patch: Partial<typeof boards.$inferInsert> = { updatedAt: new Date() };
    if (body.map) patch.map = body.map;
    if (body.scene) patch.scene = body.scene;
    if (body.world) patch.world = body.world;
    const [row] = await db.update(boards).set(patch).where(eq(boards.campaignId, campaignId)).returning();
    return Response.json({ board: boardDto(row) });
  } catch (error) {
    return apiError(error);
  }
}
