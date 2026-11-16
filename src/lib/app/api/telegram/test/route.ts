import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError } from "@/lib/server/http";
import { sendTelegram } from "@/lib/server/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    if (!actor.telegramChatId) throw new HttpError(400, "Сначала сохраните свой Telegram ID.");
    const result = await sendTelegram(actor.telegramChatId, `✅ ${actor.displayName}, уведомления D&D Master Hub подключены!`);
    if (!result.ok) throw new HttpError(502, `Telegram: ${result.error}. Нажмите /start у бота и проверьте ID.`);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
