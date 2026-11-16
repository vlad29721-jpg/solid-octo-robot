import type { AbilityKey, InventoryItem, SkillKey } from "./types";

export type RaceDef = { key: string; name: string; bonuses: Partial<Record<AbilityKey, number>>; speed: number; darkvision: number; traits: string };
export const RACES: RaceDef[] = [
  { key: "human", name: "Человек", bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, speed: 30, darkvision: 0, traits: "+1 ко всем характеристикам, дополнительный язык." },
  { key: "elf", name: "Эльф", bonuses: { dex: 2, int: 1 }, speed: 30, darkvision: 60, traits: "Тёмное зрение, наследие фей, транс вместо сна." },
  { key: "half-elf", name: "Полуэльф", bonuses: { cha: 2, dex: 1, wis: 1 }, speed: 30, darkvision: 60, traits: "Тёмное зрение, наследие фей, два навыка на выбор." },
  { key: "dwarf", name: "Дварф", bonuses: { con: 2, wis: 1 }, speed: 25, darkvision: 60, traits: "Дварфийская стойкость, знание камня, тёмное зрение." },
  { key: "halfling", name: "Полурослик", bonuses: { dex: 2, cha: 1 }, speed: 25, darkvision: 0, traits: "Везучий: перебрасывает 1 на d20, храбрый, проворный." },
  { key: "gnome", name: "Гном", bonuses: { int: 2, con: 1 }, speed: 25, darkvision: 60, traits: "Гномья хитрость: преимущество на спасброски ИНТ/МДР/ХАР против магии." },
  { key: "half-orc", name: "Полуорк", bonuses: { str: 2, con: 1 }, speed: 30, darkvision: 60, traits: "Непоколебимая стойкость, свирепые атаки, угрожающий вид." },
  { key: "tiefling", name: "Тифлинг", bonuses: { cha: 2, int: 1 }, speed: 30, darkvision: 60, traits: "Сопротивление огню, адское наследие (заклинания)." },
  { key: "dragonborn", name: "Драконорождённый", bonuses: { str: 2, cha: 1 }, speed: 30, darkvision: 0, traits: "Оружие дыхания, сопротивление урону своего дракона." },
];

export type BackgroundDef = { key: string; name: string; skills: SkillKey[]; gold: number; feature: string };
export const BACKGROUNDS: BackgroundDef[] = [
  { key: "acolyte", name: "Прислужник", skills: ["insight", "religion"], gold: 15, feature: "Приют верующих: храмы вашей веры помогут вам." },
  { key: "criminal", name: "Преступник", skills: ["deception", "stealth"], gold: 15, feature: "Криминальные связи: надёжный контакт в преступном мире." },
  { key: "folk-hero", name: "Народный герой", skills: ["animalHandling", "survival"], gold: 10, feature: "Деревенское гостеприимство: простой люд укроет вас." },
  { key: "noble", name: "Дворянин", skills: ["history", "persuasion"], gold: 25, feature: "Привилегированность: вас принимают в высшем обществе." },
  { key: "sage", name: "Мудрец", skills: ["arcana", "history"], gold: 10, feature: "Исследователь: вы знаете, где найти информацию." },
  { key: "soldier", name: "Солдат", skills: ["athletics", "intimidation"], gold: 10, feature: "Воинское звание: солдаты признают ваш авторитет." },
  { key: "outlander", name: "Чужеземец", skills: ["athletics", "survival"], gold: 10, feature: "Странник: вы всегда найдёте еду и воду в дикой местности." },
  { key: "entertainer", name: "Артист", skills: ["acrobatics", "insight"], gold: 15, feature: "По просьбе публики: выступления дают кров и еду." },
  { key: "urchin", name: "Беспризорник", skills: ["sleightOfHand", "stealth"], gold: 10, feature: "Городские тайны: вы знаете короткие пути через город." },
];

export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export type Feature = { level: number; name: string; text: string };
export type SubclassDef = { key: string; name: string; features: Feature[] };
export type ClassContent = { features: Feature[]; subclassLevel: number; subclasses: SubclassDef[] };

const f = (level: number, name: string, text: string): Feature => ({ level, name, text });

