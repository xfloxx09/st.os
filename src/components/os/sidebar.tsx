"use client";



import { useState } from "react";

import { useAppStore } from "@/stores/app-store";

import type { CaAnalysisResult } from "@/lib/analyze/types";

import type { SearchHistoryItem } from "@/stores/app-store";

import { isValidEthAddress } from "@/lib/ethereum";

import { elapsedMs, startTimer } from "@/lib/timing";

import { truncateAddress } from "@/lib/ethereum";

import type { WalletTrackSnapshot } from "@/lib/analyze/types";

import {
  crossAnalysisKey,
  walletTrackKey,
} from "@/stores/app-store";
import { fetchCrossAnalysis } from "@/lib/terminal/phase-actions";



export function Sidebar() {

  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  const sidebarTab = useAppStore((s) => s.sidebarTab);

  const setSidebarTab = useAppStore((s) => s.setSidebarTab);

  const searchHistory = useAppStore((s) => s.searchHistory);

  const trackedWallets = useAppStore((s) => s.trackedWallets);

  const setSearchHistory = useAppStore((s) => s.setSearchHistory);

  const setAnalysis = useAppStore((s) => s.setAnalysis);

  const openAnalysisPanels = useAppStore((s) => s.openAnalysisPanels);

  const openTrackPanel = useAppStore((s) => s.openTrackPanel);

  const setWalletTrack = useAppStore((s) => s.setWalletTrack);

  const setLastQueryMs = useAppStore((s) => s.setLastQueryMs);

  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);

  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);

  const crossCompareSelection = useAppStore((s) => s.crossCompareSelection);

  const toggleCrossCompare = useAppStore((s) => s.toggleCrossCompare);

  const clearCrossCompare = useAppStore((s) => s.clearCrossCompare);

  const setCrossAnalysis = useAppStore((s) => s.setCrossAnalysis);

  const openCrossAnalysisPanel = useAppStore((s) => s.openCrossAnalysisPanel);

  const user = useAppStore((s) => s.user);

  const [loadingId, setLoadingId] = useState<number | null>(null);

  const [loadingWallet, setLoadingWallet] = useState<string | null>(null);

  const [runningCross, setRunningCross] = useState(false);



  const loadSearch = async (item: SearchHistoryItem) => {

    if (!isValidEthAddress(item.contractAddress)) return;



    setLoadingId(item.id);

    setAnalyzeError(null);

    const start = startTimer();



    try {

      const res = await fetch(

        `/api/analyze/ca?address=${encodeURIComponent(item.contractAddress)}`

      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Failed to load");



      const result = data as CaAnalysisResult & {

        searchHistory: SearchHistoryItem[];

      };



      setAnalysis(result.contractAddress, result);

      openAnalysisPanels(result.contractAddress);

      setSearchHistory(result.searchHistory);

      setLastQueryMs(elapsedMs(start));

    } catch (err) {

      setAnalyzeError(err instanceof Error ? err.message : "Failed to load");

    } finally {

      setLoadingId(null);

    }

  };



  const openTracked = async (walletAddress: string, sourceContract: string | null) => {

    setLoadingWallet(walletAddress);

    setAnalyzeError(null);

    setActiveProcesses(useAppStore.getState().activeProcesses + 1);

    const start = startTimer();



    try {

      const params = new URLSearchParams({ wallet: walletAddress });

      if (sourceContract) params.set("contract", sourceContract);



      const res = await fetch(`/api/track/refresh?${params}`);

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Track refresh failed");



      const snapshot = data as WalletTrackSnapshot;

      setWalletTrack(walletTrackKey(walletAddress), snapshot);

      openTrackPanel(walletAddress, sourceContract, snapshot.trackLabel);

      setLastQueryMs(elapsedMs(start));

    } catch (err) {

      setAnalyzeError(err instanceof Error ? err.message : "Track refresh failed");

    } finally {

      setLoadingWallet(null);

      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));

    }

  };



  const runCrossAnalysis = async () => {

    if (!user) {

      setAnalyzeError("Connect Telegram for cross-analysis.");

      return;

    }

    if (crossCompareSelection.length < 2) {

      setAnalyzeError("Select at least 2 tokens for cross-analysis.");

      return;

    }



    setRunningCross(true);

    setAnalyzeError(null);

    setActiveProcesses(useAppStore.getState().activeProcesses + 1);

    const start = startTimer();



    try {

      const result = await fetchCrossAnalysis(crossCompareSelection);

      const key = crossAnalysisKey(crossCompareSelection);

      setCrossAnalysis(key, result);

      openCrossAnalysisPanel(crossCompareSelection);

      setLastQueryMs(elapsedMs(start));

    } catch (err) {

      setAnalyzeError(err instanceof Error ? err.message : "Cross-analysis failed");

    } finally {

      setRunningCross(false);

      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));

    }

  };



  if (!sidebarOpen) return null;



  return (

    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-panel)]">

      <div className="flex border-b border-[var(--border)]">

        <button

          type="button"

          onClick={() => setSidebarTab("searches")}

          className={`flex-1 px-2 py-2 text-[10px] tracking-[0.15em] ${

            sidebarTab === "searches"

              ? "bg-[var(--bg)] text-[var(--accent)]"

              : "text-[var(--text-secondary)]"

          }`}

        >

          SEARCHES

        </button>

        <button

          type="button"

          onClick={() => setSidebarTab("tracked")}

          className={`flex-1 px-2 py-2 text-[10px] tracking-[0.15em] ${

            sidebarTab === "tracked"

              ? "bg-[var(--bg)] text-[var(--accent)]"

              : "text-[var(--text-secondary)]"

          }`}

        >

          TRACKED

        </button>

      </div>



      <div className="os-scrollbar flex-1 overflow-y-auto p-2">

        {sidebarTab === "searches" ? (

          searchHistory.length === 0 ? (

            <p className="px-2 py-4 text-[11px] leading-relaxed text-[var(--text-secondary)]">

              No searches yet. Paste a contract address to begin forensics.

            </p>

          ) : (

            <>

              <p className="mb-2 px-1 text-[9px] text-[var(--text-secondary)]">

                Click to load · checkbox for cross-analysis (2–5)

              </p>

              <ul className="space-y-1">

                {searchHistory.map((item) => {

                  const selected = crossCompareSelection

                    .map((c) => c.toLowerCase())

                    .includes(item.contractAddress.toLowerCase());

                  return (

                    <li key={item.id} className="flex items-center gap-1">

                      {user ? (

                        <input

                          type="checkbox"

                          checked={selected}

                          onChange={() => toggleCrossCompare(item.contractAddress)}

                          className="h-3 w-3 shrink-0 accent-[var(--accent)]"

                          aria-label={`Add ${item.tokenSymbol ?? item.contractAddress} to cross set`}

                        />

                      ) : null}

                      <button

                        type="button"

                        onClick={() => void loadSearch(item)}

                        disabled={loadingId === item.id}

                        className="flex min-w-0 flex-1 items-center gap-2 border border-transparent px-1 py-1.5 text-left text-[11px] hover:border-[var(--border)] hover:bg-[var(--bg)] disabled:opacity-50"

                      >

                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />

                        <span className="truncate text-[var(--text-primary)]">

                          {loadingId === item.id

                            ? "LOADING..."

                            : (item.tokenSymbol ?? item.contractAddress.slice(0, 10))}

                        </span>

                      </button>

                    </li>

                  );

                })}

              </ul>

              {user && crossCompareSelection.length > 0 ? (

                <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-2">

                  <p className="text-[9px] text-[var(--text-secondary)]">

                    {crossCompareSelection.length} selected for cross

                  </p>

                  <button

                    type="button"

                    onClick={() => void runCrossAnalysis()}

                    disabled={runningCross || crossCompareSelection.length < 2}

                    className="w-full border border-[var(--accent)] px-2 py-1.5 text-[10px] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] disabled:opacity-40"

                  >

                    {runningCross ? "RUNNING..." : "RUN CROSS ANALYSIS"}

                  </button>

                  <button

                    type="button"

                    onClick={clearCrossCompare}

                    className="w-full text-[9px] text-[var(--text-secondary)] hover:text-[var(--accent)]"

                  >

                    Clear selection

                  </button>

                </div>

              ) : null}

            </>

          )

        ) : trackedWallets.length === 0 ? (

          <p className="px-2 py-4 text-[11px] leading-relaxed text-[var(--text-secondary)]">

            No tracked wallets. Use TRACK on a holder to add live monitoring.

          </p>

        ) : (

          <ul className="space-y-1">

            {trackedWallets.map((item) => (

              <li key={item.id}>

                <button

                  type="button"

                  onClick={() => void openTracked(item.walletAddress, item.sourceContract)}

                  disabled={loadingWallet === item.walletAddress}

                  className="flex w-full flex-col border border-transparent px-2 py-1.5 text-left text-[11px] hover:border-[var(--border)] hover:bg-[var(--bg)] disabled:opacity-50"

                >

                  <span className="truncate text-[var(--text-primary)]">

                    {loadingWallet === item.walletAddress

                      ? "SYNCING..."

                      : (item.label ?? truncateAddress(item.walletAddress))}

                  </span>

                  {item.lastCheckedAt ? (

                    <span className="text-[9px] text-[var(--text-secondary)]">

                      {new Date(item.lastCheckedAt).toLocaleString()}

                    </span>

                  ) : null}

                </button>

              </li>

            ))}

          </ul>

        )}

      </div>

    </aside>

  );

}

