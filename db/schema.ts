import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type { CharacterCondition, DiceRollDetail, EncounterState, InventoryItem, MapState, ProfilePrefs, Role, SceneState, Spellbook, Stats, WorldState } from "@/lib/dnd/types";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  role: text("role").$type<Role>().notNull().default("player"),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  passwordHash: text("password_hash"),
  telegramChatId: text("telegram_chat_id"),
  prefs: jsonb("prefs").$type<ProfilePrefs>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  dmId: text("dm_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  inviteCode: text("invite_code").notNull().unique(),
  status: text("status").$type<"active" | "paused" | "archived">().notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campaignMembers = pgTable("campaign_members", {
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.campaignId, table.userId] })]);

export const characters = pgTable("characters", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  classKey: text("class_key").notNull(),
  species: text("species").notNull(),
  level: integer("level").notNull().default(1),
  hpCurrent: integer("hp_current").notNull().default(1),
  hpMax: integer("hp_max").notNull().default(1),
  armorClass: integer("armor_class").notNull().default(10),
  stats: jsonb("stats").$type<Stats>().notNull(),
  inventory: jsonb("inventory").$type<InventoryItem[]>().notNull(),
  spells: jsonb("spells").$type<Spellbook>().notNull(),
  conditions: jsonb("conditions").$type<CharacterCondition[]>().notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("characters_campaign_idx").on(table.campaignId)]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes").notNull(),
  isDmOnly: boolean("is_dm_only").notNull().default(false),
  sessionDate: timestamp("session_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("sessions_campaign_idx").on(table.campaignId)]);

export const encounters = pgTable("encounters", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  state: jsonb("state").$type<EncounterState>().notNull(),
  history: jsonb("history").$type<EncounterState[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("encounters_campaign_idx").on(table.campaignId)]);

export const diceRolls = pgTable("dice_rolls", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  expression: text("expression").notNull(),
  result: integer("result").notNull(),
  detail: jsonb("detail").$type<DiceRollDetail>().notNull(),
  hidden: boolean("hidden"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("dice_rolls_campaign_idx").on(table.campaignId)]);

export const authSessions = pgTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const boards = pgTable("boards", {
  campaignId: text("campaign_id").primaryKey().references(() => campaigns.id, { onDelete: "cascade" }),
  map: jsonb("map").$type<MapState>().notNull(),
  scene: jsonb("scene").$type<SceneState>().notNull(),
  world: jsonb("world").$type<WorldState>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  recipientId: text("recipient_id"),
  kind: text("kind").$type<"chat" | "whisper" | "secret" | "system" | "roll">().notNull(),
  body: text("body").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  reactions: jsonb("reactions").$type<Record<string, string[]>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("messages_campaign_idx").on(table.campaignId)]);

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});
