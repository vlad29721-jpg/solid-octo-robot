import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, diceRolls } from "@/db/schema";
import type { DiceRollDetail } from "@/lib/dnd/types";
import { requireCampaignAccess } from "./access";
import type { Actor } from "./auth";
import { HttpError, newId } from "./http";

export type CharacterRow = typeof characters.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function lockCharacter(tx: Tx, actor: Actor, id: string, requireOwner = true) {
  const [character] = await tx.select().from(characters).where(eq(characters.id, id)).for("update");
  if (!character) throw new HttpError(404, "Персонаж не найден.", "NOT_FOUND");
  const { isDm } = await requireCampaignAccess(actor, character.campaignId);
  if (requireOwner && !isDm && character.ownerId !== actor.id) throw new HttpError(403, "Можно изменять только своего персонажа.", "FORBIDDEN");
  return { character, isDm };
}

export async function logRoll(tx: Tx, campaignId: string, actor: Actor, label: string, detail: DiceRollDetail) {
  await tx.insert(diceRolls).values({ id: newId("roll"), campaignId, actorId: actor.id, actorName: label || actor.displayName, expression: detail.expression, result: detail.total, detail });
}
