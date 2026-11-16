export type MonsterAttack = { name: string; toHit: number; damage: string; type?: string };
export type MonsterDef = {
  key: string;
  name: string;
  type: string;
  cr: string;
  xp: number;
  hp: number;
  hpDice: string;
  ac: number;
  dexMod: number;
  speed: string;
  attacks: MonsterAttack[];
  traits: string;
  resistances?: string[];
  vulnerabilities?: string[];
  immunities?: string[];
};

export const BESTIARY: MonsterDef[] = [
  { key: "rat", name: "Гигантская крыса", type: "Зверь", cr: "1/8", xp: 25, hp: 7, hpDice: "2d6", ac: 12, dexMod: 2, speed: "30 фт", attacks: [{ name: "Укус", toHit: 4, damage: "1d4+2", type: "колющий" }], traits: "Острый нюх, тактика стаи." },
  { key: "kobold", name: "Кобольд", type: "Гуманоид", cr: "1/8", xp: 25, hp: 5, hpDice: "2d6-2", ac: 12, dexMod: 2, speed: "30 фт", attacks: [{ name: "Кинжал", toHit: 4, damage: "1d4+2", type: "колющий" }, { name: "Праща", toHit: 4, damage: "1d4+2", type: "дробящий" }], traits: "Чувствительность к солнцу, тактика стаи." },
  { key: "goblin", name: "Гоблин", type: "Гуманоид", cr: "1/4", xp: 50, hp: 7, hpDice: "2d6", ac: 15, dexMod: 2, speed: "30 фт", attacks: [{ name: "Скимитар", toHit: 4, damage: "1d6+2", type: "рубящий" }, { name: "Короткий лук", toHit: 4, damage: "1d6+2", type: "колющий" }], traits: "Ловкий побег: Отход или Засада бонусным действием." },
  { key: "skeleton", name: "Скелет", type: "Нежить", cr: "1/4", xp: 50, hp: 13, hpDice: "2d8+4", ac: 13, dexMod: 2, speed: "30 фт", attacks: [{ name: "Короткий меч", toHit: 4, damage: "1d6+2", type: "колющий" }, { name: "Короткий лук", toHit: 4, damage: "1d6+2", type: "колющий" }], vulnerabilities: ["дробящий"], immunities: ["яд"], traits: "Уязвимость к дробящему урону, иммунитет к яду." },
  { key: "zombie", name: "Зомби", type: "Нежить", cr: "1/4", xp: 50, hp: 22, hpDice: "3d8+9", ac: 8, dexMod: -2, speed: "20 фт", attacks: [{ name: "Удар", toHit: 3, damage: "1d6+1", type: "дробящий" }], immunities: ["яд"], traits: "Стойкость нежити: при 0 HP спасбросок ТЕЛ." },
  { key: "wolf", name: "Волк", type: "Зверь", cr: "1/4", xp: 50, hp: 11, hpDice: "2d8+2", ac: 13, dexMod: 2, speed: "40 фт", attacks: [{ name: "Укус (сбивает с ног)", toHit: 4, damage: "2d4+2", type: "колющий" }], traits: "Тактика стаи, острый слух и нюх." },
  { key: "bandit", name: "Разбойник", type: "Гуманоид", cr: "1/8", xp: 25, hp: 11, hpDice: "2d8+2", ac: 12, dexMod: 1, speed: "30 фт", attacks: [{ name: "Скимитар", toHit: 3, damage: "1d6+1", type: "рубящий" }, { name: "Лёгкий арбалет", toHit: 3, damage: "1d8+1", type: "колющий" }], traits: "Нападает группой из засады." },
  { key: "orc", name: "Орк", type: "Гуманоид", cr: "1/2", xp: 100, hp: 15, hpDice: "2d8+6", ac: 13, dexMod: 1, speed: "30 фт", attacks: [{ name: "Секира", toHit: 5, damage: "1d12+3", type: "рубящий" }, { name: "Метательное копьё", toHit: 5, damage: "1d6+3", type: "колющий" }], traits: "Агрессия: бонусным действием движется к врагу." },
  { key: "shadow", name: "Тень", type: "Нежить", cr: "1/2", xp: 100, hp: 16, hpDice: "3d8+3", ac: 12, dexMod: 2, speed: "40 фт", attacks: [{ name: "Вытягивание силы", toHit: 4, damage: "2d6+2", type: "некротический" }], resistances: ["кислота", "огонь", "холод", "молния", "звук"], vulnerabilities: ["излучение"], immunities: ["некротический", "яд"], traits: "Аморфность, скрытность в тени, уязвимость к излучению." },
  { key: "gnoll", name: "Гнолл", type: "Гуманоид", cr: "1/2", xp: 100, hp: 22, hpDice: "5d8", ac: 15, dexMod: 1, speed: "30 фт", attacks: [{ name: "Копьё", toHit: 4, damage: "1d8+2", type: "колющий" }, { name: "Длинный лук", toHit: 3, damage: "1d8+1", type: "колющий" }], traits: "Буйство: после убийства — дополнительная атака укусом." },
  { key: "bugbear", name: "Багбир", type: "Гуманоид", cr: "1", xp: 200, hp: 27, hpDice: "5d8+5", ac: 16, dexMod: 2, speed: "30 фт", attacks: [{ name: "Моргенштерн", toHit: 4, damage: "2d8+2", type: "колющий" }], traits: "Внезапная атака: +2d6 урона по застигнутым врасплох." },
  { key: "ghoul", name: "Гуль", type: "Нежить", cr: "1", xp: 200, hp: 22, hpDice: "5d8", ac: 12, dexMod: 2, speed: "30 фт", attacks: [{ name: "Когти (паралич, СЛ 10)", toHit: 4, damage: "2d4+2", type: "рубящий" }, { name: "Укус", toHit: 2, damage: "2d6+2", type: "колющий" }], immunities: ["яд"], traits: "Когти парализуют не-эльфов на 1 минуту." },
  { key: "ogre", name: "Огр", type: "Великан", cr: "2", xp: 450, hp: 59, hpDice: "7d10+21", ac: 11, dexMod: -1, speed: "40 фт", attacks: [{ name: "Палица", toHit: 6, damage: "2d8+4", type: "дробящий" }, { name: "Метательное копьё", toHit: 6, damage: "2d6+4", type: "колющий" }], traits: "Огромный и глупый, но сокрушительный." },
  { key: "wight", name: "Умертвие", type: "Нежить", cr: "3", xp: 700, hp: 45, hpDice: "6d8+18", ac: 14, dexMod: 1, speed: "30 фт", attacks: [{ name: "Длинный меч", toHit: 4, damage: "1d8+2", type: "рубящий" }, { name: "Вытягивание жизни", toHit: 4, damage: "1d6+2", type: "некротический" }], resistances: ["некротический", "рубящий", "колющий", "дробящий"], immunities: ["яд"], traits: "Мультиатака, сопротивление несеребряному оружию." },
  { key: "owlbear", name: "Совомедведь", type: "Чудовище", cr: "3", xp: 700, hp: 59, hpDice: "7d10+21", ac: 13, dexMod: 1, speed: "40 фт", attacks: [{ name: "Клюв", toHit: 7, damage: "1d10+5", type: "колющий" }, { name: "Когти", toHit: 7, damage: "2d8+5", type: "рубящий" }], traits: "Мультиатака: клюв и когти." },
  { key: "troll", name: "Тролль", type: "Великан", cr: "5", xp: 1800, hp: 84, hpDice: "8d10+40", ac: 15, dexMod: 1, speed: "30 фт", attacks: [{ name: "Укус", toHit: 7, damage: "1d6+4", type: "колющий" }, { name: "Когти", toHit: 7, damage: "2d6+4", type: "рубящий" }], vulnerabilities: ["огонь", "кислота"], traits: "Регенерация 10 HP, если не получил урон огнём или кислотой." },
  { key: "young-dragon", name: "Молодой красный дракон", type: "Дракон", cr: "10", xp: 5900, hp: 178, hpDice: "17d10+85", ac: 18, dexMod: 0, speed: "40 фт, полёт 80 фт", attacks: [{ name: "Укус", toHit: 10, damage: "2d10+6", type: "колющий" }, { name: "Когти", toHit: 10, damage: "2d6+6", type: "рубящий" }, { name: "Огненное дыхание (СЛ 17 ЛОВ)", toHit: 0, damage: "16d6", type: "огонь" }], immunities: ["огонь"], traits: "Дыхание перезаряжается на 5–6, иммунитет к огню." },
];

