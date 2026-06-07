"use client";



import { useState } from "react";

import type { HolderEntry } from "@/lib/analyze/types";

import { formatUsd, truncateAddress } from "@/lib/ethereum";

import { elapsedMs, startTimer } from "@/lib/timing";

import {

  useAppStore,

  walletProfileKey,

  walletTrackKey,

  networkResultKey,

} from "@/stores/app-store";

import Link from "next/link";

import type { WalletProfile, WalletTrackSnapshot } from "@/lib/analyze/types";

import { fetchFundTrace, fetchWalletNetwork } from "@/lib/terminal/phase-actions";



export function HolderRosterPanel({

  holders,

  allHolders,

  contractAddress,

  holdersMeta,

}: {

  holders: HolderEntry[];

  allHolders: HolderEntry[];

  contractAddress: string;

  holdersMeta?: {

    source: string;

    totalRaw: number;

    analyzable: number;

    filtered: number;

    warning?: string;

    proRequired?: boolean;

  };

}) {

  const [loadingWallet, setLoadingWallet] = useState<string | null>(null);

  const [loadingAction, setLoadingAction] = useState<
    "analyze" | "track" | "network" | null
  >(null);

  const [tracingFunds, setTracingFunds] = useState(false);

  const [showFiltered, setShowFiltered] = useState(false);

  const guest = useAppStore((s) => s.guest);

  const user = useAppStore((s) => s.user);

  const openWalletPanel = useAppStore((s) => s.openWalletPanel);

  const openTrackPanel = useAppStore((s) => s.openTrackPanel);

  const setWalletProfile = useAppStore((s) => s.setWalletProfile);

  const setWalletTrack = useAppStore((s) => s.setWalletTrack);

  const setTrackedWallets = useAppStore((s) => s.setTrackedWallets);

  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);

  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);
  const openFundTracerPanel = useAppStore((s) => s.openFundTracerPanel);
  const setFundTrace = useAppStore((s) => s.setFundTrace);
  const toggleCrossCompare = useAppStore((s) => s.toggleCrossCompare);
  const crossCompareSelection = useAppStore((s) => s.crossCompareSelection);
  const openNetworkPanel = useAppStore((s) => s.openNetworkPanel);
  const setNetworkResult = useAppStore((s) => s.setNetworkResult);



  const excludedCount = allHolders.length - holders.length;

  const filteredHolders = allHolders.filter((h) => h.excluded);

  const canAct = Boolean(user);

  const inCross = crossCompareSelection

    .map((c) => c.toLowerCase())

    .includes(contractAddress.toLowerCase());



  const onTraceFunds = async () => {

    if (!canAct) {

      setAnalyzeError("Connect Telegram for fund tracing.");

      return;

    }

    setTracingFunds(true);

    setAnalyzeError(null);

    setActiveProcesses(useAppStore.getState().activeProcesses + 1);

    const start = startTimer();

    try {

      const result = await fetchFundTrace(contractAddress);

      setFundTrace(contractAddress, result);

      openFundTracerPanel(contractAddress);

      useAppStore.getState().setLastQueryMs(elapsedMs(start));

    } catch (err) {

      setAnalyzeError(err instanceof Error ? err.message : "Fund trace failed");

    } finally {

      setTracingFunds(false);

      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));

    }

  };



  const onAnalyze = async (holder: HolderEntry) => {

    if (!canAct) {

      setAnalyzeError("Connect Telegram to analyze wallets.");

      return;

    }



    setLoadingWallet(holder.address);

    setLoadingAction("analyze");

    setAnalyzeError(null);

    setActiveProcesses(useAppStore.getState().activeProcesses + 1);

    const start = startTimer();



    try {

      const params = new URLSearchParams({

        wallet: holder.address,

        contract: contractAddress,

        percent: String(holder.percentOfSupply),

      });

      const res = await fetch(`/api/analyze/wallet?${params}`);

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Analyze failed");



      const profile = data as WalletProfile;

      const key = walletProfileKey(holder.address, contractAddress);

      setWalletProfile(key, profile);

      openWalletPanel(holder.address, contractAddress, holder.rank);

      useAppStore.getState().setLastQueryMs(elapsedMs(start));

    } catch (err) {

      setAnalyzeError(err instanceof Error ? err.message : "Analyze failed");

    } finally {

      setLoadingWallet(null);

      setLoadingAction(null);

      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));

    }

  };



  const onNetwork = async (holder: HolderEntry) => {
    if (!canAct) {
      setAnalyzeError("Connect Telegram for network map.");
      return;
    }
    setLoadingWallet(holder.address);
    setLoadingAction("network");
    setAnalyzeError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    const start = startTimer();
    try {
      const result = await fetchWalletNetwork(
        holder.address,
        90,
        contractAddress
      );
      setNetworkResult(networkResultKey(holder.address, 90), result);
      openNetworkPanel(holder.address, contractAddress, 90);
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Network map failed");
    } finally {
      setLoadingWallet(null);
      setLoadingAction(null);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  const onTrack = async (holder: HolderEntry) => {

    if (!canAct) {

      setAnalyzeError("Connect Telegram to track wallets.");

      return;

    }



    setLoadingWallet(holder.address);

    setLoadingAction("track");

    setAnalyzeError(null);

    setActiveProcesses(useAppStore.getState().activeProcesses + 1);

    const start = startTimer();



    try {

      const label = holder.label ?? truncateAddress(holder.address);



      const addRes = await fetch("/api/track", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          walletAddress: holder.address,

          sourceContract: contractAddress,

          label,

        }),

      });

      const addData = await addRes.json();

      if (!addRes.ok) throw new Error(addData.error ?? "Failed to add track");



      const listRes = await fetch("/api/track");

      if (listRes.ok) {

        const listData = await listRes.json();

        setTrackedWallets(listData.wallets ?? []);

      }



      const params = new URLSearchParams({

        wallet: holder.address,

        contract: contractAddress,

        percent: String(holder.percentOfSupply),

      });

      const res = await fetch(`/api/track/refresh?${params}`);

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Track refresh failed");



      const snapshot = data as WalletTrackSnapshot;

      setWalletTrack(walletTrackKey(holder.address), snapshot);

      openTrackPanel(holder.address, contractAddress, label);

      useAppStore.getState().setLastQueryMs(elapsedMs(start));

      useAppStore.getState().setSidebarTab("tracked");

    } catch (err) {

      setAnalyzeError(err instanceof Error ? err.message : "Track failed");

    } finally {

      setLoadingWallet(null);

      setLoadingAction(null);

      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));

    }

  };



  return (

    <div className="space-y-3 text-[11px]">

      {holdersMeta?.proRequired ? (

        <div className="border border-[var(--warning)] bg-[var(--bg)] p-3 text-[10px]">

          <p className="text-[var(--warning)]">

            FREE TIER: Blockscout holder data. Etherscan direct pipeline requires{" "}

            <a

              href="https://docs.etherscan.io/resources/pro-endpoints"

              className="underline"

              target="_blank"

              rel="noreferrer"

            >

              Etherscan API Pro

            </a>{" "}

            (server) + EXPOSED.OS Pro (you).

          </p>

          <Link href="/pricing" className="mt-2 inline-block text-[var(--accent)] underline">

            Upgrade to EXPOSED.OS Pro →

          </Link>

        </div>

      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-secondary)]">

        <span>

          {holders.length} ANALYZABLE HOLDERS

          {excludedCount > 0 ? ` · ${excludedCount} filtered (CEX/DEX/burn)` : ""}

          {holdersMeta ? ` · via ${holdersMeta.source}` : ""}

        </span>

        {canAct ? (

          <div className="flex gap-1">

            <button

              type="button"

              onClick={() => void onTraceFunds()}

              disabled={tracingFunds}

              className="border border-[var(--warning)] px-2 py-0.5 text-[10px] text-[var(--warning)] hover:bg-[var(--warning)] hover:text-[var(--bg)] disabled:opacity-40"

            >

              {tracingFunds ? "..." : "TRACE FUNDS"}

            </button>

            <button

              type="button"

              onClick={() => toggleCrossCompare(contractAddress)}

              className={`border px-2 py-0.5 text-[10px] ${

                inCross

                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"

                  : "border-[var(--accent)] text-[var(--accent)]"

              }`}

            >

              {inCross ? "IN CROSS" : "CROSS"}

            </button>

          </div>

        ) : (

          <span className="text-[var(--warning)]">ANALYZE REQUIRES TELEGRAM</span>

        )}

      </div>



      <div className="max-h-[300px] overflow-auto os-scrollbar">

        <table className="w-full text-left">

          <thead className="sticky top-0 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)]">

            <tr className="border-b border-[var(--border)]">

              <th className="py-1 pr-2">#</th>

              <th className="py-1 pr-2">WALLET</th>

              <th className="py-1 pr-2 text-right">%</th>

              <th className="py-1 pr-2 text-right">USD</th>

              <th className="py-1 text-right">ACT</th>

            </tr>

          </thead>

          <tbody>

            {holders.length === 0 ? (

              <tr>

                <td colSpan={5} className="py-6 text-center text-[var(--text-secondary)]">

                  {allHolders.length > 0

                    ? `${allHolders.length} holders loaded but all were filtered (CEX/DEX/bridges). Expand filtered list below.`

                    : "No holder data returned. Try a different token or refresh."}

                </td>

              </tr>

            ) : (

              holders.map((holder) => (

                <tr

                  key={holder.address}

                  className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]"

                >

                  <td className="py-1.5 pr-2 text-[var(--text-secondary)]">

                    {holder.rank}

                  </td>

                  <td className="py-1.5 pr-2">

                    <div className="text-[var(--text-primary)]">

                      {holder.label ?? truncateAddress(holder.address)}

                    </div>

                  </td>

                  <td className="py-1.5 pr-2 text-right">

                    {holder.percentOfSupply.toFixed(2)}%

                  </td>

                  <td className="py-1.5 pr-2 text-right">

                    {formatUsd(holder.usdValue)}

                  </td>

                  <td className="py-1.5 text-right">

                    <div className="flex justify-end gap-1">

                      <button

                        type="button"

                        onClick={() => void onAnalyze(holder)}

                        disabled={

                          !canAct ||

                          (loadingWallet === holder.address && loadingAction === "analyze")

                        }

                        className="border border-[var(--accent)] px-2 py-0.5 text-[10px] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] disabled:opacity-40"

                      >

                        {loadingWallet === holder.address && loadingAction === "analyze"

                          ? "..."

                          : "ANALYZE"}

                      </button>

                      <button

                        type="button"

                        onClick={() => void onTrack(holder)}

                        disabled={

                          !canAct ||

                          (loadingWallet === holder.address && loadingAction === "track")

                        }

                        className="border border-[var(--success)] px-2 py-0.5 text-[10px] text-[var(--success)] hover:bg-[var(--success)] hover:text-[var(--bg)] disabled:opacity-40"

                      >

                        {loadingWallet === holder.address && loadingAction === "track"

                          ? "..."

                          : "TRACK"}

                      </button>

                      <button

                        type="button"

                        onClick={() => void onNetwork(holder)}

                        disabled={

                          !canAct ||

                          (loadingWallet === holder.address && loadingAction === "network")

                        }

                        className="border border-[var(--warning)] px-2 py-0.5 text-[10px] text-[var(--warning)] hover:bg-[var(--warning)] hover:text-[var(--bg)] disabled:opacity-40"

                        title="Map wallet friends & co-buys"

                      >

                        {loadingWallet === holder.address && loadingAction === "network"

                          ? "..."

                          : "NET"}

                      </button>

                    </div>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {filteredHolders.length > 0 ? (
        <div className="border-t border-[var(--border)] pt-2">
          <button
            type="button"
            onClick={() => setShowFiltered((v) => !v)}
            className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            {showFiltered ? "▼" : "▶"} FILTERED ({filteredHolders.length}) — CEX/DEX/bridges/burn
          </button>
          {showFiltered ? (
            <div className="mt-2 max-h-32 overflow-auto os-scrollbar">
              <table className="w-full text-left text-[10px]">
                <tbody>
                  {filteredHolders.map((holder) => (
                    <tr
                      key={holder.address}
                      className="border-b border-[var(--border)]/30 text-[var(--text-secondary)]"
                    >
                      <td className="py-1 pr-2">{holder.rank}</td>
                      <td className="py-1 pr-2">
                        {holder.label ?? truncateAddress(holder.address)}
                      </td>
                      <td className="py-1 text-right">
                        {holder.percentOfSupply.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

    </div>

  );

}

