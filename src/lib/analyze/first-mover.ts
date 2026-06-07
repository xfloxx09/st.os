import { normalizeAddress } from "@/lib/ethereum";
import { shouldExcludeHolder } from "@/lib/labels";

/** Meme/degen copy-trade window — KOL call → wallet copies in ~30 min */
export const DEGEN_COPY_WINDOW_MS = 30 * 60 * 1000;

export interface FirstBuyMeta {
  firstBuyMs: number;
  buyRank: number;
  buyersTotal: number;
  /** Wallets that bought within 30m after this wallet's first buy */
  followers30m: number;
  /** Minutes after the token's very first buyer */
  minsAfterFirstBuyer: number | null;
  /** Minutes after a top-5 buyer (copy-trade lag) */
  minsBehindLeader: number | null;
  /** Bought in the same 30m snipe window as token launch activity */
  inSnipeWindow: boolean;
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
  const tokenFirstMs = ranked[0]?.[1] ?? firstBuyMs;

  const followers30m = ranked.filter(([, ts]) => {
    const delta = ts - firstBuyMs;
    return delta > 0 && delta <= DEGEN_COPY_WINDOW_MS;
  }).length;

  const minsAfterFirstBuyer = Math.round((firstBuyMs - tokenFirstMs) / 60_000);
  const inSnipeWindow = firstBuyMs - tokenFirstMs <= DEGEN_COPY_WINDOW_MS;

  let minsBehindLeader: number | null = null;
  for (const [, leaderTs] of ranked.slice(0, 5)) {
    if (leaderTs >= firstBuyMs) continue;
    const lag = Math.round((firstBuyMs - leaderTs) / 60_000);
    if (lag > 0 && lag <= 30) {
      minsBehindLeader = lag;
      break;
    }
  }

  const rankBoost =
    buyRank <= 3 ? 40 : buyRank <= 8 ? 28 : buyRank <= 20 ? 12 : 0;
  const snipeBoost = inSnipeWindow ? 22 : 0;
  const followerBoost = Math.min(38, followers30m * 14);
  const firstMoverScore = Math.min(
    100,
    Math.round(rankBoost + snipeBoost + followerBoost)
  );

  return {
    firstBuyMs,
    buyRank,
    buyersTotal,
    followers30m,
    minsAfterFirstBuyer,
    minsBehindLeader,
    inSnipeWindow,
    firstMoverScore,
  };
}
