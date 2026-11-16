import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireActor } from "@/lib/server/auth";
import { apiError, HttpError, parseBody } from "@/lib/server/http";
import { profileDto } from "@/lib/server/serialize";
import { profilePatchSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = await parseBody(request, profilePatchSchema);
    const patch: Partial<typeof profiles.$inferInsert> = {};
    if (body.displayName !== undefined) patch.displayName = body.displayName;
    if (body.role !== undefined) patch.role = body.role;
    if (body.avatarUrl !== undefined) patch.avatarUrl = body.avatarUrl;
    if (!Object.keys(patch).length) throw new HttpError(400, "Нет изменений профиля.", "VALIDATION");
    const [updated] = await db.update(profiles).set(patch).where(eq(profiles.id, actor.id)).returning();
    return Response.json({ profile: profileDto(updated) });
  } catch (error) {
    return apiError(error);
  }
}
