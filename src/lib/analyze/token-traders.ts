import type { TraderEntry } from "@/lib/analyze/types";
import { calculateWalletTokenPnl } from "@/lib/analyze/token-pnl";
import { fetchTokenTransfers } from "@/lib/alchemy";
import { fetchTokenTransactions } from "@/lib/etherscan-wallet";
import { normalizeAddress } from "@/lib/ethereum";
import { getAddressLabel, shouldExcludeHolder } from "@/lib/labels";
import type { HolderEntry } from "@/lib/analyze/types";

const WALLET_SCAN_LIMIT = 22;
const BATCH_SIZE = 4;

async function collectWalletCandidates(
  contractAddress: string,
  holders: HolderEntry[]
): Promise<string[]> {
  const normalized = normalizeAddress(contractAddress);
  const seen = new Set<string>();

  for (const holder of holders.filter((h) => !h.excluded).slice(0, 30)) {
    seen.add(normalizeAddress(holder.address));
  }

  const transfers = await fetchTokenTransfers(normalized, 400);
  for (const tx of transfers) {
    const from = normalizeAddress(tx.from);
    const to = normalizeAddress(tx.to);
    if (!shouldExcludeHolder(from, normalized)) seen.add(from);
    if (!shouldExcludeHolder(to, normalized)) seen.add(to);
    if (seen.size >= 60) break;
  }

  return [...seen].slice(0, 40);
}

async function pnlForWallet(
  wallet: string,
  contractAddress: string,
  decimals: number,
  priceUsd: number | null
): Promise<TraderEntry | null> {
  const txs = await fetchTokenTransactions(
    wallet,
    contractAddress,
    1,
    120
  ).catch(() => []);

  if (txs.length === 0) return null;

  const txDecimals = Number(txs[0]?.tokenDecimal ?? String(decimals));
  const pnl = calculateWalletTokenPnl(txs, wallet, txDecimals, priceUsd);

  if (pnl.tradeCount === 0) return null;
  if (pnl.totalPnlUsd == null && pnl.position <= 0) return null;

  return {
    rank: 0,
    address: normalizeAddress(wallet),
    label: getAddressLabel(wallet),
    position: pnl.position,
    realizedPnlUsd: pnl.realizedPnlUsd,
    unrealizedPnlUsd: pnl.unrealizedPnlUsd,
    totalPnlUsd: pnl.totalPnlUsd,
    pnlPercent: pnl.pnlPercent,
    tradeCount: pnl.tradeCount,
    status: pnl.status,
  };
}

export async function fetchTopTraders(
  contractAddress: string,
  holders: HolderEntry[],
  decimals: number,
  priceUsd: number | null
): Promise<TraderEntry[]> {
  const normalized = normalizeAddress(contractAddress);
  const candidates = await collectWalletCandidates(normalized, holders);
  const traders: TraderEntry[] = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((wallet) =>
        pnlForWallet(wallet, normalized, decimals, priceUsd)
      )
    );
    for (const entry of results) {
      if (entry) traders.push(entry);
    }
    if (traders.length >= WALLET_SCAN_LIMIT) break;
  }

  return traders
    .sort((a, b) => (b.totalPnlUsd ?? 0) - (a.totalPnlUsd ?? 0))
    .slice(0, 20)
    .map((trader, index) => ({ ...trader, rank: index + 1 }));
}
