import { CLASS_CATALOG } from "./catalog";
import { abilityModifier, defaultSpellSlots, proficiencyBonus } from "./calculations";
import { rollExpression } from "./dice";
import type { ClassResource, Coins, DeathSaves, InventoryItem, Spellbook, Stats } from "./types";

export const EMPTY_COINS: Coins = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
export const EMPTY_DEATH: DeathSaves = { successes: 0, failures: 0, stable: false, dead: false };
export const COIN_LABELS: Record<keyof Coins, string> = { pp: "ПМ", gp: "ЗМ", ep: "ЭМ", sp: "СМ", cp: "ММ" };

export function coinsOf(stats: Stats): Coins {
  return { ...EMPTY_COINS, ...(stats.coins ?? {}) };
}

export function coinsInGold(coins: Coins): number {
  return Math.round((coins.pp * 10 + coins.gp + coins.ep * 0.5 + coins.sp * 0.1 + coins.cp * 0.01) * 100) / 100;
}

export function defaultResources(classKey: string, level: number, stats: Stats): ClassResource[] {
  const cha = Math.max(1, abilityModifier(stats.abilities.cha));
  const make = (id: string, name: string, max: number, recharge: "short" | "long"): ClassResource => ({ id, name, max, current: max, recharge });
  switch (classKey) {
    case "barbarian": return [make("rage", "Ярость", level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2, "long")];
    case "bard": return [make("inspiration", "Вдохновение барда", cha, level >= 5 ? "short" : "long")];
    case "cleric": return [make("channel", "Божественный канал", level >= 18 ? 3 : level >= 6 ? 2 : 1, "short")];
    case "druid": return [make("wildshape", "Дикий облик", 2, "short")];
    case "fighter": return [make("second-wind", "Второе дыхание", 1, "short"), ...(level >= 2 ? [make("action-surge", "Всплеск действий", level >= 17 ? 2 : 1, "short")] : [])];
    case "monk": return level >= 2 ? [make("ki", "Очки ци", level, "short")] : [];
    case "paladin": return [make("lay-on-hands", "Наложение рук (HP)", level * 5, "long"), make("divine-sense", "Божественное чувство", 1 + cha, "long")];
    case "sorcerer": return level >= 2 ? [make("sorcery", "Очки чародейства", level, "long")] : [];
    case "warlock": return [];
    case "wizard": return [make("arcane-recovery", "Магическое восстановление", 1, "long")];
    case "ranger": return [make("favored-foe", "Избранный враг", proficiencyBonus(level), "long")];
    case "rogue": return level >= 20 ? [make("stroke-of-luck", "Удача", 1, "short")] : [];
    default: return [];
  }
}

export function hitDieAverage(classKey: string): number {
  const die = CLASS_CATALOG[classKey]?.hitDie ?? 8;
  return Math.floor(die / 2) + 1;
}

export function levelUp(input: { classKey: string; level: number; hpMax: number; hpCurrent: number; stats: Stats; spellbook: Spellbook }, mode: "average" | "roll") {
  if (input.level >= 20) throw new Error("Персонаж уже достиг 20 уровня.");
  const die = CLASS_CATALOG[input.classKey]?.hitDie ?? 8;
  const con = abilityModifier(input.stats.abilities.con);
  const rolled = mode === "roll" ? rollExpression(`1d${die}`).total : hitDieAverage(input.classKey);
  const gain = Math.max(1, rolled + con);
  const level = input.level + 1;
  const oldResources = input.stats.resources ?? [];
  const resources = defaultResources(input.classKey, level, input.stats).map((resource) => {
    const old = oldResources.find((entry) => entry.id === resource.id);
    return old ? { ...resource, current: Math.min(resource.max, old.current + Math.max(0, resource.max - old.max)) } : resource;
  });
  const keptCustom = oldResources.filter((entry) => !resources.some((resource) => resource.id === entry.id));
  return {
    level,
    hpMax: input.hpMax + gain,
    hpCurrent: input.hpCurrent + gain,
    stats: { ...input.stats, resources: [...resources, ...keptCustom] },
    spellbook: { ...input.spellbook, slots: defaultSpellSlots(input.classKey, level) },
    summary: {
      rolled, con, gain,
      proficiency: proficiencyBonus(level),
      proficiencyChanged: proficiencyBonus(level) !== proficiencyBonus(input.level),
      slots: defaultSpellSlots(input.classKey, level),
      asi: [4, 8, 12, 16, 19].includes(level),
    },
  };
}

