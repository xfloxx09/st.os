import type { TraderEntry } from "@/lib/analyze/types";
import { fetchTokenTransfers } from "@/lib/alchemy";
import { fetchTokenTransactions } from "@/lib/etherscan-wallet";
import { normalizeAddress } from "@/lib/ethereum";
import { getAddressLabel, shouldExcludeHolder } from "@/lib/labels";
import type { HolderEntry } from "@/lib/analyze/types";

interface TraderAgg {
  address: string;
  buyCount: number;
  sellCount: number;
  transferInCount: number;
  transferOutCount: number;
  totalVolume: number;
  netVolume: number;
  tradeCount: number;
  firstTradeAt: string | null;
  lastTradeAt: string | null;
}

function bumpAgg(
  agg: TraderAgg,
  direction: "in" | "out",
  volume: number,
  timestamp: string | null
) {
  agg.tradeCount += 1;
  agg.totalVolume += volume;
  if (direction === "in") {
    agg.transferInCount += 1;
    agg.netVolume += volume;
  } else {
    agg.transferOutCount += 1;
    agg.netVolume -= volume;
  }
  if (timestamp) {
    if (!agg.firstTradeAt || timestamp < agg.firstTradeAt) {
      agg.firstTradeAt = timestamp;
    }
    if (!agg.lastTradeAt || timestamp > agg.lastTradeAt) {
      agg.lastTradeAt = timestamp;
    }
  }
}

function getOrCreate(
  map: Map<string, TraderAgg>,
  address: string
): TraderAgg {
  const key = normalizeAddress(address);
  const existing = map.get(key);
  if (existing) return existing;
  const agg: TraderAgg = {
    address: key,
    buyCount: 0,
    sellCount: 0,
    transferInCount: 0,
    transferOutCount: 0,
    totalVolume: 0,
    netVolume: 0,
    tradeCount: 0,
    firstTradeAt: null,
    lastTradeAt: null,
  };
  map.set(key, agg);
  return agg;
}

async function tradersFromHolderTxs(
  contractAddress: string,
  holders: HolderEntry[],
  decimals: number
): Promise<TraderEntry[]> {
  const map = new Map<string, TraderAgg>();
  const targets = holders.filter((h) => !h.excluded).slice(0, 15);

  for (const holder of targets) {
    const txs = await fetchTokenTransactions(
      holder.address,
      contractAddress,
      1,
      80
    ).catch(() => []);

    for (const tx of txs) {
      const from = normalizeAddress(tx.from);
      const to = normalizeAddress(tx.to);
      const amount = Number(tx.value) / 10 ** decimals;
      const ts = new Date(Number(tx.timeStamp) * 1000).toISOString();

      if (!shouldExcludeHolder(from, contractAddress)) {
        bumpAgg(getOrCreate(map, from), "out", amount, ts);
      }
      if (!shouldExcludeHolder(to, contractAddress)) {
        bumpAgg(getOrCreate(map, to), "in", amount, ts);
      }
    }
  }

  return finalizeTraders(map);
}

function finalizeTraders(map: Map<string, TraderAgg>): TraderEntry[] {
  return [...map.values()]
    .filter((t) => t.tradeCount >= 2)
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 25)
    .map((t, index) => ({
      rank: index + 1,
      address: t.address,
      label: getAddressLabel(t.address),
      buyCount: t.buyCount,
      sellCount: t.sellCount,
      transferInCount: t.transferInCount,
      transferOutCount: t.transferOutCount,
      totalVolume: t.totalVolume,
      netVolume: t.netVolume,
      tradeCount: t.tradeCount,
      firstTradeAt: t.firstTradeAt,
      lastTradeAt: t.lastTradeAt,
    }));
}

export async function fetchTopTraders(
  contractAddress: string,
  holders: HolderEntry[],
  decimals: number
): Promise<TraderEntry[]> {
  const normalized = normalizeAddress(contractAddress);
  const transfers = await fetchTokenTransfers(normalized, 500);

  if (transfers.length > 0) {
    const map = new Map<string, TraderAgg>();

    for (const tx of transfers) {
      const from = normalizeAddress(tx.from);
      const to = normalizeAddress(tx.to);
      const volume = tx.value ?? 0;
      const ts = tx.metadata.blockTimestamp;

      if (!shouldExcludeHolder(from, normalized)) {
        bumpAgg(getOrCreate(map, from), "out", volume, ts);
      }
      if (!shouldExcludeHolder(to, normalized)) {
        bumpAgg(getOrCreate(map, to), "in", volume, ts);
      }
    }

    const fromTransfers = finalizeTraders(map);
    if (fromTransfers.length >= 5) return fromTransfers;
  }

  return tradersFromHolderTxs(normalized, holders, decimals);
}
