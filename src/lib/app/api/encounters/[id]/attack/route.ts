import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, diceRolls, encounters } from "@/db/schema";
import { rollExpression } from "@/lib/dnd/dice";
import { applyCombatantDamage, withEvent } from "@/lib/dnd/encounter";
import { critDamage } from "@/lib/dnd/rules";
import type { EncounterState } from "@/lib/dnd/types";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { pushHistory } from "@/lib/server/board";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { attackSchema } from "@/lib/validation";
import { applyDamageType } from "@/lib/dnd/content";
import { queueConcentration } from "@/lib/server/concentration";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await requireActor(request);
    const body = await parseBody(request, attackSchema);
    const result = await db.transaction(async (tx) => {
      const [encounter] = await tx.select().from(encounters).where(eq(encounters.id, id)).for("update");
      if (!encounter) throw new HttpError(404, "Бой не найден.", "NOT_FOUND");
      await requireCampaignAccess(actor, encounter.campaignId);
      const state = encounter.state as EncounterState;
      const target = state.combatants.find((item) => item.id === body.targetId);
      if (!target) throw new HttpError(404, "Цель не найдена в бою.", "NOT_FOUND");
      const d20 = body.advantage === "advantage" ? "2d20kh1" : body.advantage === "disadvantage" ? "2d20kl1" : "1d20";
      const attack = rollExpression(body.toHit >= 0 ? `${d20}+${body.toHit}` : `${d20}${body.toHit}`);
      const natural = attack.parts[0]?.kept[0] ?? 0;
      const crit = !body.autoHit && natural === 20;
      const hit = body.autoHit || crit || (natural !== 1 && attack.total >= target.ac);
      let damageTotal = 0;
      let damageBreakdown = "";
      let typeNote = "";
      const rolls = [{ label: `${body.attackerName} · ${body.attackName} → ${target.name}`, detail: attack }];
      if (hit) {
        let damage;
        try { damage = rollExpression(crit ? critDamage(body.damage) : body.damage); } catch { throw new HttpError(400, "Неверная формула урона."); }
        const typed = applyDamageType(Math.max(0, damage.total), body.damageType, target);
        damageTotal = typed.amount;
        typeNote = typed.note;
        damageBreakdown = damage.breakdown;
        rolls.push({ label: `${body.attackerName} · урон${crit ? " (крит)" : ""}`, detail: damage });
      }
      let next = state;
      if (hit && damageTotal > 0) next = applyCombatantDamage(next, target.id, damageTotal);
      const verdict = body.autoHit ? `${body.attackName}: ${damageTotal} урона` : crit ? `КРИТ! ${damageTotal} урона` : hit ? `попадание (${attack.total} против КД ${target.ac}), ${damageTotal} урона` : natural === 1 ? "естественная 1 — промах" : `промах (${attack.total} против КД ${target.ac})`;
      next = withEvent(next, `${body.attackerName} → ${target.name}: ${verdict}${typeNote ? ` (${typeNote})` : ""}.`);
      await tx.update(encounters).set({ state: next, history: pushHistory(state, encounter.history), updatedAt: new Date() }).where(eq(encounters.id, id));
      const after = next.combatants.find((item) => item.id === target.id);
      if (target.sourceCharacterId && after) {
        await tx.update(characters).set({ hpCurrent: after.hp, updatedAt: new Date() }).where(eq(characters.id, target.sourceCharacterId));
        if (hit) await queueConcentration(tx, target.sourceCharacterId, damageTotal);
      }
      for (const roll of rolls) await tx.insert(diceRolls).values({ id: newId("roll"), campaignId: encounter.campaignId, actorId: actor.id, actorName: roll.label, expression: roll.detail.expression, result: roll.detail.total, detail: roll.detail });
      return { hit, crit, natural, attackTotal: attack.total, damage: damageTotal, damageBreakdown, targetName: target.name, targetHp: after?.hp ?? target.hp, verdict: typeNote ? `${verdict} — ${typeNote}` : verdict };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
