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
  coins: z.object({ pp: z.number().int().min(0).max(1e7), gp: z.number().int().min(0).max(1e7), ep: z.number().int().min(0).max(1e7), sp: z.number().int().min(0).max(1e7), cp: z.number().int().min(0).max(1e7) }).optional(),
  resources: z.array(z.object({ id: z.string().min(1).max(60), name: z.string().min(1).max(80), max: z.number().int().min(0).max(999), current: z.number().int().min(0).max(999), recharge: z.enum(["short", "long"]) })).max(20).optional(),
  deathSaves: z.object({ successes: z.number().int().min(0).max(3), failures: z.number().int().min(0).max(3), stable: z.boolean(), dead: z.boolean() }).optional(),
  hitDiceUsed: z.number().int().min(0).max(20).optional(),
  xp: z.number().int().min(0).max(1000000).optional(),
  inspiration: z.boolean().optional(),
  personality: z.object({ background: z.string().max(80), traits: z.string().max(1000), ideals: z.string().max(1000), bonds: z.string().max(1000), flaws: z.string().max(1000), backstory: z.string().max(6000) }).optional(),
  subclass: z.string().max(60).optional(),
  feats: z.array(z.string().max(60)).max(20).optional(),
  companions: z.array(z.object({ id: z.string().max(80), name: z.string().min(1).max(80), kind: z.string().max(80), hp: z.number().int().min(0).max(9999), maxHp: z.number().int().min(1).max(9999), ac: z.number().int().min(1).max(50), attack: z.string().max(200), notes: z.string().max(1000) })).max(10).optional(),
  race: z.string().max(60).optional(),
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
  magic: z.boolean().optional(),
  requiresAttunement: z.boolean().optional(),
  attuned: z.boolean().optional(),
  charges: z.object({ current: z.number().int().min(0).max(999), max: z.number().int().min(0).max(999) }).optional(),
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
  race: z.string().max(60).optional(),
  subclass: z.string().max(60).optional(),
  personality: z.object({ background: z.string().max(80), traits: z.string().max(1000), ideals: z.string().max(1000), bonds: z.string().max(1000), flaws: z.string().max(1000), backstory: z.string().max(6000) }).optional(),
  bonusGold: z.number().int().min(0).max(1000).optional(),
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
  effects: z.array(z.object({ id: z.string().max(80), name: z.string().min(1).max(80), rounds: z.number().int().min(0).max(1000) })).max(20).optional(),
  xp: z.number().int().min(0).max(1000000).optional(),
  cr: z.string().max(10).optional(),
  monsterKey: z.string().max(60).nullable().optional(),
  resistances: z.array(z.string().max(30)).max(15).optional(),
  vulnerabilities: z.array(z.string().max(30)).max(15).optional(),
  immunities: z.array(z.string().max(30)).max(15).optional(),
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
  damageType: z.string().max(30).optional(),
});
export const diceRollSchema = z.object({
  campaignId: z.string().min(1).max(100),
  expression: z.string().trim().min(2).max(100),
  hidden: z.boolean().optional(),
});
export const profilePatchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  role: z.enum(["dm", "player"]).optional(),
  avatarUrl: z.string().max(2000000).nullable().optional(),
  telegramChatId: z.string().trim().max(40).regex(/^-?\d*$/, "Telegram ID — только цифры").nullable().optional(),
  prefs: z.object({ diceColor: z.string().max(20).optional(), diceMaterial: z.enum(["gold", "obsidian", "crystal", "blood", "bone"]).optional() }).optional(),
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

const idStr = z.string().min(1).max(120);
const urlStr = z.string().max(500).nullable();

export const wallSchema = z.object({ id: idStr, x1: z.number().min(0).max(60), y1: z.number().min(0).max(60), x2: z.number().min(0).max(60), y2: z.number().min(0).max(60), door: z.boolean(), open: z.boolean() });
export const drawingSchema = z.object({ id: idStr, points: z.array(z.number().min(-5).max(65)).max(400), color: z.string().max(30), kind: z.enum(["free", "arrow", "text"]), text: z.string().max(80).optional(), by: z.string().max(80).optional() });

export const mapStateSchema = z.object({
  imageUrl: urlStr,
  cols: z.number().int().min(4).max(60),
  rows: z.number().int().min(4).max(60),
  feetPerCell: z.number().int().min(1).max(100),
  fogEnabled: z.boolean(),
  revealed: z.array(z.string().max(12)).max(3600),
  tokens: z.array(z.object({
    id: idStr, name: z.string().min(1).max(80), x: z.number().min(0).max(60), y: z.number().min(0).max(60),
    color: z.string().max(30), size: z.number().int().min(1).max(4), kind: z.enum(["character", "monster", "npc"]),
    characterId: z.string().max(120).nullable(), combatantId: z.string().max(120).nullable(), hidden: z.boolean(),
    light: z.number().min(0).max(120).optional(), darkvision: z.number().min(0).max(120).optional(),
  })).max(100),
  templates: z.array(z.object({ id: idStr, x: z.number(), y: z.number(), radiusFeet: z.number().min(5).max(200), color: z.string().max(30), label: z.string().max(60), shape: z.enum(["circle", "cone", "line"]).optional(), angle: z.number().min(-360).max(720).optional() })).max(20),
  name: z.string().max(80).optional(),
  walls: z.array(wallSchema).max(300).optional(),
  drawings: z.array(drawingSchema).max(80).optional(),
  lighting: z.boolean().optional(),
});

