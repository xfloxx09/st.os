"use client";

import { useState } from "react";
import type { CrossAnalysisResult, CrossHolderOverlap } from "@/lib/analyze/types";
import { truncateAddress } from "@/lib/ethereum";
import {
  fetchTrackRefresh,
  fetchWalletAnalyze,
} from "@/lib/terminal/phase-actions";
import { elapsedMs, startTimer } from "@/lib/timing";
import {
  useAppStore,
  walletProfileKey,
  walletTrackKey,
} from "@/stores/app-store";

export function CrossAnalysisPanel({
  result,
  primaryContract,
}: {
  result: CrossAnalysisResult;
  primaryContract?: string;
}) {
  const [loadingWallet, setLoadingWallet] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"analyze" | "track" | null>(
    null
  );
  const setWalletProfile = useAppStore((s) => s.setWalletProfile);
  const setWalletTrack = useAppStore((s) => s.setWalletTrack);
  const openWalletPanel = useAppStore((s) => s.openWalletPanel);
  const openTrackPanel = useAppStore((s) => s.openTrackPanel);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);
  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);

  const defaultContract =
    primaryContract ?? result.contracts[0] ?? "";

  const onAnalyze = async (row: CrossHolderOverlap) => {
    const contract =
      row.tokens[0]?.contractAddress ?? defaultContract;
    const percent = row.tokens[0]?.percentOfSupply ?? 0;
    setLoadingWallet(row.address);
    setLoadingAction("analyze");
    setAnalyzeError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    const start = startTimer();
    try {
      const profile = await fetchWalletAnalyze(row.address, contract, percent);
      setWalletProfile(walletProfileKey(row.address, contract), profile);
      openWalletPanel(row.address, contract, {
        percent,
        label: row.label,
      });
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analyze failed");
    } finally {
      setLoadingWallet(null);
      setLoadingAction(null);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  const onTrack = async (row: CrossHolderOverlap) => {
    const contract =
      row.tokens[0]?.contractAddress ?? defaultContract;
    setLoadingWallet(row.address);
    setLoadingAction("track");
    setAnalyzeError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    const start = startTimer();
    try {
      const snapshot = await fetchTrackRefresh(row.address, contract);
      setWalletTrack(walletTrackKey(row.address), snapshot);
      openTrackPanel(
        row.address,
        contract,
        row.label ?? truncateAddress(row.address)
      );
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Track failed");
    } finally {
      setLoadingWallet(null);
      setLoadingAction(null);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  return (
    <div className="space-y-4 text-[11px]">
      <div>
        <div className="text-[var(--accent)]">CROSS-HOLDER ENGINE</div>
        <div className="text-[10px] text-[var(--text-secondary)]">
          {result.contracts.length} tokens · {result.totalOverlappingWallets}{" "}
          overlapping wallets
        </div>
        {result.cached ? (
          <p className="text-[10px] text-[var(--text-secondary)]">[CACHED RESPONSE]</p>
        ) : null}
      </div>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          TOP INSIDER CANDIDATES
        </h3>
        <div className="max-h-36 space-y-1 overflow-auto os-scrollbar">
          {result.topInsiderCandidates.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No overlapping holders found.</p>
          ) : (
            result.topInsiderCandidates.map((row) => (
              <div
                key={row.address}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)]/40 py-1"
              >
                <span>{row.label ?? truncateAddress(row.address)}</span>
                <span className="text-[var(--warning)]">SCORE {row.insiderScore}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void onAnalyze(row)}
                    disabled={loadingWallet === row.address}
                    className="border border-[var(--accent)] px-1.5 py-0.5 text-[9px] text-[var(--accent)]"
                  >
                    {loadingWallet === row.address && loadingAction === "analyze"
                      ? "..."
                      : "ANALYZE"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onTrack(row)}
                    disabled={loadingWallet === row.address}
                    className="border border-[var(--success)] px-1.5 py-0.5 text-[9px] text-[var(--success)]"
                  >
                    {loadingWallet === row.address && loadingAction === "track"
                      ? "..."
                      : "TRACK"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          SHARED HOLDERS
        </h3>
        <div className="max-h-44 overflow-auto os-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)]">
              <tr>
                <th className="py-1 pr-2">WALLET</th>
                <th className="py-1 pr-2">TOKENS</th>
                <th className="py-1 pr-2 text-right">SCORE</th>
                <th className="py-1 text-right">ACT</th>
              </tr>
            </thead>
            <tbody>
              {result.overlaps.map((row) => (
                <tr key={row.address} className="border-b border-[var(--border)]/40">
                  <td className="py-1 pr-2">
                    {row.label ?? truncateAddress(row.address)}
                  </td>
                  <td className="py-1 pr-2 text-[var(--text-secondary)]">
                    {row.tokens
                      .map((t) => `${t.symbol ?? "?"} ${t.percentOfSupply.toFixed(1)}%`)
                      .join(" · ")}
                  </td>
                  <td className="py-1 pr-2 text-right text-[var(--accent)]">
                    {row.insiderScore}
                  </td>
                  <td className="py-1 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void onAnalyze(row)}
                        disabled={loadingWallet === row.address}
                        className="border border-[var(--accent)] px-1 py-0.5 text-[9px] text-[var(--accent)]"
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => void onTrack(row)}
                        disabled={loadingWallet === row.address}
                        className="border border-[var(--success)] px-1 py-0.5 text-[9px] text-[var(--success)]"
                      >
                        T
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          SHARED FUND SOURCES
        </h3>
        <div className="max-h-32 space-y-2 overflow-auto os-scrollbar">
          {result.sharedFundSources.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No shared funding paths detected.</p>
          ) : (
            result.sharedFundSources.map((source) => (
              <div
                key={source.sourceAddress}
                className="border border-[var(--border)] p-2"
              >
                <div className="flex justify-between gap-2">
                  <span>{source.label ?? truncateAddress(source.sourceAddress)}</span>
                  <span className="text-[var(--danger)]">
                    SUSPICION {source.suspicionScore}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Funds {source.holderAddresses.length} holders
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
