import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards } from "@/db/schema";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { pollVoteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, pollVoteSchema);
    await requireCampaignAccess(actor, body.campaignId);
    await db.transaction(async (tx) => {
      const [board] = await tx.select().from(boards).where(eq(boards.campaignId, body.campaignId)).for("update");
      const poll = board?.world.polls?.find((entry) => entry.id === body.pollId);
      if (!board || !poll) throw new HttpError(404, "Голосование не найдено.");
      if (poll.closed) throw new HttpError(400, "Голосование закрыто.");
      const polls = (board.world.polls ?? []).map((entry) => entry.id !== poll.id ? entry : {
        ...entry,
        options: entry.options.map((option) => option.id !== body.optionId ? option : { ...option, votes: option.votes.includes(actor.id) ? option.votes.filter((id) => id !== actor.id) : [...option.votes, actor.id] }),
      });
      await tx.update(boards).set({ world: { ...board.world, polls }, updatedAt: new Date() }).where(eq(boards.campaignId, body.campaignId));
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
