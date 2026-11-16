"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen, Bot, ChevronDown, Copy, Dices, Globe2, LayoutDashboard, Map as MapIcon, MessageCircle, Monitor, Music2, Radio, RefreshCw,
  ScrollText, Shield, Sparkles, Store, Swords, Users, Wifi, WifiOff, Mic, MoreHorizontal, X,
} from "lucide-react";
import { SceneLayer } from "@/components/scene/scene-layer";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/dnd/avatar";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/ui/page-header";
import { useHub } from "@/components/providers/hub-provider";
import { copyText, cn, relativeTime } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useHubStore } from "@/lib/store";
import { AccountDialog } from "./account-dialog";
import { CampaignDialog } from "./campaign-dialog";
import { QuickRollDialog } from "./quick-roll-dialog";

const ALL_NAV = [
  { href: "/", label: "Обзор", icon: LayoutDashboard, dmOnly: false },
  { href: "/characters", label: "Листы", icon: Users, dmOnly: false },
  { href: "/map", label: "Карта", icon: MapIcon, dmOnly: false },
  { href: "/initiative", label: "Бой", icon: Swords, dmOnly: false },
  { href: "/dice", label: "Кубики", icon: Dices, dmOnly: false },
  { href: "/chat", label: "Чат", icon: MessageCircle, dmOnly: false },
  { href: "/voice", label: "Голос", icon: Mic, dmOnly: false },
  { href: "/world", label: "Мир", icon: Globe2, dmOnly: false },
  { href: "/economy", label: "Торговля", icon: Store, dmOnly: false },
  { href: "/music", label: "Песенник", icon: Music2, dmOnly: false },
  { href: "/scene", label: "Сцена", icon: Sparkles, dmOnly: true },
  { href: "/codex", label: "Кодекс", icon: BookOpen, dmOnly: false },
  { href: "/journal", label: "Журнал", icon: ScrollText, dmOnly: false },
  { href: "/ai", label: "ИИ", icon: Bot, dmOnly: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { snapshot, isLoading, isError, error, refetch, campaign, actor, isDm, realtimeMode, lastSyncAt, isFetching } = useHub();
  const setCampaignDialogOpen = useHubStore((state) => state.setCampaignDialogOpen);
  const setAccountDialogOpen = useHubStore((state) => state.setAccountDialogOpen);
  const setQuickRollOpen = useHubStore((state) => state.setQuickRollOpen);
  const NAV_ITEMS = ALL_NAV.filter((item) => !item.dmOnly || isDm);
  const [online, setOnline] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { setMoreOpen(false); }, [pathname]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const unread = snapshot && actor && pathname !== "/chat"
    ? snapshot.messages.filter((message) => message.authorId !== actor.id && Date.now() - new Date(message.createdAt).getTime() < 10 * 60000).length
    : 0;

  if (pathname.startsWith("/screen") || pathname.startsWith("/print") || pathname.startsWith("/reset")) {
    return <div className="relative z-10 min-h-screen">{isLoading ? <div className="p-8"><PageSkeleton /></div> : children}{pathname.startsWith("/screen") ? <SceneLayer big /> : null}</div>;
  }

  const handleCopyInvite = async () => {
    if (!campaign) return;
    const ok = await copyText(campaign.inviteCode);
    if (ok) toast.success("Код приглашения скопирован", campaign.inviteCode);
    else toast.error("Не удалось скопировать код", campaign.inviteCode);
  };

  return (
    <div className="relative z-10 min-h-screen">
      <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col rounded-none border-y-0 border-l-0 px-4 py-5 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-3 px-2">
          <div className="rune-glow float-rune grid h-11 w-11 place-items-center rounded-2xl border border-gold/35 bg-gradient-to-br from-gold/25 to-crimson/25">
            <Dices className="h-6 w-6 text-gold" />
          </div>
          <div className="min-w-0">
            <p className="gold-text font-display text-xl font-bold leading-tight">D&amp;D Master Hub</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">Chronicle &amp; Combat</p>
          </div>
        </Link>

        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-ink/70">Навигация</p>
        <nav className="thin-scrollbar flex-1 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "text-gold" : "text-parchment/65 hover:bg-white/[0.05] hover:text-parchment")}>
                {active ? <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-xl border border-gold/20 bg-gold/[0.09]" transition={{ type: "spring", stiffness: 380, damping: 32 }} /> : null}
                <Icon className="relative h-4.5 w-4.5" />
                <span className="relative">{item.label}</span>
                {item.href === "/chat" && unread ? <span className="relative ml-auto rounded-full bg-crimson px-1.5 py-0.5 text-[9px] font-bold text-white">{unread}</span> : null}
              </Link>
            );
          })}
        </nav>

        {campaign ? (
          <div className="parchment-panel mt-4 rounded-2xl p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold/80">Код приглашения</p>
            <button type="button" onClick={handleCopyInvite} className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-left font-mono text-xs font-bold tracking-wider text-parchment transition hover:border-gold/40">
              <span className="truncate">{campaign.inviteCode}</span><Copy className="h-3.5 w-3.5 shrink-0 text-gold" />
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-ink">Откройте приложение на телефоне и введите код, чтобы видеть броски и инициативу в реальном времени.</p>
          </div>
        ) : null}

        <button type="button" onClick={() => setAccountDialogOpen(true)} className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-2.5 text-left transition hover:border-gold/30">
          <Avatar name={actor?.displayName ?? "Мастер"} src={actor?.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-parchment">{actor?.displayName ?? "Загрузка…"}</p>
            <p className="text-[11px] text-muted-ink">{isDm ? "Мастер кампании" : "Игрок"}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-ink" />
        </button>
      </aside>

      <div className="md:pl-[272px]">
        <header className="glass sticky top-0 z-30 rounded-none border-x-0 border-t-0 px-3 py-2.5 sm:px-5">
          <div className="mx-auto flex max-w-[1500px] items-center gap-2 sm:gap-3">
            <Link href="/" className="flex items-center gap-2 md:hidden">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-gold/30 bg-gold/10"><Dices className="h-5 w-5 text-gold" /></div>
              <span className="gold-text font-display text-base font-bold">Master Hub</span>
            </Link>
            <button type="button" onClick={() => setCampaignDialogOpen(true)} className="ml-auto flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-2.5 py-2 text-left transition hover:border-gold/35 sm:px-3 md:ml-0">
              <Shield className="h-4 w-4 shrink-0 text-gold" />
              <span className="min-w-0">
                <span className="block max-w-[120px] truncate text-xs font-semibold text-parchment sm:max-w-[240px] sm:text-sm">{campaign?.title ?? "Выбрать кампанию"}</span>
                <span className="hidden text-[10px] text-muted-ink sm:block">{isDm ? "Мастер · полный доступ" : "Игрок · доступ к своей партии"}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-ink" />
            </button>
            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <Badge variant={realtimeMode === "realtime" ? "success" : "info"} className="normal-case tracking-normal">
                {realtimeMode === "realtime" ? <Wifi className="h-3 w-3" /> : <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />}
                {realtimeMode === "realtime" ? "Supabase Realtime" : "Live polling"}
              </Badge>
              <span className="text-[11px] text-muted-ink">синхр. {relativeTime(lastSyncAt)}</span>
            </div>
            {isDm ? <Button asChild variant="ghost" size="icon" aria-label="ТВ-экран" className="hidden shrink-0 sm:inline-flex"><Link href="/screen" target="_blank"><Monitor className="h-4 w-4" /></Link></Button> : null}
            <Button variant="outline" size="icon" aria-label="Быстрый бросок" onClick={() => setQuickRollOpen(true)} className="shrink-0"><Dices className="h-4 w-4" /></Button>
            <button type="button" aria-label="Аккаунт" onClick={() => setAccountDialogOpen(true)} className="shrink-0 rounded-xl transition hover:ring-2 hover:ring-gold/40"><Avatar name={actor?.displayName ?? "Мастер"} src={actor?.avatarUrl} size="md" /></button>
          </div>
        </header>

        {!online ? <div className="sticky top-[57px] z-20 flex items-center justify-center gap-2 bg-amber-600/90 px-3 py-1.5 text-xs font-semibold text-black"><WifiOff className="h-3.5 w-3.5" />Нет сети — показаны сохранённые данные. Изменения отправятся, когда связь вернётся.</div> : null}
        <main className="mx-auto max-w-[1500px] px-3 pb-[calc(env(safe-area-inset-bottom)+92px)] pt-4 sm:px-6 sm:pt-7 md:pb-10 lg:px-8">
          {isLoading ? <PageSkeleton /> : isError ? (
            <EmptyState title="Не удалось загрузить хронику" description={error?.message ?? "Проверьте подключение к базе данных и попробуйте ещё раз."} actionLabel="Повторить" onAction={refetch} compact />
          ) : !campaign ? (
            <div className="mx-auto max-w-2xl pt-6">
              <EmptyState title="Здесь начнётся ваша сага" description={isDm ? "Создайте первую кампанию, пригласите игроков по коду и соберите партию. Демо-данные уже ждут вас после переключения на профиль Мастера." : "Введите код приглашения Мастера, чтобы увидеть доступную кампанию, своего персонажа и общий журнал."} actionLabel="Открыть кампании" onAction={() => setCampaignDialogOpen(true)} icon={Radio} />
            </div>
          ) : children}
        </main>
      </div>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Все разделы">
          <button type="button" aria-label="Закрыть" onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <motion.div initial={{ y: 260 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="glass absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-3xl border-x-0 border-b-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
            <div className="mb-3 flex items-center justify-between"><p className="font-display text-lg text-parchment">Все разделы</p><button type="button" onClick={() => setMoreOpen(false)} aria-label="Закрыть" className="rounded-lg border border-white/10 p-1.5 text-muted-ink"><X className="h-4 w-4" /></button></div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className={cn("relative flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center text-[11px] font-semibold transition", active ? "border-gold/45 bg-gold/12 text-gold" : "border-white/10 bg-black/25 text-parchment/80")}>
                    <Icon className="h-5 w-5" />
                    <span className="leading-tight">{item.label}</span>
                    {item.href === "/chat" && unread ? <span className="absolute right-2 top-2 rounded-full bg-crimson px-1.5 text-[9px] font-bold text-white">{unread}</span> : null}
                  </Link>
                );
              })}
            </div>
            {campaign ? (
              <button type="button" onClick={() => { setMoreOpen(false); void handleCopyInvite(); }} className="mt-4 flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-left">
                <span><span className="block text-[10px] uppercase tracking-[0.16em] text-muted-ink">Код приглашения</span><span className="font-mono text-sm font-bold tracking-wider text-gold">{campaign.inviteCode}</span></span>
                <Copy className="h-4 w-4 text-gold" />
              </button>
            ) : null}
          </motion.div>
        </div>
      ) : null}

      <Link href="/voice" aria-label="Голосовой чат" className={cn("fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] right-4 z-40 grid h-12 w-12 place-items-center rounded-2xl border shadow-[0_14px_38px_-14px_rgba(0,0,0,0.9)] transition active:scale-95 md:hidden", pathname === "/voice" ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200" : "border-gold/40 bg-black/70 text-gold backdrop-blur-xl")}>
        <Mic className="h-5 w-5" />
      </Link>

      <nav className="glass fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2">
          {[NAV_ITEMS[0], NAV_ITEMS.find((item) => item.href === "/characters"), NAV_ITEMS.find((item) => item.href === "/initiative"), NAV_ITEMS.find((item) => item.href === "/chat")].filter(Boolean).map((item) => {
            if (!item) return null;
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition-colors", active ? "text-gold" : "text-muted-ink")}>
                {active ? <motion.span layoutId="bottom-active" className="absolute inset-0 rounded-xl border border-gold/20 bg-gold/[0.1]" transition={{ type: "spring", stiffness: 400, damping: 32 }} /> : null}
                <Icon className="relative h-5 w-5" />
                <span className="relative whitespace-nowrap">{item.label}</span>
                {item.href === "/chat" && unread ? <span className="absolute right-2 top-1 rounded-full bg-crimson px-1.5 text-[9px] font-bold text-white">{unread}</span> : null}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)} className={cn("relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition-colors", moreOpen ? "text-gold" : "text-muted-ink")}>
            <MoreHorizontal className="h-5 w-5" />
            <span>Ещё</span>
          </button>
        </div>
      </nav>

      <SceneLayer />
      <CampaignDialog />
      <AccountDialog />
      <QuickRollDialog />
      <div className="pointer-events-none fixed bottom-20 left-3 z-20 hidden items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-ink/50 lg:flex">
        <Radio className="h-3 w-3" /> {snapshot?.capabilities.supabaseRealtime ? "Realtime channel active" : "Local sync channel"}
      </div>
    </div>
  );
}
