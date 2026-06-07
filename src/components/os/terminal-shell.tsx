"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BootSequence } from "@/components/os/boot-sequence";
import { SystemBar } from "@/components/os/system-bar";
import { Sidebar } from "@/components/os/sidebar";
import { Workspace } from "@/components/os/workspace";
import { StatusBar } from "@/components/os/status-bar";
import { useAppStore } from "@/stores/app-store";

export function TerminalShell() {
  const [showBoot, setShowBoot] = useState(true);
  const setUser = useAppStore((s) => s.setUser);
  const setGuest = useAppStore((s) => s.setGuest);
  const setSearchHistory = useAppStore((s) => s.setSearchHistory);
  const setTrackedWallets = useAppStore((s) => s.setTrackedWallets);
  const setTelegramBotUsername = useAppStore((s) => s.setTelegramBotUsername);
  const bootComplete = useAppStore((s) => s.bootComplete);

  const configQuery = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const res = await fetch("/api/config");
      if (!res.ok) return { telegramBotUsername: "", appUrl: "" };
      return res.json() as Promise<{
        telegramBotUsername: string;
        appUrl: string;
      }>;
    },
  });

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: bootComplete,
  });

  useEffect(() => {
    if (configQuery.data?.telegramBotUsername) {
      setTelegramBotUsername(configQuery.data.telegramBotUsername);
    }
  }, [configQuery.data, setTelegramBotUsername]);

  useEffect(() => {
    if (!sessionQuery.data?.authenticated) return;

    if (sessionQuery.data.guest) {
      setGuest(sessionQuery.data.guest);
      setUser(null);
      setSearchHistory([]);
      return;
    }

    if (sessionQuery.data.user) {
      setUser(sessionQuery.data.user);
      setGuest(null);
      setSearchHistory(sessionQuery.data.searchHistory ?? []);
      void fetch("/api/track")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.wallets) setTrackedWallets(data.wallets);
        });
    }
  }, [sessionQuery.data, setGuest, setSearchHistory, setTrackedWallets, setUser]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {showBoot && <BootSequence onComplete={() => setShowBoot(false)} />}
      <SystemBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <Workspace />
      </div>
      <StatusBar />
    </div>
  );
}
