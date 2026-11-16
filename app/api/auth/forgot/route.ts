import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureDatabase } from "@/db/seed";
import { apiError, parseBody } from "@/lib/server/http";
import { createResetToken, sendResetEmail } from "@/lib/server/resets";
import { forgotSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await parseBody(request, forgotSchema);
    const emailConfigured = Boolean(process.env.RESEND_API_KEY);
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, body.email)).limit(1);
    if (profile?.passwordHash && emailConfigured) {
      const token = await createResetToken(profile.id, 1);
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
      await sendResetEmail(body.email, `${origin}/reset?token=${token}`);
    }
    return Response.json({ ok: true, emailConfigured });
  } catch (error) {
    return apiError(error);
  }
}
