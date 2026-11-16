import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, encounters } from "@/db/schema";
import { requireEncounterAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, parseBody } from "@/lib/server/http";
import { encounterDto } from "@/lib/server/serialize";
import { encounterPatchSchema } from "@/lib/validation";
import { pushHistory } from "@/lib/server/board";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const { encounter } = await requireEncounterAccess(actor, id);
    const body = await parseBody(request, encounterPatchSchema);
    const ids = new Set(body.state.combatants.map((item) => item.id));
    const state = {
      ...body.state,
      round: Math.max(1, body.state.round),
      activeId: body.state.activeId && ids.has(body.state.activeId) ? body.state.activeId : null,
      combatants: body.state.combatants.map((item) => ({ ...item, hp: Math.max(0, Math.min(item.maxHp, item.hp)) })),
    };

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx.update(encounters).set({ state, history: pushHistory(encounter.state, encounter.history), updatedAt: new Date() }).where(eq(encounters.id, id)).returning();
      for (const combatant of state.combatants) {
        if (combatant.kind !== "character" || !combatant.sourceCharacterId) continue;
        await tx.update(characters).set({ hpCurrent: combatant.hp, updatedAt: new Date() }).where(eq(characters.id, combatant.sourceCharacterId));
      }
      return row;
    });
    return Response.json({ encounter: encounterDto(updated), campaignId: encounter.campaignId });
  } catch (error) {
    return apiError(error);
  }
}
