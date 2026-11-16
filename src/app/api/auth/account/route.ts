import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { hashPassword, requireActor, verifyPassword } from "@/lib/server/auth";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { accountPatchSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const actor = await requireActor(request);
    if (actor.authMode !== "account") throw new HttpError(403, "Доступно только для личного аккаунта.");
    const body = await parseBody(request, accountPatchSchema);
    if (!verifyPassword(body.currentPassword, actor.passwordHash)) throw new HttpError(401, "Текущий пароль неверен.");
    const patch: Partial<typeof profiles.$inferInsert> = {};
    if (body.newEmail && body.newEmail !== actor.email) {
      const [taken] = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.email, body.newEmail), ne(profiles.id, actor.id))).limit(1);
      if (taken) throw new HttpError(409, "Этот email уже занят.");
      patch.email = body.newEmail;
    }
    if (body.newPassword) patch.passwordHash = hashPassword(body.newPassword);
    if (!Object.keys(patch).length) throw new HttpError(400, "Нет изменений.");
    await db.update(profiles).set(patch).where(eq(profiles.id, actor.id));
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