export const sceneStateSchema = z.object({
  handout: z.object({ id: idStr, title: z.string().max(120), imageUrl: urlStr, text: z.string().max(4000), shownAt: z.string() }).nullable(),
  sound: z.object({ id: idStr, effect: z.enum(["thunder", "scream", "swords", "door", "magic", "drum", "bell", "growl"]), at: z.string() }).nullable(),
  weather: z.enum(["clear", "rain", "storm", "snow", "fog"]),
  timeOfDay: z.enum(["dawn", "day", "dusk", "night"]),
  groupSave: z.object({
    id: idStr, ability: abilityKey, dc: z.number().int().min(1).max(40), label: z.string().max(120), createdAt: z.string(),
    results: z.array(z.object({ characterId: idStr, name: z.string().max(80), roll: z.number().int(), total: z.number().int(), success: z.boolean() })).max(30),
  }).nullable(),
  checks: z.array(z.object({
    id: idStr, characterId: idStr, characterName: z.string().max(80), ownerId: idStr, kind: z.enum(["skill", "ability", "save"]), key: z.string().max(40),
    label: z.string().max(120), dc: z.number().int().min(1).max(40), secret: z.boolean(), createdAt: z.string(),
    result: z.object({ roll: z.number().int(), total: z.number().int(), success: z.boolean() }).nullable(),
  })).max(30).optional(),
  concentration: z.array(z.object({ id: idStr, characterId: idStr, characterName: z.string().max(80), ownerId: idStr, dc: z.number().int(), damage: z.number().int(), createdAt: z.string() })).max(20).optional(),
  music: z.object({ track: z.enum(["tavern", "battle", "dungeon", "forest", "mystery", "custom"]), customUrl: z.string().max(500).nullable(), playing: z.boolean(), volume: z.number().min(0).max(1), startedAt: z.string() }).nullable().optional(),
  ping: z.object({ id: idStr, x: z.number(), y: z.number(), by: z.string().max(80), at: z.string(), color: z.string().max(30) }).nullable().optional(),
});

export const worldStateSchema = z.object({
  quests: z.array(z.object({ id: idStr, title: z.string().min(1).max(120), description: z.string().max(2000), status: z.enum(["active", "done", "failed"]), reward: z.string().max(200), hidden: z.boolean() })).max(100),
  npcs: z.array(z.object({ id: idStr, name: z.string().min(1).max(80), role: z.string().max(80), description: z.string().max(2000), attitude: z.enum(["friendly", "neutral", "hostile"]), relations: z.string().max(500), secret: z.string().max(2000), portraitUrl: urlStr, hidden: z.boolean() })).max(150),
  locations: z.array(z.object({ id: idStr, name: z.string().min(1).max(80), description: z.string().max(2000), visited: z.boolean(), hidden: z.boolean(), x: z.number().min(0).max(100).nullable(), y: z.number().min(0).max(100).nullable() })).max(150),
  worldMapUrl: urlStr,
  nextSession: z.object({ at: z.string().max(40), note: z.string().max(300), reminded: z.boolean().optional() }).nullable(),
  shops: z.array(z.object({ id: idStr, name: z.string().min(1).max(80), open: z.boolean(), sellRate: z.number().min(0).max(2), items: z.array(z.object({ id: idStr, item: inventoryItemSchema, price: z.number().min(0).max(1e7), stock: z.number().int().min(-1).max(9999) })).max(80) })).max(20).optional(),
  chest: z.object({ items: z.array(inventoryItemSchema).max(200), gold: z.number().int().min(0).max(1e8) }).optional(),
  polls: z.array(z.object({ id: idStr, title: z.string().max(120), closed: z.boolean(), options: z.array(z.object({ id: idStr, at: z.string().max(40), votes: z.array(z.string().max(120)).max(50) })).max(10) })).max(20).optional(),
  attendance: z.array(z.object({ id: idStr, date: z.string().max(40), title: z.string().max(120), present: z.array(z.string().max(120)).max(50) })).max(200).optional(),
  maps: z.array(z.object({ id: idStr, name: z.string().min(1).max(80), state: mapStateSchema })).max(15).optional(),
});

