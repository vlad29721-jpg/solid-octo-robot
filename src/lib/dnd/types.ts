export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type Role = "dm" | "player";

export type AbilityScores = Record<AbilityKey, number>;

export type SkillKey =
  | "acrobatics"
  | "animalHandling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "persuasion"
  | "religion"
  | "sleightOfHand"
  | "stealth"
  | "survival";

export type ConditionKey =
  | "blinded"
  | "charmed"
  | "deafened"
  | "frightened"
  | "grappled"
  | "incapacitated"
  | "invisible"
  | "paralyzed"
  | "petrified"
  | "poisoned"
  | "prone"
  | "restrained"
  | "stunned"
  | "unconscious"
  | "exhaustion"
  | "concentration"
  | "blessed"
  | "hasted";

export type Stats = {
  abilities: AbilityScores;
  proficientSkills: SkillKey[];
  expertiseSkills: SkillKey[];
  savingThrowProficiencies: AbilityKey[];
  initiativeBonus: number;
  spellcastingAbility: AbilityKey | null;
  coins?: Coins;
  resources?: ClassResource[];
  deathSaves?: DeathSaves;
  hitDiceUsed?: number;
  xp?: number;
  inspiration?: boolean;
  personality?: Personality;
  subclass?: string;
  feats?: string[];
  companions?: Companion[];
  race?: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: "weapon" | "armor" | "shield" | "gear" | "consumable" | "treasure";
  quantity: number;
  weight: number;
  costGp: number;
  description: string;
  equipped: boolean;
  damage?: string;
  armor?: {
    base: number;
    type: "light" | "medium" | "heavy" | "shield";
    maxDex?: number;
  };
  rarity?: "common" | "uncommon" | "rare" | "very rare" | "legendary";
  magic?: boolean;
  requiresAttunement?: boolean;
  attuned?: boolean;
  charges?: { current: number; max: number };
};

export type Spell = {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  description: string;
  prepared: boolean;
};

export type Spellbook = {
  slots: Record<string, number>;
  used: Record<string, number>;
  list: Spell[];
};

export type CharacterCondition = {
  id: ConditionKey;
  name: string;
  appliedAt: string;
};

export type Combatant = {
  id: string;
  name: string;
  kind: "character" | "monster";
  sourceCharacterId: string | null;
  initiative: number;
  dexModifier: number;
  hp: number;
  maxHp: number;
  ac: number;
  conditions: ConditionKey[];
  color: string;
  effects?: TimedEffect[];
  xp?: number;
  cr?: string;
  monsterKey?: string | null;
  resistances?: string[];
  vulnerabilities?: string[];
  immunities?: string[];
};

export type EncounterEvent = {
  id: string;
  text: string;
  at: string;
};

export type EncounterState = {
  name: string;
  active: boolean;
  round: number;
  activeId: string | null;
  combatants: Combatant[];
  log: EncounterEvent[];
};

export type DicePart = {
  expression: string;
  sign: 1 | -1;
  sides: number;
  rolls: number[];
  kept: number[];
  dropped: number[];
  subtotal: number;
};

export type DiceRollDetail = {
  expression: string;
  total: number;
  parts: DicePart[];
  flatModifier: number;
  breakdown: string;
  critical: boolean;
  fumble: boolean;
};

export type Coins = { pp: number; gp: number; ep: number; sp: number; cp: number };

export type ClassResource = {
  id: string;
  name: string;
  max: number;
  current: number;
  recharge: "short" | "long";
};

export type DeathSaves = { successes: number; failures: number; stable: boolean; dead: boolean };

export type TimedEffect = { id: string; name: string; rounds: number };

export type MapToken = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  size: number;
  kind: "character" | "monster" | "npc";
  characterId: string | null;
  combatantId: string | null;
  hidden: boolean;
  light?: number;
  darkvision?: number;
};

