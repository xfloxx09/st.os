"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetUser) => void;
  }
}

interface TelegramWidgetUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginProps {
  botUsername: string;
  onSuccess?: () => void;
}

export function TelegramLogin({ botUsername, onSuccess }: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setUser = useAppStore((s) => s.setUser);
  const setSearchHistory = useAppStore((s) => s.setSearchHistory);

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      if (!res.ok) return;

      const data = (await res.json()) as {
        user: {
          userId: number;
          telegramId: number;
          username?: string;
          firstName?: string;
        };
      };

      setUser(data.user);

      const sessionRes = await fetch("/api/auth/session");
      if (sessionRes.ok) {
        const session = (await sessionRes.json()) as {
          searchHistory: Array<{
            id: number;
            contractAddress: string;
            tokenSymbol: string | null;
            tokenName: string | null;
            searchedAt: string;
          }>;
        };
        setSearchHistory(session.searchHistory);
      }

      onSuccess?.();
    };

    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-radius", "0");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    containerRef.current.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername, onSuccess, setSearchHistory, setUser]);

  return <div ref={containerRef} className="telegram-login" />;
}
