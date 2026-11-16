import { db } from "@/db";
import { assets } from "@/db/schema";
import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { assetSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, assetSchema);
    await requireCampaignAccess(actor, body.campaignId);
    const match = body.dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new HttpError(400, "Поддерживаются PNG, JPEG, WEBP и GIF.", "VALIDATION");
    const id = newId("asset");
    await db.insert(assets).values({ id, campaignId: body.campaignId, mime: match[1], data: match[2] });
    return Response.json({ url: `/api/assets/${id}` }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
