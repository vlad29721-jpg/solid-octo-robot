import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { authSessions, profiles } from "@/db/schema";
import { ensureDatabase } from "@/db/seed";
import { HttpError } from "./http";

export type AuthMode = "demo" | "account" | "supabase";
export type Actor = typeof profiles.$inferSelect & { authMode: AuthMode };

export const SESSION_COOKIE = "hub_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored?.startsWith("scrypt:")) return false;
  const [, salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(authSessions).values({ tokenHash: tokenHash(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) });
  return token;
}

export async function destroySession(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash(token)));
}

export function sessionCookie(token: string | null): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return token
    ? `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`
    : `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function requireActor(request: Request): Promise<Actor> {
  await ensureDatabase();
  const authorization = request.headers.get("authorization");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (authorization && supabaseUrl && supabaseKey) {
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, "Войдите в аккаунт Supabase заново.", "AUTH");
    const metadata = data.user.user_metadata ?? {};
    await db.insert(profiles).values({
      id: data.user.id,
      displayName: String(metadata.display_name ?? data.user.email?.split("@")[0] ?? "Путешественник"),
      role: metadata.role === "dm" ? "dm" : "player",
      email: data.user.email ?? null,
    }).onConflictDoNothing();
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, data.user.id)).limit(1);
    if (!profile) throw new HttpError(401, "Профиль не найден.", "AUTH");
    return { ...profile, authMode: "supabase" };
  }

  const session = readCookie(request, SESSION_COOKIE);
  if (session) {
    const [row] = await db.select({ profile: profiles }).from(authSessions)
      .innerJoin(profiles, eq(authSessions.userId, profiles.id))
      .where(and(eq(authSessions.tokenHash, tokenHash(session)), gt(authSessions.expiresAt, new Date())))
      .limit(1);
    if (row) return { ...row.profile, authMode: "account" };
  }

  const requested = request.headers.get("x-hub-user-id")?.trim() ?? "";
  const demoId = requested.startsWith("demo-") ? requested : "demo-dm";
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, demoId)).limit(1);
  if (!profile) throw new HttpError(401, "Демо-профиль не найден.", "AUTH");
  return { ...profile, authMode: "demo" };
}
