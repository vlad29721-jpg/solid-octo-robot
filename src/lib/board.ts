import type { MapState, SceneState, WorldState } from "./dnd/types";

export function defaultMap(demo = false): MapState {
  if (!demo) return { imageUrl: null, cols: 24, rows: 16, feetPerCell: 5, fogEnabled: false, revealed: [], tokens: [], templates: [] };
  const revealed: string[] = [];
  for (let x = 0; x < 12; x += 1) for (let y = 4; y < 12; y += 1) revealed.push(`${x}:${y}`);
  return {
    imageUrl: "/images/demo-battlemap.jpg", cols: 24, rows: 16, feetPerCell: 5, fogEnabled: true, revealed,
    tokens: [
      { id: "token-liana", name: "Лиана Тенетень", x: 4, y: 7, color: "#D4AF37", size: 1, kind: "character", characterId: "demo-char-liana", combatantId: "combat-liana", hidden: false },
      { id: "token-torin", name: "Торин Громомолот", x: 3, y: 9, color: "#6B8E9F", size: 1, kind: "character", characterId: "demo-char-torin", combatantId: "combat-torin", hidden: false },
      { id: "token-shade", name: "Тень под мостовой", x: 9, y: 8, color: "#8B0000", size: 2, kind: "monster", characterId: null, combatantId: "combat-shade-1", hidden: false },
      { id: "token-watch", name: "Стражник-марионетка", x: 16, y: 6, color: "#9A6B4F", size: 1, kind: "monster", characterId: null, combatantId: "combat-watchman", hidden: false },
    ],
    templates: [],
  };
}

export function defaultScene(): SceneState {
  return { handout: null, sound: null, weather: "clear", timeOfDay: "day", groupSave: null };
}

export function defaultWorld(demo = false): WorldState {
  if (!demo) return { quests: [], npcs: [], locations: [], worldMapUrl: null, nextSession: null };
  return {
    worldMapUrl: "/images/world-map.jpg",
    nextSession: { at: new Date(Date.now() + 5 * 86400000).toISOString(), note: "Сессия 5: Часовщик с улицы Пепла" },
    quests: [
      { id: "q1", title: "Пропавший картограф", description: "Найти мастера Ольдена, исчезнувшего у моста Гримхольма.", status: "active", reward: "200 зм и карта катакомб", hidden: false },
      { id: "q2", title: "Колокол без языка", description: "Выяснить, почему колокол собора звонит без звонаря.", status: "active", reward: "Благосклонность церкви", hidden: false },
      { id: "q3", title: "Долг Аррена", description: "Стражник защищает дочь-проводника договора.", status: "active", reward: "Союзник в страже", hidden: true },
      { id: "q4", title: "Крысы в погребе", description: "Очистить погреб таверны «Ржавый якорь».", status: "done", reward: "Бесплатный постой", hidden: false },
    ],
    npcs: [
      { id: "n1", name: "Аррен Скол", role: "Капитан стражи", description: "Седой, усталый, слишком часто смотрит на мост.", attitude: "neutral", relations: "Отец Мирры; должник гильдии часовщиков", secret: "Скрывает, что дочь — проводник Тени.", portraitUrl: null, hidden: false },
      { id: "n2", name: "Мирра", role: "Дочь капитана", description: "Тихая девушка с серебряной нитью на запястье.", attitude: "friendly", relations: "Дочь Аррена", secret: "Слышит голос под мостовой.", portraitUrl: null, hidden: true },
      { id: "n3", name: "Мастер Ольден", role: "Картограф", description: "Пропал три дня назад, оставив недорисованную карту.", attitude: "friendly", relations: "Наниматель партии", secret: "Спрятался в катакомбах добровольно.", portraitUrl: null, hidden: false },
      { id: "n4", name: "Вейра Пепел", role: "Глава гильдии часовщиков", description: "Улыбается, не показывая зубов.", attitude: "hostile", relations: "Кредитор Аррена", secret: "Хочет снять печать колокола.", portraitUrl: null, hidden: false },
    ],
    locations: [
      { id: "l1", name: "Гримхольм", description: "Город гаснущих фонарей.", visited: true, hidden: false, x: 42, y: 48 },
      { id: "l2", name: "Мост Гримхольма", description: "Здесь погасли все фонари разом.", visited: true, hidden: false, x: 47, y: 55 },
      { id: "l3", name: "Собор Тихого Колокола", description: "Колокол звонит в полночь без звонаря.", visited: false, hidden: false, x: 36, y: 38 },
      { id: "l4", name: "Катакомбы", description: "Лабиринт под городом.", visited: false, hidden: true, x: 52, y: 66 },
    ],
  };
}

export function filterBoardForPlayer(map: MapState, world: WorldState, ownCharacterIds: string[]) {
  const revealed = new Set(map.revealed);
  const tokens = map.tokens.filter((token) => {
    if (token.characterId && ownCharacterIds.includes(token.characterId)) return true;
    if (token.hidden) return false;
    if (!map.fogEnabled) return true;
    return revealed.has(`${Math.floor(token.x)}:${Math.floor(token.y)}`);
  });
  return {
    map: { ...map, tokens },
    world: {
      ...world,
      quests: world.quests.filter((quest) => !quest.hidden),
      npcs: world.npcs.filter((npc) => !npc.hidden).map((npc) => ({ ...npc, secret: "" })),
      locations: world.locations.filter((location) => !location.hidden),
      maps: [],
      shops: (world.shops ?? []).filter((shop) => shop.open),
    },
  };
}