export const CLASS_CONTENT: Record<string, ClassContent> = {
  barbarian: { subclassLevel: 3, features: [f(1, "Ярость", "Бонусным действием: +урон, сопротивление дробящему/колющему/рубящему."), f(2, "Безрассудная атака", "Преимущество на атаки СИЛ, но атаки по вам тоже с преимуществом."), f(5, "Дополнительная атака", "Две атаки за действие Атака."), f(7, "Дикий инстинкт", "Преимущество на инициативу.")],
    subclasses: [{ key: "berserker", name: "Путь берсерка", features: [f(3, "Бешенство", "Дополнительная атака бонусным действием во время ярости."), f(6, "Бездумная ярость", "Нельзя очаровать или испугать в ярости."), f(10, "Устрашающее присутствие", "Пугаете врага действием.")] },
      { key: "totem", name: "Путь тотемного воина", features: [f(3, "Дух тотема", "Медведь: сопротивление всему урону, кроме психического, в ярости."), f(6, "Аспект зверя", "Особые чувства и сила тотема."), f(10, "Странник духов", "Ритуальное общение с природой.")] }] },
  bard: { subclassLevel: 3, features: [f(1, "Вдохновение барда", "Бонусным действием даёте союзнику кость вдохновения."), f(2, "Мастер на все руки", "+½ бонуса мастерства к проверкам без владения."), f(5, "Источник вдохновения", "Вдохновение восстанавливается после короткого отдыха."), f(6, "Контрочарование", "Союзники рядом получают преимущество против страха и очарования.")],
    subclasses: [{ key: "lore", name: "Коллегия знаний", features: [f(3, "Острое словцо", "Реакцией вычитаете кость вдохновения из броска врага."), f(6, "Магические тайны", "Два заклинания любого класса."), f(14, "Непревзойдённое мастерство", "Кость вдохновения к своей проверке.")] },
      { key: "valor", name: "Коллегия доблести", features: [f(3, "Боевое вдохновение", "Кость вдохновения к урону или КД."), f(6, "Дополнительная атака", "Две атаки за действие."), f(14, "Боевая магия", "Атака бонусным действием после заклинания.")] }] },
  cleric: { subclassLevel: 1, features: [f(2, "Божественный канал", "Изгнание нежити и сила домена."), f(5, "Уничтожение нежити", "Слабая нежить уничтожается при изгнании."), f(10, "Божественное вмешательство", "Просите бога о чуде.")],
    subclasses: [{ key: "life", name: "Домен жизни", features: [f(1, "Последователь жизни", "Лечащие заклинания восстанавливают на 2 + уровень заклинания больше."), f(2, "Сохранение жизни", "Распределяете лечение 5 × уровень."), f(6, "Благословенный целитель", "Лечите себя, исцеляя других.")] },
      { key: "war", name: "Домен войны", features: [f(1, "Боевой жрец", "Атака оружием бонусным действием."), f(2, "Направленный удар", "+10 к броску атаки."), f(6, "Благословение бога войны", "+10 к атаке союзника реакцией.")] }] },
  druid: { subclassLevel: 2, features: [f(2, "Дикий облик", "Превращение в зверя, знакомого вам."), f(18, "Вечная юность", "Стареете в 10 раз медленнее."), f(20, "Архидруид", "Неограниченный дикий облик.")],
    subclasses: [{ key: "land", name: "Круг земли", features: [f(2, "Естественное восстановление", "Восстанавливаете ячейки на коротком отдыхе."), f(6, "Природная поступь", "Труднопроходимая местность не замедляет."), f(10, "Защита природы", "Иммунитет к яду и болезням.")] },
      { key: "moon", name: "Круг луны", features: [f(2, "Боевой облик", "Дикий облик бонусным действием, звери с ПО 1."), f(6, "Первобытный удар", "Атаки в облике считаются магическими."), f(10, "Облик элементаля", "Превращение в элементаля.")] }] },
  fighter: { subclassLevel: 3, features: [f(1, "Боевой стиль", "Специализация: оборона, дуэлянт, стрельба…"), f(1, "Второе дыхание", "Бонусным действием восстанавливаете 1d10 + уровень HP."), f(2, "Всплеск действий", "Дополнительное действие."), f(5, "Дополнительная атака", "Две атаки за действие."), f(9, "Упорный", "Перебрасываете проваленный спасбросок.")],
    subclasses: [{ key: "champion", name: "Чемпион", features: [f(3, "Улучшенный крит", "Критическое попадание на 19–20."), f(7, "Выдающийся атлет", "+½ мастерства к СИЛ/ЛОВ/ТЕЛ проверкам."), f(15, "Превосходный крит", "Крит на 18–20.")] },
      { key: "battle-master", name: "Мастер боевых искусств", features: [f(3, "Боевое превосходство", "4 кости превосходства d8 и приёмы."), f(7, "Познай врага", "Узнаёте силу противника."), f(10, "Улучшенное превосходство", "Кости превосходства d10.")] }] },
  monk: { subclassLevel: 3, features: [f(1, "Боевые искусства", "Безоружные удары и удар бонусным действием."), f(2, "Ци", "Шквал ударов, терпеливая оборона, поступь ветра."), f(4, "Медленное падение", "Снижаете урон от падения."), f(5, "Ошеломляющий удар", "Оглушаете врага за очко ци.")],
    subclasses: [{ key: "open-hand", name: "Путь открытой ладони", features: [f(3, "Техника открытой ладони", "Шквал ударов сбивает с ног или отталкивает."), f(6, "Целостность тела", "Лечите 3 × уровень HP."), f(11, "Спокойствие", "Эффект святилища после отдыха.")] },
      { key: "shadow", name: "Путь тени", features: [f(3, "Искусство тени", "Заклинания тьмы и тишины за ци."), f(6, "Шаг тени", "Телепорт между тенями."), f(11, "Плащ теней", "Невидимость в тени.")] }] },
  paladin: { subclassLevel: 3, features: [f(1, "Божественное чувство", "Чувствуете исчадий, нежить и небожителей."), f(1, "Наложение рук", "Запас исцеления 5 × уровень."), f(2, "Божественная кара", "Тратите ячейку на +2d8 излучением."), f(6, "Аура защиты", "+ХАР к спасброскам союзников рядом.")],
    subclasses: [{ key: "devotion", name: "Клятва преданности", features: [f(3, "Священное оружие", "+ХАР к атакам оружием."), f(7, "Аура преданности", "Союзники не могут быть очарованы."), f(15, "Чистота духа", "Постоянная защита от зла и добра.")] },
      { key: "vengeance", name: "Клятва мести", features: [f(3, "Клятва вражды", "Преимущество на атаки по выбранному врагу."), f(7, "Неумолимый мститель", "Движение после атаки по возможности."), f(15, "Душа мщения", "Атака реакцией по цели клятвы.")] }] },
  ranger: { subclassLevel: 3, features: [f(1, "Избранный враг", "Преимущество на выслеживание и знания о враге."), f(1, "Исследователь природы", "Знание избранной местности."), f(5, "Дополнительная атака", "Две атаки за действие."), f(8, "Поступь по земле", "Труднопроходимая местность не мешает.")],
    subclasses: [{ key: "hunter", name: "Охотник", features: [f(3, "Добыча охотника", "Убийца колоссов: +1d8 по раненым."), f(7, "Защитная тактика", "Защита от толпы или сильных атак."), f(11, "Мультиатака", "Залп или вихрь ударов.")] },
      { key: "beast-master", name: "Повелитель зверей", features: [f(3, "Спутник следопыта", "Верный зверь сражается рядом."), f(7, "Исключительная дрессировка", "Зверь действует бонусным действием."), f(11, "Звериная ярость", "Зверь атакует дважды.")] }] },
  rogue: { subclassLevel: 3, features: [f(1, "Скрытая атака", "+d6 урона за каждые 2 уровня при преимуществе."), f(1, "Экспертиза", "Удвоенный бонус мастерства для двух навыков."), f(2, "Хитрое действие", "Рывок, отход или засада бонусным действием."), f(5, "Невероятное уклонение", "Половина урона реакцией."), f(7, "Увёртливость", "Нет урона при успешном спасброске ЛОВ.")],
    subclasses: [{ key: "thief", name: "Вор", features: [f(3, "Быстрые руки", "Использование предметов бонусным действием."), f(9, "Скрытность высшего уровня", "Преимущество на Скрытность при медленном шаге."), f(13, "Использование магических устройств", "Игнорируете требования предметов.")] },
      { key: "assassin", name: "Убийца", features: [f(3, "Убийство", "Автокрит по застигнутым врасплох."), f(9, "Мастер внедрения", "Создаёте ложные личности."), f(13, "Самозванец", "Идеально подражаете голосу и манерам.")] }] },
  sorcerer: { subclassLevel: 1, features: [f(2, "Источник магии", "Очки чародейства и создание ячеек."), f(3, "Метамагия", "Изменяете заклинания: усиление, ускорение…"), f(20, "Чародейское восстановление", "4 очка чародейства на коротком отдыхе.")],
    subclasses: [{ key: "draconic", name: "Наследие драконов", features: [f(1, "Драконья стойкость", "+1 HP за уровень, КД 13 + ЛОВ без доспехов."), f(6, "Родство со стихией", "+ХАР к урону своей стихии."), f(14, "Драконьи крылья", "Скорость полёта.")] },
      { key: "wild", name: "Дикая магия", features: [f(1, "Всплеск дикой магии", "Случайные магические эффекты."), f(6, "Изгиб удачи", "Меняете бросок врага на 1d4."), f(14, "Контролируемый хаос", "Бросаете таблицу дикой магии дважды.")] }] },
  warlock: { subclassLevel: 1, features: [f(1, "Магия договора", "Ячейки восстанавливаются после короткого отдыха."), f(2, "Таинственные воззвания", "Особые способности от покровителя."), f(3, "Предмет договора", "Цепь, клинок или гримуар."), f(11, "Таинственный арканум", "Заклинание 6 круга раз в день.")],
    subclasses: [{ key: "fiend", name: "Исчадие", features: [f(1, "Благословение тёмного", "Временные HP при убийстве врага."), f(6, "Удача тёмного", "+d10 к проверке или спасброску."), f(10, "Исчадная стойкость", "Сопротивление выбранному урону.")] },
      { key: "archfey", name: "Архифея", features: [f(1, "Фейское присутствие", "Очаровываете или пугаете всех рядом."), f(6, "Туманный побег", "Невидимость и телепорт при уроне."), f(10, "Защита от очарования", "Иммунитет к очарованию.")] }] },
  wizard: { subclassLevel: 2, features: [f(1, "Магическое восстановление", "Восстанавливаете ячейки на коротком отдыхе раз в день."), f(18, "Мастерство заклинаний", "Заклинание 1 и 2 круга без ячеек."), f(20, "Фирменные заклинания", "Два заклинания 3 круга бесплатно.")],
    subclasses: [{ key: "evocation", name: "Школа воплощения", features: [f(2, "Формирование заклинаний", "Союзники не страдают от ваших воплощений."), f(6, "Мощный заговор", "Половина урона заговора при успехе спасброска."), f(10, "Усиленное воплощение", "+ИНТ к урону воплощений.")] },
      { key: "abjuration", name: "Школа ограждения", features: [f(2, "Магический барьер", "Защитный барьер поглощает урон."), f(6, "Проецируемый барьер", "Барьер защищает союзника."), f(10, "Улучшенное ограждение", "+мастерство к проверкам ограждения.")] }] },
};

