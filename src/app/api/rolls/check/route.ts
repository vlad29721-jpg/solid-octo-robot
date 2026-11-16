import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, characters, diceRolls } from "@/db/schema";
import { ABILITY_KEYS, ABILITY_LABELS, SKILL_DEFS } from "@/lib/dnd/catalog";
import { abilityModifier, conditionEffects, savingThrow, skillModifier } from "@/lib/dnd/calculations";
import { rollExpression } from "@/lib/dnd/dice";
import type { AbilityKey, SkillKey, Stats } from "@/lib/dnd/types";
import { requireActor } from "@/lib/server/auth";
import { lockCharacter } from "@/lib/server/character-ops";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { checkRollSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, checkRollSchema);
    const result = await db.transaction(async (tx) => {
      const { character } = await lockCharacter(tx, actor, body.characterId);
      const stats = character.stats as Stats;
      const effects = conditionEffects((character.conditions ?? []).map((condition) => condition.id));
      let bonus = 0; let label = ""; let autoFail = false; let disadvantage = false;
      if (body.kind === "skill") {
        if (!(body.key in SKILL_DEFS)) throw new HttpError(400, "Неизвестный навык.");
        bonus = skillModifier(stats, body.key as SkillKey, character.level).total; label = SKILL_DEFS[body.key as SkillKey].label; disadvantage = effects.disadvantageAbilityChecks;
      } else {
        if (!ABILITY_KEYS.includes(body.key as AbilityKey)) throw new HttpError(400, "Неизвестная характеристика.");
        const ability = body.key as AbilityKey;
        if (body.kind === "ability") { bonus = abilityModifier(stats.abilities[ability]); label = `Проверка ${ABILITY_LABELS[ability].long}`; disadvantage = effects.disadvantageAbilityChecks; }
        else { bonus = savingThrow(stats, ability, character.level).total; label = `Спасбросок ${ABILITY_LABELS[ability].long}`; autoFail = effects.autoFailSaves.includes(ability); }
      }
      const inspired = body.useInspiration && Boolean(stats.inspiration);
      const advantage = body.advantage === "advantage" || inspired;
      const dis = body.advantage === "disadvantage" || disadvantage;
      const mode = advantage && dis ? "normal" : advantage ? "advantage" : dis ? "disadvantage" : "normal";
      const d20 = mode === "advantage" ? "2d20kh1" : mode === "disadvantage" ? "2d20kl1" : "1d20";
      const detail = rollExpression(bonus >= 0 ? `${d20}+${bonus}` : `${d20}${bonus}`);
      const natural = detail.parts[0]?.kept[0] ?? 0;
      let secret = false; let success: boolean | null = null; let dc: number | null = null;
      if (body.checkId) {
        const [board] = await tx.select().from(boards).where(eq(boards.campaignId, character.campaignId)).for("update");
        const check = board?.scene.checks?.find((entry) => entry.id === body.checkId && entry.characterId === character.id);
        if (!board || !check) throw new HttpError(404, "Запрос проверки не найден.");
        if (check.result) throw new HttpError(409, "Эта проверка уже выполнена.");
        secret = check.secret; dc = check.dc;
        const passed = !autoFail && detail.total >= check.dc;
        success = passed;
        const checks = (board.scene.checks ?? []).map((entry) => entry.id === check.id ? { ...entry, result: { roll: natural, total: detail.total, success: passed } } : entry);
        await tx.update(boards).set({ scene: { ...board.scene, checks }, updatedAt: new Date() }).where(eq(boards.campaignId, character.campaignId));
      }
      if (inspired) await tx.update(characters).set({ stats: { ...stats, inspiration: false }, updatedAt: new Date() }).where(eq(characters.id, character.id));
      const suffix = mode === "advantage" ? " (преимущество)" : mode === "disadvantage" ? " (помеха)" : "";
      await tx.insert(diceRolls).values({ id: newId("roll"), campaignId: character.campaignId, actorId: actor.id, actorName: `${character.name} · ${label}${suffix}${secret ? " 🔒" : ""}`, expression: detail.expression, result: detail.total, detail: autoFail ? { ...detail, breakdown: `${detail.breakdown} · автопровал из-за состояния` } : detail, hidden: secret ? true : null });
      return secret ? { secret: true, label, mode, inspired } : { secret: false, label, mode, inspired, total: detail.total, natural, autoFail, success, dc, breakdown: detail.breakdown };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
