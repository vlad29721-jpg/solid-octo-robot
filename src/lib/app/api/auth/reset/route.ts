import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, passwordResets, profiles } from "@/db/schema";
import { ensureDatabase } from "@/db/seed";
import { createSession, hashPassword, sessionCookie } from "@/lib/server/auth";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { resetHash } from "@/lib/server/resets";
import { resetSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await parseBody(request, resetSchema);
    const [reset] = await db.select().from(passwordResets).where(and(eq(passwordResets.tokenHash, resetHash(body.token)), gt(passwordResets.expiresAt, new Date()), isNull(passwordResets.usedAt))).limit(1);
    if (!reset) throw new HttpError(400, "Ссылка устарела или уже использована. Запросите новую.", "BAD_TOKEN");
    await db.update(profiles).set({ passwordHash: hashPassword(body.password) }).where(eq(profiles.id, reset.userId));
    await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.tokenHash, reset.tokenHash));
    await db.delete(authSessions).where(eq(authSessions.userId, reset.userId));
    const token = await createSession(reset.userId);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (error) {
    return apiError(error);
  }
}
