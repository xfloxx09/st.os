import type { TokenTx } from "@/lib/etherscan-wallet";
import { normalizeAddress } from "@/lib/ethereum";

export interface TokenPnlResult {
  position: number;
  realizedPnlUsd: number | null;
  unrealizedPnlUsd: number | null;
  totalPnlUsd: number | null;
  pnlPercent: number | null;
  tradeCount: number;
  status: "OPEN" | "EXITED" | "AIRDROP" | "UNKNOWN";
}

function tokenAmount(raw: string, decimals: number): number {
  const value = BigInt(raw.split(".")[0] || "0");
  return Number(value) / 10 ** decimals;
}

function filterTxsSince(txs: TokenTx[], sinceMs: number | null): TokenTx[] {
  if (sinceMs == null) return txs;
  return txs.filter((tx) => Number(tx.timeStamp) * 1000 >= sinceMs);
}

export function calculateWalletTokenPnl(
  txs: TokenTx[],
  walletAddress: string,
  decimals: number,
  currentPriceUsd: number | null,
  sinceMs: number | null = null
): TokenPnlResult {
  const scoped = filterTxsSince(txs, sinceMs);
  const wallet = walletAddress.toLowerCase();
  const sorted = [...scoped].sort(
    (a, b) => Number(a.timeStamp) - Number(b.timeStamp)
  );

  let position = 0;
  let costBasisUsd = 0;
  let realizedPnlUsd = 0;
  let tradeCount = 0;

  for (const tx of sorted) {
    const amount = tokenAmount(tx.value, decimals);
    if (amount <= 0) continue;

    const from = normalizeAddress(tx.from).toLowerCase();
    const to = normalizeAddress(tx.to).toLowerCase();

    if (to === wallet) {
      tradeCount += 1;
      position += amount;
      if (currentPriceUsd != null) {
        costBasisUsd += amount * currentPriceUsd;
      }
    } else if (from === wallet) {
      tradeCount += 1;
      const avgCost =
        position > 0 && costBasisUsd > 0 ? costBasisUsd / position : 0;
      const soldCost = avgCost * amount;
      const proceeds =
        currentPriceUsd != null ? amount * currentPriceUsd : soldCost;
      realizedPnlUsd += proceeds - soldCost;
      position = Math.max(0, position - amount);
      costBasisUsd = Math.max(0, costBasisUsd - soldCost);
    }
  }

  let status: TokenPnlResult["status"] = "UNKNOWN";
  if (position > 0 && costBasisUsd <= 0 && tradeCount <= 2) {
    status = "AIRDROP";
  } else if (position <= 0 && tradeCount > 0) {
    status = "EXITED";
  } else if (position > 0) {
    status = "OPEN";
  }

  const unrealizedPnlUsd =
    currentPriceUsd != null && position > 0
      ? position * currentPriceUsd - costBasisUsd
      : null;

  const totalPnlUsd =
    currentPriceUsd != null
      ? realizedPnlUsd + (unrealizedPnlUsd ?? 0)
      : null;

  const pnlPercent =
    costBasisUsd > 0 && totalPnlUsd != null
      ? (totalPnlUsd / costBasisUsd) * 100
      : status === "AIRDROP" && unrealizedPnlUsd != null
        ? null
        : null;

  return {
    position,
    realizedPnlUsd: currentPriceUsd != null ? realizedPnlUsd : null,
    unrealizedPnlUsd,
    totalPnlUsd,
    pnlPercent,
    tradeCount,
    status,
  };
}
