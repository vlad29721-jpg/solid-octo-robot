import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { rest } from "@/lib/dnd/rules";
import type { Spellbook, Stats } from "@/lib/dnd/types";
import { requireActor } from "@/lib/server/auth";
import { lockCharacter } from "@/lib/server/character-ops";
import { apiError, parseBody } from "@/lib/server/http";
import { characterDto } from "@/lib/server/serialize";
import { restSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const body = await parseBody(request, restSchema);
    const result = await db.transaction(async (tx) => {
      const { character } = await lockCharacter(tx, actor, id);
      const next = rest({ classKey: character.classKey, level: character.level, hpMax: character.hpMax, hpCurrent: character.hpCurrent, stats: character.stats as Stats, spellbook: character.spells as Spellbook }, body.type, body.hitDice ?? 0);
      const conditions = body.type === "long" ? (character.conditions ?? []).filter((condition) => !["unconscious", "concentration", "blessed", "hasted"].includes(condition.id)) : character.conditions;
      const [row] = await tx.update(characters).set({ hpCurrent: next.hpCurrent, stats: next.stats, spells: next.spellbook, conditions, updatedAt: new Date() }).where(eq(characters.id, id)).returning();
      return { row, summary: next.summary };
    });
    return Response.json({ character: characterDto(result.row), summary: result.summary });
  } catch (error) {
    return apiError(error);
  }
}
