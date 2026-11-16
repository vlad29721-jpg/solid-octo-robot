import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards } from "@/db/schema";
import { ensureDatabase } from "@/db/seed";
import { remindCampaign } from "@/lib/server/reminders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const provided = url.searchParams.get("secret") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || provided !== secret) return Response.json({ error: "unauthorized" }, { status: 401 });
  await ensureDatabase();
  const rows = await db.select().from(boards);
  let sent = 0;
  for (const row of rows) {
    const session = row.world.nextSession;
    if (!session || session.reminded) continue;
    const minutes = (new Date(session.at).getTime() - Date.now()) / 60000;
    if (minutes > 0 && minutes <= 90) {
      await remindCampaign(row.campaignId, "⏰ Игра меньше чем через полтора часа!");
      await db.update(boards).set({ world: { ...row.world, nextSession: { ...session, reminded: true } } }).where(eq(boards.campaignId, row.campaignId));
      sent += 1;
    }
  }
  return Response.json({ ok: true, sent });
}
