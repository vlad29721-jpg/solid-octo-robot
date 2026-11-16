"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { browserSupabase, subscribeToCampaign, supabaseConfigured } from "@/lib/supabase";
import { useHubStore } from "@/lib/store";
import type { HubSnapshot } from "@/lib/types";

type HubContextValue = {
  snapshot: HubSnapshot | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  actor: HubSnapshot["actor"] | undefined;
  campaign: HubSnapshot["campaign"];
  isDm: boolean;
  activeCampaignId: string;
  setActiveCampaignId: (id: string) => void;
  realtimeMode: "realtime" | "polling";
  lastSyncAt: string;
};

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const activeCampaignId = useHubStore((state) => state.activeCampaignId);
  const currentUserId = useHubStore((state) => state.currentUserId);
  const authToken = useHubStore((state) => state.authToken);
  const setActiveCampaignId = useHubStore((state) => state.setActiveCampaignId);
  const sessionKey = authToken ? authToken.slice(-12) : "local";
  const [realtimeEventAt, setRealtimeEventAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (!browserSupabase) return;
    let active = true;
    void browserSupabase.auth.getSession().then(({ data }) => {
      if (active) useHubStore.getState().setAuthToken(data.session?.access_token ?? null);
    });
    const { data: { subscription } } = browserSupabase.auth.onAuthStateChange((_event, session) => {
      useHubStore.getState().setAuthToken(session?.access_token ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["hub"] });
  }, [currentUserId, sessionKey, queryClient]);

  const query = useQuery<HubSnapshot>({
    queryKey: ["hub", activeCampaignId, currentUserId, sessionKey],
    queryFn: () => apiFetch<HubSnapshot>(`/api/hub?campaignId=${encodeURIComponent(activeCampaignId || "demo-campaign-1")}`),
    placeholderData: keepPreviousData,
    initialData: () => {
      if (typeof window === "undefined") return undefined;
      try { const raw = localStorage.getItem(`hub-cache-${currentUserId}-${activeCampaignId}`); return raw ? JSON.parse(raw) as HubSnapshot : undefined; } catch { return undefined; }
    },
    initialDataUpdatedAt: 0,
    staleTime: 3_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const campaignId = query.data?.campaign?.id ?? "";
  useEffect(() => {
    if (!query.data || !query.isFetched || query.isPlaceholderData) return;
    try { localStorage.setItem(`hub-cache-${currentUserId}-${query.data.campaign?.id ?? activeCampaignId}`, JSON.stringify(query.data)); } catch { /* переполнено хранилище */ }
  }, [query.data, query.isFetched, query.isPlaceholderData, currentUserId, activeCampaignId]);

  useEffect(() => {
    if (campaignId && campaignId !== activeCampaignId) setActiveCampaignId(campaignId);
  }, [campaignId, activeCampaignId, setActiveCampaignId]);

  const versionRef = useRef<string>("");
  useEffect(() => {
    if (!campaignId) return;
    versionRef.current = "";
    let stopped = false;
    let busy = false;
    const tick = async () => {
      if (stopped || busy || document.hidden) return;
      busy = true;
      try {
        const { version } = await apiFetch<{ version: string }>(`/api/sync?campaignId=${encodeURIComponent(campaignId)}`);
        if (versionRef.current && versionRef.current !== version) {
          setRealtimeEventAt(new Date().toISOString());
          void queryClient.invalidateQueries({ queryKey: ["hub"] });
        }
        versionRef.current = version;
      } catch { /* сеть временно недоступна */ } finally { busy = false; }
    };
    const timer = window.setInterval(() => void tick(), 1500);
    const onVisible = () => { if (!document.hidden) void queryClient.invalidateQueries({ queryKey: ["hub"] }); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [campaignId, queryClient]);

  useEffect(() => {
    if (!campaignId) return;
    const unsubscribe = subscribeToCampaign(campaignId, () => {
      setRealtimeEventAt(new Date().toISOString());
      void queryClient.invalidateQueries({ queryKey: ["hub"] });
    });
    return unsubscribe;
  }, [campaignId, queryClient]);

  const value = useMemo<HubContextValue>(() => ({
    snapshot: query.data,
    isLoading: query.isPending && !query.data,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: () => { void query.refetch(); },
    actor: query.data?.actor,
    campaign: query.data?.campaign ?? null,
    isDm: Boolean(query.data && query.data.actor.role === "dm" && query.data.campaign?.dmId === query.data.actor.id),
    activeCampaignId,
    setActiveCampaignId,
    realtimeMode: supabaseConfigured ? "realtime" : "polling",
    lastSyncAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : realtimeEventAt,
  }), [query.data, query.isPending, query.isFetching, query.isError, query.error, query.refetch, query.dataUpdatedAt, activeCampaignId, setActiveCampaignId, realtimeEventAt]);

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub(): HubContextValue {
  const context = useContext(HubContext);
  if (!context) throw new Error("useHub must be used inside HubProvider");
  return context;
}
