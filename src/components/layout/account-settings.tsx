"use client";

import { Bell, Dices, KeyRound, Palette, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/api";
import { useAccountPatch, useTelegramTest, useUpdateProfile } from "@/lib/queries";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const MATERIALS = [
  { id: "gold", label: "Золото" }, { id: "obsidian", label: "Обсидиан" }, { id: "crystal", label: "Кристалл" }, { id: "blood", label: "Кровь" }, { id: "bone", label: "Кость" },
] as const;
const ACCENTS = ["#D4AF37", "#E25555", "#4FA3E0", "#4CC38A", "#B58BD6", "#F08A3C"];

export function applyTheme() {
  if (typeof document === "undefined") return;
  const theme = localStorage.getItem("hub-theme") ?? "dark";
  const accent = localStorage.getItem("hub-accent");
  document.documentElement.dataset.theme = theme;
  if (accent) { document.documentElement.style.setProperty("--color-gold", accent); document.documentElement.style.setProperty("--color-gold-soft", accent); }
  else { document.documentElement.style.removeProperty("--color-gold"); document.documentElement.style.removeProperty("--color-gold-soft"); }
}

export function AccountSettings() {
  const { snapshot, actor } = useHub();
  const update = useUpdateProfile();
  const telegramTest = useTelegramTest();
  const accountPatch = useAccountPatch();
  const [telegramId, setTelegramId] = useState("");
  const [theme, setTheme] = useState("dark");
  const [accent, setAccent] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  useEffect(() => { setTheme(localStorage.getItem("hub-theme") ?? "dark"); setAccent(localStorage.getItem("hub-accent")); }, []);
  if (!snapshot || !actor) return null;
  const prefs = actor.prefs ?? {};
  const setLook = (nextTheme: string, nextAccent: string | null) => {
    setTheme(nextTheme); setAccent(nextAccent);
    localStorage.setItem("hub-theme", nextTheme);
    if (nextAccent) localStorage.setItem("hub-accent", nextAccent); else localStorage.removeItem("hub-accent");
    applyTheme();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-parchment"><Palette className="h-4 w-4 text-gold" />Оформление (на этом устройстве)</p>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">{[["dark", "🌙 Тёмная"], ["light", "📜 Светлая (бета)"]].map(([id, label]) => <button key={id} type="button" onClick={() => setLook(id, accent)} className={cn("rounded-lg py-1.5 text-xs font-semibold", theme === id ? "bg-gold text-ink" : "text-muted-ink")}>{label}</button>)}</div>
        <div className="mt-3 flex items-center gap-2"><span className="text-xs text-muted-ink">Акцент:</span>{ACCENTS.map((color) => <button key={color} type="button" aria-label="Цвет" onClick={() => setLook(theme, color === "#D4AF37" ? null : color)} className={cn("h-7 w-7 rounded-full border-2", (accent ?? "#D4AF37") === color ? "border-white" : "border-transparent")} style={{ background: color }} />)}</div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-parchment"><Dices className="h-4 w-4 text-gold" />Мои кубики</p>
        <div className="flex flex-wrap gap-1.5">{MATERIALS.map((material) => <Button key={material.id} size="sm" variant={(prefs.diceMaterial ?? "gold") === material.id ? "gold" : "glass"} onClick={() => update.mutate({ prefs: { diceMaterial: material.id } })}>{material.label}</Button>)}</div>
        <div className="mt-2 flex items-center gap-2"><span className="text-xs text-muted-ink">Цвет:</span><input type="color" defaultValue={prefs.diceColor ?? "#D4AF37"} onBlur={(event) => update.mutate({ prefs: { diceColor: event.target.value } })} className="h-8 w-14 cursor-pointer rounded border border-white/10 bg-transparent" /><span className="text-[11px] text-muted-ink">Его увидят все, когда вы бросаете.</span></div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold text-parchment"><Bell className="h-4 w-4 text-gold" />Telegram-уведомления {snapshot.telegramLinked ? <Badge variant="success">подключено</Badge> : null}</p>
        {snapshot.capabilities.telegram ? (
          <>
            <p className="text-[11px] leading-relaxed text-muted-ink">1) Откройте бота кампании в Telegram и нажмите <b>/start</b>. 2) Узнайте свой ID у <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-gold underline">@userinfobot</a>. 3) Вставьте число ниже.</p>
            <div className="mt-2 flex gap-2"><Input value={telegramId} onChange={(event) => setTelegramId(event.target.value.replace(/[^\d-]/g, ""))} placeholder={snapshot.telegramLinked ? "ID сохранён — введите новый для замены" : "123456789"} className="h-9" />
              <Button size="sm" disabled={!telegramId} onClick={() => update.mutate({ telegramChatId: telegramId }, { onSuccess: () => setTelegramId("") })}>Сохранить</Button>
              <Button size="sm" variant="outline" disabled={!snapshot.telegramLinked || telegramTest.isPending} onClick={() => telegramTest.mutate(undefined)}><Send className="h-3.5 w-3.5" /></Button></div>
            {snapshot.telegramLinked ? <button type="button" className="mt-1 text-[11px] text-muted-ink underline" onClick={() => update.mutate({ telegramChatId: null })}>Отключить</button> : null}
          </>
        ) : <p className="text-[11px] text-muted-ink">Мастеру нужно добавить переменную <code className="text-gold">TELEGRAM_BOT_TOKEN</code> на Vercel (бот создаётся у @BotFather).</p>}
      </section>

      {snapshot.authMode === "account" ? (
        <section className="space-y-2 rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-parchment"><KeyRound className="h-4 w-4 text-gold" />Смена email или пароля</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <FieldGroup label="Текущий пароль"><Input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} /></FieldGroup>
            <FieldGroup label="Новый email"><Input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder={actor.email ?? ""} /></FieldGroup>
            <FieldGroup label="Новый пароль"><Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></FieldGroup>
          </div>
          <Button size="sm" disabled={!current || (!newEmail && newPassword.length < 6) || accountPatch.isPending} onClick={() => accountPatch.mutate({ currentPassword: current, newEmail: newEmail || undefined, newPassword: newPassword || undefined }, { onSuccess: () => { setCurrent(""); setNewEmail(""); setNewPassword(""); } })}>Сохранить изменения</Button>
        </section>
      ) : (
        <section className="space-y-2 rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <p className="text-sm font-bold text-parchment">Забыли пароль?</p>
          <div className="flex gap-2"><Input type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} placeholder="ваш email" className="h-9" />
            <Button size="sm" variant="outline" disabled={!forgotEmail.includes("@")} onClick={async () => {
              try { const result = await apiFetch<{ emailConfigured: boolean }>("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email: forgotEmail }) });
                toast.info(result.emailConfigured ? "Если аккаунт существует, письмо отправлено" : "Почта не настроена на сервере", result.emailConfigured ? "Проверьте входящие и спам." : "Попросите Мастера: «Кампании → Участники → ключ» создаст ссылку для сброса.");
              } catch (error) { toast.error("Ошибка", error instanceof Error ? error.message : ""); }
            }}>Восстановить</Button></div>
        </section>
      )}
    </div>
  );
}
