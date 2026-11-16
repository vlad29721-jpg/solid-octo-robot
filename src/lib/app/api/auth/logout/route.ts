import { destroySession, sessionCookie } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await destroySession(request);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(null) } });
  } catch (error) {
    return apiError(error);
  }
}