export type MapTemplate = { id: string; x: number; y: number; radiusFeet: number; color: string; label: string; shape?: "circle" | "cone" | "line"; angle?: number };
export type MapWall = { id: string; x1: number; y1: number; x2: number; y2: number; door: boolean; open: boolean };
export type MapDrawing = { id: string; points: number[]; color: string; kind: "free" | "arrow" | "text"; text?: string; by?: string };

export type MapState = {
  imageUrl: string | null;
  cols: number;
  rows: number;
  feetPerCell: number;
  fogEnabled: boolean;
  revealed: string[];
  tokens: MapToken[];
  templates: MapTemplate[];
  name?: string;
  walls?: MapWall[];
  drawings?: MapDrawing[];
  lighting?: boolean;
};

export type SoundEffect = "thunder" | "scream" | "swords" | "door" | "magic" | "drum" | "bell" | "growl";
export type Weather = "clear" | "rain" | "storm" | "snow" | "fog";
export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export type GroupSaveResult = { characterId: string; name: string; roll: number; total: number; success: boolean };

export type SceneState = {
  handout: { id: string; title: string; imageUrl: string | null; text: string; shownAt: string } | null;
  sound: { id: string; effect: SoundEffect; at: string } | null;
  weather: Weather;
  timeOfDay: TimeOfDay;
  groupSave: { id: string; ability: AbilityKey; dc: number; label: string; createdAt: string; results: GroupSaveResult[] } | null;
  checks?: SkillCheck[];
  concentration?: ConcentrationCheck[];
  music?: MusicState | null;
  ping?: Ping | null;
};

export type Quest = { id: string; title: string; description: string; status: "active" | "done" | "failed"; reward: string; hidden: boolean };
export type NpcEntry = { id: string; name: string; role: string; description: string; attitude: "friendly" | "neutral" | "hostile"; relations: string; secret: string; portraitUrl: string | null; hidden: boolean };
export type LocationEntry = { id: string; name: string; description: string; visited: boolean; hidden: boolean; x: number | null; y: number | null };

export type WorldState = {
  quests: Quest[];
  npcs: NpcEntry[];
  locations: LocationEntry[];
  worldMapUrl: string | null;
  nextSession: { at: string; note: string; reminded?: boolean } | null;
  shops?: Shop[];
  chest?: PartyChest;
  polls?: DatePoll[];
  attendance?: AttendanceEntry[];
  maps?: SavedMap[];
};

export type Personality = { background: string; traits: string; ideals: string; bonds: string; flaws: string; backstory: string };
export type Companion = { id: string; name: string; kind: string; hp: number; maxHp: number; ac: number; attack: string; notes: string };
export type CheckKind = "skill" | "ability" | "save";
export type SkillCheck = {
  id: string; characterId: string; characterName: string; ownerId: string; kind: CheckKind; key: string; label: string;
  dc: number; secret: boolean; createdAt: string; result: { roll: number; total: number; success: boolean } | null;
};
export type ConcentrationCheck = { id: string; characterId: string; characterName: string; ownerId: string; dc: number; damage: number; createdAt: string };
export type MusicTrack = "tavern" | "battle" | "dungeon" | "forest" | "mystery" | "custom";
export type MusicState = { track: MusicTrack; customUrl: string | null; playing: boolean; volume: number; startedAt: string };
export type Ping = { id: string; x: number; y: number; by: string; at: string; color: string };
export type SavedMap = { id: string; name: string; state: MapState };
export type ShopItem = { id: string; item: InventoryItem; price: number; stock: number };
export type Shop = { id: string; name: string; open: boolean; sellRate: number; items: ShopItem[] };
export type PartyChest = { items: InventoryItem[]; gold: number };
export type DatePoll = { id: string; title: string; closed: boolean; options: { id: string; at: string; votes: string[] }[] };
export type AttendanceEntry = { id: string; date: string; title: string; present: string[] };
export type ProfilePrefs = { diceColor?: string; diceMaterial?: "gold" | "obsidian" | "crystal" | "blood" | "bone" };
