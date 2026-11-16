import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabase } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabase();
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      service: "D&D Master Hub",
      database: "ready",
      supabaseAuth: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health]", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Database error" }, { status: 500 });
  }
}
