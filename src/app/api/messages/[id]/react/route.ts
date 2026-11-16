import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { reactSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const body = await parseBody(request, reactSchema);
    await db.transaction(async (tx) => {
      const [message] = await tx.select().from(messages).where(eq(messages.id, id)).for("update");
      if (!message) throw new HttpError(404, "Сообщение не найдено.", "NOT_FOUND");
      await requireCampaignAccess(actor, message.campaignId);
      const reactions = { ...(message.reactions ?? {}) };
      const list = new Set(reactions[body.emoji] ?? []);
      if (list.has(actor.id)) list.delete(actor.id); else list.add(actor.id);
      if (list.size) reactions[body.emoji] = [...list]; else delete reactions[body.emoji];
      await tx.update(messages).set({ reactions, updatedAt: new Date() }).where(eq(messages.id, id));
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
