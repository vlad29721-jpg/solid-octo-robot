"use client";

import { Check, LogOut, Shield, Upload, UserCog } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import { Avatar } from "@/components/dnd/avatar";
import { useHub } from "@/components/providers/hub-provider";
import { Badge, Spinner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, Input, Label, Switch } from "@/components/ui/field";
import { browserSupabase, supabaseConfigured, uploadAvatar } from "@/lib/supabase";
import { useUpdateProfile } from "@/lib/queries";
import { useHubStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });
}

export function AccountDialog() {
  const open = useHubStore((state) => state.accountDialogOpen);
  const setOpen = useHubStore((state) => state.setAccountDialogOpen);
  const currentUserId = useHubStore((state) => state.currentUserId);
  const setCurrentUserId = useHubStore((state) => state.setCurrentUserId);
  const { actor, snapshot, refetch } = useHub();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState(actor?.displayName ?? "");
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authPending, setAuthPending] = useState(false);

  useEffect(() => setDisplayName(actor?.displayName ?? ""), [actor?.displayName]);
  useEffect(() => {
    if (!browserSupabase) return;
    void browserSupabase.auth.getUser().then(({ data }) => setAuthEmail(data.user?.email ?? null));
    const { data: { subscription } } = browserSupabase.auth.onAuthStateChange((_event, session) => setAuthEmail(session?.user.email ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const switchProfile = async (id: string) => {
    if (authEmail && browserSupabase) await browserSupabase.auth.signOut();
    setCurrentUserId(id);
    void refetch();
    setOpen(false);
    toast.info("Профиль переключён", "Права доступа и видимые данные обновлены.");
  };

  const signIn = async () => {
    if (!browserSupabase) return;
    setAuthPending(true);
    const { error } = await browserSupabase.auth.signInWithPassword({ email, password });
    setAuthPending(false);
    if (error) toast.error("Вход не выполнен", error.message);
    else { toast.success("Вы вошли через Supabase Auth"); setPassword(""); setOpen(false); }
  };

  const signUp = async () => {
    if (!browserSupabase) return;
    setAuthPending(true);
    const { data, error } = await browserSupabase.auth.signUp({
      email, password,
      options: { data: { display_name: email.split("@")[0] || "Путешественник", role: "player" } },
    });
    setAuthPending(false);
    if (error) toast.error("Регистрация не выполнена", error.message);
    else if (!data.session) toast.info("Подтвердите email", "Если подтверждение включено, откройте письмо и войдите.");
    else { toast.success("Аккаунт создан"); setOpen(false); }
  };

  const signOut = async () => {
    if (!browserSupabase) return;
    await browserSupabase.auth.signOut();
    useHubStore.getState().setAuthToken(null);
    setAuthEmail(null);
    void refetch();
    toast.info("Вы вышли из Supabase", "Активен локальный демо-профиль.");
  };

  const handleAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !actor) return;
    if (file.size > 1_500_000) { toast.error("Файл слишком большой", "Для локального демо-режима выберите аватар до 1.5 МБ."); return; }
    try {
      const uploaded = browserSupabase ? await uploadAvatar(file, actor.id) : null;
      const url = uploaded?.publicUrl ?? await readAsDataUrl(file);
      updateProfile.mutate({ avatarUrl: url });
    } catch (error) {
      toast.error("Аватар не загружен", error instanceof Error ? error.message : "Попробуйте другой файл.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Аккаунт и права доступа</DialogTitle>
          <DialogDescription>Переключайте демо-профили, чтобы увидеть правила видимости DM и игрока, или войдите через Supabase Auth.</DialogDescription>
        </DialogHeader>

        {actor ? (
          <div className="parchment-panel mb-5 flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center">
            <label className="relative cursor-pointer">
              <Avatar name={actor.displayName} src={actor.avatarUrl} size="xl" />
              <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-gold/40 bg-ink text-gold"><Upload className="h-3.5 w-3.5" /></span>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleAvatar(event)} />
            </label>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="font-display text-xl text-parchment">{actor.displayName}</p><Badge variant={actor.role === "dm" ? "gold" : "info"}>{actor.role === "dm" ? "Мастер" : "Игрок"}</Badge></div>
              <p className="mt-1 truncate text-xs text-muted-ink">{actor.email ?? "Локальный демо-профиль"} · {actor.id}</p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <FieldGroup label="Имя" className="min-w-40 flex-1"><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></FieldGroup>
                <Button variant="outline" size="sm" disabled={updateProfile.isPending || displayName.trim() === actor.displayName} onClick={() => updateProfile.mutate({ displayName: displayName.trim() })}>Сохранить</Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-black/25 p-3">
              <Label className="mb-0 text-center">Роль DM</Label>
              <Switch checked={actor.role === "dm"} onCheckedChange={(checked) => updateProfile.mutate({ role: checked ? "dm" : "player" })} />
              {updateProfile.isPending ? <Spinner className="h-3 w-3 text-gold" /> : null}
            </div>
          </div>
        ) : null}

        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2"><UserCog className="h-4 w-4 text-gold" /><h3 className="text-sm font-bold uppercase tracking-[0.16em] text-parchment/80">Демо-профили</h3></div>
          <div className="grid gap-2 sm:grid-cols-3">
            {snapshot?.profiles.map((profile) => (
              <button key={profile.id} type="button" onClick={() => void switchProfile(profile.id)} className={cn("flex items-center gap-2.5 rounded-2xl border p-3 text-left transition", profile.id === currentUserId && !authEmail ? "border-gold/50 bg-gold/[0.08]" : "border-white/[0.08] bg-black/25 hover:border-gold/30")}>
                <Avatar name={profile.displayName} src={profile.avatarUrl} size="md" />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-parchment">{profile.displayName}</p><p className="text-[10px] text-muted-ink">{profile.role === "dm" ? "Видит всё" : "Свой лист"}</p></div>
                {profile.id === currentUserId && !authEmail ? <Check className="h-4 w-4 shrink-0 text-gold" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <div className="mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-gold" /><h3 className="text-sm font-bold uppercase tracking-[0.16em] text-parchment/80">Supabase Auth</h3><Badge variant={supabaseConfigured ? "success" : "muted"}>{supabaseConfigured ? "настроен" : "демо-режим"}</Badge></div>
          {!supabaseConfigured ? <p className="text-sm leading-relaxed text-muted-ink">Добавьте <code className="text-gold">NEXT_PUBLIC_SUPABASE_URL</code> и <code className="text-gold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> в <code>.env.local</code>, чтобы включить вход, Realtime и Storage. Сейчас работает локальная проверка прав и polling-синхронизация.</p> : authEmail ? (
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-parchment">Вошли как <span className="text-gold">{authEmail}</span></p><Button variant="danger" size="sm" onClick={() => void signOut()}><LogOut className="h-3.5 w-3.5" />Выйти</Button></div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldGroup label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="master@example.com" /></FieldGroup>
                <FieldGroup label="Пароль"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></FieldGroup>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row"><Button variant="gold" className="flex-1" disabled={authPending || !email || !password} onClick={() => void signIn()}>{authPending ? <Spinner /> : null}Войти</Button><Button variant="outline" className="flex-1" disabled={authPending || !email || password.length < 6} onClick={() => void signUp()}>Создать аккаунт</Button></div>
              {password.length > 0 && password.length < 6 ? <p className="text-xs text-muted-ink">Минимум 6 символов для пароля.</p> : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