export function rest(input: { classKey: string; level: number; hpMax: number; hpCurrent: number; stats: Stats; spellbook: Spellbook }, type: "short" | "long", hitDice: number) {
  const resources = (input.stats.resources ?? []).map((resource) =>
    type === "long" || resource.recharge === "short" ? { ...resource, current: resource.max } : resource);
  if (type === "long") {
    const used = input.stats.hitDiceUsed ?? 0;
    const recovered = Math.max(1, Math.floor(input.level / 2));
    return {
      hpCurrent: input.hpMax,
      stats: { ...input.stats, resources, hitDiceUsed: Math.max(0, used - recovered), deathSaves: EMPTY_DEATH },
      spellbook: { ...input.spellbook, used: {} },
      summary: { healed: input.hpMax - input.hpCurrent, rolls: [] as number[], recoveredHitDice: Math.min(used, recovered) },
    };
  }
  const available = Math.max(0, input.level - (input.stats.hitDiceUsed ?? 0));
  const spend = Math.max(0, Math.min(hitDice, available));
  const die = CLASS_CATALOG[input.classKey]?.hitDie ?? 8;
  const con = abilityModifier(input.stats.abilities.con);
  const rolls = Array.from({ length: spend }, () => Math.max(0, rollExpression(`1d${die}`).total + con));
  const healed = Math.min(input.hpMax - input.hpCurrent, rolls.reduce((sum, value) => sum + value, 0));
  const pact = CLASS_CATALOG[input.classKey]?.casterProgression === "pact";
  return {
    hpCurrent: input.hpCurrent + healed,
    stats: { ...input.stats, resources, hitDiceUsed: (input.stats.hitDiceUsed ?? 0) + spend },
    spellbook: pact ? { ...input.spellbook, used: {} } : input.spellbook,
    summary: { healed, rolls, recoveredHitDice: 0 },
  };
}

const FINESSE = /rapier|dagger|shortbow|bow|crossbow|sling|scimitar|whip|рапира|кинжал|лук|арбалет|праща/i;

export function weaponAttack(item: InventoryItem, stats: Stats, level: number) {
  const str = abilityModifier(stats.abilities.str);
  const dex = abilityModifier(stats.abilities.dex);
  const usesDex = FINESSE.test(`${item.id} ${item.name}`);
  const mod = usesDex ? Math.max(str, dex) : str;
  const toHit = mod + proficiencyBonus(level);
  const dice = item.damage?.match(/\d+d\d+/)?.[0] ?? "1d4";
  const type = item.damage?.replace(/\d+d\d+/, "").trim() ?? "";
  const damage = mod === 0 ? dice : mod > 0 ? `${dice}+${mod}` : `${dice}${mod}`;
  return { toHit, damage, type, ability: usesDex ? "ЛОВ" : "СИЛ" };
}

export function critDamage(expression: string): string {
  return expression.replace(/(\d*)d(\d+)/g, (_match, count: string, sides: string) => `${(Number(count || 1)) * 2}d${sides}`);
}

export function rollDeathSave(current: DeathSaves | undefined) {
  const state = { ...EMPTY_DEATH, ...(current ?? {}) };
  const roll = rollExpression("1d20").total;
  if (roll === 20) return { roll, revived: true, state: EMPTY_DEATH, text: "Естественная 20! Персонаж приходит в себя с 1 HP." };
  if (roll === 1) state.failures = Math.min(3, state.failures + 2);
  else if (roll >= 10) state.successes = Math.min(3, state.successes + 1);
  else state.failures = Math.min(3, state.failures + 1);
  state.dead = state.failures >= 3;
  state.stable = !state.dead && state.successes >= 3;
  const text = state.dead ? "Три провала. Персонаж погиб." : state.stable ? "Три успеха. Персонаж стабилизирован." : roll >= 10 ? "Успех спасброска от смерти." : roll === 1 ? "Естественная 1 — два провала!" : "Провал спасброска от смерти.";
  return { roll, revived: false, state, text };
}
