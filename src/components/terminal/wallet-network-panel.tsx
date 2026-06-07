"use client";

import { useState } from "react";
import type { NetworkWindow } from "@/lib/analyze/wallet-network";
import type { WalletNetworkResult } from "@/lib/analyze/types";
import { truncateAddress } from "@/lib/ethereum";
import { fetchWalletNetwork } from "@/lib/terminal/phase-actions";
import { elapsedMs, startTimer } from "@/lib/timing";
import { networkResultKey, useAppStore } from "@/stores/app-store";
import { NetworkGraph } from "@/components/terminal/network-graph";

const VERDICT_COLOR: Record<WalletNetworkResult["clusterVerdict"], string> = {
  WINNING_SYNDICATE: "var(--success)",
  LOSING_BAGHOLDERS: "var(--danger)",
  MIXED: "var(--warning)",
  UNKNOWN: "var(--text-secondary)",
};

export function WalletNetworkPanel({
  result: initial,
  walletAddress,
  contractAddress,
}: {
  result: WalletNetworkResult;
  walletAddress: string;
  contractAddress?: string;
}) {
  const [result, setResult] = useState(initial);
  const [windowDays, setWindowDays] = useState<NetworkWindow>(
    initial.windowDays as NetworkWindow
  );
  const [loading, setLoading] = useState(false);
  const setNetworkResult = useAppStore((s) => s.setNetworkResult);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);

  const rerun = async (days: NetworkWindow) => {
    setLoading(true);
    setWindowDays(days);
    setAnalyzeError(null);
    const start = startTimer();
    try {
      const next = await fetchWalletNetwork(walletAddress, days, contractAddress);
      setResult(next);
      setNetworkResult(networkResultKey(walletAddress, days), next);
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Network map failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 text-[11px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[var(--accent)]">WALLET NETWORK MAP</div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {truncateAddress(result.seedWallet, 6)} · FBI-style link analysis
          </div>
          <p className="mt-1 text-[10px] text-[var(--text-primary)]">{result.summary}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[var(--text-secondary)]">SUSPICION</div>
          <div className="text-lg text-[var(--danger)]">{result.suspicionScore}</div>
          <div
            className="text-[9px]"
            style={{ color: VERDICT_COLOR[result.clusterVerdict] }}
          >
            {result.clusterVerdict.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void rerun(30)}
          disabled={loading}
          className={`border px-2 py-1 text-[10px] ${
            windowDays === 30
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
              : "border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          1 MONTH
        </button>
        <button
          type="button"
          onClick={() => void rerun(90)}
          disabled={loading}
          className={`border px-2 py-1 text-[10px] ${
            windowDays === 90
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
              : "border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          3 MONTHS
        </button>
        {loading ? (
          <span className="self-center text-[10px] text-[var(--warning)]">SCANNING...</span>
        ) : null}
      </div>

      <NetworkGraph nodes={result.graph.nodes} edges={result.graph.edges} />

      <div className="grid grid-cols-3 gap-1 text-[9px] text-[var(--text-secondary)]">
        <span>
          <span className="text-[var(--accent)]">━</span> co-bought
        </span>
        <span>
          <span className="text-[var(--success)]">━</span> shared token
        </span>
        <span>
          <span className="text-[var(--danger)]">━</span> funded by
        </span>
      </div>

      <section>
        <h3 className="mb-1 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          LINKED WALLETS ({result.friends.length})
        </h3>
        <div className="max-h-28 space-y-1 overflow-auto os-scrollbar">
          {result.friends.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No syndicate links in this window.</p>
          ) : (
            result.friends.map((f) => (
              <div
                key={f.address}
                className="flex flex-wrap items-center justify-between gap-1 border-b border-[var(--border)]/40 py-1"
              >
                <span>{f.label ?? truncateAddress(f.address)}</span>
                <span className="text-[var(--warning)]">BOND {f.bondScore}</span>
                <span className="text-[var(--text-secondary)]">
                  {f.commonTokens.length} tokens · {f.pnlAlignment.replace(/_/g, " ")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          COMMON TOKEN CLUSTERS
        </h3>
        <div className="max-h-24 space-y-1 overflow-auto os-scrollbar">
          {result.commonTokenClusters.map((c) => (
            <div
              key={c.contractAddress}
              className="flex justify-between gap-2 border-b border-[var(--border)]/30 py-1"
            >
              <span>
                {c.symbol} · {c.friendCount} wallets
              </span>
              <span style={{ color: VERDICT_COLOR[c.pnlAlignment === "WINNING_TOGETHER" ? "WINNING_SYNDICATE" : c.pnlAlignment === "LOSING_TOGETHER" ? "LOSING_BAGHOLDERS" : "MIXED"] }}>
                {c.pnlAlignment.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
