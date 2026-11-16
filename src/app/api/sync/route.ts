import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const campaignId = new URL(request.url).searchParams.get("campaignId");
    if (!campaignId) throw new HttpError(400, "campaignId обязателен.");
    await requireCampaignAccess(actor, campaignId);
    const result = await db.execute(sql`select concat_ws('|',
      (select max(updated_at)::text from encounters where campaign_id = ${campaignId}),
      (select count(*)::text || ':' || coalesce(max(created_at)::text, '') from dice_rolls where campaign_id = ${campaignId}),
      (select count(*)::text || ':' || coalesce(max(updated_at)::text, '') from characters where campaign_id = ${campaignId}),
      (select count(*)::text from sessions where campaign_id = ${campaignId}),
      (select updated_at::text from boards where campaign_id = ${campaignId}),
      (select count(*)::text || ':' || coalesce(max(updated_at)::text, '') from messages where campaign_id = ${campaignId}),
      (select count(*)::text from campaign_members where campaign_id = ${campaignId}),
      (select role from profiles where id = ${actor.id})
    ) as v`);
    const raw = String((result.rows[0] as { v?: string } | undefined)?.v ?? "");
    return Response.json({ version: createHash("sha1").update(raw).digest("hex").slice(0, 16) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
