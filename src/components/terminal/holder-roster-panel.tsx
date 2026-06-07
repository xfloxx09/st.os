"use client";

import { useState } from "react";
import type { HolderEntry } from "@/lib/analyze/types";
import { formatUsd, truncateAddress } from "@/lib/ethereum";
import { elapsedMs, startTimer } from "@/lib/timing";
import {
  useAppStore,
  walletProfileKey,
} from "@/stores/app-store";
import type { WalletProfile } from "@/lib/analyze/types";

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
  };
}) {
  const [loadingWallet, setLoadingWallet] = useState<string | null>(null);
  const guest = useAppStore((s) => s.guest);
  const user = useAppStore((s) => s.user);
  const openWalletPanel = useAppStore((s) => s.openWalletPanel);
  const setWalletProfile = useAppStore((s) => s.setWalletProfile);
  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);

  const excludedCount = allHolders.length - holders.length;
  const canStalk = Boolean(user);

  const onStalk = async (holder: HolderEntry) => {
    if (!canStalk) {
      setAnalyzeError("Connect Telegram to STALK wallets.");
      return;
    }

    setLoadingWallet(holder.address);
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
      if (!res.ok) throw new Error(data.error ?? "STALK failed");

      const profile = data as WalletProfile;
      const key = walletProfileKey(holder.address, contractAddress);
      setWalletProfile(key, profile);
      openWalletPanel(holder.address, contractAddress, holder.rank);
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "STALK failed");
    } finally {
      setLoadingWallet(null);
      setActiveProcesses(
        Math.max(0, useAppStore.getState().activeProcesses - 1)
      );
    }
  };

  return (
    <div className="space-y-3 text-[11px]">
      <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
        <span>
          {holders.length} ANALYZABLE HOLDERS
          {excludedCount > 0 ? ` · ${excludedCount} filtered (CEX/DEX/burn)` : ""}
          {holdersMeta ? ` · via ${holdersMeta.source}` : ""}
        </span>
        {guest ? (
          <span className="text-[var(--warning)]">STALK REQUIRES TELEGRAM</span>
        ) : (
          <span className="text-[var(--accent)]">CLICK STALK TO PROFILE</span>
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
                    <button
                      type="button"
                      onClick={() => void onStalk(holder)}
                      disabled={!canStalk || loadingWallet === holder.address}
                      className="border border-[var(--accent)] px-2 py-0.5 text-[10px] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] disabled:opacity-40"
                    >
                      {loadingWallet === holder.address ? "..." : "STALK"}
                    </button>
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