export type FeatDef = { key: string; name: string; text: string };
export const FEATS: FeatDef[] = [
  { key: "alert", name: "Бдительный", text: "+5 к инициативе, вас нельзя застать врасплох." },
  { key: "lucky", name: "Везунчик", text: "3 очка удачи в день: перебросить d20." },
  { key: "tough", name: "Крепкий", text: "+2 HP за каждый уровень." },
  { key: "war-caster", name: "Боевой заклинатель", text: "Преимущество на спасброски концентрации." },
  { key: "sentinel", name: "Страж", text: "Атака по возможности останавливает цель." },
  { key: "sharpshooter", name: "Меткий стрелок", text: "−5 к попаданию, +10 к урону дальнобойным оружием." },
  { key: "gwm", name: "Мастер большого оружия", text: "−5 к попаданию, +10 к урону двуручным оружием." },
  { key: "mobile", name: "Подвижный", text: "+10 к скорости, рывок игнорирует труднопроходимость." },
  { key: "resilient", name: "Устойчивый", text: "+1 к характеристике и владение её спасбросками." },
  { key: "observant", name: "Наблюдательный", text: "+5 к пассивной Внимательности и Анализу." },
  { key: "healer", name: "Лекарь", text: "Набор целителя восстанавливает 1d6 + 4 + уровень HP." },
  { key: "skilled", name: "Одарённый", text: "Владение тремя навыками или инструментами." },
];

