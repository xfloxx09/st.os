"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProTrackWallet } from "@/lib/analyze/types";
import {
  formatPnlValue,
  formatTokenAmount,
  formatUsd,
} from "@/lib/ethereum";
import { PnlCurrencyToggle } from "@/components/terminal/pnl-currency-toggle";
import { TokenTradeChart } from "@/components/terminal/token-trade-chart";
import { WalletAddressLabel } from "@/components/terminal/wallet-address-label";
import { fetchProAlphaAi, fetchProAlphaScan } from "@/lib/terminal/phase-actions";
import { useAppStore } from "@/stores/app-store";

const STRATEGY_COLOR: Record<string, string> = {
  "ALPHA LEADER": "var(--warning)",
  ALPHA: "var(--warning)",
  "EARLY BUYER": "var(--accent)",
  "FOLLOWS ALPHA": "var(--text-secondary)",
  SNIPER: "var(--success)",
  "SWING TRADER": "var(--accent)",
  "DIAMOND HANDS": "var(--success)",
  "WHALE STACKER": "var(--danger)",
  "SERIAL DEGEN": "var(--text-secondary)",
};

function pnlCell(
  snap: { totalPnlUsd: number | null },
  currency: "eth" | "usd",
  ethPrice: number | null
): string {
  const v = snap.totalPnlUsd;
  if (v == null) return "--";
  return formatPnlValue(v, currency, ethPrice);
}

function holdCell(
  snap: { position: number; positionUsd: number | null },
  currency: "eth" | "usd",
  ethPrice: number | null
): string {
  if (snap.position <= 0) return "—";
  if (currency === "usd") {
    return snap.positionUsd != null ? formatUsd(snap.positionUsd) : "—";
  }
  if (snap.positionUsd != null && ethPrice != null && ethPrice > 0) {
    return formatPnlValue(snap.positionUsd, "eth", ethPrice);
  }
  return formatTokenAmount(snap.position);
}

function pnlColor(value: number | null): string {
  if (value == null) return "text-[var(--text-secondary)]";
  return value >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]";
}

