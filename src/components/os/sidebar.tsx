"use client";



import { useState } from "react";

import { useAppStore } from "@/stores/app-store";

import type { CaAnalysisResult } from "@/lib/analyze/types";

import type { SearchHistoryItem } from "@/stores/app-store";

import { isValidEthAddress } from "@/lib/ethereum";

import { elapsedMs, startTimer } from "@/lib/timing";

import { truncateAddress } from "@/lib/ethereum";

import {
  crossAnalysisKey,
  type TrackedFolderItem,
  type TrackedWalletItem,
} from "@/stores/app-store";
import { fetchCrossAnalysis } from "@/lib/terminal/phase-actions";



export function Sidebar() {

  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  const sidebarTab = useAppStore((s) => s.sidebarTab);

  const setSidebarTab = useAppStore((s) => s.setSidebarTab);

  const searchHistory = useAppStore((s) => s.searchHistory);

  const trackedWallets = useAppStore((s) => s.trackedWallets);

  const trackedFolders = useAppStore((s) => s.trackedFolders);

  const walletAliases = useAppStore((s) => s.walletAliases);

  const setTrackedWallets = useAppStore((s) => s.setTrackedWallets);

  const setTrackedFolders = useAppStore((s) => s.setTrackedFolders);

  const updateTrackedWallet = useAppStore((s) => s.updateTrackedWallet);

  const openWalletPanel = useAppStore((s) => s.openWalletPanel);

  const setSearchHistory = useAppStore((s) => s.setSearchHistory);

  const setAnalysis = useAppStore((s) => s.setAnalysis);

  const openAnalysisPanels = useAppStore((s) => s.openAnalysisPanels);

  const setLastQueryMs = useAppStore((s) => s.setLastQueryMs);

  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);

  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);

  const crossCompareSelection = useAppStore((s) => s.crossCompareSelection);

  const toggleCrossCompare = useAppStore((s) => s.toggleCrossCompare);

  const clearCrossCompare = useAppStore((s) => s.clearCrossCompare);

  const setCrossAnalysis = useAppStore((s) => s.setCrossAnalysis);

  const openCrossAnalysisPanel = useAppStore((s) => s.openCrossAnalysisPanel);

  const closePanel = useAppStore((s) => s.closePanel);

  const user = useAppStore((s) => s.user);

  const [loadingId, setLoadingId] = useState<number | null>(null);

  const [runningCross, setRunningCross] = useState(false);

  const [newFolderName, setNewFolderName] = useState("");

  const [showNewFolder, setShowNewFolder] = useState(false);

  const [collapsedFolders, setCollapsedFolders] = useState<Record<number, boolean>>({});



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



  const displayName = (address: string, label: string | null) =>
    walletAliases[address.toLowerCase()] ?? label ?? truncateAddress(address);

  const openTracked = (walletAddress: string, sourceContract: string | null, label: string | null) => {
    if (!sourceContract) {
      setAnalyzeError("No source contract for this wallet.");
      return;
    }
    openWalletPanel(walletAddress, sourceContract, {
      label: displayName(walletAddress, label),
    });
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/track/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create folder");
      setTrackedFolders([...trackedFolders, data.folder]);
      setNewFolderName("");
      setShowNewFolder(false);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Folder create failed");
    }
  };

  const moveToFolder = async (walletAddress: string, folderId: number | null) => {
    try {
      const res = await fetch("/api/track", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, folderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Move failed");
      updateTrackedWallet(walletAddress, { folderId });
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Move failed");
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



  const untrackWallet = async (walletAddress: string) => {

    try {

      const res = await fetch(

        `/api/track?wallet=${encodeURIComponent(walletAddress)}`,

        { method: "DELETE" }

      );

      if (!res.ok) {

        const data = await res.json();

        throw new Error(data.error ?? "Failed to untrack");

      }

      setTrackedWallets(

        trackedWallets.filter(

          (w) => w.walletAddress.toLowerCase() !== walletAddress.toLowerCase()

        )

      );

      closePanel(`track-${walletAddress}`);

    } catch (err) {

      setAnalyzeError(err instanceof Error ? err.message : "Untrack failed");

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

        ) : (
          <>
            <div className="mb-2 flex items-center justify-between gap-1 px-1">
              <p className="text-[9px] text-[var(--text-secondary)]">
                Click wallet to open intel
              </p>
              <button
                type="button"
                onClick={() => setShowNewFolder((v) => !v)}
                className="text-[9px] text-[var(--accent)] hover:underline"
              >
                + FOLDER
              </button>
            </div>
            {showNewFolder ? (
              <div className="mb-2 flex gap-1 px-1">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="flex-1 border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1 text-[10px] outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => void createFolder()}
                  className="border border-[var(--accent)] px-1.5 text-[9px] text-[var(--accent)]"
                >
                  ADD
                </button>
              </div>
            ) : null}
            {trackedWallets.length === 0 ? (
              <p className="px-2 py-2 text-[10px] text-[var(--text-secondary)]">
                No tracked wallets. Open a wallet and hit TRACK.
              </p>
            ) : (
              <div className="space-y-3">
                {trackedFolders.map((folder) => {
                  const wallets = trackedWallets.filter(
                    (w) => w.folderId === folder.id
                  );
                  if (wallets.length === 0) return null;
                  const collapsed = collapsedFolders[folder.id];
                  return (
                    <div key={folder.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedFolders((c) => ({
                            ...c,
                            [folder.id]: !c[folder.id],
                          }))
                        }
                        className="flex w-full items-center gap-1 px-1 text-[10px] text-[var(--warning)]"
                      >
                        {collapsed ? "▶" : "▼"} {folder.name} ({wallets.length})
                      </button>
                      {!collapsed ? (
                        <ul className="mt-1 space-y-0.5 pl-2">
                          {wallets.map((item) => (
                            <TrackedRow
                              key={item.id}
                              item={item}
                              displayName={displayName(item.walletAddress, item.label)}
                              folders={trackedFolders}
                              onOpen={() =>
                                openTracked(
                                  item.walletAddress,
                                  item.sourceContract,
                                  item.label
                                )
                              }
                              onUntrack={() => void untrackWallet(item.walletAddress)}
                              onMove={(folderId) =>
                                void moveToFolder(item.walletAddress, folderId)
                              }
                            />
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
                {(() => {
                  const unfiled = trackedWallets.filter((w) => !w.folderId);
                  if (unfiled.length === 0) return null;
                  return (
                    <div>
                      <p className="px-1 text-[10px] text-[var(--text-secondary)]">
                        UNFILED ({unfiled.length})
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {unfiled.map((item) => (
                          <TrackedRow
                            key={item.id}
                            item={item}
                            displayName={displayName(item.walletAddress, item.label)}
                            folders={trackedFolders}
                            onOpen={() =>
                              openTracked(
                                item.walletAddress,
                                item.sourceContract,
                                item.label
                              )
                            }
                            onUntrack={() => void untrackWallet(item.walletAddress)}
                            onMove={(folderId) =>
                              void moveToFolder(item.walletAddress, folderId)
                            }
                          />
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}

      </div>

    </aside>

  );

}

function TrackedRow({
  item,
  displayName,
  folders,
  onOpen,
  onUntrack,
  onMove,
}: {
  item: TrackedWalletItem;
  displayName: string;
  folders: TrackedFolderItem[];
  onOpen: () => void;
  onUntrack: () => void;
  onMove: (folderId: number | null) => void;
}) {
  return (
    <li className="group flex items-center gap-0.5">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col border border-transparent px-1.5 py-1 text-left text-[10px] hover:border-[var(--border)] hover:bg-[var(--bg)]"
      >
        <span className="truncate text-[var(--accent)]">{displayName}</span>
        {item.lastCheckedAt ? (
          <span className="text-[8px] text-[var(--text-secondary)]">
            {new Date(item.lastCheckedAt).toLocaleDateString()}
          </span>
        ) : null}
      </button>
      {folders.length > 0 ? (
        <select
          value={item.folderId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onMove(v ? Number(v) : null);
          }}
          className="max-w-[52px] border border-[var(--border)] bg-[var(--bg)] text-[8px] text-[var(--text-secondary)] opacity-0 group-hover:opacity-100"
          title="Move to folder"
        >
          <option value="">—</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name.slice(0, 8)}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="button"
        onClick={onUntrack}
        className="shrink-0 px-1 text-[10px] text-[var(--text-secondary)] opacity-0 hover:text-[var(--danger)] group-hover:opacity-100"
        title="Untrack"
      >
        ×
      </button>
    </li>
  );
}
