import { fetchEthTransactions } from "@/lib/etherscan-wallet";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { normalizeAddress } from "@/lib/ethereum";
import type { WalletAge } from "@/lib/analyze/types";

export const FRESH_WALLET_MAX_DAYS = 30;

export function buildWalletAge(firstTxMs: number | null): WalletAge {
  if (firstTxMs == null || !Number.isFinite(firstTxMs)) {
    return { kind: "UNKNOWN", firstTxAt: null, ageDays: null };
  }

  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - firstTxMs) / (24 * 60 * 60 * 1000))
  );

  return {
    kind: ageDays < FRESH_WALLET_MAX_DAYS ? "FRESH" : "OLD",
    firstTxAt: new Date(firstTxMs).toISOString(),
    ageDays,
  };
}

export async function resolveWalletAge(address: string): Promise<WalletAge> {
  const normalized = normalizeAddress(address);
  const cached = await getCachedWalletData<WalletAge>(normalized, "wallet_age");
  if (cached) return cached;

  const txs = await fetchEthTransactions(normalized, 1, 1).catch(() => []);
  const firstTxMs = txs[0] ? Number(txs[0].timeStamp) * 1000 : null;
  const age = buildWalletAge(firstTxMs);
  await setCachedWalletData(normalized, "wallet_age", age).catch(() => {});
  return age;
}

export async function resolveWalletAges(
  addresses: string[],
  concurrency = 4
): Promise<Record<string, WalletAge>> {
  const unique = [
    ...new Set(addresses.map((a) => normalizeAddress(a).toLowerCase())),
  ];
  const out: Record<string, WalletAge> = {};

  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    const rows = await Promise.all(
      batch.map(async (address) => ({
        address,
        age: await resolveWalletAge(address),
      }))
    );
    for (const row of rows) {
      out[row.address] = row.age;
    }
  }

  return out;
}
