import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { boards, campaignMembers, campaigns, characters, encounters, sessions } from "@/db/schema";
import { defaultMap, defaultScene, defaultWorld } from "@/lib/board";
import type { EncounterState, MapState, WorldState } from "@/lib/dnd/types";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { importSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type AnyRow = Record<string, unknown>;
const arr = (value: unknown) => (Array.isArray(value) ? value as AnyRow[] : []);

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    if (actor.role !== "dm") throw new HttpError(403, "Импортировать кампанию может Мастер.");
    const { data } = await parseBody(request, importSchema);
    if (data.format !== "dnd-master-hub") throw new HttpError(400, "Это не файл резервной копии D&D Master Hub.");
    const source = (data.campaign ?? {}) as AnyRow;
    const campaignId = newId("camp");
    const idMap = new Map<string, string>();
    await db.transaction(async (tx) => {
      await tx.insert(campaigns).values({ id: campaignId, dmId: actor.id, title: `${String(source.title ?? "Кампания")} (импорт)`.slice(0, 100), description: String(source.description ?? ""), inviteCode: `HUB-${randomBytes(4).toString("hex").toUpperCase()}`, status: "active" });
      await tx.insert(campaignMembers).values({ campaignId, userId: actor.id });
      for (const row of arr(data.characters)) {
        const id = newId("char"); idMap.set(String(row.id), id);
        await tx.insert(characters).values({ id, campaignId, ownerId: actor.id, name: String(row.name ?? "Герой"), classKey: String(row.classKey ?? "fighter"), species: String(row.species ?? "Человек"), level: Number(row.level ?? 1), hpCurrent: Number(row.hpCurrent ?? 1), hpMax: Number(row.hpMax ?? 1), armorClass: Number(row.armorClass ?? 10), stats: row.stats as never, inventory: (row.inventory ?? []) as never, spells: (row.spells ?? { slots: {}, used: {}, list: [] }) as never, conditions: (row.conditions ?? []) as never, avatarUrl: (row.avatarUrl as string) ?? null });
      }
      for (const row of arr(data.sessions)) {
        await tx.insert(sessions).values({ id: newId("session"), campaignId, authorId: actor.id, title: String(row.title ?? "Заметка"), notes: String(row.notes ?? ""), isDmOnly: Boolean(row.isDmOnly), sessionDate: new Date(String(row.sessionDate ?? new Date().toISOString())) });
      }
      for (const row of arr(data.encounters)) {
        const state = row.state as EncounterState;
        if (!state?.combatants) continue;
        await tx.insert(encounters).values({ id: newId("encounter"), campaignId, state: { ...state, combatants: state.combatants.map((item) => ({ ...item, sourceCharacterId: item.sourceCharacterId ? idMap.get(item.sourceCharacterId) ?? null : null })) } });
      }
      const board = data.board as AnyRow | null;
      const map = (board?.map as MapState) ?? defaultMap();
      await tx.insert(boards).values({ campaignId, map: { ...map, tokens: map.tokens.map((token) => ({ ...token, characterId: token.characterId ? idMap.get(token.characterId) ?? null : null })) }, scene: defaultScene(), world: (board?.world as WorldState) ?? defaultWorld() });
    });
    return Response.json({ ok: true, campaignId, characters: idMap.size });
  } catch (error) {
    if (error instanceof HttpError) return apiError(error);
    return apiError(new HttpError(400, `Не удалось импортировать: ${error instanceof Error ? error.message : "повреждённый файл"}`));
  }
}
