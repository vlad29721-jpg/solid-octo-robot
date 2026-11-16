import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { ensureDatabase } from "@/db/seed";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  await ensureDatabase();
  const { id } = await context.params;
  const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(asset.data, "base64"), {
    headers: { "Content-Type": asset.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
