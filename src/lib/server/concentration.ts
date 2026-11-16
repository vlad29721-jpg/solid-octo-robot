import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, characters } from "@/db/schema";
import { getOrCreateBoard, postMessage } from "./board";
import { notifyUsers } from "./telegram";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function queueConcentration(tx: Tx | typeof db, characterId: string, damage: number) {
  if (damage <= 0) return;
  const [character] = await tx.select().from(characters).where(eq(characters.id, characterId)).limit(1);
  if (!character || !(character.conditions ?? []).some((condition) => condition.id === "concentration")) return;
  await getOrCreateBoard(character.campaignId);
  const [board] = await tx.select().from(boards).where(eq(boards.campaignId, character.campaignId)).limit(1);
  if (!board) return;
  const dc = Math.max(10, Math.floor(damage / 2));
  const check = { id: `conc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, characterId, characterName: character.name, ownerId: character.ownerId, dc, damage, createdAt: new Date().toISOString() };
  const concentration = [...(board.scene.concentration ?? []).filter((entry) => entry.characterId !== characterId), check].slice(-20);
  await tx.update(boards).set({ scene: { ...board.scene, concentration }, updatedAt: new Date() }).where(eq(boards.campaignId, character.campaignId));
  await postMessage({ campaignId: character.campaignId, authorId: "system", authorName: "Система", kind: "system", body: `🧠 ${character.name} получил ${damage} урона — спасбросок концентрации ТЕЛ, СЛ ${dc}.` });
  void notifyUsers([character.ownerId], `🧠 ${character.name}: нужен спасбросок концентрации (СЛ ${dc}).`);
}