export const boardPatchSchema = z.object({ map: mapStateSchema.optional(), scene: sceneStateSchema.optional(), world: worldStateSchema.optional() });
export const tokenMoveSchema = z.object({ tokenId: idStr, x: z.number().min(0).max(60), y: z.number().min(0).max(60) });
export const groupSaveRollSchema = z.object({ characterId: idStr });

export const messageCreateSchema = z.object({
  campaignId: idStr,
  body: z.string().trim().min(1).max(2000),
  recipientId: z.string().max(120).nullable().optional(),
  kind: z.enum(["chat", "whisper", "secret"]).default("chat"),
});
export const reactSchema = z.object({ emoji: z.enum(["🔥", "💀", "😱", "😂", "👍", "🎲"]) });

export const inventoryOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), item: inventoryItemSchema }),
  z.object({ op: z.literal("remove"), itemId: idStr }),
  z.object({ op: z.literal("quantity"), itemId: idStr, delta: z.number().int().min(-999).max(999) }),
  z.object({ op: z.literal("equip"), itemId: idStr }),
  z.object({ op: z.literal("attune"), itemId: idStr }),
  z.object({ op: z.literal("charge"), itemId: idStr, delta: z.number().int().min(-99).max(99) }),
]);
export const levelUpSchema = z.object({ mode: z.enum(["average", "roll"]) });
export const restSchema = z.object({ type: z.enum(["short", "long"]), hitDice: z.number().int().min(0).max(20).default(0) });
export const transferSchema = z.object({
  fromId: idStr, toId: idStr,
  itemId: z.string().max(120).optional(), quantity: z.number().int().min(1).max(999).optional(),
  gold: z.number().int().min(0).max(1e7).optional(),
});
export const attackSchema = z.object({
  targetId: idStr,
  attackerName: z.string().min(1).max(80),
  attackName: z.string().min(1).max(80),
  toHit: z.number().int().min(-10).max(30),
  damage: z.string().min(2).max(40),
  advantage: z.enum(["normal", "advantage", "disadvantage"]).default("normal"),
  autoHit: z.boolean().default(false),
  damageType: z.string().max(30).optional(),
});
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Введите корректный email").max(120),
  password: z.string().min(6, "Минимум 6 символов").max(100),
  displayName: z.string().trim().min(2, "Минимум 2 символа").max(60),
  role: z.enum(["dm", "player"]),
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Введите корректный email").max(120),
  password: z.string().min(1, "Введите пароль").max(100),
});
export const assetSchema = z.object({ campaignId: idStr, dataUrl: z.string().min(20).max(4_000_000) });
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const checkRollSchema = z.object({
  characterId: idStr,
  kind: z.enum(["skill", "ability", "save"]),
  key: z.string().max(40),
  advantage: z.enum(["normal", "advantage", "disadvantage"]).default("normal"),
  useInspiration: z.boolean().default(false),
  checkId: z.string().max(120).optional(),
});
export const concentrationRollSchema = z.object({ campaignId: idStr, checkId: idStr });
export const awardXpSchema = z.object({ total: z.number().int().min(0).max(1000000), characterIds: z.array(idStr).min(1).max(20) });
export const pingSchema = z.object({ x: z.number().min(0).max(60), y: z.number().min(0).max(60) });
export const drawSchema = z.object({ drawing: drawingSchema });
export const shopActionSchema = z.object({
  campaignId: idStr, action: z.enum(["buy", "sell"]), shopId: idStr, characterId: idStr,
  itemId: z.string().max(120), quantity: z.number().int().min(1).max(99).default(1),
});
export const chestActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("deposit"), campaignId: idStr, characterId: idStr, itemId: idStr }),
  z.object({ action: z.literal("take"), campaignId: idStr, characterId: idStr, itemId: idStr }),
  z.object({ action: z.literal("gold"), campaignId: idStr, characterId: idStr, amount: z.number().int().min(-1e7).max(1e7) }),
  z.object({ action: z.literal("split"), campaignId: idStr }),
  z.object({ action: z.literal("addLoot"), campaignId: idStr, gold: z.number().int().min(0).max(1e8), items: z.array(inventoryItemSchema).max(30) }),
  z.object({ action: z.literal("discard"), campaignId: idStr, itemId: idStr }),
]);
export const pollVoteSchema = z.object({ campaignId: idStr, pollId: idStr, optionId: idStr });
export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email("Введите корректный email") });
export const resetSchema = z.object({ token: z.string().min(10).max(200), password: z.string().min(6, "Минимум 6 символов").max(100) });
export const accountPatchSchema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль").max(100),
  newEmail: z.string().trim().toLowerCase().email("Введите корректный email").max(120).optional(),
  newPassword: z.string().min(6, "Минимум 6 символов").max(100).optional(),
});
export const memberActionSchema = z.object({ action: z.enum(["kick", "transfer", "regenerate", "reset-link"]), userId: z.string().max(120).optional() });
export const importSchema = z.object({ data: z.record(z.unknown()) });
