"use client";



import { useEffect, useRef } from "react";

import { OsWindow } from "@/components/os/os-window";

import { TelegramLogin } from "@/components/auth/telegram-login";

import { GuestLogin } from "@/components/auth/guest-login";

import { CaInput } from "@/components/terminal/ca-input";

import { TokenOverviewPanel } from "@/components/terminal/token-overview-panel";

import { HolderRosterPanel } from "@/components/terminal/holder-roster-panel";

import { WalletProfilePanel } from "@/components/terminal/wallet-profile-panel";

import { WalletTrackerPanel } from "@/components/terminal/wallet-tracker-panel";

import { CrossAnalysisPanel } from "@/components/terminal/cross-analysis-panel";

import { FundTracerPanel } from "@/components/terminal/fund-tracer-panel";

import { WalletNetworkPanel } from "@/components/terminal/wallet-network-panel";

import { ExposeReportPanel } from "@/components/terminal/expose-report-panel";

import {

  crossAnalysisKey,

  networkResultKey,

  getWindowGroups,

  useAppStore,

  walletProfileKey,

  walletTrackKey,

} from "@/stores/app-store";



export function Workspace() {

  const user = useAppStore((s) => s.user);

  const guest = useAppStore((s) => s.guest);

  const panels = useAppStore((s) => s.panels);

  const activeTabByGroup = useAppStore((s) => s.activeTabByGroup);

  const analysisByContract = useAppStore((s) => s.analysisByContract);

  const walletProfiles = useAppStore((s) => s.walletProfiles);

  const walletTracks = useAppStore((s) => s.walletTracks);

  const crossAnalysisResults = useAppStore((s) => s.crossAnalysisResults);

  const fundTraceResults = useAppStore((s) => s.fundTraceResults);

  const networkResults = useAppStore((s) => s.networkResults);

  const bulkExposeResults = useAppStore((s) => s.bulkExposeResults);

  const analyzeError = useAppStore((s) => s.analyzeError);

  const botUsername = useAppStore((s) => s.telegramBotUsername);

  const inputContainerRef = useRef<HTMLDivElement>(null);



  const authenticated = Boolean(user || guest);

  const groups = getWindowGroups(panels);



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

              EXPOSED.OS — SIGN IN

            </p>

            <p className="mb-6 text-sm text-[var(--text-secondary)]">

              Connect Telegram for full access, or guest mode for 5 free contract

              scans.

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

            <p className="mt-4 text-[10px] text-[var(--text-secondary)]">
              <a href="/" className="underline hover:text-[var(--accent)]">About</a>
              {" · "}
              <a href="/pricing" className="underline hover:text-[var(--accent)]">Pricing</a>
            </p>

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

                searches remaining · wallet analyze requires Telegram

              </p>

            ) : null}

            {analyzeError ? (

              <p className="mt-2 text-[11px] text-[var(--danger)]">

                SIGNAL LOST — {analyzeError}

              </p>

            ) : null}

          </div>



          {Array.from(groups.entries()).map(([groupId, tabs]) => {

            const host = tabs.find((p) => p.id === groupId) ?? tabs[0];

            const activeTabId = activeTabByGroup[groupId] ?? host.id;

            const activePanel = tabs.find((p) => p.id === activeTabId) ?? host;



            const analysis = activePanel.contractAddress

              ? analysisByContract[activePanel.contractAddress]

              : null;

            const walletKey =

              activePanel.walletAddress && activePanel.contractAddress

                ? walletProfileKey(

                    activePanel.walletAddress,

                    activePanel.contractAddress

                  )

                : null;

            const walletProfile = walletKey ? walletProfiles[walletKey] : null;

            const trackKey = activePanel.walletAddress

              ? walletTrackKey(activePanel.walletAddress)

              : null;

            const walletTrack = trackKey ? walletTracks[trackKey] : null;

            const crossKey = activePanel.compareContracts?.length

              ? crossAnalysisKey(activePanel.compareContracts)

              : null;

            const crossResult = crossKey ? crossAnalysisResults[crossKey] : null;

            const fundTrace = activePanel.contractAddress

              ? fundTraceResults[activePanel.contractAddress]

              : null;

            const networkKey =

              activePanel.walletAddress && activePanel.networkWindowDays

                ? networkResultKey(

                    activePanel.walletAddress,

                    activePanel.networkWindowDays

                  )

                : activePanel.walletAddress

                  ? networkResultKey(activePanel.walletAddress, 90)

                  : null;

            const networkResult = networkKey ? networkResults[networkKey] : null;

            const bulkExpose = activePanel.contractAddress

              ? bulkExposeResults[activePanel.contractAddress]

              : null;



            return (

              <OsWindow

                key={groupId}

                groupId={groupId}

                host={host}

                tabs={tabs}

                activeTabId={activeTabId}

              >

                {activePanel.type === "TOKEN_OVERVIEW" && analysis ? (

                  <TokenOverviewPanel

                    overview={analysis.overview}

                    cached={analysis.cached}

                    contractAddress={analysis.contractAddress}

                  />

                ) : activePanel.type === "HOLDER_ROSTER" && analysis ? (

                  <HolderRosterPanel

                    holders={analysis.holders}

                    allHolders={analysis.allHolders}

                    contractAddress={analysis.contractAddress}

                    holdersMeta={analysis.holdersMeta}

                  />

                ) : activePanel.type === "WALLET_PROFILE" && walletProfile ? (

                  <WalletProfilePanel profile={walletProfile} />

                ) : activePanel.type === "WALLET_PROFILE" ? (

                  <p className="scan-line text-[var(--text-secondary)]">

                    ANALYZING WALLET... SCANNING TRADES...

                  </p>

                ) : activePanel.type === "WALLET_TRACK" && walletTrack ? (

                  <WalletTrackerPanel
                    snapshot={walletTrack}
                    contractAddress={activePanel.contractAddress}
                  />

                ) : activePanel.type === "WALLET_TRACK" ? (

                  <p className="scan-line text-[var(--text-secondary)]">

                    SYNCING TRACKER... PULLING LIVE ACTIVITY...

                  </p>

                ) : activePanel.type === "CROSS_ANALYSIS" && crossResult ? (

                  <CrossAnalysisPanel
                    result={crossResult}
                    primaryContract={activePanel.compareContracts?.[0]}
                  />

                ) : activePanel.type === "CROSS_ANALYSIS" ? (

                  <p className="scan-line text-[var(--text-secondary)]">

                    RUNNING CROSS-HOLDER ENGINE...

                  </p>

                ) : activePanel.type === "FUND_TRACER" && fundTrace ? (

                  <FundTracerPanel result={fundTrace} />

                ) : activePanel.type === "FUND_TRACER" ? (

                  <p className="scan-line text-[var(--text-secondary)]">

                    TRACING FUND ORIGINS ACROSS HOLDERS...

                  </p>

                ) : activePanel.type === "WALLET_NETWORK" && networkResult ? (

                  <WalletNetworkPanel

                    result={networkResult}

                    walletAddress={activePanel.walletAddress!}

                    contractAddress={activePanel.contractAddress}

                  />

                ) : activePanel.type === "WALLET_NETWORK" ? (

                  <p className="scan-line text-[var(--text-secondary)]">

                    MAPPING WALLET SYNDICATE... TRACING CO-BUYS...

                  </p>

                ) : activePanel.type === "EXPOSE_REPORT" && bulkExpose ? (

                  <ExposeReportPanel result={bulkExpose} />

                ) : activePanel.type === "EXPOSE_REPORT" ? (

                  <p className="scan-line text-[var(--text-secondary)]">

                    RUNNING BULK EXPOSE... MAPPING FISHY WALLETS...

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

