import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureDatabase } from "@/db/seed";
import { createSession, hashPassword, sessionCookie } from "@/lib/server/auth";
import { apiError, HttpError, newId, parseBody } from "@/lib/server/http";
import { registerSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await parseBody(request, registerSchema);
    const [existing] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, body.email)).limit(1);
    if (existing) throw new HttpError(409, "Аккаунт с таким email уже существует. Войдите.", "EMAIL_TAKEN");
    const [profile] = await db.insert(profiles).values({
      id: newId("user"), displayName: body.displayName, role: body.role, email: body.email, passwordHash: hashPassword(body.password),
    }).returning();
    const token = await createSession(profile.id);
    return Response.json({ ok: true, userId: profile.id }, { status: 201, headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (error) {
    return apiError(error);
  }
}
