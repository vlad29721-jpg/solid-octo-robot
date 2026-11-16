import { requireCampaignAccess } from "@/lib/server/access";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError } from "@/lib/server/http";
import { remindCampaign } from "@/lib/server/reminders";
import { telegramConfigured } from "@/lib/server/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const { campaignId } = await request.json() as { campaignId?: string };
    if (!campaignId) throw new HttpError(400, "campaignId обязателен.");
    const { isDm } = await requireCampaignAccess(actor, campaignId);
    if (!isDm) throw new HttpError(403, "Напоминания отправляет Мастер.");
    if (!telegramConfigured()) throw new HttpError(503, "Добавьте TELEGRAM_BOT_TOKEN в переменные окружения.");
    if (!(await remindCampaign(campaignId, "📣 Напоминание от Мастера"))) throw new HttpError(400, "Сначала назначьте дату сессии.");
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
