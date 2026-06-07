"use client";

import { useEffect, useRef } from "react";
import { OsWindow } from "@/components/os/os-window";
import { TelegramLogin } from "@/components/auth/telegram-login";
import { GuestLogin } from "@/components/auth/guest-login";
import { CaInput } from "@/components/terminal/ca-input";
import { TokenOverviewPanel } from "@/components/terminal/token-overview-panel";
import { HolderRosterPanel } from "@/components/terminal/holder-roster-panel";
import { WalletProfilePanel } from "@/components/terminal/wallet-profile-panel";
import { useAppStore, walletProfileKey } from "@/stores/app-store";

export function Workspace() {
  const user = useAppStore((s) => s.user);
  const guest = useAppStore((s) => s.guest);
  const panels = useAppStore((s) => s.panels);
  const analysisByContract = useAppStore((s) => s.analysisByContract);
  const walletProfiles = useAppStore((s) => s.walletProfiles);
  const analyzeError = useAppStore((s) => s.analyzeError);
  const botUsername = useAppStore((s) => s.telegramBotUsername);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const authenticated = Boolean(user || guest);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputContainerRef.current?.querySelector("input")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="relative flex-1 overflow-hidden bg-[var(--bg)]">
      {!authenticated ? (
        <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
          <div className="max-w-md border border-[var(--border)] bg-[var(--bg-panel)] p-6 text-center">
            <p className="mb-2 text-xs tracking-[0.3em] text-[var(--accent)]">
              AUTH REQUIRED
            </p>
            <p className="mb-6 text-sm text-[var(--text-secondary)]">
              Connect Telegram for full access, or continue as guest for 5 CA
              searches.
            </p>
            <div className="flex flex-col items-center gap-4">
              {botUsername ? (
                <TelegramLogin botUsername={botUsername} />
              ) : (
                <p className="text-[11px] text-[var(--warning)]">
                  Telegram bot not configured on server.
                </p>
              )}
              <GuestLogin />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={inputContainerRef}
            className="absolute left-4 right-4 top-4 z-10 px-2"
          >
            <CaInput />
            {guest ? (
              <p className="mt-2 text-[10px] text-[var(--warning)]">
                GUEST MODE — {guest.searchesRemaining} of {guest.searchesLimit}{" "}
                searches remaining · STALK requires Telegram
              </p>
            ) : null}
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
            const walletKey =
              panel.walletAddress && panel.contractAddress
                ? walletProfileKey(panel.walletAddress, panel.contractAddress)
                : null;
            const walletProfile = walletKey
              ? walletProfiles[walletKey]
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
                    contractAddress={analysis.contractAddress}
                  />
                ) : panel.type === "WALLET_PROFILE" && walletProfile ? (
                  <WalletProfilePanel profile={walletProfile} />
                ) : panel.type === "WALLET_PROFILE" ? (
                  <p className="scan-line text-[var(--text-secondary)]">
                    TRACING FUNDS... SCANNING TRADES...
                  </p>
                ) : (
                  <p className="text-[var(--text-secondary)]">
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
