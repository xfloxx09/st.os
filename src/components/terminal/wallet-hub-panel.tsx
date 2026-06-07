"use client";

import { useEffect, useState } from "react";
import type { WalletProfile } from "@/lib/analyze/types";
import { WalletAddressLabel } from "@/components/terminal/wallet-address-label";
import {
  formatPercent,
  formatPnlValue,
  formatTokenAmount,
  formatUsd,
  truncateAddress,
} from "@/lib/ethereum";
import { PnlCurrencyToggle } from "@/components/terminal/pnl-currency-toggle";
import { fetchWalletAnalyze, fetchWalletNetwork } from "@/lib/terminal/phase-actions";
import { elapsedMs, startTimer } from "@/lib/timing";
import {
  networkResultKey,
  useAppStore,
  walletProfileKey,
  walletTrackKey,
} from "@/stores/app-store";
import type { WalletTrackSnapshot } from "@/lib/analyze/types";

export function WalletHubPanel({
  walletAddress,
  contractAddress,
  holderRank,
  percentOfSupply,
  initialProfile,
}: {
  walletAddress: string;
  contractAddress: string;
  holderRank?: number;
  percentOfSupply?: number;
  initialProfile?: WalletProfile | null;
}) {
  const user = useAppStore((s) => s.user);
  const isPro = Boolean(user?.isPro || user?.isAdmin);
  const pnlCurrency = useAppStore((s) => s.pnlCurrency);
  const ethPriceUsd = useAppStore((s) => s.ethPriceUsd);
  const walletAliases = useAppStore((s) => s.walletAliases);
  const trackedWallets = useAppStore((s) => s.trackedWallets);
  const setWalletProfile = useAppStore((s) => s.setWalletProfile);
  const setWalletAlias = useAppStore((s) => s.setWalletAlias);
  const setTrackedWallets = useAppStore((s) => s.setTrackedWallets);
  const openTrackPanel = useAppStore((s) => s.openTrackPanel);
  const openNetworkPanel = useAppStore((s) => s.openNetworkPanel);
  const setNetworkResult = useAppStore((s) => s.setNetworkResult);
  const setWalletTrack = useAppStore((s) => s.setWalletTrack);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);
  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);
  const updatePanelTitle = useAppStore((s) => s.updatePanelTitle);

  const [profile, setProfile] = useState<WalletProfile | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(!initialProfile);
  const [nickname, setNickname] = useState(
    walletAliases[walletAddress.toLowerCase()] ?? ""
  );
  const [savingNick, setSavingNick] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const tracked = trackedWallets.find(
    (w) => w.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  const displayName =
    nickname ||
    tracked?.label ||
    walletAliases[walletAddress.toLowerCase()] ||
    truncateAddress(walletAddress, 6);

  useEffect(() => {
    setNickname(walletAliases[walletAddress.toLowerCase()] ?? tracked?.label ?? "");
  }, [walletAddress, walletAliases, tracked?.label]);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setActiveProcesses(useAppStore.getState().activeProcesses + 1);
      try {
        const data = await fetchWalletAnalyze(
          walletAddress,
          contractAddress,
          percentOfSupply
        );
        if (!cancelled) {
          setProfile(data);
          setWalletProfile(walletProfileKey(walletAddress, contractAddress), data);
        }
      } catch (err) {
        if (!cancelled) {
          setAnalyzeError(err instanceof Error ? err.message : "Wallet load failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
        setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, contractAddress]);

  const saveNickname = async () => {
    if (!user) return;
    setSavingNick(true);
    try {
      const res = await fetch("/api/wallet-alias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, nickname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save nickname");
      setWalletAlias(walletAddress, data.nickname);
      updatePanelTitle(
        `wallet-${walletAddress}-${contractAddress}`,
        data.nickname ? `${data.nickname}` : `WALLET · ${truncateAddress(walletAddress, 4)}`
      );
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Nickname save failed");
    } finally {
      setSavingNick(false);
    }
  };

  const onTrack = async () => {
    if (!user) {
      setAnalyzeError("Connect Telegram to track wallets.");
      return;
    }
    if (!isPro) {
      setAnalyzeError("EXPOSED.OS Pro required to track wallets.");
      return;
    }
    setAction("track");
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          sourceContract: contractAddress,
          label: nickname || displayName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Track failed");
      const listRes = await fetch("/api/track");
      if (listRes.ok) {
        const listData = await listRes.json();
        setTrackedWallets(listData.wallets ?? []);
      }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Track failed");
    } finally {
      setAction(null);
    }
  };

  const onUntrack = async () => {
    setAction("untrack");
    try {
      const res = await fetch(
        `/api/track?wallet=${encodeURIComponent(walletAddress)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Untrack failed");
      }
      setTrackedWallets(
        trackedWallets.filter(
          (w) => w.walletAddress.toLowerCase() !== walletAddress.toLowerCase()
        )
      );
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Untrack failed");
    } finally {
      setAction(null);
    }
  };

  const onLiveTracker = async () => {
    if (!isPro) {
      setAnalyzeError("EXPOSED.OS Pro required for live tracker.");
      return;
    }
    setAction("live");
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    try {
      const params = new URLSearchParams({ wallet: walletAddress, contract: contractAddress });
      if (percentOfSupply != null) params.set("percent", String(percentOfSupply));
      const res = await fetch(`/api/track/refresh?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tracker sync failed");
      setWalletTrack(walletTrackKey(walletAddress), data as WalletTrackSnapshot);
      openTrackPanel(walletAddress, contractAddress, displayName);
      useAppStore.getState().setSidebarTab("tracked");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Tracker sync failed");
    } finally {
      setAction(null);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  const onMapNetwork = async () => {
    if (!isPro) {
      setAnalyzeError("EXPOSED.OS Pro required for network map.");
      return;
    }
    setAction("network");
    const start = startTimer();
    try {
      const result = await fetchWalletNetwork(walletAddress, 90, contractAddress);
      setNetworkResult(networkResultKey(walletAddress, 90), result);
      openNetworkPanel(walletAddress, contractAddress, 90);
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Network map failed");
    } finally {
      setAction(null);
    }
  };

  const onRefresh = async () => {
    setAction("refresh");
    setLoading(true);
    try {
      const data = await fetchWalletAnalyze(
        walletAddress,
        contractAddress,
        percentOfSupply
      );
      setProfile(data);
      setWalletProfile(walletProfileKey(walletAddress, contractAddress), data);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  if (loading && !profile) {
    return (
      <p className="scan-line text-[11px] text-[var(--text-secondary)]">
        LOADING WALLET INTEL...
      </p>
    );
  }

  if (!profile) {
    return (
      <p className="text-[11px] text-[var(--danger)]">
        Could not load wallet data. {!user ? "Login required." : "Try refresh."}
      </p>
    );
  }

  return (
    <div className="space-y-4 text-[11px]">
      <div className="border border-[var(--border)] bg-[var(--bg)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <WalletAddressLabel
              address={walletAddress}
              label={displayName !== truncateAddress(walletAddress, 6) ? displayName : null}
              aliases={walletAliases}
              walletAge={profile.walletAge}
              truncateLen={8}
              className="text-sm text-[var(--accent)]"
            />
            <div className="text-[9px] text-[var(--text-secondary)]">
              {truncateAddress(walletAddress, 8)}
              {holderRank ? ` · holder #${holderRank}` : ""}
              {percentOfSupply != null ? ` · ${percentOfSupply.toFixed(2)}% supply` : ""}
              {profile.walletAge?.ageDays != null
                ? ` · ${profile.walletAge.ageDays}d on-chain`
                : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[var(--warning)]">{profile.behaviorLabel}</div>
            <div className="text-[9px] text-[var(--text-secondary)]">
              {profile.behaviorConfidence} confidence
            </div>
          </div>
        </div>

        {user ? (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Set nickname..."
              className="flex-1 border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 text-[10px] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => void saveNickname()}
              disabled={savingNick}
              className="border border-[var(--accent)] px-2 py-1 text-[9px] text-[var(--accent)] disabled:opacity-40"
            >
              {savingNick ? "..." : "SAVE"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ActionBtn label="REFRESH" onClick={onRefresh} loading={action === "refresh"} />
        {tracked ? (
          <ActionBtn label="UNTRACK" onClick={onUntrack} loading={action === "untrack"} danger />
        ) : (
          <ActionBtn label="TRACK" onClick={onTrack} loading={action === "track"} accent />
        )}
        <ActionBtn
          label="LIVE TRACKER"
          onClick={onLiveTracker}
          loading={action === "live"}
          accent
        />
        <ActionBtn
          label="CO-BUY LINKS"
          onClick={onMapNetwork}
          loading={action === "network"}
          warn
        />
      </div>

      {profile.cached ? (
        <p className="text-[9px] text-[var(--text-secondary)]">[cached]</p>
      ) : null}

      <section>
        <h3 className="mb-1 text-[9px] tracking-[0.2em] text-[var(--text-secondary)]">
          FUND ORIGIN
        </h3>
        <p className="text-[var(--text-primary)]">{profile.fundOrigin.source}</p>
        {profile.fundOrigin.flags.map((flag) => (
          <p key={flag} className="text-[var(--danger)]">
            ⚠ {flag}
          </p>
        ))}
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-[9px] tracking-[0.2em] text-[var(--text-secondary)]">
            PNL ON THIS TOKEN
          </h3>
          <PnlCurrencyToggle />
        </div>
        <p className="mb-2 text-[9px] text-[var(--text-secondary)]/80">
          Estimated gain/loss on this token in{" "}
          {pnlCurrency === "eth" ? "ETH" : "USD"} (vs average cost basis)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="STATUS" value={profile.pnl.status} />
          <MiniStat label="POSITION" value={formatTokenAmount(profile.pnl.position)} />
          <MiniStat
            label="UNREALIZED"
            value={formatPnlValue(profile.pnl.unrealizedPnlUsd, pnlCurrency, ethPriceUsd)}
          />
          <MiniStat
            label="CHANGE"
            value={formatPercent(profile.pnl.unrealizedPnlPercent)}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-[9px] tracking-[0.2em] text-[var(--text-secondary)]">
          RECENT ACTIVITY
        </h3>
        <div className="max-h-24 overflow-auto os-scrollbar space-y-0.5">
          {profile.trades.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No transfers found.</p>
          ) : (
            profile.trades.slice(-8).map((trade) => (
              <div
                key={`${trade.txHash}-${trade.timestamp}`}
                className="flex justify-between gap-2 text-[10px]"
              >
                <span
                  className={
                    trade.type.includes("IN")
                      ? "text-[var(--success)]"
                      : "text-[var(--danger)]"
                  }
                >
                  {trade.type}
                </span>
                <span className="text-[var(--text-secondary)]">
                  {new Date(trade.timestamp).toLocaleDateString()}
                </span>
                <span>{formatTokenAmount(trade.tokenAmount)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-[9px] tracking-[0.2em] text-[var(--text-secondary)]">
          PORTFOLIO
        </h3>
        <div className="max-h-20 overflow-auto os-scrollbar space-y-0.5">
          {profile.portfolio.slice(0, 6).map((h) => (
            <div key={h.address} className="flex justify-between text-[10px]">
              <span>{h.symbol}</span>
              <span className="text-[var(--text-secondary)]">{formatUsd(h.usdValue)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  loading,
  accent,
  warn,
  danger,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  accent?: boolean;
  warn?: boolean;
  danger?: boolean;
}) {
  const color = danger
    ? "border-[var(--danger)] text-[var(--danger)]"
    : warn
      ? "border-[var(--warning)] text-[var(--warning)]"
      : accent
        ? "border-[var(--accent)] text-[var(--accent)]"
        : "border-[var(--border)] text-[var(--text-secondary)]";

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={loading}
      className={`border px-2 py-1 text-[9px] tracking-wide hover:bg-[var(--bg)] disabled:opacity-40 ${color}`}
    >
      {loading ? "..." : label}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] text-[var(--text-secondary)]">{label}</div>
      <div className="text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
