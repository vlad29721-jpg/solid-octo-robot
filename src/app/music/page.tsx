"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDown, ArrowUp, ExternalLink, Github, ListMusic, Music2, Pause, Play, Plus, RefreshCw,
  Search, Shuffle, SkipBack, SkipForward, Square, Trash2, Volume2, X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Input, Select } from "@/components/ui/field";
import { Badge, Spinner } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import type { MusicState, SongRef } from "@/lib/dnd/types";
import { formatDuration, isGitHubAudioUrl, MOODS, musicPosition, saveCustomSongs, songToRef, usePlaylist, type SongDef } from "@/lib/playlist";
import { useBoardPatch } from "@/lib/queries";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function MusicPage() {
  const { snapshot, campaign, isDm } = useHub();
  const patch = useBoardPatch();
  const { tracks, sources, refetchCustom, isLoading } = usePlaylist();
  const [search, setSearch] = useState("");
  const [mood, setMood] = useState("all");
  const [remote, setRemote] = useState<SongDef[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDuration, setCustomDuration] = useState(180);
  const [, setTick] = useState(0);

  const scene = snapshot?.board?.scene;
  const music = scene?.music;
  const timeline = music?.timeline ?? [];
  const pos = music?.playing && timeline.length ? musicPosition(timeline, music.startedAt, music.offset ?? 0, music.loop ?? false) : null;
  const current = pos && !pos.finished ? timeline[pos.index] : timeline[0];

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const catalog = useMemo(() => {
    const merged = new Map<string, SongDef>();
    tracks.forEach((song) => merged.set(song.id, song));
    remote.forEach((song) => { if (!merged.has(song.id)) merged.set(song.id, song); });
    return [...merged.values()];
  }, [tracks, remote]);
  const filtered = useMemo(() => catalog.filter((song) =>
    `${song.title} ${song.author ?? ""} ${song.mood}`.toLowerCase().includes(search.toLowerCase()) && (mood === "all" || song.mood === mood),
  ), [catalog, search, mood]);

  if (!snapshot || !campaign || !scene) return <PageSkeleton />;

  const setMusic = (next: MusicState | null) => patch.mutate({ campaignId: campaign.id, patch: { scene: { ...scene, music: next } } });
  const play = (songs: SongRef[], offset = 0, keepVolume = true) => {
    if (!songs.length) return;
    setMusic({
      track: "github", trackId: songs[0].id, title: songs[0].title, customUrl: songs[0].url, timeline: songs,
      playing: true, volume: keepVolume ? (music?.volume ?? 0.7) : 0.7, startedAt: new Date().toISOString(), offset, loop: music?.loop ?? false,
    });
  };
  const playNow = (song: SongDef) => { play([songToRef(song)]); toast.success("Играет у всей партии", song.title); };
  const enqueue = (song: SongDef) => {
    if (!timeline.length) { play([songToRef(song)]); return; }
    setMusic({ ...(music as MusicState), timeline: [...timeline, songToRef(song)] });
    toast.success("Добавлено в очередь", song.title);
  };
  const pause = () => {
    if (!music?.playing || !timeline.length) return;
    const position = musicPosition(timeline, music.startedAt, music.offset ?? 0, music.loop ?? false);
    setMusic({ ...music, playing: false, offset: position?.position ?? 0, startedAt: new Date().toISOString() });
  };
  const resume = () => {
    if (!music || !timeline.length) return;
    setMusic({ ...music, playing: true, startedAt: new Date().toISOString() });
  };
  const skip = (direction: -1 | 1) => {
    if (!timeline.length) return;
    const index = (pos?.index ?? 0) + direction;
    if (index < 0 || index >= timeline.length) { toast.info(direction > 0 ? "Конец очереди" : "Это первый трек"); return; }
    play(timeline.slice(index), 0);
  };
  const removeAt = (index: number) => {
    if (!music || index === pos?.index) return;
    setMusic({ ...music, timeline: timeline.filter((_, i) => i !== index) });
  };
  const move = (index: number, delta: number) => {
    if (!music || index + delta < 0 || index + delta >= timeline.length || index === pos?.index || index + delta === pos?.index) return;
    const next = [...timeline];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setMusic({ ...music, timeline: next });
  };

  const refreshGithub = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/music/github?refresh=1");
      if (!response.ok) throw new Error("GitHub API недоступен");
      const data = await response.json() as { tracks: SongDef[]; count: number };
      setRemote(data.tracks);
      toast.success(`Каталог GitHub обновлён`, `Найдено ${data.tracks.length} CC0-треков`);
    } catch (error) {
      toast.error("Не удалось обновить каталог", error instanceof Error ? error.message : "Попробуйте позже");
    } finally {
      setRefreshing(false);
    }
  };

  const addCustom = (event: FormEvent) => {
    event.preventDefault();
    const url = customUrl.trim();
    if (!/^https:\/\//.test(url)) { toast.error("Нужна ссылка https://", "Например, raw.githubusercontent.com/.../track.mp3"); return; }
    if (!isGitHubAudioUrl(url)) toast.info("Ссылка не с GitHub", "Трек всё равно добавлен — главное, чтобы файл был доступен по https.");
    const song: SongDef = {
      id: `custom-${Date.now()}`, title: customTitle.trim() || url.split("/").pop()?.replace(/\.[^.]+$/, "") || "Свой трек",
      mood: "custom", author: "Добавлено Мастером", license: "проверьте права", duration: Math.max(1, customDuration || 180),
      url, sourceUrl: url, repoUrl: null,
    };
    const next = [...tracks.filter((item) => item.mood === "custom"), song];
    saveCustomSongs(next);
    void refetchCustom();
    setCustomUrl(""); setCustomTitle("");
    toast.success("Трек добавлен в песенник", "Он сохранился в этом браузере. Чтобы он был у всех — добавьте в public/music/playlist.json на GitHub.");
  };

  return (
    <div className="space-y-5 pb-4">
      <PageHeader eyebrow="Саундтрек кампании" title="Песенник" description="Настоящие песни с GitHub (CC0). Мастер включает трек — он играет синхронно у всех игроков, с той же секунды."
        action={<Button variant="outline" size="sm" onClick={() => void refreshGithub()} disabled={refreshing}>{refreshing ? <Spinner /> : <RefreshCw className="h-4 w-4" />}Обновить из GitHub</Button>} />

      {!isDm ? <div className="parchment-panel rounded-2xl p-3 text-xs text-parchment/80">🎧 Управляет музыкой Мастер. Вы слышите тот же трек и ту же секунду, что и остальные, но можете убавить громкость в мини-плеере внизу экрана.</div> : null}

      <section className="glass relative overflow-hidden rounded-3xl p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.12),transparent_55%)]" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/25 to-crimson/25 text-4xl"><Music2 className="h-10 w-10 text-gold" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold/80">{music?.playing ? "Сейчас играет у всей партии" : "Сейчас тишина"}</p>
            <h2 className="mt-1 truncate font-display text-3xl text-parchment">{current?.title ?? "Выберите песню из каталога"}</h2>
            {current ? <p className="mt-1 text-xs text-muted-ink">{current.author ?? "—"} · {current.license ?? "CC0"} {current.sourceUrl ? <> · <a href={current.sourceUrl} target="_blank" rel="noreferrer" className="text-gold underline">источник</a></> : null}</p> : <p className="mt-1 text-xs text-muted-ink">Все треки бесплатны для использования. Ссылки ведут на файлы в GitHub.</p>}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/50"><div className="h-full rounded-full bg-gradient-to-r from-gold to-crimson transition-[width] duration-1000" style={{ width: current ? `${Math.min(100, ((pos?.position ?? 0) / current.duration) * 100)}%` : "0%" }} /></div>
            <p className="mt-1 font-mono text-[10px] text-muted-ink">{current ? `${formatDuration(pos?.position ?? 0)} / ${formatDuration(current.duration)}` : "0:00 / 0:00"}{timeline.length > 1 ? ` · в очереди ${timeline.length - 1}` : ""}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isDm ? (
              <>
                <Button variant="glass" size="icon" aria-label="Предыдущий" onClick={() => skip(-1)}><SkipBack className="h-4 w-4" /></Button>
                {music?.playing ? <Button size="lg" onClick={pause}><Pause className="h-5 w-5" />Пауза</Button> : <Button size="lg" disabled={!timeline.length} onClick={resume}><Play className="h-5 w-5" />Продолжить</Button>}
                <Button variant="glass" size="icon" aria-label="Следующий" onClick={() => skip(1)}><SkipForward className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Стоп" onClick={() => setMusic(null)}><Square className="h-4 w-4" /></Button>
                <Button variant={music?.loop ? "gold" : "glass"} size="sm" onClick={() => music && setMusic({ ...music, loop: !music.loop })}><Shuffle className="h-3.5 w-3.5" />Повтор</Button>
              </>
            ) : <Badge variant="gold" className="normal-case tracking-normal"><Volume2 className="h-3 w-3" />Синхронно у всех</Badge>}
          </div>
        </div>
        {isDm && music ? (
          <div className="relative mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-3">
            <span className="text-xs text-muted-ink">Громкость для всех</span>
            <input type="range" min={0} max={1} step={0.05} value={music.volume} onChange={(event) => setMusic({ ...music, volume: Number(event.target.value) })} className="w-40 accent-[#D4AF37]" />
            <span className="text-xs text-gold">{Math.round(music.volume * 100)}%</span>
            <span className="ml-auto text-[11px] text-muted-ink">Свою громкость каждый игрок настраивает отдельно в мини-плеере.</span>
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="space-y-3">
          <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3">
            <div className="relative min-w-40 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-ink" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Название, автор, настроение…" className="h-9 pl-8 text-xs" /></div>
            <Select value={mood} onChange={(event) => setMood(event.target.value)} className="h-9 w-44 text-xs"><option value="all">Все настроения</option>{Object.entries(MOODS).map(([key, value]) => <option key={key} value={key}>{value.emoji} {value.label}</option>)}</Select>
            <Badge variant="outline" className="normal-case tracking-normal">{filtered.length} треков</Badge>
          </div>

          {isLoading ? <div className="glass h-40 animate-pulse rounded-2xl" /> : filtered.length ? (
            <div className="space-y-2">
              {filtered.map((song, index) => {
                const active = current?.id === song.id && music?.playing;
                return (
                  <motion.div key={song.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.02, 0.2) }} className={cn("glass flex flex-wrap items-center gap-3 rounded-2xl p-3", active && "border-gold/50")}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30 text-xl">{MOODS[song.mood]?.emoji ?? "🎵"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-parchment">{song.title}{active ? <span className="ml-2 text-[10px] font-normal text-gold">♪ играет</span> : null}</p>
                      <p className="truncate text-[10px] text-muted-ink">{song.author ?? "—"} · {song.license ?? "CC0"} · {MOODS[song.mood]?.label ?? song.mood} · {formatDuration(song.duration)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {song.sourceUrl ? <Button asChild variant="ghost" size="icon-sm" aria-label="Источник"><a href={song.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button> : null}
                      {song.repoUrl ? <Button asChild variant="ghost" size="icon-sm" aria-label="Репозиторий"><a href={song.repoUrl} target="_blank" rel="noreferrer"><Github className="h-3.5 w-3.5" /></a></Button> : null}
                      {isDm ? <><Button size="sm" variant="glass" onClick={() => enqueue(song)} title="В очередь"><Plus className="h-3.5 w-3.5" /></Button><Button size="sm" onClick={() => playNow(song)}><Play className="h-3.5 w-3.5" />Играть</Button></> : null}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : <EmptyState compact title="Треки не найдены" description="Измените поиск или нажмите «Обновить из GitHub», чтобы подтянуть каталог CC0-музыки." icon={Music2} />}
        </section>

        <aside className="space-y-4">
          <section className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2"><ListMusic className="h-4 w-4 text-gold" /><h2 className="font-display text-lg text-parchment">Очередь</h2>{timeline.length ? <Badge variant="gold">{timeline.length}</Badge> : null}</div>
            {timeline.length ? (
              <>
                <div className="thin-scrollbar max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {timeline.map((song, index) => (
                    <div key={`${song.id}-${index}`} className={cn("flex items-center gap-2 rounded-xl border p-2", index === pos?.index && music?.playing ? "border-gold/50 bg-gold/10" : "border-white/[0.07] bg-black/25")}>
                      <span className="w-4 text-center text-[10px] text-muted-ink">{index + 1}</span>
                      <div className="min-w-0 flex-1"><p className="truncate text-xs text-parchment">{song.title}</p><p className="text-[10px] text-muted-ink">{formatDuration(song.duration)}</p></div>
                      {isDm ? <div className="flex gap-0.5">
                        <button type="button" aria-label="Выше" onClick={() => move(index, -1)}><ArrowUp className="h-3 w-3 text-muted-ink" /></button>
                        <button type="button" aria-label="Ниже" onClick={() => move(index, 1)}><ArrowDown className="h-3 w-3 text-muted-ink" /></button>
                        <button type="button" aria-label="Убрать" disabled={index === pos?.index} onClick={() => removeAt(index)}><X className="h-3 w-3 text-muted-ink" /></button>
                      </div> : null}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-ink">Всего: {formatDuration(timeline.reduce((sum, song) => sum + song.duration, 0))}{music?.loop ? " · повтор очереди" : ""}</p>
                {isDm ? <div className="mt-2 grid grid-cols-2 gap-1.5"><Button size="sm" variant="glass" onClick={() => play([...timeline].sort(() => Math.random() - 0.5))}><Shuffle className="h-3.5 w-3.5" />Перемешать</Button><Button size="sm" variant="danger" onClick={() => setMusic(null)}><Trash2 className="h-3.5 w-3.5" />Очистить</Button></div> : null}
              </>
            ) : <p className="py-6 text-center text-xs text-muted-ink">Очередь пуста. Нажмите «Играть» у любого трека.</p>}
          </section>

          {isDm ? (
            <section className="glass rounded-2xl p-4">
              <h2 className="mb-2 font-display text-lg text-parchment">Добавить свою песню</h2>
              <p className="mb-3 text-[11px] leading-relaxed text-muted-ink">Вставьте прямую https-ссылку на mp3/ogg. Например, загрузите файл в свой репозиторий и нажмите <b>Raw</b> — получится ссылка на raw.githubusercontent.com.</p>
              <form className="space-y-2" onSubmit={addCustom}>
                <Input value={customUrl} onChange={(event) => setCustomUrl(event.target.value)} placeholder="https://raw.githubusercontent.com/.../track.mp3" className="h-9 text-xs" />
                <div className="grid grid-cols-2 gap-2"><Input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="Название" className="h-9 text-xs" /><Input type="number" min={1} max={7200} value={customDuration} onChange={(event) => setCustomDuration(Number(event.target.value))} title="Длительность, сек" className="h-9 text-xs" /></div>
                <Button type="submit" size="sm" className="w-full" disabled={!customUrl.trim()}><Plus className="h-3.5 w-3.5" />Добавить в песенник</Button>
              </form>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-ink">Чтобы трек появился у всех, добавьте его в <code className="text-gold">public/music/playlist.json</code> и загрузите файл на GitHub. Пока трек сохранён только в этом браузере.</p>
            </section>
          ) : null}

          <section className="parchment-panel rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2"><Github className="h-4 w-4 text-gold" /><h2 className="font-display text-lg text-parchment">Источники</h2></div>
            {(sources.length ? sources : [{ name: "AlienOmen/ufo-cut-assets", url: "https://github.com/AlienOmen/ufo-cut-assets", license: "CC0-1.0" }]).map((source) => (
              <p key={source.url} className="text-[11px] leading-relaxed text-parchment/75"><a href={source.url} target="_blank" rel="noreferrer" className="text-gold underline">{source.name}</a> — {source.license}</p>
            ))}
            <p className="mt-2 text-[10px] leading-relaxed text-muted-ink">Все треки каталога — CC0 / общественное достояние. Файлы загружаются напрямую с GitHub, сайт их не копирует и не хранит. Если у вас нет интернета, в разделе «Сцена» есть встроенные генерируемые темы.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
