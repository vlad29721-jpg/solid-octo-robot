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
