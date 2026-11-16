import { defaultStats } from "@/lib/dnd/calculations";
import { createEncounterState } from "@/lib/dnd/encounter";
import type { CampaignDto, CharacterDto, DiceRollDto, EncounterDto, HubSnapshot, ProfileDto, SessionDto } from "@/lib/types";
import type { DiceRollDetail, EncounterState, InventoryItem, Spellbook, Stats, CharacterCondition } from "@/lib/dnd/types";
import { campaigns, characters, diceRolls, encounters, profiles, sessions } from "@/db/schema";
import type { Actor } from "./auth";

type Row<T> = T extends { $inferSelect: infer U } ? U : never;

function iso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function safeStats(value: unknown): Stats {
  return value && typeof value === "object" && "abilities" in value ? value as Stats : defaultStats("fighter");
}
function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}
function safeSpellbook(value: unknown): Spellbook {
  const book = value && typeof value === "object" ? value as Partial<Spellbook> : {};
  return { slots: book.slots ?? {}, used: book.used ?? {}, list: safeArray(book.list) };
}
function safeEncounter(value: unknown): EncounterState {
  const base = createEncounterState();
  if (!value || typeof value !== "object") return base;
  const state = value as Partial<EncounterState>;
  return { ...base, ...state, combatants: safeArray(state.combatants), log: safeArray(state.log) };
}
function safeDetail(value: unknown, expression: string, result: number): DiceRollDetail {
  if (value && typeof value === "object" && "parts" in value) return value as DiceRollDetail;
  return { expression, total: result, parts: [], flatModifier: result, breakdown: `итого ${result}`, critical: false, fumble: false };
}

export function profileDto(row: Row<typeof profiles>): ProfileDto {
  return { id: row.id, displayName: row.displayName, role: row.role, avatarUrl: row.avatarUrl, email: row.email, createdAt: iso(row.createdAt) };
}
export function campaignDto(row: Row<typeof campaigns>): CampaignDto {
  return { id: row.id, dmId: row.dmId, title: row.title, description: row.description, inviteCode: row.inviteCode, status: row.status, createdAt: iso(row.createdAt) };
}
export function characterDto(row: Row<typeof characters>): CharacterDto {
  return {
    id: row.id, campaignId: row.campaignId, ownerId: row.ownerId, name: row.name, classKey: row.classKey,
    species: row.species, level: row.level, hpCurrent: row.hpCurrent, hpMax: row.hpMax, armorClass: row.armorClass,
    stats: safeStats(row.stats), inventory: safeArray<InventoryItem>(row.inventory), spellbook: safeSpellbook(row.spells),
    conditions: safeArray<CharacterCondition>(row.conditions), avatarUrl: row.avatarUrl,
    createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  };
}
export function sessionDto(row: Row<typeof sessions>): SessionDto {
  return { id: row.id, campaignId: row.campaignId, authorId: row.authorId, title: row.title, notes: row.notes, isDmOnly: row.isDmOnly, sessionDate: iso(row.sessionDate), createdAt: iso(row.createdAt) };
}
export function encounterDto(row: Row<typeof encounters>): EncounterDto {
  return { id: row.id, campaignId: row.campaignId, state: safeEncounter(row.state), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) };
}
export function diceRollDto(row: Row<typeof diceRolls>): DiceRollDto {
  return { id: row.id, campaignId: row.campaignId, actorId: row.actorId, actorName: row.actorName, expression: row.expression, result: row.result, detail: safeDetail(row.detail, row.expression, row.result), createdAt: iso(row.createdAt) };
}

export function buildHubSnapshot(input: {
  actor: Actor;
  profiles: Row<typeof profiles>[];
  campaigns: Row<typeof campaigns>[];
  campaign: Row<typeof campaigns> | null;
  characters: Row<typeof characters>[];
  sessions: Row<typeof sessions>[];
  encounter: Row<typeof encounters> | null;
  rolls: Row<typeof diceRolls>[];
  members: { userId: string; campaignId: string; displayName: string; avatarUrl: string | null; role: "dm" | "player" }[];
  serverTime?: string;
}): HubSnapshot {
  const supabaseAuth = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return {
    actor: profileDto(input.actor),
    profiles: input.profiles.map(profileDto),
    campaigns: input.campaigns.map(campaignDto),
    campaign: input.campaign ? campaignDto(input.campaign) : null,
    members: input.members,
    characters: input.characters.map(characterDto),
    sessions: input.sessions.map(sessionDto),
    encounter: input.encounter ? encounterDto(input.encounter) : null,
    rolls: input.rolls.map(diceRollDto),
    capabilities: { supabaseAuth, supabaseRealtime: supabaseAuth, deepseek: Boolean(process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY) },
    serverTime: input.serverTime ?? new Date().toISOString(),
  };
}
