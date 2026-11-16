"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/api";
import { toast } from "@/lib/toast";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async () => {
    if (password.length < 6) { toast.error("Минимум 6 символов"); return; }
    if (password !== repeat) { toast.error("Пароли не совпадают"); return; }
    setPending(true);
    try { await apiFetch("/api/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) }); setDone(true); toast.success("Пароль изменён, вы вошли"); void queryClient.invalidateQueries({ queryKey: ["hub"] }); }
    catch (error) { toast.error("Не получилось", error instanceof Error ? error.message : ""); }
    finally { setPending(false); }
  };
  return (
    <div className="mx-auto max-w-md pt-10">
      <div className="glass space-y-4 rounded-3xl p-6">
        <KeyRound className="mx-auto h-8 w-8 text-gold" />
        <h1 className="text-center font-display text-2xl text-parchment">Новый пароль</h1>
        {!token ? <p className="text-center text-sm text-red-300">В ссылке нет токена. Запросите новую ссылку.</p> : done ? (
          <Button asChild className="w-full"><Link href="/">На главную</Link></Button>
        ) : (
          <>
            <FieldGroup label="Новый пароль"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></FieldGroup>
            <FieldGroup label="Повторите"><Input type="password" value={repeat} onChange={(event) => setRepeat(event.target.value)} autoComplete="new-password" /></FieldGroup>
            <Button className="w-full" disabled={pending} onClick={() => void submit()}>{pending ? <Spinner /> : null}Сохранить пароль</Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return <Suspense fallback={null}><ResetForm /></Suspense>;
}