const THRESHOLDS: Record<number, [number, number, number, number]> = {
  1: [25, 50, 75, 100], 2: [50, 100, 150, 200], 3: [75, 150, 225, 400], 4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100], 6: [300, 600, 900, 1400], 7: [350, 750, 1100, 1700], 8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400], 10: [600, 1200, 1900, 2800], 11: [800, 1600, 2400, 3600], 12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100], 14: [1250, 2500, 3800, 5700], 15: [1400, 2800, 4300, 6400], 16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800], 18: [2100, 4200, 6300, 9500], 19: [2400, 4900, 7300, 10900], 20: [2800, 5700, 8500, 12700],
};

function multiplier(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 1.5;
  if (count <= 6) return 2;
  if (count <= 10) return 2.5;
  if (count <= 14) return 3;
  return 4;
}

export type Difficulty = "trivial" | "easy" | "medium" | "hard" | "deadly";
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  trivial: "Пустяк", easy: "Лёгкий", medium: "Средний", hard: "Сложный", deadly: "Смертельный",
};

export function encounterDifficulty(partyLevels: number[], monsterXp: number[]) {
  const thresholds = partyLevels.reduce<[number, number, number, number]>((sum, level) => {
    const row = THRESHOLDS[Math.max(1, Math.min(20, level))];
    return [sum[0] + row[0], sum[1] + row[1], sum[2] + row[2], sum[3] + row[3]];
  }, [0, 0, 0, 0]);
  const baseXp = monsterXp.reduce((sum, value) => sum + value, 0);
  const adjustedXp = Math.round(baseXp * multiplier(monsterXp.length));
  let level: Difficulty = "trivial";
  if (partyLevels.length && adjustedXp >= thresholds[3]) level = "deadly";
  else if (partyLevels.length && adjustedXp >= thresholds[2]) level = "hard";
  else if (partyLevels.length && adjustedXp >= thresholds[1]) level = "medium";
  else if (partyLevels.length && adjustedXp >= thresholds[0]) level = "easy";
  return { level, baseXp, adjustedXp, thresholds, perPlayerXp: partyLevels.length ? Math.floor(baseXp / partyLevels.length) : 0 };
}
