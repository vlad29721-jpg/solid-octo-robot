import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, campaignMembers, campaigns } from "@/db/schema";
import { formatDate } from "@/lib/utils";
import { notifyUsers } from "./telegram";

export async function remindCampaign(campaignId: string, prefix = "⏰ Скоро игра!") {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  const [board] = await db.select().from(boards).where(eq(boards.campaignId, campaignId)).limit(1);
  if (!campaign || !board?.world.nextSession) return false;
  const members = await db.select({ userId: campaignMembers.userId }).from(campaignMembers).where(eq(campaignMembers.campaignId, campaignId));
  const session = board.world.nextSession;
  await notifyUsers([campaign.dmId, ...members.map((member) => member.userId)], `${prefix}\n«${campaign.title}» — ${session.note || "сессия"}\n🗓 ${formatDate(session.at, true)}`);
  return true;
}
