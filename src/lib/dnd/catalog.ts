import type {
  AbilityKey,
  ConditionKey,
  InventoryItem,
  SkillKey,
  Spell,
} from "./types";

export const ABILITY_LABELS: Record<AbilityKey, { short: string; long: string }> = {
  str: { short: "СИЛ", long: "Сила" },
  dex: { short: "ЛОВ", long: "Ловкость" },
  con: { short: "ТЕЛ", long: "Телосложение" },
  int: { short: "ИНТ", long: "Интеллект" },
  wis: { short: "МДР", long: "Мудрость" },
  cha: { short: "ХАР", long: "Харизма" },
};

export const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export const SKILL_DEFS: Record<SkillKey, { label: string; ability: AbilityKey }> = {
  acrobatics: { label: "Акробатика", ability: "dex" },
  animalHandling: { label: "Уход за животными", ability: "wis" },
  arcana: { label: "Магия", ability: "int" },
  athletics: { label: "Атлетика", ability: "str" },
  deception: { label: "Обман", ability: "cha" },
  history: { label: "История", ability: "int" },
  insight: { label: "Проницательность", ability: "wis" },
  intimidation: { label: "Запугивание", ability: "cha" },
  investigation: { label: "Анализ", ability: "int" },
  medicine: { label: "Медицина", ability: "wis" },
  nature: { label: "Природа", ability: "int" },
  perception: { label: "Внимательность", ability: "wis" },
  persuasion: { label: "Убеждение", ability: "cha" },
  religion: { label: "Религия", ability: "int" },
  sleightOfHand: { label: "Ловкость рук", ability: "dex" },
  stealth: { label: "Скрытность", ability: "dex" },
  survival: { label: "Выживание", ability: "wis" },
};

export const SKILL_KEYS = Object.keys(SKILL_DEFS) as SkillKey[];

export type ClassDefinition = {
  label: string;
  hitDie: number;
  saveProficiencies: AbilityKey[];
  suggestedSkills: SkillKey[];
  spellcastingAbility: AbilityKey | null;
  casterProgression: "full" | "half" | "third" | "pact" | "none";
};

export const CLASS_CATALOG: Record<string, ClassDefinition> = {
  barbarian: { label: "Варвар", hitDie: 12, saveProficiencies: ["str", "con"], suggestedSkills: ["athletics", "intimidation", "nature", "survival"], spellcastingAbility: null, casterProgression: "none" },
  bard: { label: "Бард", hitDie: 8, saveProficiencies: ["dex", "cha"], suggestedSkills: ["deception", "insight", "persuasion", "history"], spellcastingAbility: "cha", casterProgression: "full" },
  cleric: { label: "Жрец", hitDie: 8, saveProficiencies: ["wis", "cha"], suggestedSkills: ["insight", "medicine", "persuasion", "religion"], spellcastingAbility: "wis", casterProgression: "full" },
  druid: { label: "Друид", hitDie: 8, saveProficiencies: ["int", "wis"], suggestedSkills: ["animalHandling", "arcana", "medicine", "nature"], spellcastingAbility: "wis", casterProgression: "full" },
  fighter: { label: "Воин", hitDie: 10, saveProficiencies: ["str", "con"], suggestedSkills: ["acrobatics", "athletics", "intimidation", "survival"], spellcastingAbility: null, casterProgression: "third" },
  monk: { label: "Монах", hitDie: 8, saveProficiencies: ["str", "dex"], suggestedSkills: ["acrobatics", "athletics", "insight", "religion"], spellcastingAbility: null, casterProgression: "none" },
  paladin: { label: "Паладин", hitDie: 10, saveProficiencies: ["wis", "cha"], suggestedSkills: ["athletics", "insight", "intimidation", "religion"], spellcastingAbility: "cha", casterProgression: "half" },
  ranger: { label: "Следопыт", hitDie: 10, saveProficiencies: ["str", "dex"], suggestedSkills: ["animalHandling", "insight", "perception", "survival"], spellcastingAbility: "wis", casterProgression: "half" },
  rogue: { label: "Плут", hitDie: 8, saveProficiencies: ["dex", "int"], suggestedSkills: ["acrobatics", "investigation", "perception", "stealth"], spellcastingAbility: null, casterProgression: "third" },
  sorcerer: { label: "Чародей", hitDie: 6, saveProficiencies: ["con", "cha"], suggestedSkills: ["arcana", "deception", "insight", "persuasion"], spellcastingAbility: "cha", casterProgression: "full" },
  warlock: { label: "Колдун", hitDie: 8, saveProficiencies: ["wis", "cha"], suggestedSkills: ["arcana", "deception", "history", "intimidation"], spellcastingAbility: "cha", casterProgression: "pact" },
  wizard: { label: "Волшебник", hitDie: 6, saveProficiencies: ["int", "wis"], suggestedSkills: ["arcana", "history", "investigation", "religion"], spellcastingAbility: "int", casterProgression: "full" },
};

