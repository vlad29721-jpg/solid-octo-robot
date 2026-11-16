import { apiError } from "@/lib/server/http";
import type { SongDef } from "@/lib/playlist";

export const dynamic = "force-dynamic";

const UFO = "https://raw.githubusercontent.com/AlienOmen/ufo-cut-assets/main/audio/";
const JUPIXELS = "https://raw.githubusercontent.com/jupixels/game-sounds/main/sounds/music/";
const EFFACE = "https://raw.githubusercontent.com/effacestudios/Royalty-Free-Music-Pack/master/";

const MOOD: Record<string, string> = {
  "town-theme": "tavern", "8bit-bossa": "tavern", "chill-lofi": "rest", "happy-lullaby": "rest",
  "eye-of-the-storm": "battle", "next-to-you": "epic", "forest": "nature",
};

type Cache = { at: number; tracks: SongDef[]; sources: string[] };
const globalForCache = globalThis as typeof globalThis & { __hubMusicCache?: Cache };

async function githubJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "dnd-master-hub" }, signal: AbortSignal.timeout(9000), cache: "no-store" });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

async function fromUfoCut(): Promise<SongDef[]> {
  const data = await githubJson<{ content: string; encoding: string }>("https://api.github.com/repos/AlienOmen/ufo-cut-assets/contents/audio/manifest.json");
  if (!data?.content) return [];
  let manifest: { sounds?: { name: string; file: string; duration: number; license: string; source?: string; category?: string }[] };
  try { manifest = JSON.parse(Buffer.from(data.content, "base64").toString()); } catch { return []; }
  return (manifest.sounds ?? [])
    .filter((entry) => /^(Music|Ambience)$/i.test(entry.category ?? "") && entry.duration >= 25 && entry.file.endsWith(".mp3") && /CC0|Free/i.test(entry.license))
    .slice(0, 30)
    .map((entry) => {
      const key = Object.keys(MOOD).find((part) => entry.file.includes(part)) ?? "rest";
      return {
        id: `ufo-${entry.file.replace(/\.[^.]+$/, "")}`,
        title: entry.name,
        mood: MOOD[key] ?? (entry.category === "Ambience" ? "nature" : "rest"),
        author: "OpenGameArt / ufo-cut-assets",
        license: entry.license,
        duration: Math.round(entry.duration),
        url: `${UFO}${entry.file}`,
        sourceUrl: entry.source ?? "https://github.com/AlienOmen/ufo-cut-assets",
        repoUrl: "https://github.com/AlienOmen/ufo-cut-assets",
      } satisfies SongDef;
    });
}

async function fromJupixels(): Promise<SongDef[]> {
  return [
    { id: "gh-call-to-war", title: "Call to War", mood: "battle", author: "Umplix (CC0)", license: "CC0-1.0", duration: 76, url: `${JUPIXELS}call_to_war_01.mp3`, sourceUrl: "https://opengameart.org/content/call-to-war", repoUrl: "https://github.com/jupixels/game-sounds" },
    { id: "gh-war-lament", title: "Lament of the War", mood: "epic", author: "Cethiel (CC0)", license: "CC0-1.0", duration: 228, url: `${JUPIXELS}war_lament_01.mp3`, sourceUrl: "https://opengameart.org/content/laments-of-the-war", repoUrl: "https://github.com/jupixels/game-sounds" },
  ];
}

async function fromEfface(): Promise<SongDef[]> {
  const tree = await githubJson<{ tree?: { path: string; type: string }[] }>("https://api.github.com/repos/effacestudios/Royalty-Free-Music-Pack/git/trees/master?recursive=1");
  if (!tree?.tree) return [];
  return tree.tree
    .filter((item) => item.type === "blob" && item.path.endsWith(".mp3"))
    .slice(0, 24)
    .map((item) => ({
      id: `eff-${item.path.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
      title: item.path.replace(/\.mp3$/, ""),
      mood: /fury|alarming|champion|templer/i.test(item.path) ? "battle" : /myster|illusion|unknown|outsider/i.test(item.path) ? "mystery" : /happy|party|bubbles|starter/i.test(item.path) ? "tavern" : "dungeon",
      author: "effacestudios",
      license: "CC0-1.0",
      duration: 180,
      url: `${EFFACE}${item.path.split("/").map(encodeURIComponent).join("/")}`,
      sourceUrl: "https://github.com/effacestudios/Royalty-Free-Music-Pack",
      repoUrl: "https://github.com/effacestudios/Royalty-Free-Music-Pack",
    }) satisfies SongDef);
}

export async function GET(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get("refresh") === "1";
    const cache = globalForCache.__hubMusicCache;
    if (!force && cache && Date.now() - cache.at < 3600_000) return Response.json({ tracks: cache.tracks, sources: cache.sources, cached: true });
    const results = await Promise.allSettled([fromUfoCut(), fromJupixels(), fromEfface()]);
    const tracks = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (!tracks.length && cache) return Response.json({ tracks: cache.tracks, sources: cache.sources, cached: true, stale: true });
    const sources = ["AlienOmen/ufo-cut-assets", "jupixels/game-sounds", "effacestudios/Royalty-Free-Music-Pack"];
    globalForCache.__hubMusicCache = { at: Date.now(), tracks, sources };
    return Response.json({ tracks, sources, cached: false, count: tracks.length });
  } catch (error) {
    return apiError(error);
  }
}
