"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { EyeOff, Plus, ScrollText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar } from "@/components/dnd/avatar";
import { EmptyState } from "@/components/empty-state";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import { useCreateSession } from "@/lib/queries";
import { formatDate, formatTime, relativeTime } from "@/lib/utils";
import { sessionCreateSchema, type SessionCreateInput } from "@/lib/validation";

export default function JournalPage() {
  const { snapshot, campaign, isDm } = useHub();
  const create = useCreateSession();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "public" | "dm">("all");
  const form = useForm<z.input<typeof sessionCreateSchema>, unknown, SessionCreateInput>({
    resolver: zodResolver(sessionCreateSchema),
    defaultValues: {
      campaignId: campaign?.id ?? "demo-campaign-1", title: "", notes: "", isDmOnly: false,
      sessionDate: new Date().toISOString().slice(0, 10),
    },
  });

  const { setValue } = form;
  useEffect(() => { if (campaign) setValue("campaignId", campaign.id); }, [campaign, setValue]);

  const notes = useMemo(() => (snapshot?.sessions ?? []).filter((session) => {
    const matches = `${session.title} ${session.notes}`.toLowerCase().includes(search.toLowerCase());
    return matches && (filter === "all" || (filter === "dm" ? session.isDmOnly : !session.isDmOnly));
  }), [snapshot?.sessions, search, filter]);

  if (!snapshot || !campaign) return <PageSkeleton />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader eyebrow="Хроника партии" title="Журнал сессий" description={isDm ? "Мастер видит все записи, включая скрытые замыслы. Игрокам доступны только заметки без метки «Только DM»." : "Вы видите открытые заметки партии. Скрытые записи Мастера остаются за пределами доступа."} action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Новая заметка</Button>} />

      <div className="glass flex flex-col gap-2 rounded-2xl p-3 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-ink" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по заголовкам и тексту…" className="pl-9" /></div>
        <Select value={filter} onChange={(event) => setFilter(event.target.value as "all" | "public" | "dm")} className="sm:w-48"><option value="all">Все заметки</option><option value="public">Открытые партии</option>{isDm ? <option value="dm">Только DM</option> : null}</Select>
        <Badge variant="gold" className="h-10 items-center justify-center px-3 normal-case tracking-normal">{notes.length} записей</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="space-y-3 xl:col-span-2">
          {notes.length ? notes.map((session, index) => {
            const author = snapshot.profiles.find((profile) => profile.id === session.authorId);
            return (
              <motion.article key={session.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.3) }} className="parchment-panel rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-2">
                  <Avatar name={author?.displayName ?? "Автор"} src={author?.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1"><h2 className="font-display text-xl text-parchment">{session.title}</h2><p className="text-[11px] text-muted-ink">{author?.displayName ?? "Неизвестный автор"} · {formatDate(session.sessionDate)}{session.isDmOnly ? " · скрытая запись" : ""}</p></div>
                  {session.isDmOnly ? <Badge variant="crimson"><EyeOff className="h-3 w-3" />Только DM</Badge> : <Badge variant="success">Партия</Badge>}
                </div>
                <div className="mt-4 whitespace-pre-wrap border-t border-gold/10 pt-3 text-sm leading-[1.8] text-parchment/80">{session.notes}</div>
                <p className="mt-3 text-[10px] text-muted-ink">Сохранено {relativeTime(session.createdAt)}</p>
              </motion.article>
            );
          }) : <EmptyState title={snapshot.sessions.length ? "Записей не найдено" : "Журнал ещё пуст"} description={snapshot.sessions.length ? "Попробуйте другой запрос или фильтр видимости." : "Запишите первую сессию, зацепку или тайный план Мастера — всё сохранится в базе кампании."} actionLabel={snapshot.sessions.length ? undefined : "Создать заметку"} onAction={snapshot.sessions.length ? undefined : () => setOpen(true)} icon={ScrollText} />}
        </section>

        <aside className="glass h-fit rounded-2xl p-4">
          <h2 className="mb-3 font-display text-lg text-parchment">Хроника бросков</h2>
          <div className="thin-scrollbar max-h-[480px] space-y-2 overflow-y-auto pr-1">
            {snapshot.rolls.slice(0, 10).map((roll) => <div key={roll.id} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-black/25 p-2.5"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-gold/20 bg-gold/10 font-display text-sm text-gold">{roll.result}</div><div className="min-w-0 flex-1"><p className="truncate text-xs text-parchment">{roll.actorName} · <span className="font-mono text-gold/80">{roll.expression}</span></p><p className="text-[10px] text-muted-ink">{formatTime(roll.createdAt)}</p></div></div>)}
            {!snapshot.rolls.length ? <p className="py-6 text-center text-xs text-muted-ink">Бросков пока нет.</p> : null}
          </div>
          {isDm ? <p className="mt-4 rounded-xl border border-crimson/25 bg-crimson/10 p-3 text-[11px] leading-relaxed text-red-200/80"><EyeOff className="mr-1 inline h-3 w-3" />Скрытые заметки сервер не отдаёт игрокам даже при прямом запросе.</p> : null}
        </aside>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Запись в журнал</DialogTitle><DialogDescription>Открытая заметка видна всей партии. Скрытую заметку может создать и прочитать только Мастер.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit((data) => create.mutate({ ...data, isDmOnly: isDm ? Boolean(data.isDmOnly) : false }, { onSuccess: () => { form.reset({ ...form.getValues(), title: "", notes: "", isDmOnly: false }); setOpen(false); } }))}>
            <FieldGroup label="Заголовок" error={form.formState.errors.title?.message}><Input placeholder="Сессия 5: Часовщик с улицы Пепла" {...form.register("title")} /></FieldGroup>
            <FieldGroup label="Дата сессии"><Input type="date" {...form.register("sessionDate")} /></FieldGroup>
            <FieldGroup label="Заметки" error={form.formState.errors.notes?.message}><Textarea className="min-h-40" placeholder="Что произошло, кого встретили, какие нити остались…" {...form.register("notes")} /></FieldGroup>
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/25 p-3"><div><p className="text-sm font-semibold text-parchment">Только для Мастера</p><p className="text-[11px] text-muted-ink">{isDm ? "Скрыть запись от игроков" : "Доступно только профилю DM"}</p></div><Switch checked={Boolean(form.watch("isDmOnly"))} disabled={!isDm} onCheckedChange={(checked) => form.setValue("isDmOnly", checked)} /></div>
            <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? <Spinner /> : <Plus className="h-4 w-4" />}Сохранить в хронику</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
