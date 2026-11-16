import type { DicePart, DiceRollDetail } from "./types";

export type ParsedTerm =
  | { kind: "dice"; sign: 1 | -1; count: number; sides: number; keep: "highest" | "lowest" | null; keepCount: number; raw: string }
  | { kind: "modifier"; sign: 1 | -1; value: number; raw: string };

function secureRandom(): number {
  if (typeof globalThis.crypto !== "undefined" && "getRandomValues" in globalThis.crypto) {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] / 4294967296;
  }
  return Math.random();
}

export function parseDiceExpression(input: string): ParsedTerm[] {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, "").replace(/[−–—]/g, "-");
  if (!normalized || normalized.length > 100) throw new Error("Введите выражение до 100 символов, например 2d6+3.");
  if (!/^[0-9dkhl+\-]+$/.test(normalized)) throw new Error("Разрешены только числа, d, kh/kl, + и −.");
  const matches = normalized.match(/[+-]?(?:\d*d\d+(?:(?:kh|kl)\d*)?|\d+)/g) ?? [];
  if (matches.join("") !== normalized) throw new Error("Не удалось разобрать выражение. Пример: 1d20+5 или 4d6kh3.");
  if (matches.length > 20) throw new Error("Слишком много частей в выражении (максимум 20).");

  return matches.map((raw) => {
    const sign: 1 | -1 = raw.startsWith("-") ? -1 : 1;
    const body = raw.replace(/^[+-]/, "");
    if (!body.includes("d")) {
      const value = Number(body);
      if (!Number.isFinite(value) || value > 10000) throw new Error("Модификатор слишком велик.");
      return { kind: "modifier", sign, value, raw };
    }
    const match = body.match(/^(\d*)d(\d+)(?:(kh|kl)(\d*))?$/);
    if (!match) throw new Error(`Некорректная часть выражения: ${raw}`);
    const count = match[1] ? Number(match[1]) : 1;
    const sides = Number(match[2]);
    const keepCount = match[4] ? Number(match[4]) : match[3] ? 1 : 0;
    if (count < 1 || count > 100) throw new Error("Количество кубиков должно быть от 1 до 100.");
    if (sides < 2 || sides > 1000) throw new Error("Граней должно быть от 2 до 1000.");
    if (keepCount && (keepCount < 1 || keepCount > count)) throw new Error("kh/kl должно быть от 1 до числа кубиков.");
    return {
      kind: "dice",
      sign,
      count,
      sides,
      keep: match[3] === "kh" ? "highest" : match[3] === "kl" ? "lowest" : null,
      keepCount,
      raw,
    };
  });
}

export function rollExpression(input: string, rng: () => number = secureRandom): DiceRollDetail {
  const terms = parseDiceExpression(input);
  const parts: DicePart[] = [];
  let total = 0;
  let flatModifier = 0;
  let critical = false;
  let fumble = false;

  for (const term of terms) {
    if (term.kind === "modifier") {
      total += term.sign * term.value;
      flatModifier += term.sign * term.value;
      continue;
    }
    const rolls = Array.from({ length: term.count }, () => Math.floor(rng() * term.sides) + 1);
    const indexed = rolls.map((value, index) => ({ value, index }));
    let kept = indexed;
    if (term.keep === "highest") {
      kept = [...indexed].sort((a, b) => b.value - a.value || a.index - b.index).slice(0, term.keepCount).sort((a, b) => a.index - b.index);
    } else if (term.keep === "lowest") {
      kept = [...indexed].sort((a, b) => a.value - b.value || a.index - b.index).slice(0, term.keepCount).sort((a, b) => a.index - b.index);
    }
    const keptIds = new Set(kept.map((item) => item.index));
    const keptValues = kept.map((item) => item.value);
    const droppedValues = indexed.filter((item) => !keptIds.has(item.index)).map((item) => item.value);
    const subtotal = keptValues.reduce((sum, value) => sum + value, 0);
    total += term.sign * subtotal;
    if (term.sides === 20 && term.count === 1) {
      critical ||= rolls[0] === 20;
      fumble ||= rolls[0] === 1;
    }
    parts.push({
      expression: term.raw,
      sign: term.sign,
      sides: term.sides,
      rolls,
      kept: keptValues,
      dropped: droppedValues,
      subtotal,
    });
  }

  const breakdown = [
    ...parts.map((part) => `${part.expression} [${part.rolls.join(", ")}]${part.dropped.length ? ` (отброшено ${part.dropped.join(", ")})` : ""} = ${part.sign * part.subtotal}`),
    flatModifier ? `модификатор ${signed(flatModifier)}` : null,
    `итого ${total}`,
  ].filter(Boolean).join(" · ");

  return { expression: input.trim(), total, parts, flatModifier, breakdown, critical, fumble };
}

function signed(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export const DICE_PRESETS = [
  { label: "d4", expression: "1d4" },
  { label: "d6", expression: "1d6" },
  { label: "d8", expression: "1d8" },
  { label: "d10", expression: "1d10" },
  { label: "d12", expression: "1d12" },
  { label: "d20", expression: "1d20" },
  { label: "2d6+3", expression: "2d6+3" },
  { label: "4d6kh3", expression: "4d6kh3" },
  { label: "Преимущество", expression: "2d20kh1" },
  { label: "Помеха", expression: "2d20kl1" },
];
