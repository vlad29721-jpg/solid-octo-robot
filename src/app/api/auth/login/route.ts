import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureDatabase } from "@/db/seed";
import { createSession, sessionCookie, verifyPassword } from "@/lib/server/auth";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await parseBody(request, loginSchema);
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, body.email)).limit(1);
    if (!profile || !verifyPassword(body.password, profile.passwordHash)) throw new HttpError(401, "Неверный email или пароль.", "BAD_CREDENTIALS");
    const token = await createSession(profile.id);
    return Response.json({ ok: true, userId: profile.id }, { headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (error) {
    return apiError(error);
  }
}
