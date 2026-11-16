import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { levelUp } from "@/lib/dnd/rules";
import type { Spellbook, Stats } from "@/lib/dnd/types";
import { requireActor } from "@/lib/server/auth";
import { postMessage } from "@/lib/server/board";
import { lockCharacter } from "@/lib/server/character-ops";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { characterDto } from "@/lib/server/serialize";
import { levelUpSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const body = await parseBody(request, levelUpSchema);
    const result = await db.transaction(async (tx) => {
      const { character } = await lockCharacter(tx, actor, id);
      let next;
      try {
        next = levelUp({ classKey: character.classKey, level: character.level, hpMax: character.hpMax, hpCurrent: character.hpCurrent, stats: character.stats as Stats, spellbook: character.spells as Spellbook }, body.mode);
      } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : "Нельзя повысить уровень."); }
      const [row] = await tx.update(characters).set({ level: next.level, hpMax: next.hpMax, hpCurrent: next.hpCurrent, stats: next.stats, spells: next.spellbook, updatedAt: new Date() }).where(eq(characters.id, id)).returning();
      await postMessage({ campaignId: character.campaignId, authorId: actor.id, authorName: actor.displayName, kind: "system", body: `🎉 ${character.name} достиг ${next.level} уровня! +${next.summary.gain} HP.` });
      return { row, summary: next.summary };
    });
    return Response.json({ character: characterDto(result.row), summary: result.summary });
  } catch (error) {
    return apiError(error);
  }
}
