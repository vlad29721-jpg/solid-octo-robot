import { z } from "zod";
import { ABILITY_KEYS, CLASS_CATALOG, CONDITION_KEYS, SKILL_KEYS } from "./dnd/catalog";
import type { AbilityKey, ConditionKey, SkillKey } from "./dnd/types";

const abilityKey = z.enum(ABILITY_KEYS as [AbilityKey, ...AbilityKey[]]);
const skillKey = z.enum(SKILL_KEYS as [SkillKey, ...SkillKey[]]);
const conditionKey = z.enum(CONDITION_KEYS as [ConditionKey, ...ConditionKey[]]);
const classKey = z.string().refine((value) => value in CLASS_CATALOG, "Выберите класс из списка.");

export const abilityScoresSchema = z.object({
  str: z.coerce.number().int().min(1).max(30),
  dex: z.coerce.number().int().min(1).max(30),
  con: z.coerce.number().int().min(1).max(30),
  int: z.coerce.number().int().min(1).max(30),
  wis: z.coerce.number().int().min(1).max(30),
  cha: z.coerce.number().int().min(1).max(30),
});

export const statsSchema = z.object({
  abilities: abilityScoresSchema,
  proficientSkills: z.array(skillKey).max(18),
  expertiseSkills: z.array(skillKey).max(18),
  savingThrowProficiencies: z.array(abilityKey).max(6),
  initiativeBonus: z.number().int().min(-10).max(20),
  spellcastingAbility: abilityKey.nullable(),
});

export const inventoryItemSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  category: z.enum(["weapon", "armor", "shield", "gear", "consumable", "treasure"]),
  quantity: z.number().int().min(1).max(999),
  weight: z.number().min(0).max(9999),
  costGp: z.number().min(0).max(1000000),
  description: z.string().max(1000),
  equipped: z.boolean(),
  damage: z.string().max(100).optional(),
  armor: z.object({
    base: z.number().int().min(0).max(30),
    type: z.enum(["light", "medium", "heavy", "shield"]),
    maxDex: z.number().int().min(0).max(10).optional(),
  }).optional(),
  rarity: z.enum(["common", "uncommon", "rare", "very rare", "legendary"]).optional(),
});

export const spellSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  level: z.number().int().min(0).max(9),
  school: z.string().max(100),
  castingTime: z.string().max(100),
  range: z.string().max(100),
  components: z.string().max(100),
  description: z.string().max(2000),
  prepared: z.boolean(),
});

export const spellbookSchema = z.object({
  slots: z.record(z.number().int().min(0).max(20)),
  used: z.record(z.number().int().min(0).max(20)),
  list: z.array(spellSchema).max(100),
});

export const conditionSchema = z.object({
  id: conditionKey,
  name: z.string().min(1).max(80),
  appliedAt: z.string().min(1),
});

export const characterCreateSchema = z.object({
  campaignId: z.string().min(1).max(100),
  name: z.string().trim().min(2).max(60),
  classKey,
  species: z.string().trim().min(2).max(50),
  level: z.coerce.number().int().min(1).max(20),
  hpMax: z.coerce.number().int().min(1).max(999),
  hpCurrent: z.coerce.number().int().min(0).max(999),
  armorClass: z.coerce.number().int().min(1).max(40),
  abilities: abilityScoresSchema,
  proficientSkills: z.array(skillKey).max(18),
  expertiseSkills: z.array(skillKey).max(18),
  initiativeBonus: z.coerce.number().int().min(-10).max(20).default(0),
  ownerId: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().max(2000).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.hpCurrent > value.hpMax) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hpCurrent"], message: "Текущие HP не могут превышать максимум." });
});

export const characterPatchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  level: z.number().int().min(1).max(20).optional(),
  hpCurrent: z.number().int().min(0).max(999).optional(),
  hpMax: z.number().int().min(1).max(999).optional(),
  armorClass: z.number().int().min(1).max(40).optional(),
  stats: statsSchema.optional(),
  inventory: z.array(inventoryItemSchema).max(100).optional(),
  spellbook: spellbookSchema.optional(),
  conditions: z.array(conditionSchema).max(20).optional(),
  avatarUrl: z.string().max(2000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "Нет изменений.");

export const campaignCreateSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).default(""),
  status: z.enum(["active", "paused", "archived"]).default("active"),
});

export const campaignJoinSchema = z.object({
  inviteCode: z.string().trim().min(4).max(40).transform((value) => value.toUpperCase()),
});

export const sessionCreateSchema = z.object({
  campaignId: z.string().min(1).max(100),
  title: z.string().trim().min(2).max(120),
  notes: z.string().trim().min(2).max(10000),
  isDmOnly: z.boolean().default(false),
  sessionDate: z.string().min(4).max(40).optional(),
});

export const encounterCreateSchema = z.object({
  campaignId: z.string().min(1).max(100),
  name: z.string().trim().min(2).max(100).default("Новое столкновение"),
});

export const combatantSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  kind: z.enum(["character", "monster"]),
  sourceCharacterId: z.string().max(100).nullable(),
  initiative: z.number().int().min(-20).max(100),
  dexModifier: z.number().int().min(-10).max(20),
  hp: z.number().int().min(0).max(9999),
  maxHp: z.number().int().min(1).max(9999),
  ac: z.number().int().min(1).max(50),
  conditions: z.array(conditionKey).max(20),
  color: z.string().max(40),
});

export const encounterStateSchema = z.object({
  name: z.string().min(1).max(100),
  active: z.boolean(),
  round: z.number().int().min(1).max(999),
  activeId: z.string().max(100).nullable(),
  combatants: z.array(combatantSchema).max(60),
  log: z.array(z.object({ id: z.string(), text: z.string().max(500), at: z.string() })).max(30),
});

export const encounterPatchSchema = z.object({ state: encounterStateSchema });
export const hpDeltaSchema = z.object({
  combatantId: z.string().min(1).max(100),
  amount: z.number().int().min(0).max(999),
  mode: z.enum(["damage", "heal"]),
});
export const diceRollSchema = z.object({
  campaignId: z.string().min(1).max(100),
  expression: z.string().trim().min(2).max(100),
});
export const profilePatchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  role: z.enum(["dm", "player"]).optional(),
  avatarUrl: z.string().max(2000000).nullable().optional(),
});

export const deepseekSchema = z.object({
  kind: z.enum(["npc", "backstory", "rules", "event", "custom"]),
  prompt: z.string().trim().min(3).max(4000),
  context: z.string().max(4000).optional(),
  conversation: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(8).optional(),
});

export const monsterFormSchema = z.object({
  name: z.string().trim().min(2).max(60),
  hp: z.coerce.number().int().min(1).max(999),
  ac: z.coerce.number().int().min(1).max(40),
  initiative: z.coerce.number().int().min(-10).max(50),
  count: z.coerce.number().int().min(1).max(8).default(1),
});

export type CharacterCreateInput = z.infer<typeof characterCreateSchema>;
export type CharacterPatchInput = z.infer<typeof characterPatchSchema>;
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;
export type MonsterFormInput = z.infer<typeof monsterFormSchema>;
export type DeepseekInput = z.infer<typeof deepseekSchema>;
export type CampaignJoinInput = z.infer<typeof campaignJoinSchema>;
export type EncounterCreateInput = z.infer<typeof encounterCreateSchema>;
export type DiceRollInput = z.infer<typeof diceRollSchema>;