export const CLASS_KEYS = Object.keys(CLASS_CATALOG);

export type ConditionDefinition = {
  label: string;
  tone: "harmful" | "helpful" | "neutral";
  description: string;
  effects: string[];
  perceptionShift?: -5 | 5;
  autoFailSaves?: AbilityKey[];
  speedMultiplier?: number;
  disadvantageAttacks?: boolean;
  disadvantageAbilityChecks?: boolean;
};

export const CONDITION_CATALOG: Record<ConditionKey, ConditionDefinition> = {
  blinded: { label: "Ослеплён", tone: "harmful", description: "Не видит и автоматически проваливает проверки, требующие зрения.", effects: ["Помеха на атаки", "Помеха на пассивную внимательность (−5)"], perceptionShift: -5, disadvantageAttacks: true },
  charmed: { label: "Очарован", tone: "harmful", description: "Не может атаковать источник очарования.", effects: ["Социальные ограничения", "Источник получает преимущество в диалоге"] },
  deafened: { label: "Оглохший", tone: "harmful", description: "Не слышит и автоматически проваливает проверки на слух.", effects: ["Нет восприятия звуковых подсказок"] },
  frightened: { label: "Испуган", tone: "harmful", description: "Помеха на проверки и атаки, пока источник страха виден.", effects: ["Помеха на атаки", "Помеха на проверки характеристик", "−5 к пассивной внимательности"], perceptionShift: -5, disadvantageAttacks: true, disadvantageAbilityChecks: true },
  grappled: { label: "Захвачен", tone: "harmful", description: "Скорость равна нулю; может попытаться вырваться действием.", effects: ["Скорость 0"], speedMultiplier: 0 },
  incapacitated: { label: "Недееспособен", tone: "harmful", description: "Не может совершать действия и реакции.", effects: ["Нет действий", "Нет реакций"] },
  invisible: { label: "Невидим", tone: "helpful", description: "Атаки по нему с помехой, его атаки с преимуществом.", effects: ["Преимущество на атаки", "Помеха по атакам против него"] },
  paralyzed: { label: "Парализован", tone: "harmful", description: "Недееспособен, автоматически проваливает спасброски СИЛ/ЛОВ.", effects: ["Автопровал СИЛ/ЛОВ", "Удар в ближнем бою — крит"], autoFailSaves: ["str", "dex"] },
  petrified: { label: "Окаменел", tone: "harmful", description: "Превращён в камень, недееспособен.", effects: ["Автопровал СИЛ/ЛОВ", "Сопротивление урону"], autoFailSaves: ["str", "dex"] },
  poisoned: { label: "Отравлен", tone: "harmful", description: "Помеха на броски атак и проверки характеристик.", effects: ["Помеха на атаки", "Помеха на проверки"], disadvantageAttacks: true, disadvantageAbilityChecks: true },
  prone: { label: "Сбит с ног", tone: "harmful", description: "Атаки в ближнем бою по цели с преимуществом; перемещение стоит вдвое дороже.", effects: ["Помеха на атаки цели", "Половина скорости при подъёме"], disadvantageAttacks: true },
  restrained: { label: "Обездвижен", tone: "harmful", description: "Скорость 0, помеха на атаки и спасброски ЛОВ.", effects: ["Скорость 0", "Помеха на спасброски ЛОВ"], speedMultiplier: 0, disadvantageAttacks: true },
  stunned: { label: "Оглушён", tone: "harmful", description: "Недееспособен, автоматически проваливает спасброски СИЛ/ЛОВ.", effects: ["Автопровал СИЛ/ЛОВ", "Нет концентрации"], autoFailSaves: ["str", "dex"] },
  unconscious: { label: "Без сознания", tone: "harmful", description: "Лежит ничком, недееспособен, сбросы СИЛ/ЛОВ провалены.", effects: ["0 HP", "Автопровал СИЛ/ЛОВ"], autoFailSaves: ["str", "dex"] },
  exhaustion: { label: "Истощение", tone: "harmful", description: "Помеха на проверки characteristics; эффект усиливается с уровнем.", effects: ["Помеха на проверки", "Снижение скорости"], disadvantageAbilityChecks: true },
  concentration: { label: "Концентрация", tone: "neutral", description: "Активное заклинание требует спасброска ТЕЛ при получении урона.", effects: ["Спасбросок ТЕЛ при уроне", "Только одно такое заклинание"] },
  blessed: { label: "Благословлён", tone: "helpful", description: "+1d4 к атакам и спасброскам.", effects: ["+1d4 к атакам", "+1d4 к спасброскам"] },
  hasted: { label: "Ускорен", tone: "helpful", description: "+2 к КД, удвоенная скорость, дополнительное действие.", effects: ["+2 КД", "×2 скорость", "+1 действие"], speedMultiplier: 2 },
};

