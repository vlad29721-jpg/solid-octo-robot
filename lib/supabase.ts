import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const browserSupabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export async function uploadAvatar(file: File, userId: string): Promise<{ publicUrl: string } | null> {
  if (!browserSupabase) return null;
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error } = await browserSupabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });
  if (error) throw new Error(`Не удалось загрузить аватар: ${error.message}`);
  const { data } = browserSupabase.storage.from("avatars").getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}

export function subscribeToCampaign(campaignId: string, onChange: () => void): () => void {
  if (!browserSupabase || !campaignId) return () => undefined;
  const channel = browserSupabase
    .channel(`hub:${campaignId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "dice_rolls", filter: `campaign_id=eq.${campaignId}` }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "encounters", filter: `campaign_id=eq.${campaignId}` }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "characters", filter: `campaign_id=eq.${campaignId}` }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `campaign_id=eq.${campaignId}` }, () => onChange());
  channel.subscribe();
  return () => { void browserSupabase.removeChannel(channel); };
}
