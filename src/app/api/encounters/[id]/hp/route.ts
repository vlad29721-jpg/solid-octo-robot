import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, encounters } from "@/db/schema";
import { applyCombatantDamage, withEvent } from "@/lib/dnd/encounter";
import type { EncounterState } from "@/lib/dnd/types";
import { requireEncounterAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { characterDto, encounterDto } from "@/lib/server/serialize";
import { hpDeltaSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const { encounter } = await requireEncounterAccess(actor, id);
    const body = await parseBody(request, hpDeltaSchema);
    const state = encounter.state as EncounterState;
    const target = state.combatants.find((item) => item.id === body.combatantId);
    if (!target) throw new HttpError(404, "Участник боя не найден.", "NOT_FOUND");

    const delta = body.mode === "damage" ? body.amount : -body.amount;
    const damaged = applyCombatantDamage(state, body.combatantId, delta);
    const finalState = withEvent(
      damaged,
      `${target.name} ${body.mode === "damage" ? `получил ${body.amount} урона` : `восстановил ${body.amount} HP`}.`,
    );

    let updatedEncounter: typeof encounters.$inferSelect | undefined;
    let updatedCharacter: typeof characters.$inferSelect | undefined;
    await db.transaction(async (tx) => {
      const [encounterRow] = await tx.update(encounters)
        .set({ state: finalState, updatedAt: new Date() })
        .where(eq(encounters.id, id)).returning();
      updatedEncounter = encounterRow;
      if (target.sourceCharacterId) {
        const finalHp = finalState.combatants.find((item) => item.id === target.id)?.hp ?? target.hp;
        const [characterRow] = await tx.update(characters)
          .set({ hpCurrent: finalHp, updatedAt: new Date() })
          .where(eq(characters.id, target.sourceCharacterId)).returning();
        updatedCharacter = characterRow;
      }
    });
    if (!updatedEncounter) throw new HttpError(500, "Не удалось сохранить состояние боя.", "INTERNAL");
    return Response.json({
      encounter: encounterDto(updatedEncounter),
      character: updatedCharacter ? characterDto(updatedCharacter) : null,
    });
  } catch (error) {
    return apiError(error);
  }
}