export const CONDITION_KEYS = Object.keys(CONDITION_CATALOG) as ConditionKey[];

export const ITEM_CATALOG: InventoryItem[] = [
  { id: "item-longsword", name: "Длинный меч", category: "weapon", quantity: 1, weight: 3, costGp: 15, description: "Классический одноручный клинок. Урон 1d8 рубящий.", equipped: false, damage: "1d8 рубящий", rarity: "common" },
  { id: "item-rapier", name: "Рапира", category: "weapon", quantity: 1, weight: 2, costGp: 25, description: "Лёгкое колющее оружие с финесом. Урон 1d8 колющий.", equipped: false, damage: "1d8 колющий", rarity: "common" },
  { id: "item-greataxe", name: "Секира", category: "weapon", quantity: 1, weight: 7, costGp: 30, description: "Тяжёлое двуручное оружие. Урон 1d12 рубящий.", equipped: false, damage: "1d12 рубящий", rarity: "common" },
  { id: "item-shortbow", name: "Короткий лук", category: "weapon", quantity: 1, weight: 2, costGp: 25, description: "Дальнобойное оружие, дистанция 80/320 футов.", equipped: false, damage: "1d6 колющий", rarity: "common" },
  { id: "item-leather", name: "Кожаный доспех", category: "armor", quantity: 1, weight: 10, costGp: 10, description: "Лёгкий доспех: 11 + модификатор ЛОВ.", equipped: false, armor: { base: 11, type: "light" }, rarity: "common" },
  { id: "item-scale", name: "Чешуйчатый доспех", category: "armor", quantity: 1, weight: 45, costGp: 50, description: "Средний доспех: 14 + ЛОВ (максимум +2).", equipped: false, armor: { base: 14, type: "medium", maxDex: 2 }, rarity: "common" },
  { id: "item-plate", name: "Латы", category: "armor", quantity: 1, weight: 65, costGp: 1500, description: "Тяжёлый доспех: КД 18, без бонуса ЛОВ.", equipped: false, armor: { base: 18, type: "heavy", maxDex: 0 }, rarity: "rare" },
  { id: "item-shield", name: "Щит", category: "shield", quantity: 1, weight: 6, costGp: 10, description: "Даёт +2 к классу доспеха, занимает одну руку.", equipped: false, armor: { base: 2, type: "shield" }, rarity: "common" },
  { id: "item-rope", name: "Шёлковая верёвка, 50 фт", category: "gear", quantity: 1, weight: 5, costGp: 10, description: "Прочная верёвка для спусков, ловушек и импровизации.", equipped: false, rarity: "common" },
  { id: "item-torch", name: "Факел", category: "gear", quantity: 5, weight: 1, costGp: 0.01, description: "Горит 1 час, освещает 20 футов ярким светом.", equipped: false, rarity: "common" },
  { id: "item-rations", name: "Сухой паёк", category: "consumable", quantity: 4, weight: 2, costGp: 0.5, description: "Однодневный запас еды для одного путешественника.", equipped: false, rarity: "common" },
  { id: "item-potion", name: "Зелье лечения", category: "consumable", quantity: 1, weight: 0.5, costGp: 50, description: "Восстанавливает 2d4+2 HP действием.", equipped: false, rarity: "common" },
  { id: "item-thieves", name: "Инструменты вора", category: "gear", quantity: 1, weight: 1, costGp: 25, description: "Отмычки, зеркальце, ножницы и тонкая проволока.", equipped: false, rarity: "common" },
  { id: "item-spellbook", name: "Книга заклинаний", category: "gear", quantity: 1, weight: 3, costGp: 50, description: "Записанные формулы и заметки волшебника.", equipped: false, rarity: "common" },
  { id: "item-holy", name: "Святой символ", category: "gear", quantity: 1, weight: 1, costGp: 5, description: "Фокусировка божественной магии жреца или паладина.", equipped: false, rarity: "common" },
  { id: "item-pearl", name: "Чёрная жемчужина", category: "treasure", quantity: 1, weight: 0.1, costGp: 100, description: "Редкий компонент для ритуала и предмет для торга.", equipped: false, rarity: "uncommon" },
  { id: "item-bag", name: "Сумка приключенца", category: "gear", quantity: 1, weight: 5, costGp: 5, description: "Одеяло, чашка, кремень, фляга и прочий походный набор.", equipped: false, rarity: "common" },
  { id: "item-cloak", name: "Плащ защиты", category: "armor", quantity: 1, weight: 2, costGp: 350, description: "+1 к КД и спасброскам, пока надет.", equipped: false, armor: { base: 1, type: "light" }, rarity: "uncommon" },
];

