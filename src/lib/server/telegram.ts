import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN);

export async function sendTelegram(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN не задан на сервере." };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { description?: string };
      return { ok: false, error: data.description ?? `Telegram ответил ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Сеть недоступна" };
  }
}

export async function notifyUsers(userIds: string[], text: string) {
  if (!telegramConfigured() || !userIds.length) return;
  try {
    const rows = await db.select({ chatId: profiles.telegramChatId }).from(profiles).where(inArray(profiles.id, [...new Set(userIds)]));
    await Promise.all(rows.filter((row) => row.chatId).map((row) => sendTelegram(row.chatId as string, `🎲 D&D Master Hub\n${text}`)));
  } catch (error) {
    console.error("[telegram]", error);
  }
}
