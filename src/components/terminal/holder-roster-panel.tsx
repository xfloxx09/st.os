"use client";

import { useState } from "react";
import type { HolderEntry } from "@/lib/analyze/types";
import { formatUsd, truncateAddress } from "@/lib/ethereum";
import { elapsedMs, startTimer } from "@/lib/timing";
import {
  useAppStore,
  walletProfileKey,
  walletTrackKey,
} from "@/stores/app-store";
import Link from "next/link";
import type { WalletProfile, WalletTrackSnapshot } from "@/lib/analyze/types";

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
  const [loadingAction, setLoadingAction] = useState<"analyze" | "track" | null>(null);
  const guest = useAppStore((s) => s.guest);
  const user = useAppStore((s) => s.user);
  const openWalletPanel = useAppStore((s) => s.openWalletPanel);
  const openTrackPanel = useAppStore((s) => s.openTrackPanel);
  const setWalletProfile = useAppStore((s) => s.setWalletProfile);
  const setWalletTrack = useAppStore((s) => s.setWalletTrack);
  const setTrackedWallets = useAppStore((s) => s.setTrackedWallets);
  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);

  const excludedCount = allHolders.length - holders.length;
  const canAct = Boolean(user);

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
            (server) + CA.OS Pro (you).
          </p>
          <Link href="/pricing" className="mt-2 inline-block text-[var(--accent)] underline">
            Upgrade to CA.OS Pro →
          </Link>
        </div>
      ) : null}
      <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
        <span>
          {holders.length} ANALYZABLE HOLDERS
          {excludedCount > 0 ? ` · ${excludedCount} filtered (CEX/DEX/burn)` : ""}
          {holdersMeta ? ` · via ${holdersMeta.source}` : ""}
        </span>
        {guest ? (
          <span className="text-[var(--warning)]">ANALYZE REQUIRES TELEGRAM</span>
        ) : (
          <span className="text-[var(--accent)]">ANALYZE OR TRACK HOLDERS</span>
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
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
