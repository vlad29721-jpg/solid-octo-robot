"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Loader2, Mic, MicOff, PhoneCall, PhoneOff, Radio, Users, Volume2, VolumeX } from "lucide-react";
import { browserSupabase, supabaseConfigured } from "@/lib/supabase";
import { useHub } from "@/components/providers/hub-provider";
import { Avatar } from "@/components/dnd/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Signal = { from: string; to?: string; kind: "offer" | "answer" | "ice" | "hello" | "bye"; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit; name?: string };
type Peer = { id: string; name: string; stream?: MediaStream; muted?: boolean; speaking?: boolean; connection?: RTCPeerConnection };

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

function randomId() {
  return `v-${Math.random().toString(36).slice(2, 10)}`;
}

export function VoiceRoom() {
  const { campaign, actor } = useHub();
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [localLevel, setLocalLevel] = useState(0);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const peerId = useRef(randomId());
  const channel = useRef<ReturnType<NonNullable<typeof browserSupabase>["channel"]> | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const levelTimer = useRef<number | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);

  const syncPeers = useCallback(() => {
    setPeers([...peersRef.current.values()]);
  }, []);

  const send = useCallback((payload: Signal) => {
    if (!channel.current) return;
    void channel.current.send({ type: "broadcast", event: "voice-signal", payload });
  }, []);

  const createPeer = useCallback((remoteId: string, remoteName: string, initiator: boolean) => {
    const existing = peersRef.current.get(remoteId);
    if (existing?.connection) return existing.connection;
    const connection = new RTCPeerConnection(ICE);
    localStream.current?.getTracks().forEach((track) => connection.addTrack(track, localStream.current as MediaStream));
    const peer: Peer = { id: remoteId, name: remoteName, connection };
    peersRef.current.set(remoteId, peer);

    connection.onicecandidate = (event) => {
      if (event.candidate) send({ from: peerId.current, to: remoteId, kind: "ice", candidate: event.candidate.toJSON() });
    };
    connection.ontrack = (event) => {
      const [stream] = event.streams;
      const current = peersRef.current.get(remoteId) ?? peer;
      current.stream = stream;
      peersRef.current.set(remoteId, current);
      const audio = audioRefs.current.get(remoteId);
      if (audio) { audio.srcObject = stream; void audio.play().catch(() => undefined); }
      syncPeers();
    };
    connection.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(connection.connectionState)) {
        peersRef.current.delete(remoteId);
        syncPeers();
      }
    };

    if (initiator) {
      void (async () => {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        send({ from: peerId.current, to: remoteId, kind: "offer", sdp: offer, name: actor?.displayName });
      })();
    }
    syncPeers();
    return connection;
  }, [actor?.displayName, send, syncPeers]);

  const leave = useCallback(() => {
    if (levelTimer.current) window.clearInterval(levelTimer.current);
    levelTimer.current = null;
    send({ from: peerId.current, kind: "bye", name: actor?.displayName });
    peersRef.current.forEach((peer) => peer.connection?.close());
    peersRef.current.clear();
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    audioRefs.current.forEach((audio) => { audio.srcObject = null; });
    audioRefs.current.clear();
    setPeers([]);
    if (channel.current) { void browserSupabase?.removeChannel(channel.current); channel.current = null; }
    setJoined(false);
    setConnecting(false);
  }, [actor?.displayName, send]);

  const join = useCallback(async () => {
    if (!campaign) { toast.error("Сначала выберите кампанию"); return; }
    if (!supabaseConfigured || !browserSupabase) {
      setError("Для голосового чата нужны NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в переменных Vercel. Без них канал сигнализации недоступен.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      localStream.current = stream;
      setJoined(true);
      setConnecting(false);

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = 512;
      source.connect(node);
      analyser.current = node;
      levelTimer.current = window.setInterval(() => {
        const data = new Uint8Array(node.frequencyBinCount);
        node.getByteFrequencyData(data);
        const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
        setLocalLevel(avg / 90);
      }, 150);

      const ch = browserSupabase.channel(`voice:${campaign.id}`, {
        config: { broadcast: { self: false }, presence: { key: peerId.current } },
      });
      channel.current = ch;
      ch.on("broadcast", { event: "voice-signal" }, ({ payload }: { payload: Signal }) => {
        if (!payload || payload.from === peerId.current) return;
        if (payload.to && payload.to !== peerId.current) return;
        const remoteId = payload.from;
        const remoteName = payload.name ?? "Игрок";
        if (payload.kind === "hello") {
          if (peerId.current < remoteId) createPeer(remoteId, remoteName, true);
          else createPeer(remoteId, remoteName, false);
          send({ from: peerId.current, to: remoteId, kind: "hello", name: actor?.displayName });
          return;
        }
        const peer = peersRef.current.get(remoteId) ?? { id: remoteId, name: remoteName, connection: createPeer(remoteId, remoteName, false) };
        const connection = peer.connection as RTCPeerConnection;
        if (payload.kind === "offer" && payload.sdp) {
          void (async () => {
            await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            send({ from: peerId.current, to: remoteId, kind: "answer", sdp: answer, name: actor?.displayName });
          })();
        } else if (payload.kind === "answer" && payload.sdp) {
          void connection.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
        } else if (payload.kind === "ice" && payload.candidate) {
          void connection.addIceCandidate(new RTCIceCandidate(payload.candidate as RTCIceCandidateInit)).catch(() => undefined);
        } else if (payload.kind === "bye") {
          connection.close();
          peersRef.current.delete(remoteId);
          syncPeers();
        }
      });
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState() as Record<string, { name?: string }[]>;
        Object.keys(state).forEach((key) => {
          if (key === peerId.current) return;
          const meta = state[key]?.[0];
          if (!peersRef.current.has(key)) createPeer(key, meta?.name ?? "Игрок", false);
        });
        Object.keys(state).forEach(() => undefined);
      });
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void ch.track({ name: actor?.displayName ?? "Игрок", joinedAt: new Date().toISOString() });
          send({ from: peerId.current, kind: "hello", name: actor?.displayName });
        }
      });
    } catch (cause) {
      setConnecting(false);
      setJoined(false);
      const message = cause instanceof Error ? cause.message : "Микрофон недоступен";
      setError(`Не удалось включить микрофон: ${message}. Разрешите доступ в настройках браузера и откройте сайт по HTTPS.`);
    }
  }, [actor?.displayName, campaign, createPeer, send, syncPeers]);

  useEffect(() => () => leave(), [leave]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStream.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
  };
  const toggleDeafen = () => {
    const next = !deafened;
    setDeafened(next);
    audioRefs.current.forEach((audio) => { audio.muted = next; });
  };

  const speaking = localLevel > 0.12 && !muted;

  return (
    <div className="space-y-5">
      <div className="glass relative overflow-hidden rounded-3xl p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(212,175,55,0.14),transparent_60%)]" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className={cn("grid h-16 w-16 place-items-center rounded-2xl border transition", speaking ? "border-emerald-400/70 bg-emerald-500/15" : "border-gold/30 bg-gold/10")}>
            <Mic className={cn("h-7 w-7", speaking ? "text-emerald-300" : "text-gold")} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl text-parchment">Голосовой чат партии</h2>
              <Badge variant={joined ? "success" : "outline"} className="normal-case tracking-normal">{joined ? `в канале · ${peers.length + 1}` : "не подключён"}</Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-ink">Связь идёт напрямую между браузерами (WebRTC), сигнализация — через Supabase Realtime. Звук не записывается и не хранится.</p>
            {joined ? (
              <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/50"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-150" style={{ width: `${Math.min(100, Math.round(localLevel * 100))}%` }} /></div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {joined ? (
              <>
                <Button variant={muted ? "danger" : "glass"} onClick={toggleMute}>{muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{muted ? "Микрофон выкл." : "Микрофон вкл."}</Button>
                <Button variant={deafened ? "danger" : "glass"} onClick={toggleDeafen}>{deafened ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{deafened ? "Звук выкл." : "Звук вкл."}</Button>
                <Button variant="danger" onClick={leave}><PhoneOff className="h-4 w-4" />Выйти</Button>
              </>
            ) : (
              <Button size="lg" onClick={() => void join()} disabled={connecting}>{connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-5 w-5" />}Подключиться к голосу</Button>
            )}
          </div>
        </div>
        {error ? <p className="relative mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">{error}</p> : null}
        {!supabaseConfigured ? <p className="relative mt-3 text-[11px] text-muted-ink">Supabase не настроен в этом окружении: текстовый чат работает через API, а голос требует Realtime-канал.</p> : null}
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-gold" /><h3 className="font-display text-lg text-parchment">В канале</h3><Badge variant="outline" className="normal-case tracking-normal">{joined ? peers.length + 1 : 0}</Badge></div>
        {!joined ? (
          <p className="py-8 text-center text-sm text-muted-ink">Подключитесь, чтобы увидеть участников голосового канала.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className={cn("relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition", speaking ? "border-emerald-400/60 bg-emerald-500/10" : "border-gold/25 bg-black/25")}>
              <Avatar name={actor?.displayName ?? "Вы"} src={actor?.avatarUrl} size="lg" />
              <p className="max-w-full truncate text-sm font-semibold text-parchment">{actor?.displayName ?? "Вы"} <span className="text-[10px] text-muted-ink">(вы)</span></p>
              <span className="text-[11px] text-gold">{muted ? <MicOff className="mx-auto h-3.5 w-3.5" /> : <Mic className="mx-auto h-3.5 w-3.5" />}</span>
              {speaking ? <span className="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-emerald-400" /> : null}
            </div>
            {peers.map((peer) => (
              <div key={peer.id} className={cn("relative flex flex-col items-center gap-2 rounded-2xl border p-4", peer.speaking ? "border-emerald-400/60 bg-emerald-500/10" : "border-white/10 bg-black/25")}>
                <Avatar name={peer.name} size="lg" />
                <p className="max-w-full truncate text-sm font-semibold text-parchment">{peer.name}</p>
                <span className="text-[11px] text-emerald-300"><Headphones className="mx-auto h-3.5 w-3.5" /></span>
                <audio ref={(node) => { if (node) { audioRefs.current.set(peer.id, node); node.muted = deafened; if (peer.stream) node.srcObject = peer.stream; } }} autoPlay playsInline className="hidden" />
              </div>
            ))}
            {peers.length === 0 ? <p className="col-span-full rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-muted-ink">Ждём остальных: они увидят вас автоматически, если откроют «Голос» и подключатся.</p> : null}
          </div>
        )}
      </div>

      <div className="parchment-panel rounded-2xl p-4 text-[11px] leading-relaxed text-parchment/75">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-gold"><Radio className="h-3.5 w-3.5" />Как это работает</p>
        Микрофон запрашивает разрешение один раз. Для стабильной связи откройте сайт по HTTPS и разрешите доступ. Если сеть блокирует прямые соединения (строгий NAT), звук может не пройти — тогда используйте Discord/Telegram как запасной вариант; для 100% надёжности нужен TURN-сервер.
      </div>
    </div>
  );
}
