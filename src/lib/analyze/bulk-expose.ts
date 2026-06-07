import type { BulkExposeEntry, BulkExposeResult, ExposedWallet } from "@/lib/analyze/types";
import { buildWalletNetwork, type NetworkWindow } from "@/lib/analyze/wallet-network";
import { getAddressLabel } from "@/lib/labels";
import { normalizeAddress } from "@/lib/ethereum";

const BATCH_SIZE = 2;
const MAX_TARGETS = 5;

async function runInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function bulkExposeWallets(
  contractAddress: string,
  exposedWallets: ExposedWallet[],
  windowDays: NetworkWindow = 90
): Promise<BulkExposeResult> {
  const normalized = normalizeAddress(contractAddress);
  const targets = exposedWallets.slice(0, MAX_TARGETS);

  const entries = await runInBatches(targets, async (exposed) => {
    const entry: BulkExposeEntry = {
      walletAddress: exposed.address,
      label: exposed.label ?? getAddressLabel(exposed.address),
      exposeScore: exposed.exposeScore,
      network: null,
    };

    try {
      entry.network = await buildWalletNetwork(
        exposed.address,
        windowDays,
        normalized
      );
    } catch (err) {
      entry.error = err instanceof Error ? err.message : "Network analysis failed";
    }

    return entry;
  });

  const successful = entries.filter((e) => e.network);
  const primaryNetwork =
    successful.sort(
      (a, b) =>
        (b.network?.suspicionScore ?? 0) - (a.network?.suspicionScore ?? 0)
    )[0]?.network ?? null;

  const combinedSuspicion =
    successful.length > 0
      ? Math.round(
          successful.reduce((sum, e) => sum + (e.network?.suspicionScore ?? 0), 0) /
            successful.length
        )
      : 0;

  const syndicates = successful.filter(
    (e) => e.network?.clusterVerdict === "WINNING_SYNDICATE"
  ).length;

  const summary =
    successful.length === 0
      ? `Failed to map networks for ${targets.length} flagged wallet(s).`
      : `Mapped ${successful.length}/${targets.length} flagged wallets. ` +
        `Avg suspicion ${combinedSuspicion}.` +
        (syndicates > 0 ? ` ${syndicates} winning syndicate(s) detected.` : "");

  return {
    contractAddress: normalized,
    windowDays,
    entries,
    primaryNetwork,
    combinedSuspicion,
    summary,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
}
