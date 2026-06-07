"use client";

import { useEffect, useRef } from "react";
import { OsWindow } from "@/components/os/os-window";
import { TelegramLogin } from "@/components/auth/telegram-login";
import { useAppStore } from "@/stores/app-store";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export function Workspace() {
  const user = useAppStore((s) => s.user);
  const panels = useAppStore((s) => s.panels);
  const addPanel = useAppStore((s) => s.addPanel);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const hasWelcome = panels.some((p) => p.id === "welcome");
    if (!hasWelcome) {
      addPanel({
        id: "welcome",
        type: "TOKEN_OVERVIEW",
        title: "TERMINAL.EXE",
        x: 48,
        y: 48,
        width: 520,
        height: 280,
      });
    }
  }, [user, panels, addPanel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="relative flex-1 overflow-hidden bg-[var(--bg)]">
      {!user ? (
        <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
          <div className="max-w-md border border-[var(--border)] bg-[var(--bg-panel)] p-6 text-center">
            <p className="mb-2 text-xs tracking-[0.3em] text-[var(--accent)]">
              AUTH REQUIRED
            </p>
            <p className="mb-6 text-sm text-[var(--text-secondary)]">
              Connect Telegram to access the forensics terminal.
            </p>
            {BOT_USERNAME ? (
              <div className="flex justify-center">
                <TelegramLogin botUsername={BOT_USERNAME} />
              </div>
            ) : (
              <p className="text-[11px] text-[var(--warning)]">
                Set NEXT_PUBLIC_TELEGRAM_BOT_USERNAME in environment.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="absolute left-4 right-4 top-4 z-10 mx-auto max-w-3xl">
            <label className="block text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
              CONTRACT ADDRESS INPUT
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="0x... paste token contract address (Phase 1)"
              disabled
              className="mt-1 w-full border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)]"
            />
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
              Ctrl+K to focus · Analysis pipeline ships in Phase 1
            </p>
          </div>

          {panels.map((panel) => (
            <OsWindow key={panel.id} {...panel}>
              {panel.id === "welcome" ? (
                <div className="space-y-3 text-[var(--text-secondary)]">
                  <p className="text-[var(--text-primary)]">
                    STALKER.OS terminal online.
                  </p>
                  <p>
                    Phase 0 complete. Paste a contract address in Phase 1 to load
                    token overview and holder roster.
                  </p>
                  <ul className="space-y-1 text-[11px]">
                    <li>TOKEN_OVERVIEW.exe — token metadata + risk flags</li>
                    <li>HOLDER_ROSTER.exe — top holders, STALK on demand</li>
                    <li>WALLET_PROFILE.exe — fund origin, trades, PNL</li>
                    <li>CROSS_ANALYSIS.exe — holder relationship engine</li>
                  </ul>
                </div>
              ) : (
                <p className="text-[var(--text-secondary)]">Panel loading...</p>
              )}
            </OsWindow>
          ))}
        </>
      )}
    </main>
  );
}
