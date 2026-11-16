import { createHash, randomBytes } from "node:crypto";
import { db } from "@/db";
import { passwordResets } from "@/db/schema";

export const resetHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createResetToken(userId: string, hours: number) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({ tokenHash: resetHash(token), userId, expiresAt: new Date(Date.now() + hours * 3600000) });
  return token;
}

export async function sendResetEmail(email: string, link: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "D&D Master Hub <onboarding@resend.dev>",
      to: [email],
      subject: "Восстановление пароля — D&D Master Hub",
      html: `<p>Вы запросили сброс пароля.</p><p><a href="${link}">Задать новый пароль</a> (ссылка действует 1 час).</p><p>Если это были не вы — просто проигнорируйте письмо.</p>`,
    }),
  }).catch(() => null);
  return Boolean(response?.ok);
}
