"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ExposedWallet, HolderEntry, TraderEntry } from "@/lib/analyze/types";
import { formatUsd, truncateAddress } from "@/lib/ethereum";
import { elapsedMs, startTimer } from "@/lib/timing";
import {
  fetchBulkExpose,
  fetchExposeScan,
  fetchFundTrace,
  fetchWalletNetwork,
} from "@/lib/terminal/phase-actions";
import {
  networkResultKey,
  useAppStore,
  walletProfileKey,
  walletTrackKey,
} from "@/stores/app-store";
import type { WalletProfile, WalletTrackSnapshot } from "@/lib/analyze/types";

type Tab = "holders" | "traders" | "exposed";

function formatPercent(value: number): string {
  if (value >= 0.01) return `${value.toFixed(2)}%`;
  if (value > 0) return `${value.toFixed(4)}%`;
  return "0.00%";
}

const TIER_COLOR: Record<ExposedWallet["tier"], string> = {
  CRITICAL: "var(--danger)",
  HIGH: "var(--warning)",
  MEDIUM: "var(--accent)",
  LOW: "var(--text-secondary)",
};

function WalletRow({
  address,
  label,
  rank,
  rightPrimary,
  rightSecondary,
  actions,
  highlight,
}: {
  address: string;
  label: string | null;
  rank?: number;
  rightPrimary: string;
  rightSecondary?: string;
  actions?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <tr
      className={`border-b border-[var(--border)]/50 hover:bg-[var(--bg)] ${
        highlight ? "bg-[var(--danger)]/5" : ""
      }`}
    >
      <td className="py-1.5 pr-2 text-[var(--text-secondary)]">{rank ?? "—"}</td>
      <td className="py-1.5 pr-2">
        <div className="text-[var(--text-primary)]">
          {label ?? truncateAddress(address)}
        </div>
      </td>
      <td className="py-1.5 pr-2 text-right">{rightPrimary}</td>
      {rightSecondary !== undefined ? (
        <td className="py-1.5 pr-2 text-right text-[var(--text-secondary)]">
          {rightSecondary}
        </td>
      ) : null}
      {actions ? <td className="py-1.5 text-right">{actions}</td> : null}
    </tr>
  );
}

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
  const [tab, setTab] = useState<Tab>("exposed");
  const [loadingWallet, setLoadingWallet] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    "analyze" | "track" | "network" | "expose" | null
  >(null);
  const [tracingFunds, setTracingFunds] = useState(false);
  const [exposingAll, setExposingAll] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [exposeScanError, setExposeScanError] = useState<string | null>(null);
  const [showFiltered, setShowFiltered] = useState(false);

  const guest = useAppStore((s) => s.guest);
  const user = useAppStore((s) => s.user);
  const exposeScan = useAppStore((s) => s.exposeScanResults[contractAddress]);
  const setExposeScan = useAppStore((s) => s.setExposeScan);
  const setBulkExpose = useAppStore((s) => s.setBulkExpose);
  const openWalletPanel = useAppStore((s) => s.openWalletPanel);
  const openTrackPanel = useAppStore((s) => s.openTrackPanel);
  const openNetworkPanel = useAppStore((s) => s.openNetworkPanel);
  const openExposeReportPanel = useAppStore((s) => s.openExposeReportPanel);
  const setWalletProfile = useAppStore((s) => s.setWalletProfile);
  const setWalletTrack = useAppStore((s) => s.setWalletTrack);
  const setTrackedWallets = useAppStore((s) => s.setTrackedWallets);
  const setNetworkResult = useAppStore((s) => s.setNetworkResult);
  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);
  const openFundTracerPanel = useAppStore((s) => s.openFundTracerPanel);
  const setFundTrace = useAppStore((s) => s.setFundTrace);
  const toggleCrossCompare = useAppStore((s) => s.toggleCrossCompare);
  const crossCompareSelection = useAppStore((s) => s.crossCompareSelection);

  const excludedCount = allHolders.length - holders.length;
  const filteredHolders = allHolders.filter((h) => h.excluded);
  const canAct = Boolean(user);
  const isPro = Boolean(user?.isPro || user?.isAdmin);
  const inCross = crossCompareSelection
    .map((c) => c.toLowerCase())
    .includes(contractAddress.toLowerCase());

  const runExposeScan = async (force = false) => {
    if (exposeScan && !force) return;
    setScanLoading(true);
    setExposeScanError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    try {
      const result = await fetchExposeScan(contractAddress, {
        full: isPro,
        refresh: force,
      });
      setExposeScan(contractAddress, result);
    } catch (err) {
      setExposeScanError(
        err instanceof Error ? err.message : "Expose scan failed"
      );
    } finally {
      setScanLoading(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  useEffect(() => {
    void runExposeScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress]);

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

  const onExposeAll = async () => {
    if (!canAct) {
      setAnalyzeError("Connect Telegram to expose wallets.");
      return;
    }
    if (!isPro) {
      setAnalyzeError("EXPOSED.OS Pro required for FBI-style bulk expose.");
      return;
    }
    setExposingAll(true);
    setAnalyzeError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    const start = startTimer();
    try {
      const result = await fetchBulkExpose(contractAddress, 90);
      setBulkExpose(contractAddress, result);
      if (result.primaryNetwork) {
        const seed = result.primaryNetwork.seedWallet;
        setNetworkResult(networkResultKey(seed, 90), result.primaryNetwork);
      }
      openExposeReportPanel(contractAddress);
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Bulk expose failed");
    } finally {
      setExposingAll(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  const onExposeOne = async (exposed: ExposedWallet) => {
    if (!canAct) {
      setAnalyzeError("Connect Telegram to expose wallets.");
      return;
    }
    if (!isPro) {
      setAnalyzeError("EXPOSED.OS Pro required for network expose.");
      return;
    }
    setLoadingWallet(exposed.address);
    setLoadingAction("expose");
    setAnalyzeError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    const start = startTimer();
    try {
      const result = await fetchWalletNetwork(exposed.address, 90, contractAddress);
      setNetworkResult(networkResultKey(exposed.address, 90), result);
      openNetworkPanel(exposed.address, contractAddress, 90);
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Expose failed");
    } finally {
      setLoadingWallet(null);
      setLoadingAction(null);
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
      setWalletProfile(walletProfileKey(holder.address, contractAddress), profile);
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
      setWalletTrack(walletTrackKey(holder.address), data as WalletTrackSnapshot);
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

  const exposedWallets = exposeScan?.exposedWallets ?? [];
  const traders = exposeScan?.traders ?? [];

  const tabBtn = (id: Tab, label: string, count?: number) => {
    const isExposed = id === "exposed";
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => setTab(id)}
        className={`border px-2 py-1 text-[10px] tracking-wide ${
          isExposed
            ? active
              ? "border-[var(--warning)] bg-[var(--warning)] text-[var(--bg)] shadow-[0_0_14px_rgba(255,184,0,0.4)]"
              : "border-[var(--warning)]/70 bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20"
            : active
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
        }`}
      >
        {isExposed ? "★ " : ""}
        {label}
        {count != null ? ` (${count})` : ""}
      </button>
    );
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {tabBtn("exposed", "EXPOSED", exposedWallets.length)}
          {tabBtn("holders", "TOP HOLDERS", holders.length)}
          {tabBtn("traders", "TOP PNL", traders.length)}
        </div>
        {canAct ? (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => void onExposeAll()}
              disabled={exposingAll || exposedWallets.length === 0}
              className="border border-[var(--danger)] bg-[var(--danger)] px-2 py-0.5 text-[10px] text-[var(--bg)] hover:opacity-80 disabled:opacity-40"
            >
              {exposingAll ? "EXPOSING..." : "EXPOSE ALL"}
            </button>
            <button
              type="button"
              onClick={() => void onTraceFunds()}
              disabled={tracingFunds}
              className="border border-[var(--warning)] px-2 py-0.5 text-[10px] text-[var(--warning)] hover:bg-[var(--warning)] hover:text-[var(--bg)] disabled:opacity-40"
            >
              {tracingFunds ? "..." : "TRACE"}
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
          <span className="text-[var(--warning)]">LOGIN FOR EXPOSE</span>
        )}
      </div>

      {tab === "exposed" ? (
        <>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {scanLoading
              ? "AUTO-EXPOSING SUSPICIOUS WALLETS ON THIS CA..."
              : exposeScanError
                ? exposeScanError
                : exposeScan?.summary ?? "Auto-scan runs when you paste a CA."}
            {exposeScan?.scanDepth === "basic" && !isPro && !exposeScanError ? (
              <span className="ml-2 text-[var(--warning)]">
                · Preview scan — Pro unlocks fund-trace depth + EXPOSE ALL
              </span>
            ) : null}
          </div>
          {exposeScanError ? (
            <button
              type="button"
              onClick={() => void runExposeScan(true)}
              className="text-[10px] text-[var(--warning)] underline"
            >
              Retry expose scan
            </button>
          ) : null}
          <div className="max-h-[320px] overflow-auto os-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">WALLET</th>
                  <th className="py-1 pr-2 text-right">SCORE</th>
                  <th className="py-1 pr-2">WHY</th>
                  <th className="py-1 text-right">ACT</th>
                </tr>
              </thead>
              <tbody>
                {exposedWallets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[var(--text-secondary)]">
                      {scanLoading ? "Analyzing..." : "No exposed wallets flagged yet."}
                    </td>
                  </tr>
                ) : (
                  exposedWallets.map((exposed, index) => (
                    <tr
                      key={exposed.address}
                      className="border-b border-[var(--border)]/50 hover:bg-[var(--warning)]/5"
                    >
                      <td className="py-1.5 pr-2 text-[var(--text-secondary)]">
                        {index + 1}
                      </td>
                      <td className="py-1.5 pr-2">
                        <div className="text-[var(--text-primary)]">
                          {exposed.label ?? truncateAddress(exposed.address)}
                        </div>
                        {exposed.holderRank ? (
                          <div className="text-[9px] text-[var(--text-secondary)]">
                            holder #{exposed.holderRank}
                            {exposed.percentOfSupply != null
                              ? ` · ${formatPercent(exposed.percentOfSupply)}`
                              : ""}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-1.5 pr-2 text-right">
                        <span style={{ color: TIER_COLOR[exposed.tier] }}>
                          {exposed.exposeScore}
                        </span>
                        <div
                          className="text-[8px]"
                          style={{ color: TIER_COLOR[exposed.tier] }}
                        >
                          {exposed.tier}
                        </div>
                      </td>
                      <td className="py-1.5 pr-2 text-[9px] text-[var(--text-secondary)]">
                        {exposed.reasons.slice(0, 2).join(" · ")}
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => void onExposeOne(exposed)}
                          disabled={
                            !canAct ||
                            (loadingWallet === exposed.address &&
                              loadingAction === "expose")
                          }
                          className="border border-[var(--warning)] px-2 py-0.5 text-[10px] text-[var(--warning)] hover:bg-[var(--warning)] hover:text-[var(--bg)] disabled:opacity-40"
                        >
                          {loadingWallet === exposed.address && loadingAction === "expose"
                            ? "..."
                            : "EXPOSE"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {exposeScan && exposeScan.sharedSources.length > 0 ? (
            <div className="border border-[var(--warning)]/30 bg-[var(--bg)] p-2 text-[10px]">
              <div className="text-[var(--warning)]">
                SHARED FUND CLUSTERS · score {exposeScan.insiderClusterScore}
              </div>
              {exposeScan.sharedSources.slice(0, 3).map((src) => (
                <div key={src.sourceAddress} className="mt-1 text-[var(--text-secondary)]">
                  {src.label ?? truncateAddress(src.sourceAddress, 6)} funded{" "}
                  {src.holderAddresses.length} holders (suspicion {src.suspicionScore})
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "holders" ? (
        <>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {holders.length} analyzable · {excludedCount} filtered (CEX/DEX/burn)
            {holdersMeta ? ` · via ${holdersMeta.source}` : ""}
          </div>
          <div className="max-h-[320px] overflow-auto os-scrollbar">
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
                      No holder data returned.
                    </td>
                  </tr>
                ) : (
                  holders.map((holder) => {
                    const isExposed = exposedWallets.some(
                      (f) => f.address.toLowerCase() === holder.address.toLowerCase()
                    );
                    return (
                      <WalletRow
                        key={holder.address}
                        address={holder.address}
                        label={holder.label}
                        rank={holder.rank}
                        rightPrimary={formatPercent(holder.percentOfSupply)}
                        rightSecondary={formatUsd(holder.usdValue) ?? "—"}
                        highlight={isExposed}
                        actions={
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void onAnalyze(holder)}
                              disabled={
                                !canAct ||
                                (loadingWallet === holder.address &&
                                  loadingAction === "analyze")
                              }
                              className="border border-[var(--accent)] px-1.5 py-0.5 text-[9px] text-[var(--accent)] disabled:opacity-40"
                            >
                              ANALYZE
                            </button>
                            <button
                              type="button"
                              onClick={() => void onTrack(holder)}
                              disabled={
                                !canAct ||
                                (loadingWallet === holder.address &&
                                  loadingAction === "track")
                              }
                              className="border border-[var(--success)] px-1.5 py-0.5 text-[9px] text-[var(--success)] disabled:opacity-40"
                            >
                              TRACK
                            </button>
                          </div>
                        }
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "traders" ? (
        <>
          <div className="text-[10px] text-[var(--text-secondary)]">
            Top wallets by estimated PnL on this token (realized + unrealized)
            {traders.length === 0 && scanLoading ? " · loading..." : ""}
          </div>
          <div className="max-h-[320px] overflow-auto os-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">WALLET</th>
                  <th className="py-1 pr-2 text-right">PNL</th>
                  <th className="py-1 pr-2 text-right">REALIZED</th>
                  <th className="py-1 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {traders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[var(--text-secondary)]">
                      {scanLoading
                        ? "Computing PnL from token transfers..."
                        : "No PnL data — scan needs transfer history on this CA."}
                    </td>
                  </tr>
                ) : (
                  traders.map((trader: TraderEntry) => (
                    <tr
                      key={trader.address}
                      className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]"
                    >
                      <td className="py-1.5 pr-2 text-[var(--text-secondary)]">
                        {trader.rank}
                      </td>
                      <td className="py-1.5 pr-2">
                        {trader.label ?? truncateAddress(trader.address)}
                      </td>
                      <td
                        className={`py-1.5 pr-2 text-right font-medium ${
                          (trader.totalPnlUsd ?? 0) >= 0
                            ? "text-[var(--success)]"
                            : "text-[var(--danger)]"
                        }`}
                      >
                        {formatUsd(trader.totalPnlUsd)}
                      </td>
                      <td className="py-1.5 pr-2 text-right text-[var(--text-secondary)]">
                        {formatUsd(trader.realizedPnlUsd)}
                      </td>
                      <td className="py-1.5 text-right text-[9px] text-[var(--text-secondary)]">
                        {trader.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {filteredHolders.length > 0 ? (
        <div className="border-t border-[var(--border)] pt-2">
          <button
            type="button"
            onClick={() => setShowFiltered((v) => !v)}
            className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            {showFiltered ? "▼" : "▶"} FILTERED ({filteredHolders.length}) — CEX/DEX/bridges
          </button>
          {showFiltered ? (
            <div className="mt-2 max-h-24 overflow-auto os-scrollbar text-[10px]">
              {filteredHolders.map((holder) => (
                <div
                  key={holder.address}
                  className="border-b border-[var(--border)]/30 py-1 text-[var(--text-secondary)]"
                >
                  #{holder.rank} {holder.label ?? truncateAddress(holder.address)} ·{" "}
                      {formatPercent(holder.percentOfSupply)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {guest && !user ? (
        <p className="text-[9px] text-[var(--text-secondary)]">
          Guest mode: preview exposed list. Login + Pro to EXPOSE syndicate networks.
        </p>
      ) : null}
    </div>
  );
}
