import { apiError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export type Track = {
  id: string; title: string; url: string; duration: number; author: string | null;
  license: string | null; mood: string; sourceUrl: string | null; repoUrl: string | null; folder?: string;
};

const RAW = "https://raw.githubusercontent.com";
const REPOS: { repo: string; branch: string; license: string; label: string; source: string }[] = [
  { repo: "SoundSafari/CC0-1.0-Music", branch: "main", license: "CC0-1.0", label: "SoundSafari · 9000+ CC0 треков", source: "https://github.com/SoundSafari/CC0-1.0-Music" },
  { repo: "AlienOmen/ufo-cut-assets", branch: "main", license: "CC0-1.0", label: "ufo-cut · RPG-музыка и эмбиент", source: "https://github.com/AlienOmen/ufo-cut-assets" },
  { repo: "Beatscribe/homebrew_vgm", branch: "main", license: "CC0-1.0", label: "Beatscribe · чиптюн", source: "https://github.com/Beatscribe/homebrew_vgm" },
  { repo: "effacestudios/Royalty-Free-Music-Pack", branch: "master", license: "CC0-1.0", label: "effacestudios · royalty-free пак", source: "https://github.com/effacestudios/Royalty-Free-Music-Pack" },
  { repo: "jupixels/game-sounds", branch: "main", license: "CC0-1.0", label: "jupixels · оркестровые темы", source: "https://github.com/jupixels/game-sounds" },
];

const MOOD_RULES: [string, RegExp][] = [
  ["battle", /battle|war|fight|boss|combat|epic battle|fury|charge|alarm|danger|tension|драк|битв/i],
  ["tavern", /tavern|town|inn|folk|dance|jig|party|happy|fest|celtic|bard|village|вальс/i],
  ["dungeon", /dungeon|cave|dark|crypt|horror|evil|demon|witch|grave|underworld|gothic|organ/i],
  ["mystery", /mystery|mystic|secret|illusion|shadow|mysterious|riddle|suspense|noir/i],
  ["rest", /sleep|rest|calm|peace|lullaby|dream|ambient|soft|gentle|piano|nocturne|adagio/i],
  ["nature", /forest|nature|birds|rain|storm|wind|river|sea|ocean|garden/i],
  ["epic", /epic|hero|saga|legend|anthem|triumph|glory|march|orchestra|symphon/i],
  ["classical", /bach|mozart|beethoven|chopin|vivaldi|debussy|haydn|handel|schubert|sonata|concerto|prelude|fugue|waltz/i],
];

function moodFor(text: string): string {
  for (const [mood, rule] of MOOD_RULES) if (rule.test(text)) return mood;
  return "rest";
}

function prettify(path: string): string {
  const file = path.split("/").pop() ?? path;
  return decodeURIComponent(file)
    .replace(/\.(mp3|ogg|m4a|flac|wav)$/i, "")
    .replace(/\(chosic\.com\)/gi, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubTree(repo: string, branch: string) {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "dnd-master-hub" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!response.ok) return [] as { path: string; size: number }[];
    const data = (await response.json()) as { tree?: { path: string; type: string; size?: number }[] };
    return (data.tree ?? [])
      .filter((item) => item.type === "blob" && /\.(mp3|ogg)$/i.test(item.path) && (item.size ?? 0) > 80_000)
      .map((item) => ({ path: item.path, size: item.size ?? 0 }));
  } catch {
    return [] as { path: string; size: number }[];
  }
}

type Cache = { at: number; tracks: Track[] };
const store = globalThis as typeof globalThis & { __hubMusicIndex?: Cache };

async function buildIndex(force: boolean): Promise<Track[]> {
  const cached = store.__hubMusicIndex;
  if (!force && cached && Date.now() - cached.at < 30 * 60_000) return cached.tracks;
  const results = await Promise.all(
    REPOS.map(async (meta) => {
      const files = await githubTree(meta.repo, meta.branch);
      if (meta.repo === "jupixels/game-sounds") return files.filter((file) => file.path.startsWith("sounds/music/"));
      if (meta.repo === "AlienOmen/ufo-cut-assets") return files.filter((file) => /audio\/(music|ambience)/i.test(file.path));
      return files;
    }),
  );
  const seen = new Set<string>();
  const tracks: Track[] = [];
  results.forEach((files, index) => {
    const meta = REPOS[index];
    for (const file of files) {
      const url = `${RAW}/${meta.repo}/${meta.branch}/${encodePath(file.path)}`;
      if (seen.has(url)) continue;
      seen.add(url);
      const title = prettify(file.path);
      tracks.push({
        id: `${meta.repo.split("/")[0].toLowerCase()}-${file.path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
        title,
        url,
        duration: 0,
        author: meta.repo.split("/")[0],
        license: meta.license,
        mood: moodFor(`${file.path} ${title}`),
        sourceUrl: meta.source,
        repoUrl: meta.source,
        folder: file.path.split("/").slice(0, -1).join("/") || "root",
      });
      if (tracks.length >= 12_000) break;
    }
  });
  store.__hubMusicIndex = { at: Date.now(), tracks };
  return tracks;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const q = (params.get("q") ?? "").trim().toLowerCase();
    const mood = params.get("mood") ?? "all";
    const folder = params.get("folder") ?? "";
    const offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
    const limit = Math.min(120, Math.max(1, Number(params.get("limit") ?? 60) || 60));
    const force = params.get("refresh") === "1";
    const all = await buildIndex(force);
    const filtered = all.filter((track) =>
      (mood === "all" || track.mood === mood) &&
      (!folder || track.folder === folder) &&
      (!q || `${track.title} ${track.author ?? ""} ${track.folder ?? ""}`.toLowerCase().includes(q)),
    );
    const moods: Record<string, number> = {};
    const folders = new Map<string, number>();
    for (const track of all) {
      moods[track.mood] = (moods[track.mood] ?? 0) + 1;
      const key = `${track.author ?? ""}/${track.folder ?? ""}`;
      folders.set(key, (folders.get(key) ?? 0) + 1);
    }
    return Response.json({
      tracks: filtered.slice(offset, offset + limit),
      total: filtered.length,
      catalogTotal: all.length,
      offset,
      limit,
      moods,
      folders: [...folders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([name, count]) => ({ name, count })),
      sources: REPOS.map((meta) => ({ name: meta.label, url: meta.source, license: meta.license })),
      cached: Boolean(store.__hubMusicIndex) && !force,
    });
  } catch (error) {
    return apiError(error);
  }
}