export const SPELL_CATALOG: Spell[] = [
  { id: "spell-magic-missile", name: "Волшебная стрела", level: 1, school: "Воплощение", castingTime: "1 действие", range: "120 фт", components: "В, С", description: "Три дротика наносят по 1d4+1 силового урона.", prepared: false },
  { id: "spell-shield", name: "Щит", level: 1, school: "Ограждение", castingTime: "1 реакция", range: "На себя", components: "В, С", description: "+5 к КД до начала вашего следующего хода.", prepared: false },
  { id: "spell-cure-wounds", name: "Лечащие руки", level: 1, school: "Воплощение", castingTime: "1 действие", range: "Касание", components: "В, С", description: "Восстанавливает 1d8 + модификатор магии HP.", prepared: false },
  { id: "spell-healing-word", name: "Лечащее слово", level: 1, school: "Воплощение", castingTime: "1 бонусное действие", range: "60 фт", components: "В", description: "Восстанавливает 1d4 + модификатор магии HP на расстоянии.", prepared: false },
  { id: "spell-bless", name: "Благословение", level: 1, school: "Очарование", castingTime: "1 действие", range: "30 фт", components: "В, С, М", description: "До трёх союзников добавляют 1d4 к атакам и спасброскам.", prepared: false },
  { id: "spell-faerie-fire", name: "Огонь фей", level: 1, school: "Воплощение", castingTime: "1 действие", range: "60 фт", components: "В, С", description: "Цели светятся, атаки по ним получают преимущество.", prepared: false },
  { id: "spell-misty-step", name: "Туманный шаг", level: 2, school: "Перемещение", castingTime: "1 бонусное действие", range: "На себя", components: "В", description: "Телепортация на 30 футов в видимое пространство.", prepared: false },
  { id: "spell-hold-person", name: "Удержание личности", level: 2, school: "Очарование", castingTime: "1 действие", range: "60 фт", components: "В, С, М", description: "Гуманоид парализован, пока не пройдёт спасбросок МДР.", prepared: false },
  { id: "spell-shatter", name: "Раскат грома", level: 2, school: "Воплощение", castingTime: "1 действие", range: "60 фт", components: "В, С, М", description: "3d8 урона звуком в радиусе 10 футов.", prepared: false },
  { id: "spell-fireball", name: "Огненный шар", level: 3, school: "Воплощение", castingTime: "1 действие", range: "150 фт", components: "В, С, М", description: "8d6 урона огнём в радиусе 20 футов, спасбросок ЛОВ.", prepared: false },
  { id: "spell-counterspell", name: "Контрзаклинание", level: 3, school: "Ограждение", castingTime: "1 реакция", range: "60 фт", components: "С", description: "Прерывает заклинание 3 уровня или ниже.", prepared: false },
  { id: "spell-revivify", name: "Оживление", level: 3, school: "Некромантия", castingTime: "1 действие", range: "Касание", components: "В, С, М (алмазы 300 зм)", description: "Возвращает к жизни существо, умершее не более 1 минуты назад.", prepared: false },
  { id: "spell-polymorph", name: "Превращение", level: 4, school: "Изменение", castingTime: "1 действие", range: "60 фт", components: "В, С, М", description: "Превращает цель в зверя с новыми HP.", prepared: false },
  { id: "spell-wall-fire", name: "Огненная стена", level: 4, school: "Воплощение", castingTime: "1 действие", range: "120 фт", components: "В, С, М", description: "Стена пламени наносит 5d8 урона при прохождении.", prepared: false },
  { id: "spell-raise-dead", name: "Воскрешение", level: 5, school: "Некромантия", castingTime: "1 час", range: "Касание", components: "В, С, М (алмаз 500 зм)", description: "Возвращает к жизни существо, умершее не более 10 дней назад.", prepared: false },
  { id: "spell-teleportation-circle", name: "Круг телепортации", level: 5, school: "Перемещение", castingTime: "1 минута", range: "10 фт", components: "В, С, М", description: "Создаёт постоянную точку прибытия для телепортации.", prepared: false },
];
