import type { Combatant, EncounterState } from "./types";

export function sortCombatants(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) =>
    b.initiative - a.initiative || b.dexModifier - a.dexModifier || a.name.localeCompare(b.name, "ru"),
  );
}

export function createEncounterState(name = "Новое столкновение"): EncounterState {
  return { name, active: false, round: 1, activeId: null, combatants: [], log: [] };
}

export function withEvent(state: EncounterState, text: string): EncounterState {
  return {
    ...state,
    log: [
      { id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, at: new Date().toISOString() },
      ...state.log,
    ].slice(0, 30),
  };
}

export function startCombat(state: EncounterState): EncounterState {
  const ordered = sortCombatants(state.combatants);
  if (!ordered.length) return withEvent(state, "Невозможно начать бой: нет участников.");
  return withEvent({ ...state, combatants: ordered, active: true, round: 1, activeId: ordered[0].id }, `Бой начался. Первый ход: ${ordered[0].name}.`);
}

export function nextTurn(state: EncounterState): EncounterState {
  const ordered = sortCombatants(state.combatants);
  if (!ordered.length) return state;
  const currentIndex = ordered.findIndex((item) => item.id === state.activeId);
  if (!state.active || currentIndex < 0) return startCombat(state);
  const wraps = currentIndex >= ordered.length - 1;
  const next = ordered[wraps ? 0 : currentIndex + 1];
  let combatants = ordered;
  const expired: string[] = [];
  if (wraps) {
    combatants = ordered.map((item) => {
      const effects = (item.effects ?? []).map((effect) => ({ ...effect, rounds: effect.rounds - 1 }));
      effects.filter((effect) => effect.rounds <= 0).forEach((effect) => expired.push(`${effect.name} (${item.name})`));
      return { ...item, effects: effects.filter((effect) => effect.rounds > 0) };
    });
  }
  let result = withEvent(
    { ...state, combatants, active: true, activeId: next.id, round: state.round + (wraps ? 1 : 0) },
    wraps ? `Раунд ${state.round + 1}. Ход: ${next.name}.` : `Ход: ${next.name}.`,
  );
  if (expired.length) result = withEvent(result, `Эффекты закончились: ${expired.join(", ")}.`);
  return result;
}

export function previousTurn(state: EncounterState): EncounterState {
  const ordered = sortCombatants(state.combatants);
  if (!ordered.length) return state;
  const currentIndex = ordered.findIndex((item) => item.id === state.activeId);
  const index = currentIndex <= 0 ? ordered.length - 1 : currentIndex - 1;
  return withEvent({ ...state, combatants: ordered, active: true, activeId: ordered[index].id, round: Math.max(1, state.round - (currentIndex <= 0 ? 1 : 0)) }, `Возврат хода: ${ordered[index].name}.`);
}

export function endCombat(state: EncounterState): EncounterState {
  return withEvent({ ...state, active: false, activeId: null }, "Бой завершён.");
}

export function applyCombatantDamage(state: EncounterState, combatantId: string, delta: number): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((item) => {
      if (item.id !== combatantId) return item;
      const hp = Math.max(0, Math.min(item.maxHp, item.hp - delta));
      const conditions = [...new Set(item.conditions)];
      if (hp === 0 && !conditions.includes("unconscious")) conditions.push("unconscious");
      if (hp > 0) return { ...item, hp, conditions: conditions.filter((key) => key !== "unconscious") };
      return { ...item, hp, conditions };
    }),
  };
}
