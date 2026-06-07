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
  const setSearchHistory = useAppStore((s) => s.setSearchHistory);
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
      return res.json() as Promise<{
        user: {
          userId: number;
          telegramId: number;
          username?: string;
          firstName?: string;
        };
        searchHistory: Array<{
          id: number;
          contractAddress: string;
          tokenSymbol: string | null;
          tokenName: string | null;
          searchedAt: string;
        }>;
      }>;
    },
    enabled: bootComplete,
  });

  useEffect(() => {
    if (configQuery.data?.telegramBotUsername) {
      setTelegramBotUsername(configQuery.data.telegramBotUsername);
    }
  }, [configQuery.data, setTelegramBotUsername]);

  useEffect(() => {
    if (sessionQuery.data) {
      setUser(sessionQuery.data.user);
      setSearchHistory(sessionQuery.data.searchHistory);
    }
  }, [sessionQuery.data, setSearchHistory, setUser]);

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
