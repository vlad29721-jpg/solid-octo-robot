import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureDatabase } from "@/db/seed";
import { HttpError } from "./http";

export type Actor = typeof profiles.$inferSelect;

export async function requireActor(request: Request): Promise<Actor> {
  await ensureDatabase();
  const authorization = request.headers.get("authorization");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (authorization) {
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token || !supabaseUrl || !supabaseKey) throw new HttpError(401, "Сессия Supabase недействительна или не настроена.", "AUTH");
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, "Войдите в аккаунт Supabase заново.", "AUTH");
    const metadata = data.user.user_metadata ?? {};
    const role = metadata.role === "dm" ? "dm" : "player";
    await db.insert(profiles).values({
      id: data.user.id,
      displayName: String(metadata.display_name ?? metadata.full_name ?? data.user.email?.split("@")[0] ?? "Путешественник"),
      role,
      email: data.user.email ?? null,
      avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    }).onConflictDoNothing();
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, data.user.id)).limit(1);
    if (!profile) throw new HttpError(401, "Профиль не найден.", "AUTH");
    return profile;
  }

  const requestedId = request.headers.get("x-hub-user-id")?.trim() || "demo-dm";
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, requestedId)).limit(1);
  if (!profile) throw new HttpError(401, "Выберите существующий профиль или войдите через Supabase.", "AUTH");
  return profile;
}
