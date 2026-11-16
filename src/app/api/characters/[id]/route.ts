import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, encounters } from "@/db/schema";
import type { EncounterState } from "@/lib/dnd/types";
import { requireCharacterAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { characterDto } from "@/lib/server/serialize";
import { characterPatchSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const { character } = await requireCharacterAccess(actor, id);
    const body = await parseBody(request, characterPatchSchema);
    const nextMax = body.hpMax ?? character.hpMax;
    const nextCurrent = body.hpCurrent ?? character.hpCurrent;
    if (nextCurrent > nextMax) throw new HttpError(400, "Текущие HP не могут превышать максимум.", "VALIDATION");

    const patch: Partial<typeof characters.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.level !== undefined) patch.level = body.level;
    if (body.hpCurrent !== undefined) patch.hpCurrent = body.hpCurrent;
    if (body.hpMax !== undefined) patch.hpMax = body.hpMax;
    if (body.armorClass !== undefined) patch.armorClass = body.armorClass;
    if (body.stats !== undefined) patch.stats = body.stats;
    if (body.inventory !== undefined) patch.inventory = body.inventory;
    if (body.spellbook !== undefined) patch.spells = body.spellbook;
    if (body.conditions !== undefined) patch.conditions = body.conditions;
    if (body.avatarUrl !== undefined) patch.avatarUrl = body.avatarUrl;

    const [updated] = await db.update(characters).set(patch).where(eq(characters.id, id)).returning();
    return Response.json({ character: characterDto(updated) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const { character } = await requireCharacterAccess(actor, id);
    const [encounter] = await db.select().from(encounters)
      .where(eq(encounters.campaignId, character.campaignId))
      .orderBy(desc(encounters.updatedAt)).limit(1);

    await db.transaction(async (tx) => {
      if (encounter) {
        const state = encounter.state as EncounterState;
        const removed = state.combatants.find((item) => item.sourceCharacterId === id);
        await tx.update(encounters).set({
          state: {
            ...state,
            combatants: state.combatants.filter((item) => item.sourceCharacterId !== id),
            activeId: state.activeId === removed?.id ? null : state.activeId,
            log: removed ? [{ id: `event-${Date.now()}`, text: `${character.name} удалён из трекера.`, at: new Date().toISOString() }, ...state.log].slice(0, 30) : state.log,
          },
          updatedAt: new Date(),
        }).where(eq(encounters.id, encounter.id));
      }
      await tx.delete(characters).where(eq(characters.id, id));
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
