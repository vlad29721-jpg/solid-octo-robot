import type {
  MapState,
  SceneState,
  WorldState,
  CharacterCondition,
  DiceRollDetail,
  EncounterState,
  InventoryItem,
  Role,
  Spellbook,
  Stats,
} from "./dnd/types";

export type ProfileDto = {
  id: string;
  displayName: string;
  role: Role;
  avatarUrl: string | null;
  email: string | null;
  createdAt: string;
  prefs: import("./dnd/types").ProfilePrefs | null;
};

export type CampaignDto = {
  id: string;
  dmId: string;
  title: string;
  description: string;
  inviteCode: string;
  status: "active" | "paused" | "archived";
  createdAt: string;
};

export type CharacterDto = {
  id: string;
  campaignId: string;
  ownerId: string;
  name: string;
  classKey: string;
  species: string;
  level: number;
  hpCurrent: number;
  hpMax: number;
  armorClass: number;
  stats: Stats;
  inventory: InventoryItem[];
  spellbook: Spellbook;
  conditions: CharacterCondition[];
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SessionDto = {
  id: string;
  campaignId: string;
  authorId: string;
  title: string;
  notes: string;
  isDmOnly: boolean;
  sessionDate: string;
  createdAt: string;
};

export type EncounterDto = {
  id: string;
  campaignId: string;
  state: EncounterState;
  createdAt: string;
  updatedAt: string;
};

export type DiceRollDto = {
  id: string;
  campaignId: string;
  actorId: string;
  actorName: string;
  expression: string;
  result: number;
  detail: DiceRollDetail;
  createdAt: string;
};

export type MemberDto = {
  userId: string;
  campaignId: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
};

export type Capabilities = {
  supabaseAuth: boolean;
  supabaseRealtime: boolean;
  deepseek: boolean;
  telegram: boolean;
  email: boolean;
};

export type BoardDto = { campaignId: string; map: MapState; scene: SceneState; world: WorldState; updatedAt: string };

export type MessageDto = {
  id: string;
  campaignId: string;
  authorId: string;
  authorName: string;
  recipientId: string | null;
  kind: "chat" | "whisper" | "secret" | "system" | "roll";
  body: string;
  data: Record<string, unknown>;
  reactions: Record<string, string[]>;
  createdAt: string;
};

export type HubSnapshot = {
  board: BoardDto | null;
  messages: MessageDto[];
  authMode: "demo" | "account" | "supabase";
  canUndo: boolean;
  telegramLinked: boolean;
  actor: ProfileDto;
  profiles: ProfileDto[];
  campaigns: CampaignDto[];
  campaign: CampaignDto | null;
  members: MemberDto[];
  characters: CharacterDto[];
  sessions: SessionDto[];
  encounter: EncounterDto | null;
  rolls: DiceRollDto[];
  capabilities: Capabilities;
  serverTime: string;
};
