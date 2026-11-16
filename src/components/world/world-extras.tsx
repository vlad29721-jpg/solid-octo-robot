"use client";

import { CalendarCheck, Check, Lock, Plus, Trash2, Vote } from "lucide-react";
import { useMemo, useState } from "react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import type { WorldState } from "@/lib/dnd/types";
import { useBoardPatch, usePollVote } from "@/lib/queries";
import { cn, formatDate } from "@/lib/utils";

function usePeople() {
  const { snapshot, campaign } = useHub();
  return useMemo(() => {
    if (!snapshot || !campaign) return [];
    const ids = new Set([campaign.dmId, ...snapshot.members.map((member) => member.userId)]);
    return snapshot.profiles.filter((profile) => ids.has(profile.id));
  }, [snapshot, campaign]);
}

export function PollsPanel() {
  const { snapshot, campaign, isDm, actor } = useHub();
  const patch = useBoardPatch();
  const vote = usePollVote();
  const people = usePeople();
  const [title, setTitle] = useState("Когда играем следующую сессию?");
  const [options, setOptions] = useState(["", "", ""]);
  if (!snapshot?.board || !campaign || !actor) return null;
  const world = snapshot.board.world;
  const polls = world.polls ?? [];
  const save = (next: WorldState) => patch.mutate({ campaignId: campaign.id, patch: { world: next } });
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {polls.length ? [...polls].reverse().map((poll) => {
          const best = Math.max(...poll.options.map((option) => option.votes.length));
          return (
            <div key={poll.id} className="glass rounded-2xl p-4">
              <div className="mb-3 flex items-center gap-2"><Vote className="h-4 w-4 text-gold" /><p className="flex-1 font-display text-lg text-parchment">{poll.title}</p>{poll.closed ? <Badge variant="muted"><Lock className="h-3 w-3" />Закрыто</Badge> : null}
                {isDm ? <><Button size="sm" variant="glass" onClick={() => save({ ...world, polls: polls.map((entry) => entry.id === poll.id ? { ...entry, closed: !entry.closed } : entry) })}>{poll.closed ? "Открыть" : "Закрыть"}</Button><button type="button" aria-label="Удалить" onClick={() => save({ ...world, polls: polls.filter((entry) => entry.id !== poll.id) })}><Trash2 className="h-4 w-4 text-muted-ink" /></button></> : null}</div>
              <div className="space-y-2">
                {poll.options.map((option) => {
                  const mine = option.votes.includes(actor.id);
                  return (
                    <button key={option.id} type="button" disabled={poll.closed} onClick={() => vote.mutate({ campaignId: campaign.id, pollId: poll.id, optionId: option.id, actorId: actor.id })}
                      className={cn("relative w-full overflow-hidden rounded-xl border p-3 text-left transition", mine ? "border-gold/60" : "border-white/10 hover:border-gold/30")}>
                      <span className="absolute inset-y-0 left-0 bg-gold/15 transition-all" style={{ width: `${people.length ? (option.votes.length / people.length) * 100 : 0}%` }} />
                      <span className="relative flex items-center gap-2"><span className={cn("grid h-5 w-5 place-items-center rounded border", mine ? "border-gold bg-gold text-ink" : "border-white/30")}>{mine ? <Check className="h-3 w-3" /> : null}</span>
                        <span className="flex-1 text-sm text-parchment">{formatDate(option.at, true)}</span>
                        {option.votes.length === best && best > 0 ? <Badge variant="gold">Лидер</Badge> : null}
                        <span className="text-xs text-muted-ink">{option.votes.length} · {option.votes.map((id) => people.find((profile) => profile.id === id)?.displayName ?? "?").join(", ")}</span></span>
                    </button>
                  );
                })}
              </div>
              {isDm && !poll.closed ? <Button size="sm" variant="outline" className="mt-3" onClick={() => {
                const winner = [...poll.options].sort((a, b) => b.votes.length - a.votes.length)[0];
                save({ ...world, nextSession: { at: winner.at, note: world.nextSession?.note ?? "Следующая сессия" }, polls: polls.map((entry) => entry.id === poll.id ? { ...entry, closed: true } : entry) });
              }}><CalendarCheck className="h-3.5 w-3.5" />Назначить лидирующую дату</Button> : null}
            </div>
          );
        }) : <p className="glass rounded-2xl p-8 text-center text-sm text-muted-ink">Голосований пока нет.</p>}
      </div>
      {isDm ? (
        <div className="glass h-fit space-y-2 rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Новое голосование</p>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          {options.map((value, index) => <Input key={index} type="datetime-local" value={value} onChange={(event) => setOptions(options.map((entry, i) => i === index ? event.target.value : entry))} />)}
          <Button size="sm" variant="ghost" onClick={() => setOptions([...options, ""].slice(0, 6))}><Plus className="h-3.5 w-3.5" />Ещё вариант</Button>
          <Button className="w-full" disabled={options.filter(Boolean).length < 2} onClick={() => { save({ ...world, polls: [...polls, { id: `poll-${Date.now()}`, title, closed: false, options: options.filter(Boolean).map((at, index) => ({ id: `o${index}-${Date.now()}`, at: new Date(at).toISOString(), votes: [] })) }].slice(-20) }); setOptions(["", "", ""]); }}>Запустить</Button>
        </div>
      ) : null}
    </div>
  );
}

