import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, messages } from "@/db/schema";
import { defaultMap, defaultScene, defaultWorld } from "@/lib/board";
import type { EncounterState } from "@/lib/dnd/types";
import { newId } from "./http";
import { notifyUsers } from "./telegram";

export async function getOrCreateBoard(campaignId: string) {
  const [existing] = await db.select().from(boards).where(eq(boards.campaignId, campaignId)).limit(1);
  if (existing) return existing;
  const demo = campaignId.startsWith("demo-campaign-1");
  await db.insert(boards).values({ campaignId, map: defaultMap(demo), scene: defaultScene(), world: defaultWorld(demo) }).onConflictDoNothing();
  const [created] = await db.select().from(boards).where(eq(boards.campaignId, campaignId)).limit(1);
  return created;
}

export async function postMessage(input: {
  campaignId: string; authorId: string; authorName: string; recipientId?: string | null;
  kind: "chat" | "whisper" | "secret" | "system" | "roll"; body: string; data?: Record<string, unknown>;
}) {
  const [row] = await db.insert(messages).values({
    id: newId("msg"), campaignId: input.campaignId, authorId: input.authorId, authorName: input.authorName,
    recipientId: input.recipientId ?? null, kind: input.kind, body: input.body, data: input.data ?? {}, reactions: {},
  }).returning();
  if (input.recipientId && input.recipientId !== input.authorId) {
    const prefix = input.kind === "secret" ? "📜 Тайная записка" : input.kind === "whisper" ? `🤫 Шёпот от ${input.authorName}` : "🔔";
    void notifyUsers([input.recipientId], `${prefix}: ${input.body}`);
  }
  return row;
}

export function pushHistory(previous: EncounterState, history: EncounterState[] | null | undefined): EncounterState[] {
  return [previous, ...(history ?? [])].slice(0, 15);
}
