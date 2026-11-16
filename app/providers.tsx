"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { HubProvider } from "@/components/providers/hub-provider";
import { applyTheme } from "@/components/layout/account-settings";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 3_000 },
      mutations: { retry: 0 },
    },
  }));

  useEffect(() => { applyTheme(); }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HubProvider>
        {children}
        <Toaster />
      </HubProvider>
    </QueryClientProvider>
  );
}
