"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Crown, KeyRound, List, Plus, Users } from "lucide-react";
import { MembersPanel } from "./members-panel";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useHub } from "@/components/providers/hub-provider";
import { Badge, Spinner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useCreateCampaign, useJoinCampaign } from "@/lib/queries";
import { useHubStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { cn, copyText, formatDate } from "@/lib/utils";
import { campaignCreateSchema, campaignJoinSchema, type CampaignCreateInput, type CampaignJoinInput } from "@/lib/validation";

type Mode = "list" | "create" | "join" | "members";
const TAB_ITEMS: TabItem<Mode>[] = [
  { value: "list", label: "Кампании", icon: List },
  { value: "create", label: "Создать", icon: Plus },
  { value: "join", label: "Код", icon: KeyRound },
  { value: "members", label: "Участники", icon: Users },
];

export function CampaignDialog() {
  const open = useHubStore((state) => state.campaignDialogOpen);
  const setOpen = useHubStore((state) => state.setCampaignDialogOpen);
  const setAccountDialogOpen = useHubStore((state) => state.setAccountDialogOpen);
  const activeCampaignId = useHubStore((state) => state.activeCampaignId);
  const setActiveCampaignId = useHubStore((state) => state.setActiveCampaignId);
  const { snapshot, isDm, refetch } = useHub();
  const [mode, setMode] = useState<Mode>("list");
  const createMutation = useCreateCampaign();
  const joinMutation = useJoinCampaign();

  const createForm = useForm<z.input<typeof campaignCreateSchema>, unknown, CampaignCreateInput>({
    resolver: zodResolver(campaignCreateSchema),
    defaultValues: { title: "", description: "", status: "active" },
  });
  const joinForm = useForm<z.input<typeof campaignJoinSchema>, unknown, CampaignJoinInput>({
    resolver: zodResolver(campaignJoinSchema),
    defaultValues: { inviteCode: "" },
  });

  const copyCode = async (code: string) => {
    const ok = await copyText(code);
    if (ok) toast.success("Код скопирован", code);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Кампании и приглашения</DialogTitle>
          <DialogDescription>Переключайте хроники, создавайте новую сагу или подключайтесь по коду Мастера.</DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={setMode} items={TAB_ITEMS} className="mb-5" />

        {mode === "list" ? (
          <div className="space-y-2.5">
            {snapshot?.campaigns.length ? snapshot.campaigns.map((campaign) => {
              const active = campaign.id === activeCampaignId;
              return (
                <div key={campaign.id} className={cn("rounded-2xl border p-4 transition", active ? "border-gold/45 bg-gold/[0.07]" : "border-white/[0.08] bg-black/25 hover:border-gold/25")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold text-parchment">{campaign.title}</h3>
                        <Badge variant={campaign.status === "active" ? "success" : campaign.status === "paused" ? "gold" : "muted"}>{campaign.status === "active" ? "Активна" : campaign.status === "paused" ? "Пауза" : "Архив"}</Badge>
                        {campaign.dmId === snapshot.actor.id ? <Badge variant="crimson"><Crown className="h-3 w-3" />DM</Badge> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-ink">{campaign.description || "Описание ещё не написано."}</p>
                      <p className="mt-2 text-[11px] text-muted-ink/70">Создана {formatDate(campaign.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button variant="glass" size="icon-sm" aria-label="Скопировать код" onClick={() => void copyCode(campaign.inviteCode)}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant={active ? "outline" : "gold"} disabled={active} onClick={() => { setActiveCampaignId(campaign.id); void refetch(); setOpen(false); }}>
                        {active ? <><Check className="h-3.5 w-3.5" />Текущая</> : "Открыть"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 rounded-lg border border-white/[0.07] bg-black/35 px-2.5 py-1.5 font-mono text-[11px] tracking-widest text-gold/90">{campaign.inviteCode}</p>
                </div>
              );
            }) : <p className="rounded-2xl border border-dashed border-gold/20 p-8 text-center text-sm text-muted-ink">Пока нет доступных кампаний. Создайте свою или введите код приглашения.</p>}
          </div>
        ) : null}

        {mode === "create" ? (!isDm ? (
          <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-5 text-center">
            <Crown className="mx-auto mb-3 h-7 w-7 text-gold" />
            <h3 className="font-display text-xl text-parchment">Нужна роль Мастера</h3>
            <p className="mt-2 text-sm text-muted-ink">Создавать кампании может профиль с ролью DM. Переключитесь в аккаунте или измените роль своего профиля.</p>
            <Button className="mt-4" variant="outline" onClick={() => { setOpen(false); setAccountDialogOpen(true); }}>Открыть аккаунт</Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data, { onSuccess: () => { createForm.reset(); setMode("list"); setOpen(false); } }))}>
            <FieldGroup label="Название кампании" error={createForm.formState.errors.title?.message}>
              <Input placeholder="Например, Тень над Гримхольмом" {...createForm.register("title")} />
            </FieldGroup>
            <FieldGroup label="Краткая завязка" error={createForm.formState.errors.description?.message}>
              <Textarea placeholder="Тон, место действия и главная тайна…" {...createForm.register("description")} />
            </FieldGroup>
            <FieldGroup label="Статус">
              <Select {...createForm.register("status")}>
                <option value="active">Активна</option><option value="paused">Пауза</option><option value="archived">Архив</option>
              </Select>
            </FieldGroup>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? <Spinner /> : <Plus className="h-4 w-4" />}Создать кампанию</Button>
          </form>
        )) : null}

        {mode === "members" ? <MembersPanel /> : null}

        {mode === "join" ? (
          <form className="space-y-4" onSubmit={joinForm.handleSubmit((data) => joinMutation.mutate(data, { onSuccess: () => { joinForm.reset(); setMode("list"); setOpen(false); } }))}>
            <div className="parchment-panel rounded-2xl p-4 text-sm leading-relaxed text-parchment/80">Попросите у Мастера код из боковой панели. Игрок увидит только своего персонажа и открытые заметки; броски и трекер синхронизируются у всей партии.</div>
            <FieldGroup label="Код приглашения" error={joinForm.formState.errors.inviteCode?.message} hint="Демо-коды: GRIMHOLM-7K и DRAGON-ASH-42">
              <Input className="font-mono uppercase tracking-[0.2em]" placeholder="GRIMHOLM-7K" {...joinForm.register("inviteCode")} />
            </FieldGroup>
            <Button type="submit" className="w-full" disabled={joinMutation.isPending}>{joinMutation.isPending ? <Spinner /> : <KeyRound className="h-4 w-4" />}Присоединиться</Button>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
