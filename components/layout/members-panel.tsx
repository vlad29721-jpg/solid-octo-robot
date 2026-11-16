"use client";

import { Crown, Download, KeyRound, RefreshCw, Upload, UserMinus } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { Avatar } from "@/components/dnd/avatar";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/api";
import { useHubStore } from "@/lib/store";
import { useImportCampaign, useMemberAction } from "@/lib/queries";
import { toast } from "@/lib/toast";
import { copyText } from "@/lib/utils";

export function MembersPanel() {
  const { snapshot, campaign, isDm, actor } = useHub();
  const action = useMemberAction();
  const importCampaign = useImportCampaign();
  const [confirm, setConfirm] = useState<{ type: "kick" | "transfer"; userId: string; name: string } | null>(null);
  if (!snapshot || !campaign) return null;
  const members = snapshot.members.filter((member) => member.userId !== campaign.dmId);
  const dm = snapshot.profiles.find((profile) => profile.id === campaign.dmId);

  const exportFile = async () => {
    const { currentUserId, authToken } = useHubStore.getState();
    const response = await fetch(`/api/campaigns/${campaign.id}/export`, { headers: { "x-hub-user-id": currentUserId, ...(authToken ? { authorization: `Bearer ${authToken}` } : {}) } });
    if (!response.ok) { toast.error("Экспорт не удался"); return; }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${campaign.title}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Резервная копия скачана");
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try { importCampaign.mutate({ data: JSON.parse(await file.text()) as Record<string, unknown> }); }
    catch { toast.error("Файл повреждён", "Нужен JSON, скачанный кнопкой «Экспорт»."); }
  };
  void apiFetch;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/[0.06] p-3"><Avatar name={dm?.displayName ?? "Мастер"} src={dm?.avatarUrl} size="md" /><div className="flex-1"><p className="text-sm text-parchment">{dm?.displayName ?? "Мастер"}</p><p className="text-[11px] text-muted-ink">Мастер кампании</p></div><Crown className="h-5 w-5 text-gold" /></div>
      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.userId} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/25 p-3">
            <Avatar name={member.displayName} src={member.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm text-parchment">{member.displayName}</p><p className="text-[10px] text-muted-ink">{snapshot.characters.filter((character) => character.ownerId === member.userId).map((character) => character.name).join(", ") || "без персонажа"}</p></div>
            {member.userId === actor?.id ? <Badge variant="info">Вы</Badge> : null}
            {isDm ? (
              <div className="flex gap-1">
                {!member.userId.startsWith("demo-") ? <Button size="sm" variant="glass" title="Ссылка для сброса пароля" onClick={() => action.mutate({ campaignId: campaign.id, action: "reset-link", userId: member.userId }, { onSuccess: async (data) => { const url = `${window.location.origin}${data.link}`; await copyText(url); toast.success("Ссылка скопирована", "Отправьте её игроку — действует 24 часа."); } })}><KeyRound className="h-3.5 w-3.5" /></Button> : null}
                <Button size="sm" variant="glass" title="Передать права Мастера" onClick={() => setConfirm({ type: "transfer", userId: member.userId, name: member.displayName })}><Crown className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="danger" title="Исключить" onClick={() => setConfirm({ type: "kick", userId: member.userId, name: member.displayName })}><UserMinus className="h-3.5 w-3.5" /></Button>
              </div>
            ) : null}
          </div>
        ))}
        {!members.length ? <p className="text-center text-sm text-muted-ink">Игроков пока нет. Поделитесь кодом приглашения.</p> : null}
      </div>
      {isDm ? (
        <>
          <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/25 p-3">
            <span className="flex-1 font-mono text-sm tracking-widest text-gold">{campaign.inviteCode}</span>
            <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate({ campaignId: campaign.id, action: "regenerate" }, { onSuccess: (data) => toast.success("Новый код приглашения", `${data.inviteCode}. Старый больше не работает.`) })}><RefreshCw className="h-3.5 w-3.5" />Новый код</Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="glass" onClick={() => void exportFile()}><Download className="h-4 w-4" />Экспорт кампании</Button>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-parchment hover:border-gold/30"><Upload className="h-4 w-4" />Импорт из файла<input type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importFile(event)} /></label>
          </div>
          <p className="text-[11px] text-muted-ink">Экспорт сохраняет персонажей, заметки, бой, карты и мир в JSON. Импорт создаёт новую кампанию; все персонажи будут принадлежать вам.</p>
        </>
      ) : null}
      <ConfirmDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.type === "kick" ? `Исключить ${confirm?.name}?` : `Передать кампанию ${confirm?.name}?`}
        description={confirm?.type === "kick" ? "Игрок потеряет доступ к кампании. Его персонажи останутся у вас в списке." : "Этот игрок станет Мастером кампании, а вы — обычным участником. Отменить сможет только новый Мастер."}
        confirmLabel={confirm?.type === "kick" ? "Исключить" : "Передать права"} pending={action.isPending}
        onConfirm={() => confirm && action.mutate({ campaignId: campaign.id, action: confirm.type, userId: confirm.userId }, { onSuccess: () => { toast.success(confirm.type === "kick" ? "Участник исключён" : "Права Мастера переданы"); setConfirm(null); } })} />
    </div>
  );
}