export const MAGIC_ITEMS: InventoryItem[] = [
  { id: "magic-wand-mm", name: "Жезл волшебных стрел", category: "gear", quantity: 1, weight: 1, costGp: 500, description: "Трата заряда — Волшебная стрела. 7 зарядов, восстанавливает 1d6+1 на рассвете.", equipped: false, magic: true, charges: { current: 7, max: 7 }, rarity: "uncommon" },
  { id: "magic-ring-prot", name: "Кольцо защиты", category: "treasure", quantity: 1, weight: 0, costGp: 3500, description: "+1 к КД и спасброскам. Требует настройки.", equipped: false, magic: true, requiresAttunement: true, rarity: "rare" },
  { id: "magic-cloak-elf", name: "Эльфийский плащ", category: "armor", quantity: 1, weight: 1, costGp: 500, description: "Преимущество на Скрытность. Требует настройки.", equipped: false, magic: true, requiresAttunement: true, rarity: "uncommon" },
  { id: "magic-sword-flame", name: "Пламенный клинок", category: "weapon", quantity: 1, weight: 3, costGp: 5000, description: "Длинный меч, +2d6 огнём при воспламенении. Требует настройки.", equipped: false, damage: "1d8 рубящий", magic: true, requiresAttunement: true, rarity: "rare" },
  { id: "magic-bag", name: "Сумка хранения", category: "gear", quantity: 1, weight: 15, costGp: 500, description: "Вмещает 500 фунтов, весит всегда 15.", equipped: false, magic: true, rarity: "uncommon" },
  { id: "magic-potion-greater", name: "Большое зелье лечения", category: "consumable", quantity: 1, weight: 0.5, costGp: 150, description: "Восстанавливает 4d4+4 HP.", equipped: false, magic: true, rarity: "uncommon" },
  { id: "magic-amulet-health", name: "Амулет здоровья", category: "treasure", quantity: 1, weight: 1, costGp: 8000, description: "Телосложение становится 19. Требует настройки.", equipped: false, magic: true, requiresAttunement: true, rarity: "rare" },
  { id: "magic-staff-fire", name: "Посох огня", category: "weapon", quantity: 1, weight: 4, costGp: 8000, description: "10 зарядов: Огненный шар (3), Стена огня (4). Требует настройки.", equipped: false, damage: "1d6 дробящий", magic: true, requiresAttunement: true, charges: { current: 10, max: 10 }, rarity: "very rare" },
];

