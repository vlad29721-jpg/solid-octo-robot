import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { campaignMembers, campaigns, characters, diceRolls, encounters, messages, profiles, sessions } from "@/db/schema";
import { filterBoardForPlayer } from "@/lib/board";
import { getOrCreateBoard } from "./board";
import { HttpError } from "./http";
import type { Actor } from "./auth";

type CampaignRow = typeof campaigns.$inferSelect;
type CharacterRow = typeof characters.$inferSelect;
type EncounterRow = typeof encounters.$inferSelect;

export async function getVisibleCampaigns(actor: Actor): Promise<CampaignRow[]> {
  const owned = actor.role === "dm"
    ? await db.select().from(campaigns).where(eq(campaigns.dmId, actor.id))
    : [];
  const joined = await db.select({ campaign: campaigns })
    .from(campaignMembers)
    .innerJoin(campaigns, eq(campaignMembers.campaignId, campaigns.id))
    .where(eq(campaignMembers.userId, actor.id));
  const map = new Map<string, CampaignRow>();
  for (const row of owned) map.set(row.id, row);
  for (const row of joined) map.set(row.campaign.id, row.campaign);
  return [...map.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function requireCampaignAccess(actor: Actor, campaignId: string) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) throw new HttpError(404, "Кампания не найдена.", "NOT_FOUND");
  const isDm = campaign.dmId === actor.id && actor.role === "dm";
  if (isDm) return { campaign, isDm: true };
  const [membership] = await db.select().from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, actor.id))).limit(1);
  if (membership) return { campaign, isDm: false };
  const [ownedCharacter] = await db.select({ id: characters.id }).from(characters)
    .where(and(eq(characters.campaignId, campaignId), eq(characters.ownerId, actor.id))).limit(1);
  if (ownedCharacter) return { campaign, isDm: false };
  throw new HttpError(403, "Нет доступа к этой кампании.", "FORBIDDEN");
}

export async function requireCharacterAccess(actor: Actor, characterId: string): Promise<{ character: CharacterRow; isDm: boolean }> {
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
  if (!character) throw new HttpError(404, "Персонаж не найден.", "NOT_FOUND");
  const { isDm } = await requireCampaignAccess(actor, character.campaignId);
  if (!isDm && character.ownerId !== actor.id) throw new HttpError(403, "Можно изменять только своего персонажа.", "FORBIDDEN");
  return { character, isDm };
}

export async function requireEncounterAccess(actor: Actor, encounterId: string): Promise<{ encounter: EncounterRow; isDm: boolean }> {
  const [encounter] = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1);
  if (!encounter) throw new HttpError(404, "Столкновение не найдено.", "NOT_FOUND");
  const { isDm } = await requireCampaignAccess(actor, encounter.campaignId);
  return { encounter, isDm };
}

export async function getCampaignBundle(actor: Actor, campaignId: string | null) {
  const visibleCampaigns = await getVisibleCampaigns(actor);
  const selectedId = campaignId && visibleCampaigns.some((item) => item.id === campaignId)
    ? campaignId
    : visibleCampaigns[0]?.id ?? null;
  const everyone = await db.select().from(profiles).orderBy(asc(profiles.createdAt));

  if (!selectedId) {
    return {
      visibleCampaigns,
      campaign: null,
      allProfiles: everyone.filter((profile) => profile.id.startsWith("demo-") || profile.id === actor.id),
      board: null,
      messageRows: [],
      canUndo: false,
      characterRows: [],
      sessionRows: [],
      encounterRows: [],
      rollRows: [],
      memberRows: [],
      isDm: false,
    };
  }

  const { campaign, isDm } = await requireCampaignAccess(actor, selectedId);
  const characterRows = await db.select().from(characters)
    .where(isDm
      ? eq(characters.campaignId, selectedId)
      : and(eq(characters.campaignId, selectedId), eq(characters.ownerId, actor.id)))
    .orderBy(desc(characters.createdAt));
  const sessionRows = await db.select().from(sessions)
    .where(isDm
      ? eq(sessions.campaignId, selectedId)
      : and(eq(sessions.campaignId, selectedId), eq(sessions.isDmOnly, false)))
    .orderBy(desc(sessions.sessionDate));
  const encounterRows = await db.select().from(encounters)
    .where(eq(encounters.campaignId, selectedId)).orderBy(desc(encounters.updatedAt)).limit(1);
  const rollRows = (await db.select().from(diceRolls)
    .where(eq(diceRolls.campaignId, selectedId)).orderBy(desc(diceRolls.createdAt)).limit(80))
    .filter((roll) => isDm || !roll.hidden).slice(0, 60);
  const memberRows = await db.select({
    userId: campaignMembers.userId,
    campaignId: campaignMembers.campaignId,
    displayName: profiles.displayName,
    avatarUrl: profiles.avatarUrl,
    role: profiles.role,
  }).from(campaignMembers)
    .innerJoin(profiles, eq(campaignMembers.userId, profiles.id))
    .where(eq(campaignMembers.campaignId, selectedId));

  const memberIds = new Set([...memberRows.map((member) => member.userId), campaign.dmId, actor.id]);
  const allProfiles = everyone.filter((profile) => profile.id.startsWith("demo-") || memberIds.has(profile.id));
  const boardRow = await getOrCreateBoard(selectedId);
  let board = boardRow;
  if (!isDm) {
    const filtered = filterBoardForPlayer(boardRow.map, boardRow.world, characterRows.map((character) => character.id));
    const scene = {
      ...boardRow.scene,
      checks: (boardRow.scene.checks ?? []).filter((check) => check.ownerId === actor.id).map((check) => check.secret && check.result ? { ...check, result: { roll: -1, total: -1, success: false } } : check),
      concentration: (boardRow.scene.concentration ?? []).filter((entry) => entry.ownerId === actor.id),
    };
    board = { ...boardRow, map: filtered.map, world: filtered.world, scene };
  }
  const messageRows = (await db.select().from(messages)
    .where(and(eq(messages.campaignId, selectedId), or(isNull(messages.recipientId), eq(messages.recipientId, actor.id), eq(messages.authorId, actor.id))))
    .orderBy(desc(messages.createdAt)).limit(100)).reverse();
  const canUndo = Boolean(encounterRows[0]?.history?.length);
  void inArray;
  return { visibleCampaigns, campaign, allProfiles, characterRows, sessionRows, encounterRows, rollRows, memberRows, isDm, board, messageRows, canUndo };
}
