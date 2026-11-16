"use client";

import { LogIn, LogOut, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { useLogin, useLogout, useRegister } from "@/lib/queries";
import { loginSchema, registerSchema } from "@/lib/validation";

export function LocalAuthPanel({ onDone }: { onDone?: () => void }) {
  const { snapshot, actor } = useHub();
  const login = useLogin();
  const register = useRegister();
  const logout = useLogout();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"dm" | "player">("player");
  const [error, setError] = useState("");

  if (snapshot?.authMode === "account" && actor) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.05] p-4">
        <div><p className="text-sm text-parchment">Вы вошли как <span className="font-semibold text-gold">{actor.email}</span></p><p className="text-[11px] text-muted-ink">Личный аккаунт · {actor.role === "dm" ? "Мастер" : "Игрок"}</p></div>
        <Button variant="danger" size="sm" disabled={logout.isPending} onClick={() => logout.mutate(undefined)}><LogOut className="h-3.5 w-3.5" />Выйти</Button>
      </div>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "login") {
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Проверьте поля"); return; }
      login.mutate(parsed.data, { onSuccess: () => onDone?.() });
    } else {
      const parsed = registerSchema.safeParse({ email, password, displayName, role });
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Проверьте поля"); return; }
      register.mutate(parsed.data, { onSuccess: () => onDone?.() });
    }
  };
  const pending = login.isPending || register.isPending;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
      <div className="flex items-center gap-2"><p className="text-sm font-bold uppercase tracking-[0.16em] text-parchment/80">Личный аккаунт</p><Badge variant="gold">email + пароль</Badge></div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
        {(["login", "register"] as const).map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-lg py-1.5 text-xs font-semibold ${mode === item ? "bg-gold text-ink" : "text-muted-ink"}`}>{item === "login" ? "Вход" : "Регистрация"}</button>)}
      </div>
      {mode === "register" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldGroup label="Имя в игре"><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Влад" /></FieldGroup>
          <FieldGroup label="Роль"><Select value={role} onChange={(event) => setRole(event.target.value as "dm" | "player")}><option value="player">Игрок</option><option value="dm">Мастер</option></Select></FieldGroup>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldGroup label="Email"><Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@mail.ru" /></FieldGroup>
        <FieldGroup label="Пароль"><Input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="минимум 6 символов" /></FieldGroup>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? <Spinner /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{mode === "login" ? "Войти" : "Создать аккаунт"}</Button>
      <p className="text-[11px] leading-relaxed text-muted-ink">После входа Мастер создаёт кампанию, а игроки подключаются по коду приглашения. Демо-профили ниже остаются для знакомства.</p>
    </form>
  );
}