export const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

export function xpProgress(level: number, xp: number) {
  const current = XP_TABLE[Math.max(0, Math.min(19, level - 1))];
  const next = level >= 20 ? null : XP_TABLE[level];
  const percent = next ? Math.max(0, Math.min(100, ((xp - current) / (next - current)) * 100)) : 100;
  return { current, next, percent, canLevel: next !== null && xp >= next };
}

export const DAMAGE_TYPES = ["рубящий", "колющий", "дробящий", "огонь", "холод", "молния", "кислота", "яд", "некротический", "излучение", "психический", "звук", "силовой"] as const;

export function applyDamageType(amount: number, type: string | undefined, target: { resistances?: string[]; vulnerabilities?: string[]; immunities?: string[] }) {
  if (!type) return { amount, note: "" };
  if (target.immunities?.includes(type)) return { amount: 0, note: `иммунитет к «${type}»` };
  if (target.resistances?.includes(type)) return { amount: Math.floor(amount / 2), note: `сопротивление «${type}» (½)` };
  if (target.vulnerabilities?.includes(type)) return { amount: amount * 2, note: `уязвимость к «${type}» (×2)` };
  return { amount, note: "" };
}

export function damageTypeOf(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return DAMAGE_TYPES.find((type) => text.toLowerCase().includes(type.slice(0, 5)));
}

function roll(count: number, sides: number) {
  let total = 0;
  for (let i = 0; i < count; i += 1) total += Math.floor(Math.random() * sides) + 1;
  return total;
}

export function generateLoot(tier: "0-4" | "5-10" | "11-16" | "17+", hoard: boolean) {
  const base = { "0-4": [5, 6, 10], "5-10": [4, 6, 100], "11-16": [4, 6, 1000], "17+": [8, 6, 1000] }[tier];
  const gold = roll(base[0], base[1]) * base[2] * (hoard ? 4 : 1) / (tier === "0-4" ? 10 : 1);
  const items: InventoryItem[] = [];
  const chance = hoard ? 0.9 : { "0-4": 0.15, "5-10": 0.3, "11-16": 0.45, "17+": 0.6 }[tier];
  const count = hoard ? 1 + Math.floor(Math.random() * 3) : 1;
  const pool = tier === "0-4" ? MAGIC_ITEMS.filter((item) => item.rarity === "uncommon") : MAGIC_ITEMS;
  for (let i = 0; i < count; i += 1) {
    if (Math.random() < chance) {
      const item = pool[Math.floor(Math.random() * pool.length)];
      items.push({ ...item, id: `${item.id}-${Math.random().toString(36).slice(2, 8)}` });
    }
  }
  const gems = hoard ? roll(2, 4) : 0;
  if (gems) items.push({ id: `gem-${Math.random().toString(36).slice(2, 8)}`, name: "Драгоценные камни", category: "treasure", quantity: gems, weight: 0.1, costGp: tier === "0-4" ? 10 : tier === "5-10" ? 50 : 500, description: "Самоцветы для продажи или ритуалов.", equipped: false });
  return { gold: Math.round(gold), items };
}
