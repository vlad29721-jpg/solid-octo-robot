import { sql } from "drizzle-orm";
import { db } from "./index";
import { campaignMembers, campaigns, characters, diceRolls, encounters, profiles, sessions } from "./schema";
import { CLASS_CATALOG, ITEM_CATALOG, SPELL_CATALOG } from "@/lib/dnd/catalog";
import { defaultSpellSlots } from "@/lib/dnd/calculations";
import { rollExpression } from "@/lib/dnd/dice";
import type { AbilityKey, CharacterCondition, Combatant, EncounterState, InventoryItem, SkillKey, Spell, Stats } from "@/lib/dnd/types";

let bootstrapPromise: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

const DDL = [
  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'player',
    avatar_url TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    dm_id TEXT NOT NULL CONSTRAINT campaigns_dm_id_profiles_id_fk REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    invite_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT campaigns_invite_code_unique UNIQUE (invite_code)
  )`,
  `CREATE TABLE IF NOT EXISTS campaign_members (
    campaign_id TEXT NOT NULL CONSTRAINT campaign_members_campaign_id_campaigns_id_fk REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL CONSTRAINT campaign_members_user_id_profiles_id_fk REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT campaign_members_campaign_id_user_id_pk PRIMARY KEY (campaign_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL CONSTRAINT characters_campaign_id_campaigns_id_fk REFERENCES campaigns(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL CONSTRAINT characters_owner_id_profiles_id_fk REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class_key TEXT NOT NULL,
    species TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    hp_current INTEGER NOT NULL DEFAULT 1,
    hp_max INTEGER NOT NULL DEFAULT 1,
    armor_class INTEGER NOT NULL DEFAULT 10,
    stats JSONB NOT NULL,
    inventory JSONB NOT NULL,
    spells JSONB NOT NULL,
    conditions JSONB NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL CONSTRAINT sessions_campaign_id_campaigns_id_fk REFERENCES campaigns(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL CONSTRAINT sessions_author_id_profiles_id_fk REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT NOT NULL,
    is_dm_only BOOLEAN NOT NULL DEFAULT FALSE,
    session_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS encounters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL CONSTRAINT encounters_campaign_id_campaigns_id_fk REFERENCES campaigns(id) ON DELETE CASCADE,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS dice_rolls (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL CONSTRAINT dice_rolls_campaign_id_campaigns_id_fk REFERENCES campaigns(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    expression TEXT NOT NULL,
    result INTEGER NOT NULL,
    detail JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS characters_campaign_idx ON characters(campaign_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_campaign_idx ON sessions(campaign_id)`,
  `CREATE INDEX IF NOT EXISTS encounters_campaign_idx ON encounters(campaign_id)`,
  `CREATE INDEX IF NOT EXISTS dice_rolls_campaign_idx ON dice_rolls(campaign_id)`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT`,
  `ALTER TABLE encounters ADD COLUMN IF NOT EXISTS history JSONB`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prefs JSONB`,
  `ALTER TABLE dice_rolls ADD COLUMN IF NOT EXISTS hidden BOOLEAN`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL CONSTRAINT password_resets_user_id_profiles_id_fk REFERENCES profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL CONSTRAINT auth_sessions_user_id_profiles_id_fk REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS boards (
    campaign_id TEXT PRIMARY KEY CONSTRAINT boards_campaign_id_campaigns_id_fk REFERENCES campaigns(id) ON DELETE CASCADE,
    map JSONB NOT NULL,
    scene JSONB NOT NULL,
    world JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL CONSTRAINT messages_campaign_id_campaigns_id_fk REFERENCES campaigns(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    recipient_id TEXT,
    kind TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB NOT NULL,
    reactions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS messages_campaign_idx ON messages(campaign_id)`,
  `CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL CONSTRAINT assets_campaign_id_campaigns_id_fk REFERENCES campaigns(id) ON DELETE CASCADE,
    mime TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

function makeStats(
  abilities: Stats["abilities"],
  proficientSkills: SkillKey[],
  classKey: string,
  spellcastingAbility: AbilityKey | null = null,
  initiativeBonus = 0,
): Stats {
  const definition = CLASS_CATALOG[classKey];
  return {
    abilities,
    proficientSkills,
    expertiseSkills: classKey === "rogue" ? ["stealth", "sleightOfHand"] : [],
    savingThrowProficiencies: definition?.saveProficiencies ?? [],
    initiativeBonus,
    spellcastingAbility,
  };
}

function item(id: string, overrides: Partial<InventoryItem> = {}): InventoryItem {
  const base = ITEM_CATALOG.find((entry) => entry.id === id);
  if (!base) throw new Error(`Unknown catalog item: ${id}`);
  return { ...base, ...overrides };
}

function spell(id: string, prepared = true): Spell {
  const base = SPELL_CATALOG.find((entry) => entry.id === id);
  if (!base) throw new Error(`Unknown catalog spell: ${id}`);
  return { ...base, prepared };
}

function condition(id: CharacterCondition["id"], name: string): CharacterCondition {
  return { id, name, appliedAt: "2026-02-18T19:15:00.000Z" };
}

function combatant(data: Omit<Combatant, "conditions" | "color"> & Partial<Pick<Combatant, "conditions" | "color">>): Combatant {
  return { conditions: [], color: "#D4AF37", ...data };
}

async function bootstrap() {
  await db.transaction(async (tx) => {
    await tx.execute(sql.raw("SELECT pg_advisory_xact_lock(828171)"));
    for (const statement of DDL) await tx.execute(sql.raw(statement));

    const demoTime = new Date("2026-02-10T12:00:00.000Z");
    await tx.insert(profiles).values([
      { id: "demo-dm", displayName: "Эларион Вещий", role: "dm", email: "dm@masterhub.demo", avatarUrl: null, createdAt: demoTime },
      { id: "demo-player", displayName: "Лиана", role: "player", email: "liana@masterhub.demo", avatarUrl: null, createdAt: demoTime },
      { id: "demo-player-2", displayName: "Торин", role: "player", email: "torin@masterhub.demo", avatarUrl: null, createdAt: demoTime },
    ]).onConflictDoNothing();

    await tx.insert(campaigns).values([
      { id: "demo-campaign-1", dmId: "demo-dm", title: "Тень над Гримхольмом", description: "Город гаснущих фонарей, где под мостовой просыпается древняя клятва. Партия ищет пропавшего картографа и слышит колокол, которого нет на башне.", inviteCode: "GRIMHOLM-7K", status: "active", createdAt: demoTime },
      { id: "demo-campaign-2", dmId: "demo-dm", title: "Пепел Драконьего Предела", description: "Экспедиция через выжженное нагорье к обсерватории, где последний дракон оставил не сокровище, а предупреждение.", inviteCode: "DRAGON-ASH-42", status: "active", createdAt: new Date("2026-01-22T12:00:00.000Z") },
    ]).onConflictDoNothing();

    await tx.insert(campaignMembers).values([
      { campaignId: "demo-campaign-1", userId: "demo-dm", joinedAt: demoTime },
      { campaignId: "demo-campaign-1", userId: "demo-player", joinedAt: demoTime },
      { campaignId: "demo-campaign-1", userId: "demo-player-2", joinedAt: demoTime },
      { campaignId: "demo-campaign-2", userId: "demo-dm", joinedAt: demoTime },
      { campaignId: "demo-campaign-2", userId: "demo-player", joinedAt: demoTime },
    ]).onConflictDoNothing();

    const liana: Stats = makeStats({ str: 9, dex: 18, con: 14, int: 13, wis: 12, cha: 16 }, ["stealth", "sleightOfHand", "perception", "acrobatics", "deception"], "rogue", null, 2);
    const torin: Stats = makeStats({ str: 16, dex: 10, con: 16, int: 11, wis: 17, cha: 12 }, ["insight", "medicine", "religion", "perception"], "cleric", "wis");
    const serafina: Stats = makeStats({ str: 8, dex: 15, con: 13, int: 18, wis: 12, cha: 10 }, ["arcana", "history", "investigation"], "wizard", "int");

    await tx.insert(characters).values([
      {
        id: "demo-char-liana", campaignId: "demo-campaign-1", ownerId: "demo-player", name: "Лиана Тенетень", classKey: "rogue", species: "Полуэльф", level: 5,
        hpCurrent: 31, hpMax: 38, armorClass: 15, stats: liana,
        inventory: [item("item-rapier", { equipped: true }), item("item-leather", { equipped: true }), item("item-thieves", { equipped: true }), item("item-rope"), item("item-potion", { quantity: 2 }), item("item-pearl")],
        spells: { slots: {}, used: {}, list: [] }, conditions: [condition("concentration", "Концентрация")], avatarUrl: null,
        createdAt: demoTime, updatedAt: demoTime,
      },
      {
        id: "demo-char-torin", campaignId: "demo-campaign-1", ownerId: "demo-player-2", name: "Торин Громомолот", classKey: "cleric", species: "Дварф", level: 5,
        hpCurrent: 42, hpMax: 43, armorClass: 18, stats: torin,
        inventory: [item("item-longsword", { equipped: true }), item("item-scale", { equipped: true }), item("item-shield", { equipped: true }), item("item-holy", { equipped: true }), item("item-rations")],
        spells: { slots: defaultSpellSlots("cleric", 5), used: { "1": 1 }, list: [spell("spell-cure-wounds"), spell("spell-bless"), spell("spell-healing-word"), spell("spell-hold-person"), spell("spell-shatter")] },
        conditions: [condition("blessed", "Благословлён")], avatarUrl: null,
        createdAt: demoTime, updatedAt: demoTime,
      },
      {
        id: "demo-char-serafina", campaignId: "demo-campaign-2", ownerId: "demo-player", name: "Серафина Пепельная", classKey: "wizard", species: "Человек", level: 4,
        hpCurrent: 22, hpMax: 26, armorClass: 12, stats: serafina,
        inventory: [item("item-spellbook", { equipped: true }), item("item-shortbow"), item("item-potion"), item("item-bag"), item("item-torch", { quantity: 3 })],
        spells: { slots: defaultSpellSlots("wizard", 4), used: { "1": 2, "2": 1 }, list: [spell("spell-magic-missile"), spell("spell-shield"), spell("spell-misty-step"), spell("spell-shatter")] },
        conditions: [], avatarUrl: null,
        createdAt: demoTime, updatedAt: demoTime,
      },
    ]).onConflictDoNothing();

    await tx.insert(sessions).values([
      { id: "demo-note-1", campaignId: "demo-campaign-1", authorId: "demo-dm", title: "Сессия 4: Колокол без языка", notes: "Партия нашла карту канализации под собором. Стражник Аррен солгал о времени исчезновения картографа. На мосту Гримхольма фонари погасли все разом, когда Лиана коснулась серебряной нити.\n\nСледующая зацепка: мастерская часовщика на улице Пепла и три имени в журнале гильдии.", isDmOnly: false, sessionDate: new Date("2026-02-14T19:00:00.000Z"), createdAt: new Date("2026-02-14T22:30:00.000Z") },
      { id: "demo-note-2", campaignId: "demo-campaign-1", authorId: "demo-player", title: "Заметки Лианы", notes: "Не доверяю Аррену. Серебряная нить тёплая, будто живая. Торин сказал, что blessings на колокольне звучат не как молитва, а как приказ. Нужно вернуться к мосту днём.", isDmOnly: false, sessionDate: new Date("2026-02-15T10:00:00.000Z"), createdAt: new Date("2026-02-15T10:30:00.000Z") },
      { id: "demo-note-3", campaignId: "demo-campaign-1", authorId: "demo-dm", title: "Секретный план Мастера", notes: "Колокол — это печать, а не сигнал. Аррен защищает дочь, ставшую проводником древнего договора. Если партия снимет печать до новолуния, на улицы выйдет Тень под мостовой. Не раскрывать до третьего акта.", isDmOnly: true, sessionDate: new Date("2026-02-16T18:00:00.000Z"), createdAt: new Date("2026-02-16T18:20:00.000Z") },
      { id: "demo-note-4", campaignId: "demo-campaign-2", authorId: "demo-dm", title: "Хроника экспедиции", notes: "Через перевал прошли за шесть дней. На четвёртый день пепел выпал против ветра. Обсерватория видна ночью, но на карте Серафины её башня смещается на милю к востоку.", isDmOnly: false, sessionDate: new Date("2026-01-28T18:00:00.000Z"), createdAt: new Date("2026-01-28T21:00:00.000Z") },
      { id: "demo-note-5", campaignId: "demo-campaign-2", authorId: "demo-dm", title: "Истинная природа пепла", notes: "Пепел хранит память дракона и показывает каждому путнику его несостоявшееся будущее. Не сообщать игрокам до проверки Магии СЛ 16.", isDmOnly: true, sessionDate: new Date("2026-01-29T18:00:00.000Z"), createdAt: new Date("2026-01-29T18:10:00.000Z") },
    ]).onConflictDoNothing();

    const grimCombatants: Combatant[] = [
      combatant({ id: "combat-liana", name: "Лиана Тенетень", kind: "character", sourceCharacterId: "demo-char-liana", initiative: 21, dexModifier: 4, hp: 31, maxHp: 38, ac: 15, color: "#D4AF37" }),
      combatant({ id: "combat-shade-1", name: "Тень под мостовой", kind: "monster", sourceCharacterId: null, initiative: 18, dexModifier: 3, hp: 44, maxHp: 68, ac: 15, conditions: ["poisoned"], color: "#8B0000" }),
      combatant({ id: "combat-torin", name: "Торин Громомолот", kind: "character", sourceCharacterId: "demo-char-torin", initiative: 12, dexModifier: 0, hp: 42, maxHp: 43, ac: 18, conditions: ["blessed"], color: "#6B8E9F" }),
      combatant({ id: "combat-watchman", name: "Стражник-марионетка", kind: "monster", sourceCharacterId: null, initiative: 9, dexModifier: 1, hp: 17, maxHp: 22, ac: 14, color: "#9A6B4F" }),
    ];
    const grimState: EncounterState = {
      name: "Мост Гримхольма", active: true, round: 2, activeId: "combat-liana", combatants: grimCombatants,
      log: [
        { id: "event-demo-3", text: "Раунд 2. Ход: Лиана Тенетень.", at: "2026-02-18T19:20:00.000Z" },
        { id: "event-demo-2", text: "Тень под мостовой получила 24 урона.", at: "2026-02-18T19:18:00.000Z" },
        { id: "event-demo-1", text: "Бой начался. Первый ход: Лиана Тенетень.", at: "2026-02-18T19:15:00.000Z" },
      ],
    };
    const ashState: EncounterState = {
      name: "Засада у обсерватории", active: false, round: 1, activeId: null,
      combatants: [
        combatant({ id: "combat-serafina", name: "Серафина Пепельная", kind: "character", sourceCharacterId: "demo-char-serafina", initiative: 16, dexModifier: 2, hp: 22, maxHp: 26, ac: 12, color: "#B58BD6" }),
        combatant({ id: "combat-ash-1", name: "Пепельный скакун", kind: "monster", sourceCharacterId: null, initiative: 14, dexModifier: 2, hp: 33, maxHp: 33, ac: 13, color: "#8B0000" }),
      ],
      log: [],
    };
    await tx.insert(encounters).values([
      { id: "demo-encounter-1", campaignId: "demo-campaign-1", state: grimState, createdAt: demoTime, updatedAt: new Date("2026-02-18T19:20:00.000Z") },
      { id: "demo-encounter-2", campaignId: "demo-campaign-2", state: ashState, createdAt: demoTime, updatedAt: demoTime },
    ]).onConflictDoNothing();

    const rollSeed = [
      { id: "demo-roll-1", campaignId: "demo-campaign-1", actorId: "demo-player", actorName: "Лиана", expression: "1d20+7", at: "2026-02-18T19:14:00.000Z" },
      { id: "demo-roll-2", campaignId: "demo-campaign-1", actorId: "demo-dm", actorName: "Эларион Вещий", expression: "2d6+3", at: "2026-02-18T19:17:00.000Z" },
      { id: "demo-roll-3", campaignId: "demo-campaign-1", actorId: "demo-player-2", actorName: "Торин", expression: "1d20+3", at: "2026-02-18T19:19:00.000Z" },
      { id: "demo-roll-4", campaignId: "demo-campaign-1", actorId: "demo-player", actorName: "Лиана", expression: "4d6kh3", at: "2026-02-18T19:21:00.000Z" },
      { id: "demo-roll-5", campaignId: "demo-campaign-2", actorId: "demo-player", actorName: "Серафина", expression: "1d20+6", at: "2026-01-28T20:30:00.000Z" },
      { id: "demo-roll-6", campaignId: "demo-campaign-2", actorId: "demo-dm", actorName: "Эларион Вещий", expression: "8d6", at: "2026-01-28T20:35:00.000Z" },
    ];
    await tx.insert(diceRolls).values(rollSeed.map((entry) => {
      const detail = rollExpression(entry.expression);
      return { id: entry.id, campaignId: entry.campaignId, actorId: entry.actorId, actorName: entry.actorName, expression: entry.expression, result: detail.total, detail, createdAt: new Date(entry.at) };
    })).onConflictDoNothing();
  });
}
