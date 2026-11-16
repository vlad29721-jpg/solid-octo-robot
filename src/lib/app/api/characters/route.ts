import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, profiles } from "@/db/schema";
import { CLASS_CATALOG, ITEM_CATALOG, SPELL_CATALOG } from "@/lib/dnd/catalog";
import { defaultSpellSlots } from "@/lib/dnd/calculations";
import { defaultResources, EMPTY_DEATH } from "@/lib/dnd/rules";
import type { InventoryItem, Stats } from "@/lib/dnd/types";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { characterDto } from "@/lib/server/serialize";
import { characterCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const STARTER_KITS: Record<string, string[]> = {
  wizard: ["item-spellbook", "item-bag", "item-rations"],
  cleric: ["item-longsword", "item-shield", "item-holy", "item-bag"],
  paladin: ["item-longsword", "item-shield", "item-holy", "item-bag"],
  rogue: ["item-rapier", "item-leather", "item-thieves", "item-rope"],
  ranger: ["item-shortbow", "item-leather", "item-rope", "item-rations"],
  fighter: ["item-longsword", "item-shield", "item-scale", "item-bag"],
  barbarian: ["item-greataxe", "item-bag", "item-rations"],
  bard: ["item-rapier", "item-leather", "item-bag"],
  warlock: ["item-spellbook", "item-bag", "item-pearl"],
};

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, characterCreateSchema);
    const { isDm } = await requireCampaignAccess(actor, body.campaignId);
    const definition = CLASS_CATALOG[body.classKey];
    const ownerId = isDm && body.ownerId && body.ownerId !== actor.id ? body.ownerId : actor.id;
    if (ownerId !== actor.id) {
      const [owner] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, ownerId)).limit(1);
      if (!owner) throw new HttpError(400, "Выбранный владелец персонажа не существует.", "VALIDATION");
    }

    const stats: Stats = {
      abilities: body.abilities,
      proficientSkills: body.proficientSkills,
      expertiseSkills: body.expertiseSkills.filter((skill) => body.proficientSkills.includes(skill)),
      savingThrowProficiencies: definition?.saveProficiencies ?? [],
      initiativeBonus: body.initiativeBonus ?? 0,
      spellcastingAbility: definition?.spellcastingAbility ?? null,
      coins: { pp: 0, gp: 15 + (body.bonusGold ?? 0), ep: 0, sp: 0, cp: 0 },
      xp: 0,
      race: body.race,
      subclass: body.subclass,
      personality: body.personality,
      feats: [],
      companions: [],
      deathSaves: EMPTY_DEATH,
      hitDiceUsed: 0,
    };
    stats.resources = defaultResources(body.classKey, body.level, stats);
    const starterIds = STARTER_KITS[body.classKey] ?? ["item-bag", "item-rations"];
    const inventory: InventoryItem[] = starterIds.flatMap((id) => {
      const found = ITEM_CATALOG.find((entry) => entry.id === id);
      if (!found) return [];
      return [{ ...found, equipped: found.category === "armor" || found.category === "weapon" || found.category === "shield" || found.id === "item-spellbook" }];
    });
    const isCaster = definition && definition.casterProgression !== "none";
    const startingSpells = isCaster
      ? SPELL_CATALOG.filter((spell) => spell.level === 1).slice(0, body.classKey === "cleric" || body.classKey === "paladin" ? 2 : 3).map((spell) => ({ ...spell, prepared: true }))
      : [];

    const [character] = await db.insert(characters).values({
      id: newId("char"), campaignId: body.campaignId, ownerId, name: body.name,
      classKey: body.classKey, species: body.species, level: body.level,
      hpCurrent: Math.min(body.hpCurrent, body.hpMax), hpMax: body.hpMax, armorClass: body.armorClass,
      stats, inventory,
      spells: { slots: defaultSpellSlots(body.classKey, body.level), used: {}, list: startingSpells },
      conditions: [], avatarUrl: body.avatarUrl || null,
    }).returning();
    return Response.json({ character: characterDto(character) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
