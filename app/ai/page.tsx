"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle, Bot, Copy, Dices, Save, ScrollText, Scale, Shuffle, Sparkles, Trash2, UserRound, WandSparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import { rollExpression } from "@/lib/dnd/dice";
import { ApiError } from "@/lib/api";
import { useCreateSession, useDeepseek } from "@/lib/queries";
import { toast } from "@/lib/toast";
import { cn, copyText, formatDate } from "@/lib/utils";
import type { DeepseekInput } from "@/lib/validation";

type Kind = DeepseekInput["kind"];
type HistoryMessage = { role: "user" | "assistant"; content: string };
type Tool = { kind: Kind; title: string; detail: string; icon: typeof Bot; placeholder: string; suggestions: string[] };

const TOOLS: Tool[] = [
  { kind: "npc", title: "Генератор NPC", detail: "Голос, мотив, секрет", icon: UserRound, placeholder: "Создай часовщика, который чинит не часы, а чужие воспоминания…", suggestions: ["Хозяин таверны с долгом перед тенями", "Следопыт, знающий дорогу под городом", "Придворный алхимик с двойным дном"] },
  { kind: "backstory", title: "Предыстория", detail: "Узы, долг, крючки", icon: ScrollText, placeholder: "Мой плут вырос в соборном приюте и боится колокольного звона…", suggestions: ["Воин, переживший чужое воскрешение", "Волшебница, укравшая собственное имя", "Жрец, который сомневается в своём божестве"] },
  { kind: "rules", title: "Судья правил", detail: "Вердикт и пограничные случаи", icon: Scale, placeholder: "Можно ли толкнуть отравленного врага в туманный шаг союзника?", suggestions: ["Бонусное действие и реакция в одном раунде", "Концентрация при одновременно полученном уроне", "Скрытная атака через туман"] },
  { kind: "event", title: "Случайные события", detail: "3 развилки для сцены", icon: Shuffle, placeholder: "Партия ночует у разрушенной обсерватории в пепельную бурю…", suggestions: ["Путешествие через болото", "Бал у подозрительного герцога", "Ночной привал у древнего кургана"] },
  { kind: "custom", title: "Свободный запрос", detail: "Любая помощь Мастеру", icon: WandSparkles, placeholder: "Придумай три названия гильдии и загадку для её двери…", suggestions: ["Описание запаха древней библиотеки", "Короткая загадка для двери", "Награда для третьего уровня"] },
];

