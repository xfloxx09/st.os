import type { TokenPnlResult } from "@/lib/analyze/token-pnl";
import type { TokenTrade, WalletStrategy } from "@/lib/analyze/types";
import type { FirstBuyMeta } from "@/lib/analyze/first-mover";

export interface StrategyInput {
  trades: TokenTrade[];
  pnl: TokenPnlResult;
  firstBuy: FirstBuyMeta | null;
  percentOfSupply: number | null;
  intelScore: number;
}

export function classifyWalletStrategy(
  input: StrategyInput
): { strategy: WalletStrategy; detail: string } {
  const { trades, pnl, firstBuy, percentOfSupply, intelScore } = input;
  const buys = trades.filter(
    (t) => t.type === "BUY" || t.type === "TRANSFER_IN"
  );
  const sells = trades.filter(
    (t) => t.type === "SELL" || t.type === "TRANSFER_OUT"
  );

  if (pnl.status === "AIRDROP") {
    return { strategy: "AIRDROP", detail: "Received tokens without buys" };
  }

  if (firstBuy && firstBuy.buyRank <= 3 && firstBuy.followers48h >= 4) {
    return {
      strategy: "ALPHA LEADER",
      detail: `#${firstBuy.buyRank} buyer · ${firstBuy.followers48h} wallets followed within 48h`,
    };
  }

  if (firstBuy && firstBuy.buyRank <= 10 && firstBuy.firstMoverScore >= 70) {
    return {
      strategy: "EARLY BUYER",
      detail: `Top ${firstBuy.buyRank} buyer on this token`,
    };
  }

  if (
    firstBuy &&
    firstBuy.buyRank > 15 &&
    firstBuy.followers48h === 0 &&
    buys.length >= 2
  ) {
    const lagHours = firstBuy.buyRank > 30 ? "days" : "hours";
    return {
      strategy: "FOLLOWS ALPHA",
      detail: `Enters after leaders · rank #${firstBuy.buyRank} buyer (${lagHours} behind)`,
    };
  }

  if (buys.length === 1 && sells.length === 0 && pnl.status === "OPEN") {
    return { strategy: "SNIPER", detail: "Single entry, still holding" };
  }

  if (buys.length >= 3 && sells.length >= 2) {
    return {
      strategy: "SWING TRADER",
      detail: `${buys.length} buys / ${sells.length} sells on this token`,
    };
  }

  if (buys.length <= 2 && sells.length === 0 && pnl.status === "OPEN") {
    return { strategy: "DIAMOND HANDS", detail: "Low turnover, still holding" };
  }

  if (percentOfSupply != null && percentOfSupply >= 2) {
    return {
      strategy: "WHALE STACKER",
      detail: `${percentOfSupply.toFixed(2)}% of supply`,
    };
  }

  if (trades.length >= 10) {
    return {
      strategy: "SERIAL DEGEN",
      detail: `${trades.length} transfers — high activity`,
    };
  }

  if (intelScore >= 75 && (pnl.totalPnlUsd ?? 0) > 0) {
    return {
      strategy: "ALPHA",
      detail: "High intel score with positive positioning",
    };
  }

  return { strategy: "UNKNOWN", detail: "Insufficient pattern data" };
}

export function tradingHoursProfile(trades: TokenTrade[]): {
  avgBuyHourUtc: number | null;
  preferredWindow: string;
} {
  const buys = trades.filter(
    (t) => t.type === "BUY" || t.type === "TRANSFER_IN"
  );
  if (buys.length === 0) {
    return { avgBuyHourUtc: null, preferredWindow: "No buys detected" };
  }

  const hours = buys.map((t) => new Date(t.timestamp).getUTCHours());
  const avg = hours.reduce((s, h) => s + h, 0) / hours.length;

  let preferredWindow = "Mixed hours";
  if (avg >= 13 && avg <= 21) preferredWindow = "US session (13–21 UTC)";
  else if (avg >= 7 && avg <= 14) preferredWindow = "EU morning (07–14 UTC)";
  else if (avg >= 0 && avg <= 6) preferredWindow = "Asia night (00–06 UTC)";

  return { avgBuyHourUtc: avg, preferredWindow };
}
