"use client";

import { motion } from "framer-motion";
import { Dices, EyeOff, Lock, MessageCircle, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/dnd/avatar";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import { useReact, useSendMessage } from "@/lib/queries";
import { cn, formatTime } from "@/lib/utils";

const EMOJIS = ["🔥", "💀", "😱", "😂", "👍", "🎲"];

export default function ChatPage() {
  const { snapshot, campaign, actor, isDm } = useHub();
  const send = useSendMessage();
  const react = useReact();
  const [text, setText] = useState("");
  const [recipient, setRecipient] = useState("");
  const [secret, setSecret] = useState(false);
  const [filter, setFilter] = useState<"all" | "private">("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  const people = useMemo(() => {
    if (!snapshot || !campaign) return [];
    const ids = new Set([campaign.dmId, ...snapshot.members.map((member) => member.userId)]);
    return snapshot.profiles.filter((profile) => ids.has(profile.id) && profile.id !== actor?.id);
  }, [snapshot, campaign, actor?.id]);

  const messages = (snapshot?.messages ?? []).filter((message) => filter === "all" || message.recipientId);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length]);

  if (!snapshot || !campaign || !actor) return <PageSkeleton />;
  const nameOf = (id: string | null) => snapshot.profiles.find((profile) => profile.id === id)?.displayName ?? "игрок";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    send.mutate({ campaignId: campaign.id, body, recipientId: recipient || null, kind: recipient ? (secret && isDm ? "secret" : "whisper") : "chat" }, { onSuccess: () => setText("") });
  };

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col pb-2 md:h-[calc(100vh-8rem)]">
      <PageHeader eyebrow="Таверна" title="Чат кампании" description="Команда /roll 2d6+3 бросает кубики прямо в чат. Выберите получателя, чтобы прошептать лично." className="mb-3"
        action={<Select value={filter} onChange={(event) => setFilter(event.target.value as "all" | "private")} className="h-9 w-40 text-xs"><option value="all">Все сообщения</option><option value="private">Только личные</option></Select>} />

      <div className="glass thin-scrollbar flex-1 space-y-2 overflow-y-auto rounded-2xl p-3 sm:p-4">
        {messages.length ? messages.map((message) => {
          const mine = message.authorId === actor.id;
          const reactions = Object.entries(message.reactions);
          if (message.kind === "system") {
            return <div key={message.id} className="mx-auto max-w-md rounded-xl border border-gold/20 bg-gold/[0.06] px-3 py-1.5 text-center text-xs text-parchment/85">{message.body} <span className="text-[10px] text-muted-ink">· {formatTime(message.createdAt)}</span></div>;
          }
          return (
            <motion.div key={message.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("group flex gap-2", mine && "flex-row-reverse")}>
              <Avatar name={message.authorName} src={snapshot.profiles.find((profile) => profile.id === message.authorId)?.avatarUrl} size="sm" />
              <div className={cn("max-w-[80%]", mine && "items-end text-right")}>
                <div className={cn("flex items-center gap-1.5 text-[10px] text-muted-ink", mine && "justify-end")}>
                  <span className="font-semibold text-parchment/80">{message.authorName}</span>
                  {message.kind === "whisper" ? <Badge variant="info" className="normal-case tracking-normal"><Lock className="h-2.5 w-2.5" />{mine ? `→ ${nameOf(message.recipientId)}` : "шёпот вам"}</Badge> : null}
                  {message.kind === "secret" ? <Badge variant="crimson" className="normal-case tracking-normal"><EyeOff className="h-2.5 w-2.5" />тайная записка{mine ? ` → ${nameOf(message.recipientId)}` : ""}</Badge> : null}
                  <span>{formatTime(message.createdAt)}</span>
                </div>
                <div className={cn("mt-0.5 inline-block rounded-2xl px-3 py-2 text-left text-sm leading-relaxed",
                  message.kind === "roll" ? "border border-gold/30 bg-gold/10" : message.kind === "secret" ? "border border-crimson/40 bg-crimson/15" : message.kind === "whisper" ? "border border-sky-400/25 bg-sky-500/10" : mine ? "bg-gold/15 text-parchment" : "bg-white/[0.06] text-parchment/90")}>
                  {message.kind === "roll" ? (
                    <span className="flex items-center gap-2"><Dices className="h-4 w-4 text-gold" /><span className="font-mono text-gold">{message.body}</span>
                      {message.data.critical ? <Badge variant="success">NAT 20</Badge> : null}{message.data.fumble ? <Badge variant="crimson">NAT 1</Badge> : null}</span>
                  ) : <span className="whitespace-pre-wrap">{message.body}</span>}
                  {message.kind === "roll" && typeof message.data.breakdown === "string" ? <span className="mt-1 block text-[10px] text-muted-ink">{message.data.breakdown}</span> : null}
                </div>
                <div className={cn("mt-1 flex flex-wrap gap-1", mine && "justify-end")}>
                  {reactions.map(([emoji, users]) => (
                    <button key={emoji} type="button" onClick={() => react.mutate({ messageId: message.id, emoji, actorId: actor.id })} className={cn("rounded-full border px-1.5 text-xs", users.includes(actor.id) ? "border-gold/50 bg-gold/15" : "border-white/10 bg-black/30")}>{emoji} {users.length}</button>
                  ))}
                  <span className="hidden gap-0.5 group-hover:flex">
                    {EMOJIS.filter((emoji) => !message.reactions[emoji]).map((emoji) => <button key={emoji} type="button" onClick={() => react.mutate({ messageId: message.id, emoji, actorId: actor.id })} className="rounded-full px-1 text-xs opacity-60 hover:opacity-100">{emoji}</button>)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        }) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-ink"><MessageCircle className="mb-2 h-8 w-8 text-gold/60" /><p className="text-sm">В таверне тихо. Напишите первым или бросьте /roll 1d20.</p></div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="glass mt-3 flex flex-col gap-2 rounded-2xl p-2.5 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <Select value={recipient} onChange={(event) => setRecipient(event.target.value)} className="h-10 w-full text-xs sm:w-40"><option value="">Всем</option>{people.map((profile) => <option key={profile.id} value={profile.id}>🤫 {profile.displayName}</option>)}</Select>
          {isDm && recipient ? <label className="flex shrink-0 items-center gap-1 text-[11px] text-red-200"><input type="checkbox" checked={secret} onChange={(event) => setSecret(event.target.checked)} className="accent-crimson" />Тайная записка</label> : null}
        </div>
        <Input value={text} onChange={(event) => setText(event.target.value)} placeholder={recipient ? `Шёпот для ${nameOf(recipient)}…` : "Сообщение или /roll 1d20+5"} className="h-10 flex-1" maxLength={2000} />
        <div className="flex gap-2">
          <Button type="button" variant="glass" size="icon" aria-label="Бросить d20" onClick={() => send.mutate({ campaignId: campaign.id, body: "/roll 1d20" })}><Dices className="h-4 w-4" /></Button>
          <Button type="submit" disabled={send.isPending || !text.trim()} className="flex-1 sm:flex-none">{send.isPending ? <Spinner /> : <Send className="h-4 w-4" />}Отправить</Button>
        </div>
      </form>
    </div>
  );
}