export function ProTrackPanel({
  contractAddress,
  isPro,
  active = true,
}: {
  contractAddress: string;
  isPro: boolean;
  active?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);

  const scan = useAppStore((s) => s.proAlphaResults[contractAddress]);
  const aiBrief = useAppStore((s) => s.proAlphaAiResults[contractAddress]);
  const setProAlphaScan = useAppStore((s) => s.setProAlphaScan);
  const setProAlphaAi = useAppStore((s) => s.setProAlphaAi);
  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);
  const openWalletPanel = useAppStore((s) => s.openWalletPanel);
  const walletAliases = useAppStore((s) => s.walletAliases);
  const pnlCurrency = useAppStore((s) => s.pnlCurrency);
  const ethPriceUsd = useAppStore((s) => s.ethPriceUsd);

  const runScan = async (force = false) => {
    if (!isPro) return;
    if (scan && !force) return;
    setLoading(true);
    setError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    try {
      const result = await fetchProAlphaScan(contractAddress, { refresh: force });
      setProAlphaScan(contractAddress, result);
      if (result.trackWallets[0] && !selected) {
        setSelected(result.trackWallets[0].address);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pro scan failed");
    } finally {
      setLoading(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  const runAiBrief = async (force = false) => {
    if (!isPro || !scan) return;
    if (aiBrief && !force) return;
    setAiLoading(true);
    setAiError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    try {
      const result = await fetchProAlphaAi(contractAddress, { refresh: force });
      setProAlphaAi(contractAddress, result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI brief failed");
    } finally {
      setAiLoading(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  const toggleAi = () => {
    const next = !showAi;
    setShowAi(next);
    if (next && !aiBrief) {
      void runAiBrief();
    }
  };

  useEffect(() => {
    if (!isPro || !active) return;
    const delay = setTimeout(() => void runScan(), 1500);
    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress, isPro, active]);

  if (!isPro) {
    return (
      <div className="border border-[var(--warning)]/60 bg-[var(--warning)]/5 p-4 text-[10px]">
        <p className="text-[var(--warning)]">★ PRO TRACK — golden feature</p>
        <p className="mt-2 text-[var(--text-secondary)]">
          Degen-mode wallet ranking — 30m copy-trade window, snipe timing,
          holdings + unrealized/realized PnL, fresh/old wallet tags, optional AI
          brief, and strategy labels with buy/sell chart markers.
        </p>
        <Link href="/pricing" className="mt-3 inline-block text-[var(--accent)] underline">
          Upgrade to EXPOSED.OS Pro →
        </Link>
      </div>
    );
  }

  const wallets = scan?.trackWallets ?? [];
  const selectedWallet = wallets.find(
    (w) => w.address.toLowerCase() === selected?.toLowerCase()
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--warning)]/50 bg-[var(--warning)]/5 px-2 py-2">
        <div>
          <div className="text-[10px] tracking-widest text-[var(--warning)]">
            ★ PRO TRACK — WALLETS TO WATCH
          </div>
          <p className="text-[9px] text-[var(--text-secondary)]">
            {scan?.summary ?? (loading ? "Running alpha intel scan..." : "")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PnlCurrencyToggle />
          <button
            type="button"
            onClick={toggleAi}
            disabled={!scan || loading}
            className={`border px-2 py-1 text-[9px] ${
              showAi
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-secondary)]"
            }`}
          >
            {aiLoading ? "AI..." : showAi ? "AI ON" : "AI BRIEF"}
          </button>
          <button
            type="button"
            onClick={() => void runScan(true)}
            disabled={loading}
            className="border border-[var(--border)] px-2 py-1 text-[9px] text-[var(--text-secondary)]"
          >
            {loading ? "..." : "REFRESH"}
          </button>
        </div>
      </div>

      {error ? <p className="text-[10px] text-[var(--danger)]">{error}</p> : null}

      {showAi ? (
        <div className="border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-2 text-[10px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] tracking-widest text-[var(--accent)]">
              AI BRIEF — qualitative read
            </span>
            <button
              type="button"
              onClick={() => void runAiBrief(true)}
              disabled={aiLoading || !scan}
              className="border border-[var(--border)] px-2 py-0.5 text-[8px] text-[var(--text-secondary)]"
            >
              {aiLoading ? "..." : "REGEN"}
            </button>
          </div>
          {aiError ? (
            <p className="mt-2 text-[var(--danger)]">{aiError}</p>
          ) : aiBrief ? (
            <div className="mt-2 space-y-2 text-[9px] text-[var(--text-primary)]">
              <p>{aiBrief.brief.narrative || aiBrief.brief.tokenVerdict}</p>
              {aiBrief.brief.watchFirst.length > 0 ? (
                <p className="text-[var(--text-secondary)]">
                  Watch first: {aiBrief.brief.watchFirst.join(" · ")}
                </p>
              ) : null}
              {aiBrief.brief.redFlags.length > 0 ? (
                <ul className="list-inside list-disc text-[var(--danger)]">
                  {aiBrief.brief.redFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              ) : null}
              {aiBrief.brief.walletNotes.length > 0 ? (
                <ul className="space-y-1 text-[var(--text-secondary)]">
                  {aiBrief.brief.walletNotes.map((note) => (
                    <li key={note.address}>
                      <span className="text-[var(--accent)]">{note.address}</span> —{" "}
                      {note.note}
                    </li>
                  ))}
                </ul>
              ) : null}
              {aiBrief.cached ? (
                <p className="text-[8px] text-[var(--text-secondary)]">[cached]</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 scan-line text-[var(--accent)]">
              {aiLoading ? "Generating AI brief..." : "Toggle AI to generate brief"}
            </p>
          )}
        </div>
      ) : null}

      <div className="border border-[var(--border)]/60 bg-[var(--bg)]/40 px-2 py-1 text-[9px] text-[var(--text-secondary)]">
        DATA INTEL — on-chain facts: PnL, balances, snipe timing, fresh/old wallet age,
        deployer flags. Toggle AI for pattern read beyond raw scores.
      </div>

      {scan ? (
        <TokenTradeChart
          points={scan.chartPoints}
          markers={selectedWallet?.markers ?? []}
          selectedWallet={selectedWallet?.address}
        />
      ) : null}

      {selectedWallet ? (
        <div className="border border-[var(--border)] bg-[var(--bg)] p-2 text-[10px]">
          <div className="flex flex-wrap justify-between gap-2">
            <WalletAddressLabel
              address={selectedWallet.address}
              label={selectedWallet.label}
              aliases={walletAliases}
              walletAge={selectedWallet.walletAge}
              isDeployer={selectedWallet.isDeployer}
            />
            <span
              style={{
                color: STRATEGY_COLOR[selectedWallet.strategy] ?? "var(--text-primary)",
              }}
            >
              {selectedWallet.strategy}
            </span>
          </div>
          <p className="mt-1 text-[9px] text-[var(--text-secondary)]">
            {selectedWallet.strategyDetail} · {selectedWallet.preferredWindow}
          </p>
          <p className="mt-1 text-[9px] text-[var(--text-secondary)]">
            Intel {selectedWallet.intelScore} · Track score {selectedWallet.trackScore}
            {selectedWallet.followers30m > 0
              ? ` · ${selectedWallet.followers30m} copied in 30m`
              : ""}
            {selectedWallet.minsAfterFirstBuyer != null
              ? ` · ${selectedWallet.minsAfterFirstBuyer}m from first buyer`
              : ""}
          </p>
          <p className="mt-1 text-[9px] text-[var(--text-secondary)]">
            Hold {formatTokenAmount(selectedWallet.pnlCurrent.position)}
            {selectedWallet.pnlCurrent.positionUsd != null
              ? ` (${formatUsd(selectedWallet.pnlCurrent.positionUsd)})`
              : ""}
            {" · "}
            Realized{" "}
            {formatPnlValue(
              selectedWallet.pnlCurrent.realizedPnlUsd,
              pnlCurrency,
              ethPriceUsd
            )}
            {" · "}
            Unrealized{" "}
            {formatPnlValue(
              selectedWallet.pnlCurrent.unrealizedPnlUsd,
              pnlCurrency,
              ethPriceUsd
            )}
            {" · "}
            Total{" "}
            {formatPnlValue(
              selectedWallet.pnlCurrent.totalPnlUsd,
              pnlCurrency,
              ethPriceUsd
            )}
          </p>
          {selectedWallet.trackReasons.length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-[9px] text-[var(--text-secondary)]">
              {selectedWallet.trackReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() =>
              openWalletPanel(selectedWallet.address, contractAddress, {
                rank: selectedWallet.holderRank ?? selectedWallet.rank,
                percent: selectedWallet.percentOfSupply ?? undefined,
                label: selectedWallet.label ?? undefined,
              })
            }
            className="mt-2 border border-[var(--accent)] px-2 py-1 text-[9px] text-[var(--accent)]"
          >
            OPEN WALLET INTEL →
          </button>
        </div>
      ) : null}

      <div className="max-h-[280px] overflow-auto os-scrollbar">
        <table className="w-full text-left text-[10px]">
          <thead className="sticky top-0 bg-[var(--bg-panel)] text-[9px] text-[var(--text-secondary)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">WALLET</th>
              <th className="py-1 pr-2">STRATEGY</th>
              <th className="py-1 pr-2 text-right">INTEL</th>
              <th className="py-1 pr-2 text-right">HOLD</th>
              <th className="py-1 pr-2 text-right">TOTAL</th>
              <th className="py-1 pr-2 text-right">1D</th>
              <th className="py-1 pr-2 text-right">7D</th>
              <th className="py-1 pr-2 text-right">30D</th>
              <th className="py-1 text-right">TRACK</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((w: ProTrackWallet) => {
              const rowActive =
                selected?.toLowerCase() === w.address.toLowerCase();
              return (
                <tr
                  key={w.address}
                  onClick={() => setSelected(w.address)}
                  className={`cursor-pointer border-b border-[var(--border)]/40 ${
                    rowActive ? "bg-[var(--warning)]/10" : "hover:bg-[var(--accent)]/10"
                  }`}
                >
                  <td className="py-1.5 pr-2 text-[var(--text-secondary)]">{w.rank}</td>
                  <td className="py-1.5 pr-2">
                    <WalletAddressLabel
                      address={w.address}
                      label={w.label}
                      aliases={walletAliases}
                      walletAge={w.walletAge}
                      isDeployer={w.isDeployer}
                    />
                  </td>
                  <td
                    className="py-1.5 pr-2 text-[9px]"
                    style={{
                      color: STRATEGY_COLOR[w.strategy] ?? "var(--text-primary)",
                    }}
                  >
                    {w.strategy}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[var(--warning)]">
                    {w.intelScore}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[var(--text-primary)]">
                    {holdCell(w.pnlCurrent, pnlCurrency, ethPriceUsd)}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right ${pnlColor(
                      w.pnlCurrent.totalPnlUsd
                    )}`}
                  >
                    {pnlCell(w.pnlCurrent, pnlCurrency, ethPriceUsd)}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right ${pnlColor(
                      w.pnlDay.totalPnlUsd
                    )}`}
                    title="Window realized + current unrealized"
                  >
                    {pnlCell(w.pnlDay, pnlCurrency, ethPriceUsd)}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right ${pnlColor(
                      w.pnlWeek.totalPnlUsd
                    )}`}
                    title="Window realized + current unrealized"
                  >
                    {pnlCell(w.pnlWeek, pnlCurrency, ethPriceUsd)}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right ${pnlColor(
                      w.pnlMonth.totalPnlUsd
                    )}`}
                    title="Window realized + current unrealized"
                  >
                    {pnlCell(w.pnlMonth, pnlCurrency, ethPriceUsd)}
                  </td>
                  <td className="py-1.5 text-right font-medium text-[var(--warning)]">
                    {w.trackScore}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && wallets.length === 0 ? (
        <p className="scan-line text-[10px] text-[var(--warning)]">
          SCANNING DEGEN ALPHA · BALANCES · WALLET AGE · SNIPER INTEL...
        </p>
      ) : null}
    </div>
  );
}
