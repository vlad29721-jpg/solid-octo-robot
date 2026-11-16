import { ABILITY_KEYS, CLASS_CATALOG, CONDITION_CATALOG, SKILL_DEFS } from "./catalog";
import type {
  AbilityKey,
  ConditionKey,
  InventoryItem,
  SkillKey,
  Spellbook,
  Stats,
} from "./types";

const FULL_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

export function abilityModifier(score: number): number {
  return Math.floor((Number.isFinite(score) ? score - 10 : 0) / 2);
}

export function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function proficiencyBonus(level: number): number {
  return Math.min(6, 2 + Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4));
}

export function skillModifier(stats: Stats, skill: SkillKey, level: number) {
  const ability = SKILL_DEFS[skill].ability;
  const base = abilityModifier(stats.abilities[ability]);
  const expertise = stats.expertiseSkills.includes(skill);
  const proficient = expertise || stats.proficientSkills.includes(skill);
  const prof = proficient ? proficiencyBonus(level) * (expertise ? 2 : 1) : 0;
  return { total: base + prof, base, prof, proficient, expertise, ability };
}

export function savingThrow(stats: Stats, ability: AbilityKey, level: number) {
  const base = abilityModifier(stats.abilities[ability]);
  const proficient = stats.savingThrowProficiencies.includes(ability);
  const prof = proficient ? proficiencyBonus(level) : 0;
  return { total: base + prof, base, prof, proficient };
}

export function passivePerception(stats: Stats, level: number, conditions: ConditionKey[] = []) {
  const perception = skillModifier(stats, "perception", level).total;
  const shift = conditions.reduce((sum, key) => sum + (CONDITION_CATALOG[key]?.perceptionShift ?? 0), 0);
  const bounded = Math.max(-5, Math.min(5, shift));
  return { value: 10 + perception + bounded, base: 10 + perception, shift: bounded };
}

export function initiativeModifier(stats: Stats, conditions: ConditionKey[] = []): number {
  const stunned = conditions.some((key) => ["stunned", "paralyzed", "unconscious", "petrified"].includes(key));
  return abilityModifier(stats.abilities.dex) + (stats.initiativeBonus ?? 0) + (stunned ? -5 : 0);
}

export function inventoryWeight(items: InventoryItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(0, item.weight) * Math.max(1, item.quantity), 0);
}

export function encumbrance(stats: Stats, items: InventoryItem[]) {
  const weight = inventoryWeight(items);
  const capacity = Math.max(1, stats.abilities.str) * 15;
  const variantHeavy = Math.max(1, stats.abilities.str) * 10;
  const variantLight = Math.max(1, stats.abilities.str) * 5;
  const tier = weight > variantHeavy ? "heavy" : weight > variantLight ? "light" : "none";
  return {
    weight: Math.round(weight * 10) / 10,
    capacity,
    percent: Math.min(100, Math.round((weight / capacity) * 100)),
    tier: tier as "none" | "light" | "heavy",
    speedPenalty: tier === "heavy" ? -20 : tier === "light" ? -10 : 0,
  };
}

export function armorClass(stats: Stats, items: InventoryItem[], fallback = 10) {
  const dex = abilityModifier(stats.abilities.dex);
  const worn = items.filter((item) => item.equipped && item.armor && item.armor.type !== "shield");
  const shield = items.find((item) => item.equipped && item.armor?.type === "shield");
  let base = fallback;
  let dexBonus = 0;
  let armorName = "Без доспеха";
  if (worn.length) {
    const armor = [...worn].sort((a, b) => (b.armor?.base ?? 0) - (a.armor?.base ?? 0))[0];
    armorName = armor.name;
    base = armor.armor?.base ?? fallback;
    if (armor.armor?.type !== "heavy") {
      dexBonus = armor.armor?.maxDex === undefined ? dex : Math.min(dex, armor.armor.maxDex);
    }
  } else {
    base = 10 + dex;
    dexBonus = 0;
  }
  const haste = 0;
  return { value: base + dexBonus + (shield ? 2 : 0) + haste, base, dexBonus, shield: shield ? 2 : 0, armorName };
}

export function defaultSpellSlots(classKey: string, level: number): Record<string, number> {
  const definition = CLASS_CATALOG[classKey];
  if (!definition || definition.casterProgression === "none") return {};
  const safeLevel = Math.max(1, Math.min(20, level));
  if (definition.casterProgression === "pact") {
    const count = safeLevel >= 17 ? 4 : safeLevel >= 11 ? 3 : safeLevel >= 5 ? 2 : 1;
    const slotLevel = Math.min(5, 1 + Math.floor((safeLevel - 1) / 4));
    return { [String(slotLevel)]: count };
  }
  const casterLevel = definition.casterProgression === "half" ? Math.floor(safeLevel / 2) : definition.casterProgression === "third" ? Math.floor(safeLevel / 3) : safeLevel;
  const slots = FULL_CASTER_SLOTS[Math.max(0, Math.min(20, casterLevel))] ?? [];
  return Object.fromEntries(
    slots
      .map((count, index): [string, number] => [String(index + 1), count])
      .filter(([, count]) => count > 0),
  );
}

export function defaultSpellbook(classKey: string, level: number): Spellbook {
  return { slots: defaultSpellSlots(classKey, level), used: {}, list: [] };
}

export function conditionEffects(conditions: ConditionKey[]) {
  const definitions = conditions.map((key) => CONDITION_CATALOG[key]).filter(Boolean);
  return {
    autoFailSaves: Array.from(new Set(definitions.flatMap((item) => item.autoFailSaves ?? []))),
    disadvantageAttacks: definitions.some((item) => item.disadvantageAttacks),
    disadvantageAbilityChecks: definitions.some((item) => item.disadvantageAbilityChecks),
    speedMultiplier: definitions.reduce((value, item) => value * (item.speedMultiplier ?? 1), 1),
    notes: Array.from(new Set(definitions.flatMap((item) => item.effects))),
  };
}

export function defaultStats(classKey: string): Stats {
  const definition = CLASS_CATALOG[classKey];
  return {
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficientSkills: definition?.suggestedSkills.filter((skill) => skill in SKILL_DEFS).slice(0, 2) ?? [],
    expertiseSkills: [],
    savingThrowProficiencies: definition?.saveProficiencies ?? [],
    initiativeBonus: 0,
    spellcastingAbility: definition?.spellcastingAbility ?? null,
  };
}

export const ABILITY_ORDER = ABILITY_KEYS;