export function AttendancePanel() {
  const { snapshot, campaign, isDm } = useHub();
  const patch = useBoardPatch();
  const people = usePeople().filter((profile) => profile.id !== campaign?.dmId);
  const [title, setTitle] = useState("");
  if (!snapshot?.board || !campaign) return null;
  const world = snapshot.board.world;
  const list = world.attendance ?? [];
  const save = (attendance: WorldState["attendance"]) => patch.mutate({ campaignId: campaign.id, patch: { world: { ...world, attendance } } });
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {people.map((profile) => {
          const count = list.filter((entry) => entry.present.includes(profile.id)).length;
          return <div key={profile.id} className="glass rounded-2xl p-3"><p className="text-sm text-parchment">{profile.displayName}</p><p className="font-display text-2xl text-gold">{count}<span className="text-sm text-muted-ink"> / {list.length}</span></p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/50"><div className="h-full bg-gold" style={{ width: `${list.length ? (count / list.length) * 100 : 0}%` }} /></div></div>;
        })}
      </div>
      {isDm ? (
        <div className="glass flex gap-2 rounded-2xl p-3"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Сессия 5: Катакомбы" /><Button onClick={() => { save([{ id: `att-${Date.now()}`, date: new Date().toISOString(), title: title || `Сессия ${list.length + 1}`, present: people.map((profile) => profile.id) }, ...list]); setTitle(""); }}><Plus className="h-4 w-4" />Отметить сегодня</Button></div>
      ) : null}
      <div className="space-y-2">
        {list.map((entry) => (
          <div key={entry.id} className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3">
            <div className="min-w-40 flex-1"><p className="text-sm text-parchment">{entry.title}</p><p className="text-[11px] text-muted-ink">{formatDate(entry.date)}</p></div>
            {people.map((profile) => {
              const present = entry.present.includes(profile.id);
              return <button key={profile.id} type="button" disabled={!isDm} onClick={() => save(list.map((item) => item.id !== entry.id ? item : { ...item, present: present ? item.present.filter((id) => id !== profile.id) : [...item.present, profile.id] }))} className={cn("rounded-full border px-2 py-0.5 text-[11px]", present ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-muted-ink line-through")}>{profile.displayName}</button>;
            })}
            {isDm ? <button type="button" aria-label="Удалить" onClick={() => save(list.filter((item) => item.id !== entry.id))}><Trash2 className="h-3.5 w-3.5 text-muted-ink" /></button> : null}
          </div>
        ))}
        {!list.length ? <p className="text-center text-sm text-muted-ink">История посещений пуста.</p> : null}
      </div>
    </div>
  );
}

export function ChroniclePanel() {
  const { snapshot } = useHub();
  if (!snapshot?.board) return null;
  type Entry = { at: string; icon: string; text: string };
  const entries: Entry[] = [
    ...snapshot.messages.filter((message) => message.kind === "system" && !message.recipientId).map((message) => ({ at: message.createdAt, icon: "📜", text: message.body })),
    ...snapshot.sessions.map((session) => ({ at: session.sessionDate, icon: "🗓", text: `Сессия: ${session.title}` })),
    ...(snapshot.board.world.quests ?? []).filter((quest) => quest.status !== "active").map((quest) => ({ at: snapshot.board?.updatedAt ?? new Date().toISOString(), icon: quest.status === "done" ? "🏆" : "💀", text: `Квест «${quest.title}» ${quest.status === "done" ? "выполнен" : "провален"}` })),
    ...(snapshot.encounter?.state.log ?? []).filter((event) => /Бой начался|Бой завершён|получил/.test(event.text)).slice(0, 15).map((event) => ({ at: event.at, icon: "⚔️", text: event.text })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 80);
  return (
    <div className="relative mx-auto max-w-2xl space-y-3 border-l border-gold/25 pl-6">
      {entries.map((entry, index) => (
        <div key={`${entry.at}-${index}`} className="relative">
          <span className="absolute -left-[33px] top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-xs">{entry.icon}</span>
          <p className="text-[10px] uppercase tracking-wider text-muted-ink">{formatDate(entry.at, true)}</p>
          <p className="text-sm text-parchment/90">{entry.text}</p>
        </div>
      ))}
      {!entries.length ? <p className="text-sm text-muted-ink">Хроника заполнится сама: повышения уровня, бои, сделки и квесты.</p> : null}
    </div>
  );
}
