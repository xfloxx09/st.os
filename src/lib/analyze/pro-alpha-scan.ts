import { fetchPoolOhlcvHourly } from "@/lib/chart/gecko-ohlcv";
import {
  buildFirstBuyMap,
  firstBuyMetaForWallet,
} from "@/lib/analyze/first-mover";
import {
  calculateWalletTokenPnl,
  type TokenPnlResult,
} from "@/lib/analyze/token-pnl";
import type {
  HolderEntry,
  ProAlphaScanResult,
  ProTrackWallet,
  TokenOverview,
  TokenTrade,
  TradeMarker,
  WindowPnlSnapshot,
} from "@/lib/analyze/types";
import {
  classifyWalletStrategy,
  tradingHoursProfile,
} from "@/lib/analyze/wallet-strategy";
import { fetchTokenTransfers } from "@/lib/alchemy";
import { fetchTokenTransactions } from "@/lib/etherscan-wallet";
import { normalizeAddress } from "@/lib/ethereum";
import { getAddressLabel, shouldExcludeHolder } from "@/lib/labels";

const SCAN_LIMIT = 10;
const BATCH = 2;

function sinceMs(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function holderBalanceTokens(holder: HolderEntry | undefined): number | null {
  if (!holder?.balance) return null;
  const parsed = Number(holder.balance);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function effectivePosition(
  full: TokenPnlResult,
  holder: HolderEntry | undefined,
  priceUsd: number | null
): { position: number; positionUsd: number | null } {
  const holderBal = holderBalanceTokens(holder);
  if (holderBal != null && holderBal > full.position * 1.02) {
    return {
      position: holderBal,
      positionUsd:
        holder?.usdValue ??
        (priceUsd != null ? holderBal * priceUsd : null),
    };
  }
  return {
    position: full.position,
    positionUsd:
      priceUsd != null && full.position > 0
        ? full.position * priceUsd
        : null,
  };
}

function scaledUnrealized(
  full: TokenPnlResult,
  position: number,
  priceUsd: number | null
): number | null {
  if (priceUsd == null || position <= 0) return null;
  if (full.position > 0 && full.unrealizedPnlUsd != null) {
    const avgCost =
      (full.position * priceUsd - full.unrealizedPnlUsd) / full.position;
    return position * priceUsd - avgCost * position;
  }
  return position * priceUsd;
}

function toPnlSnapshot(
  full: TokenPnlResult,
  holder: HolderEntry | undefined,
  priceUsd: number | null,
  windowRealized: TokenPnlResult | null
): WindowPnlSnapshot {
  const { position, positionUsd } = effectivePosition(full, holder, priceUsd);
  const unrealizedPnlUsd = scaledUnrealized(full, position, priceUsd);
  const realizedPnlUsd =
    windowRealized?.realizedPnlUsd ?? full.realizedPnlUsd;
  const totalPnlUsd =
    priceUsd != null && realizedPnlUsd != null
      ? realizedPnlUsd + (unrealizedPnlUsd ?? 0)
      : full.totalPnlUsd;

  return {
    realizedPnlUsd,
    unrealizedPnlUsd,
    totalPnlUsd,
    position,
    positionUsd,
    tradeCount: windowRealized?.tradeCount ?? full.tradeCount,
    status: position > 0 ? "OPEN" : full.status,
  };
}

function windowPnl(
  txs: Awaited<ReturnType<typeof fetchTokenTransactions>>,
  wallet: string,
  decimals: number,
  priceUsd: number | null,
  holder: HolderEntry | undefined,
  days: number
): WindowPnlSnapshot {
  const full = calculateWalletTokenPnl(txs, wallet, decimals, priceUsd, null);
  const window = calculateWalletTokenPnl(
    txs,
    wallet,
    decimals,
    priceUsd,
    sinceMs(days)
  );
  return toPnlSnapshot(full, holder, priceUsd, window);
}

function currentPnl(
  txs: Awaited<ReturnType<typeof fetchTokenTransactions>>,
  wallet: string,
  decimals: number,
  priceUsd: number | null,
  holder: HolderEntry | undefined
): WindowPnlSnapshot {
  const full = calculateWalletTokenPnl(txs, wallet, decimals, priceUsd, null);
  return toPnlSnapshot(full, holder, priceUsd, null);
}

function tradeMarkers(
  txs: Awaited<ReturnType<typeof fetchTokenTransactions>>,
  wallet: string,
  decimals: number
): TradeMarker[] {
  const w = wallet.toLowerCase();
  return txs
    .map((tx) => {
      const amount = Number(BigInt(tx.value.split(".")[0] || "0")) / 10 ** decimals;
      const isBuy = normalizeAddress(tx.to).toLowerCase() === w;
      return {
        timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
        type: isBuy ? ("BUY" as const) : ("SELL" as const),
        tokenAmount: amount,
        txHash: tx.hash,
      };
    })
    .filter((m) => m.tokenAmount > 0)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function classifyTrades(
  txs: Awaited<ReturnType<typeof fetchTokenTransactions>>,
  wallet: string,
  decimals: number,
  priceUsd: number | null
): TokenTrade[] {
  const w = normalizeAddress(wallet).toLowerCase();
  return txs.map((tx) => {
    const amount = Number(BigInt(tx.value.split(".")[0] || "0")) / 10 ** decimals;
    const isIncoming = normalizeAddress(tx.to).toLowerCase() === w;
    return {
      type: isIncoming ? "TRANSFER_IN" : "TRANSFER_OUT",
      timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
      tokenAmount: amount,
      ethAmount: null,
      priceUsd,
      txHash: tx.hash,
    };
  });
}

function intelScore(
  firstMover: number,
  totalPnl: number | null,
  unrealizedPnl: number | null,
  positionUsd: number | null,
  followers30m: number,
  holderRank: number | null
): number {
  let score = 40;
  score += Math.min(35, firstMover * 0.35);
  score += Math.min(30, followers30m * 10);
  if (totalPnl != null && totalPnl > 0) score += Math.min(12, totalPnl / 500);
  if (unrealizedPnl != null && unrealizedPnl > 0) {
    score += Math.min(10, unrealizedPnl / 750);
  }
  if (positionUsd != null && positionUsd > 0) {
    score += Math.min(8, positionUsd / 2000);
  }
  if (holderRank != null && holderRank <= 10) score += 8;
  return Math.min(100, Math.round(score));
}

function trackScore(
  intel: number,
  totalPnl: number | null,
  unrealizedPnl: number | null,
  positionUsd: number | null,
  firstMover: number,
  followers30m: number
): number {
  const pnlPart =
    totalPnl == null ? 0 : Math.min(25, Math.max(-10, totalPnl / 200));
  const unrealizedPart =
    unrealizedPnl == null ? 0 : Math.min(12, Math.max(0, unrealizedPnl / 400));
  const bagPart =
    positionUsd == null ? 0 : Math.min(12, positionUsd / 1500);
  return Math.min(
    100,
    Math.round(
      intel * 0.38 +
        firstMover * 0.22 +
        followers30m * 4 +
        pnlPart +
        unrealizedPart +
        bagPart
    )
  );
}

function holderByAddress(
  holders: HolderEntry[],
  address: string
): HolderEntry | undefined {
  return holders.find(
    (h) => h.address.toLowerCase() === address.toLowerCase()
  );
}

export async function scanProAlphaTargets(
  contractAddress: string,
  overview: TokenOverview,
  holders: HolderEntry[]
): Promise<ProAlphaScanResult> {
  const normalized = normalizeAddress(contractAddress);
  const decimals = overview.decimals;
  const priceUsd = overview.priceUsd;

  const transfers = await fetchTokenTransfers(normalized, 600).catch(() => []);
  let transferRows = transfers
    .map((tx) => ({
      from: tx.from,
      to: tx.to,
      timeStamp: tx.metadata.blockTimestamp
        ? new Date(tx.metadata.blockTimestamp).getTime()
        : 0,
    }))
    .filter((tx) => tx.timeStamp > 0);

  if (transferRows.length < 20) {
    for (const holder of holders.filter((h) => !h.excluded).slice(0, 8)) {
      const txs = await fetchTokenTransactions(
        holder.address,
        normalized,
        1,
        60
      ).catch(() => []);
      for (const tx of txs) {
        transferRows.push({
          from: tx.from,
          to: tx.to,
          timeStamp: Number(tx.timeStamp) * 1000,
        });
      }
    }
  }

  const firstBuyMap = buildFirstBuyMap(transferRows, normalized);

  const candidates = new Set<string>();
  for (const h of holders.filter((x) => !x.excluded).slice(0, 20)) {
    candidates.add(normalizeAddress(h.address));
  }
  for (const tx of transfers) {
    const from = normalizeAddress(tx.from);
    const to = normalizeAddress(tx.to);
    if (!shouldExcludeHolder(from, normalized)) candidates.add(from);
    if (!shouldExcludeHolder(to, normalized)) candidates.add(to);
    if (candidates.size >= 35) break;
  }

  const chartPoints = overview.topPoolAddress
    ? await fetchPoolOhlcvHourly(overview.topPoolAddress, 168)
    : [];

  const wallets: ProTrackWallet[] = [];

  const candidateList = [...candidates].slice(0, SCAN_LIMIT + 8);
  for (let i = 0; i < candidateList.length; i += BATCH) {
    const batch = candidateList.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (wallet) => {
        const txs = await fetchTokenTransactions(
          wallet,
          normalized,
          1,
          150
        ).catch(() => []);
        if (txs.length === 0) return null;

        const txDecimals = Number(txs[0]?.tokenDecimal ?? String(decimals));
        const holder = holderByAddress(holders, wallet);
        const firstBuy = firstBuyMetaForWallet(wallet, firstBuyMap);
        const trades = classifyTrades(txs, wallet, txDecimals, priceUsd);
        const fullPnl = calculateWalletTokenPnl(
          txs,
          wallet,
          txDecimals,
          priceUsd,
          null
        );
        const pnlCurrent = currentPnl(
          txs,
          wallet,
          txDecimals,
          priceUsd,
          holder
        );
        const { preferredWindow } = tradingHoursProfile(trades);
        const intel = intelScore(
          firstBuy?.firstMoverScore ?? 0,
          pnlCurrent.totalPnlUsd,
          pnlCurrent.unrealizedPnlUsd,
          pnlCurrent.positionUsd,
          firstBuy?.followers30m ?? 0,
          holder?.rank ?? null
        );
        const { strategy, detail } = classifyWalletStrategy({
          trades,
          pnl: fullPnl,
          firstBuy,
          percentOfSupply: holder?.percentOfSupply ?? null,
          intelScore: intel,
        });

        const reasons: string[] = [];
        if (firstBuy && firstBuy.followers30m >= 2) {
          reasons.push(`${firstBuy.followers30m} wallets copied within 30m`);
        }
        if (firstBuy?.inSnipeWindow) {
          reasons.push("Bought in launch snipe window (≤30m from first buyer)");
        }
        if ((pnlCurrent.totalPnlUsd ?? 0) > 0) {
          reasons.push(
            `Total PnL incl. bag: realized + unrealized on current position`
          );
        }
        if ((pnlCurrent.unrealizedPnlUsd ?? 0) > 0) {
          reasons.push("Unrealized gains on open position");
        }
        if (pnlCurrent.position > 0) {
          reasons.push(
            holder?.percentOfSupply != null && holder.percentOfSupply >= 0.1
              ? `Still holding ${holder.percentOfSupply.toFixed(2)}% of supply`
              : "Still holding token balance"
          );
        }
        if (strategy === "ALPHA LEADER" || strategy === "EARLY BUYER") {
          reasons.push("Consistently early on this token");
        }
        if (holder && holder.rank <= 15) {
          reasons.push(`Top ${holder.rank} holder`);
        }

        return {
          rank: 0,
          address: wallet,
          label: holder?.label ?? getAddressLabel(wallet),
          holderRank: holder?.rank ?? null,
          percentOfSupply: holder?.percentOfSupply ?? null,
          strategy,
          strategyDetail: detail,
          preferredWindow,
          intelScore: intel,
          trackScore: trackScore(
            intel,
            pnlCurrent.totalPnlUsd,
            pnlCurrent.unrealizedPnlUsd,
            pnlCurrent.positionUsd,
            firstBuy?.firstMoverScore ?? 0,
            firstBuy?.followers30m ?? 0
          ),
          firstMoverScore: firstBuy?.firstMoverScore ?? 0,
          followers30m: firstBuy?.followers30m ?? 0,
          minsAfterFirstBuyer: firstBuy?.minsAfterFirstBuyer ?? null,
          minsBehindLeader: firstBuy?.minsBehindLeader ?? null,
          buyRank: firstBuy?.buyRank ?? null,
          pnlCurrent,
          pnlDay: windowPnl(txs, wallet, txDecimals, priceUsd, holder, 1),
          pnlWeek: windowPnl(txs, wallet, txDecimals, priceUsd, holder, 7),
          pnlMonth: windowPnl(txs, wallet, txDecimals, priceUsd, holder, 30),
          markers: tradeMarkers(txs, wallet, txDecimals),
          trackReasons: reasons,
        } satisfies ProTrackWallet;
      })
    );

    for (const row of results) {
      if (row) wallets.push(row);
    }
    if (wallets.length >= SCAN_LIMIT) break;
  }

  const trackWallets = wallets
    .sort((a, b) => b.trackScore - a.trackScore)
    .slice(0, SCAN_LIMIT)
    .map((w, index) => ({ ...w, rank: index + 1 }));

  const leaders = trackWallets.filter(
    (w) => w.strategy === "ALPHA LEADER" || w.strategy === "EARLY BUYER"
  ).length;

  const summary =
    trackWallets.length === 0
      ? "No trackable wallets found for Pro alpha scan."
      : `${trackWallets.length} wallets ranked · ${leaders} early/alpha profiles · chart ${chartPoints.length}h`;

  return {
    contractAddress: normalized,
    tokenSymbol: overview.symbol,
    trackWallets,
    chartPoints,
    summary,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
}
