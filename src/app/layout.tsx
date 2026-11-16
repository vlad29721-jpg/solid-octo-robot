import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "D&D Master Hub — Хроника, бой и кубики",
  description: "Премиальный рабочий стол Мастера D&D: листы персонажей, инициатива, броски в реальном времени, журнал и ИИ-помощник на базе DeepSeek.",
  applicationName: "D&D Master Hub",
  appleWebApp: { capable: true, title: "Master Hub", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/icon-512.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-ink text-parchment antialiased">
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  );
}
