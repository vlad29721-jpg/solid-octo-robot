"use client";

import { Mic } from "lucide-react";
import { useHub } from "@/components/providers/hub-provider";
import { VoiceRoom } from "@/components/voice/voice-room";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";

export default function VoicePage() {
  const { campaign } = useHub();
  if (!campaign) return <PageSkeleton />;
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Живой стол"
        title="Голосовой чат"
        description="Разговаривайте с партией прямо во время игры: звук идёт напрямую между браузерами, без записи на сервер."
        action={<span className="hidden items-center gap-2 rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold sm:flex"><Mic className="h-3.5 w-3.5" />WebRTC · Supabase Realtime</span>}
      />
      <VoiceRoom />
    </div>
  );
}