export default function AiPage() {
  const { snapshot, campaign } = useHub();
  const deepseek = useDeepseek();
  const createSession = useCreateSession();
  const [kind, setKind] = useState<Kind>("npc");
  const [prompt, setPrompt] = useState("");
  const [includeContext, setIncludeContext] = useState(true);
  const [responses, setResponses] = useState<Partial<Record<Kind, string>>>({});
  const [models, setModels] = useState<Partial<Record<Kind, string>>>({});
  const [history, setHistory] = useState<Record<Kind, HistoryMessage[]>>({ npc: [], backstory: [], rules: [], event: [], custom: [] });

  const tool = TOOLS.find((entry) => entry.kind === kind) ?? TOOLS[0];
  const context = useMemo(() => {
    if (!campaign || !snapshot) return "";
    return [
      `Кампания: ${campaign.title}`,
      `Завязка: ${campaign.description}`,
      `Партия: ${snapshot.characters.map((character) => `${character.name} (${character.classKey}, ур. ${character.level})`).join(", ") || "ещё нет персонажей"}`,
      `Столкновение: ${snapshot.encounter?.state.name ?? "нет"}, раунд ${snapshot.encounter?.state.round ?? 0}`,
      `Последние заметки: ${snapshot.sessions.slice(0, 2).map((session) => session.title).join("; ") || "нет"}`,
      `Последний бросок: ${snapshot.rolls[0] ? `${snapshot.rolls[0].actorName} — ${snapshot.rolls[0].expression} = ${snapshot.rolls[0].result}` : "нет"}`,
    ].join("\n").slice(0, 4000);
  }, [campaign, snapshot]);

  if (!snapshot || !campaign) return <PageSkeleton />;
  const response = responses[kind];
  const errorCode = deepseek.error instanceof ApiError ? deepseek.error.code : undefined;
  const errorTitle = errorCode === "DEEPSEEK_429" || errorCode === "LOCAL_RATE_LIMIT" ? "Лимит запросов" : errorCode === "DEEPSEEK_401" ? "Проблема с ключом" : errorCode === "DEEPSEEK_NOT_CONFIGURED" ? "DeepSeek не настроен" : "Запрос не выполнен";

  const generate = () => {
    if (prompt.trim().length < 3) { toast.error("Уточните запрос", "Минимум 3 символа."); return; }
    deepseek.mutate({
      kind, prompt: prompt.trim(), context: includeContext ? context : undefined,
      conversation: history[kind].slice(-4),
    }, {
      onSuccess: (data) => {
        setResponses((previous) => ({ ...previous, [kind]: data.content }));
        setModels((previous) => ({ ...previous, [kind]: data.model }));
        setHistory((previous) => ({ ...previous, [kind]: [...previous[kind], { role: "user", content: prompt.trim() }, { role: "assistant", content: data.content }].slice(-8) }));
      },
    });
  };

  const saveToJournal = () => {
    if (!response) return;
    createSession.mutate({
      campaignId: campaign.id,
      title: `ИИ · ${tool.title} · ${formatDate(new Date())}`,
      notes: `Запрос:\n${prompt}\n\nОтвет DeepSeek (${models[kind] ?? "deepseek"}):\n${response}`,
      isDmOnly: false,
    });
  };

  const addRandomSeed = () => {
    const seed = rollExpression("1d20").total;
    setPrompt((previous) => `${previous}${previous ? "\n" : ""}Случайный ориентир d20: ${seed}. Используй его как скрытый тон сцены.`);
  };

  return (
    <div className="space-y-5 pb-4">
      <PageHeader eyebrow="Советник Мастера" title="ИИ-студия" description="NPC, предыстории, спорные правила и случайные события. Бесплатные модели через OpenRouter или DeepSeek; ключ остаётся на сервере." action={<Badge variant={snapshot.capabilities.deepseek ? "success" : "crimson"} className="normal-case tracking-normal"><Bot className="h-3 w-3" />{snapshot.capabilities.deepseek ? "ИИ подключён" : "Нужен OPENROUTER_API_KEY"}</Badge>} />

      {!snapshot.capabilities.deepseek ? <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 sm:flex-row sm:items-center"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" /><p className="text-xs leading-relaxed text-amber-100/85">Получите бесплатный ключ на <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-gold underline">openrouter.ai/keys</a> и добавьте его как <code className="font-mono text-gold">OPENROUTER_API_KEY</code> в переменные окружения Vercel, затем пересоберите сайт.</p></div> : null}

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        {TOOLS.map((entry) => {
          const Icon = entry.icon;
          const active = entry.kind === kind;
          return <button key={entry.kind} type="button" onClick={() => setKind(entry.kind)} className={cn("glass group rounded-2xl p-4 text-left transition", active ? "border-gold/50 bg-gold/[0.08]" : "hover:border-gold/25")}><Icon className={cn("h-5 w-5", active ? "text-gold" : "text-muted-ink group-hover:text-gold")} /><p className="mt-3 text-sm font-semibold text-parchment">{entry.title}</p><p className="mt-0.5 text-[11px] text-muted-ink">{entry.detail}</p></button>;
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="glass rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-display text-xl text-parchment">{tool.title}</h2><Badge variant="outline">{history[kind].length / 2} в истории</Badge></div>
          <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-40" placeholder={tool.placeholder} />
          <p className="mt-2 text-[11px] text-muted-ink">Попробуйте:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{tool.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setPrompt(suggestion)} className="rounded-lg border border-white/10 bg-black/25 px-2 py-1 text-left text-[11px] text-parchment/70 transition hover:border-gold/35 hover:text-gold">{suggestion}</button>)}</div>
          <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-xl border border-white/[0.07] bg-black/25 p-3"><input type="checkbox" checked={includeContext} onChange={(event) => setIncludeContext(event.target.checked)} className="mt-0.5 accent-gold" /><span><span className="block text-xs font-semibold text-parchment">Добавить контекст кампании</span><span className="block text-[11px] leading-relaxed text-muted-ink">Название, партия, бой, заметки и последний бросок — до 4000 символов.</span></span></label>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={generate} disabled={deepseek.isPending || prompt.trim().length < 3}>{deepseek.isPending ? <Spinner /> : <Sparkles className="h-4 w-4" />}{deepseek.isPending ? "ИИ думает…" : "Спросить ИИ"}</Button>
            <Button variant="outline" size="sm" onClick={addRandomSeed}><Dices className="h-4 w-4" />Случайный ориентир</Button>
            <Button variant="ghost" size="sm" onClick={() => { setHistory((previous) => ({ ...previous, [kind]: [] })); setResponses((previous) => ({ ...previous, [kind]: undefined })); }}><Trash2 className="h-4 w-4" />Очистить</Button>
          </div>
          {deepseek.isError ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/25 p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-300" /><p className="text-sm font-semibold text-red-200">{errorTitle}</p></div><p className="mt-1.5 text-xs leading-relaxed text-red-100/75">{deepseek.error.message}</p></div> : null}
          <p className="mt-4 text-[11px] leading-relaxed text-muted-ink">Бесплатный режим: OpenRouter автоматически выбирает доступную бесплатную модель. Лимит: 12 запросов в минуту.</p>
        </section>

        <section className="parchment-panel relative flex min-h-[420px] flex-col rounded-3xl p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl text-parchment">Ответ Мастера</h2>{response ? <div className="flex gap-1.5"><Button variant="glass" size="sm" onClick={() => { void copyText(response).then((ok) => ok && toast.success("Ответ скопирован")); }}><Copy className="h-3.5 w-3.5" />Копировать</Button><Button variant="outline" size="sm" disabled={createSession.isPending} onClick={saveToJournal}><Save className="h-3.5 w-3.5" />В журнал</Button></div> : null}</div>
          {response ? (
            <motion.div key={`${kind}-${response.slice(0, 24)}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="thin-scrollbar max-h-[520px] flex-1 overflow-y-auto whitespace-pre-wrap pr-1 text-sm leading-[1.85] text-parchment/85">{response}</motion.div>
          ) : <div className="flex-1"><EmptyState compact title="Свиток пока чист" description="Выберите инструмент, опишите задачу и отправьте запрос. Ответ можно сразу сохранить в журнал кампании." icon={WandSparkles} /></div>}
          {response ? <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gold/10 pt-3 text-[10px] text-muted-ink"><Badge variant="success">AI</Badge><span>Модель: {models[kind] ?? "deepseek-chat"}</span><span className="ml-auto">{prompt.length} символов в запросе</span></div> : null}
        </section>
      </div>
    </div>
  );
}
