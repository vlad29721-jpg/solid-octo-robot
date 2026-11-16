import { requireActor } from "@/lib/server/auth";
import { getCampaignBundle } from "@/lib/server/access";
import { apiError } from "@/lib/server/http";
import { buildHubSnapshot } from "@/lib/server/serialize";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaignId");
    const bundle = await getCampaignBundle(actor, campaignId);
    return Response.json(buildHubSnapshot({
      actor,
      profiles: bundle.allProfiles,
      campaigns: bundle.visibleCampaigns,
      campaign: bundle.campaign,
      characters: bundle.characterRows,
      sessions: bundle.sessionRows,
      encounter: bundle.encounterRows[0] ?? null,
      rolls: bundle.rollRows,
      members: bundle.memberRows,
      board: bundle.board,
      messages: bundle.messageRows,
      canUndo: bundle.canUndo,
    }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
