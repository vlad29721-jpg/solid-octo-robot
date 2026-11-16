"use client";

import { useQuery } from "@tanstack/react-query";
import type { SongRef } from "./dnd/types";

export type SongDef = SongRef & { repoUrl?: string | null; sourceUrl?: string | null; folder?: string };
export type Playlist = { version: number; note?: string; sources: { name: string; url: string; license: string }[]; tracks: SongDef[] };

export const MOODS: Record<string, { label: string; emoji: string }> = {
  tavern: { label: "Таверна и город", emoji: "🍺" },
  classical: { label: "Классика", emoji: "🎻" },
  travel: { label: "Дорога", emoji: "🐎" },
  battle: { label: "Битва", emoji: "⚔️" },
  dungeon: { label: "Подземелье", emoji: "🕯️" },
  mystery: { label: "Тайна", emoji: "🔮" },
  rest: { label: "Отдых", emoji: "🌙" },
  nature: { label: "Природа", emoji: "🌲" },
  epic: { label: "Эпос и драма", emoji: "🏆" },
  custom: { label: "Свои треки", emoji: "🎵" },
};

export function formatDuration(seconds: number): string {
  const value = Math.max(0, Math.round(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export function songToRef(song: SongDef): SongRef {
  return {
    id: song.id, title: song.title, url: song.url, duration: Math.max(1, song.duration),
    author: song.author ?? null, license: song.license ?? null, mood: song.mood ?? "custom",
    sourceUrl: song.sourceUrl ?? song.repoUrl ?? null,
  };
}

export function isGitHubAudioUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return url.hostname === "raw.githubusercontent.com" || /^https:\/\/github\.com\//.test(value) || url.hostname.endsWith(".githubusercontent.com");
  } catch {
    return false;
  }
}

/** Читает реальную длительность файла, чтобы очередь у всей партии шла синхронно. */
export function preloadDuration(url: string, fallback = 180, timeout = 6000): Promise<number> {
  if (typeof window === "undefined") return Promise.resolve(fallback);
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    let done = false;
    const finish = (value: number) => {
      if (done) return;
      done = true;
      audio.removeAttribute("src");
      audio.load();
      resolve(Math.max(1, Math.round(value)));
    };
    const timer = window.setTimeout(() => finish(fallback), timeout);
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      window.clearTimeout(timer);
      finish(Number.isFinite(audio.duration) && audio.duration > 1 ? audio.duration : fallback);
    }, { once: true });
    audio.addEventListener("error", () => { window.clearTimeout(timer); finish(fallback); }, { once: true });
    audio.src = url;
  });
}

export function loadCustomSongs(): SongDef[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("hub-custom-songs");
    const parsed = raw ? JSON.parse(raw) as SongDef[] : [];
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch {
    return [];
  }
}

export function saveCustomSongs(songs: SongDef[]) {
  localStorage.setItem("hub-custom-songs", JSON.stringify(songs.slice(0, 50)));
}

export function usePlaylist() {
  const query = useQuery<Playlist>({
    queryKey: ["music-playlist"],
    queryFn: async () => {
      const response = await fetch("/music/playlist.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("Не удалось загрузить песенник.");
      return response.json() as Promise<Playlist>;
    },
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const custom = useQuery<SongDef[]>({
    queryKey: ["music-custom"],
    queryFn: () => Promise.resolve(loadCustomSongs()),
    staleTime: 0,
  });
  const tracks = [...(query.data?.tracks ?? []), ...(custom.data ?? [])];
  return { ...query, tracks, sources: query.data?.sources ?? [], custom: custom.data ?? [], refetchCustom: custom.refetch };
}

export function songFromApi(raw: { id: string; title: string; url: string; author: string | null; license: string | null; mood: string; sourceUrl: string | null; repoUrl: string | null; folder?: string }): SongDef {
  return { id: raw.id, title: raw.title, url: raw.url, duration: 0, author: raw.author, license: raw.license, mood: raw.mood, sourceUrl: raw.sourceUrl, repoUrl: raw.repoUrl, folder: raw.folder };
}

export function musicPosition(timeline: SongRef[], startedAt: string, offset = 0, loop = false) {
  if (!timeline.length) return null;
  const elapsed = Math.max(0, (Date.now() - new Date(startedAt).getTime()) / 1000 + offset);
  const total = timeline.reduce((sum, song) => sum + song.duration, 0);
  let time = elapsed;
  if (loop && total > 0) time = elapsed % total;
  if (!loop && elapsed >= total) return { finished: true, index: timeline.length - 1, position: timeline[timeline.length - 1].duration, elapsed, total };
  for (let index = 0; index < timeline.length; index += 1) {
    if (time < timeline[index].duration) return { finished: false, index, position: time, elapsed, total };
    time -= timeline[index].duration;
  }
  return { finished: true, index: timeline.length - 1, position: timeline[timeline.length - 1].duration, elapsed, total };
}
