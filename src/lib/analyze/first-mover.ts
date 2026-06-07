import { normalizeAddress } from "@/lib/ethereum";
import { shouldExcludeHolder } from "@/lib/labels";

export interface FirstBuyMeta {
  firstBuyMs: number;
  buyRank: number;
  buyersTotal: number;
  followers48h: number;
  firstMoverScore: number;
}

export function buildFirstBuyMap(
  transfers: Array<{ from: string; to: string; timeStamp: number }>,
  contractAddress: string
): Map<string, number> {
  const contract = normalizeAddress(contractAddress).toLowerCase();
  const firstBuy = new Map<string, number>();

  const sorted = [...transfers].sort((a, b) => a.timeStamp - b.timeStamp);
  for (const tx of sorted) {
    const to = normalizeAddress(tx.to).toLowerCase();
    if (shouldExcludeHolder(to, contract)) continue;
    if (!firstBuy.has(to)) {
      firstBuy.set(to, tx.timeStamp);
    }
  }

  return firstBuy;
}

export function firstBuyMetaForWallet(
  wallet: string,
  firstBuyMap: Map<string, number>
): FirstBuyMeta | null {
  const key = normalizeAddress(wallet).toLowerCase();
  const firstBuyMs = firstBuyMap.get(key);
  if (firstBuyMs == null) return null;

  const ranked = [...firstBuyMap.entries()].sort((a, b) => a[1] - b[1]);
  const buyRank = ranked.findIndex(([addr]) => addr === key) + 1;
  const buyersTotal = ranked.length;

  const followers48h = ranked.filter(([, ts]) => {
    const delta = ts - firstBuyMs;
    return delta > 0 && delta <= 48 * 60 * 60 * 1000;
  }).length;

  const percentile =
    buyersTotal > 1 ? 1 - (buyRank - 1) / (buyersTotal - 1) : 1;
  const followerBoost = Math.min(40, followers48h * 6);
  const firstMoverScore = Math.min(
    100,
    Math.round(percentile * 55 + followerBoost)
  );

  return {
    firstBuyMs,
    buyRank,
    buyersTotal,
    followers48h,
    firstMoverScore,
  };
}
