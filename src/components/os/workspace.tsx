"use client";

import { useEffect, useRef } from "react";
import { OsWindow } from "@/components/os/os-window";
import { TelegramLogin } from "@/components/auth/telegram-login";
import { CaInput } from "@/components/terminal/ca-input";
import { TokenOverviewPanel } from "@/components/terminal/token-overview-panel";
import { HolderRosterPanel } from "@/components/terminal/holder-roster-panel";
import { useAppStore } from "@/stores/app-store";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export function Workspace() {
  const user = useAppStore((s) => s.user);
  const panels = useAppStore((s) => s.panels);
  const analysisByContract = useAppStore((s) => s.analysisByContract);
  const analyzeError = useAppStore((s) => s.analyzeError);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = inputContainerRef.current?.querySelector("input");
        input?.focus();
      }
      if (e.key === "Escape") {
        const input = inputContainerRef.current?.querySelector("input");
        if (input === document.activeElement) input?.blur();
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
          <div
            ref={inputContainerRef}
            className="absolute left-4 right-4 top-4 z-10 px-2"
          >
            <CaInput />
            {analyzeError ? (
              <p className="mt-2 text-[11px] text-[var(--danger)]">
                SIGNAL LOST — {analyzeError}
              </p>
            ) : null}
          </div>

          {panels.map((panel) => {
            const analysis = panel.contractAddress
              ? analysisByContract[panel.contractAddress]
              : null;

            return (
              <OsWindow key={panel.id} {...panel}>
                {panel.type === "TOKEN_OVERVIEW" && analysis ? (
                  <TokenOverviewPanel
                    overview={analysis.overview}
                    cached={analysis.cached}
                  />
                ) : panel.type === "HOLDER_ROSTER" && analysis ? (
                  <HolderRosterPanel
                    holders={analysis.holders}
                    allHolders={analysis.allHolders}
                  />
                ) : panel.id === "welcome" ? (
                  <div className="space-y-3 text-[var(--text-secondary)]">
                    <p className="text-[var(--text-primary)]">
                      STALKER.OS terminal online.
                    </p>
                    <p>
                      Paste a contract address above to load token overview and
                      holder roster.
                    </p>
                  </div>
                ) : (
                  <p className="scan-line text-[var(--text-secondary)]">
                    AWAITING DATA STREAM...
                  </p>
                )}
              </OsWindow>
            );
          })}
        </>
      )}
    </main>
  );
}
