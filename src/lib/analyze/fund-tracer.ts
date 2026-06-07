import type {
  FundTraceEntry,
  FundTraceResult,
  HolderEntry,
  SharedFundSource,
} from "@/lib/analyze/types";
import { traceFundOrigin } from "@/lib/analyze/wallet-analyzer";
import { getAddressLabel } from "@/lib/labels";
import { normalizeAddress } from "@/lib/ethereum";

const BATCH_SIZE = 5;

async function traceHolders(
  holders: HolderEntry[],
  limit: number
): Promise<FundTraceEntry[]> {
  const targets = holders.filter((h) => !h.excluded).slice(0, limit);
  const entries: FundTraceEntry[] = [];

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const traced = await Promise.all(
      batch.map(async (holder) => {
        const fundOrigin = await traceFundOrigin(holder.address).catch(() => ({
          source: "TRACE FAILED",
          sourceAddress: null,
          timestamp: null,
          hops: 0,
          flags: [] as string[],
        }));
        return {
          holderAddress: normalizeAddress(holder.address),
          holderRank: holder.rank,
          holderLabel: holder.label ?? getAddressLabel(holder.address),
          percentOfSupply: holder.percentOfSupply,
          fundOrigin,
        };
      })
    );
    entries.push(...traced);
  }

  return entries;
}

function buildSharedSources(entries: FundTraceEntry[]): SharedFundSource[] {
  const bySource = new Map<
    string,
    { holders: string[]; ranks: number[]; flags: string[] }
  >();

  for (const entry of entries) {
    const source = entry.fundOrigin.sourceAddress;
    if (!source) continue;
    const key = normalizeAddress(source);
    const bucket = bySource.get(key) ?? { holders: [], ranks: [], flags: [] };
    bucket.holders.push(entry.holderAddress);
    bucket.ranks.push(entry.holderRank);
    bucket.flags.push(...entry.fundOrigin.flags);
    bySource.set(key, bucket);
  }

  const shared: SharedFundSource[] = [];

  for (const [sourceAddress, data] of bySource) {
    if (data.holders.length < 2) continue;
    const uniqueFlags = [...new Set(data.flags)];
    const suspicionScore = Math.min(
      100,
      data.holders.length * 18 +
        (uniqueFlags.length > 0 ? 25 : 0) +
        (data.holders.length >= 4 ? 20 : 0)
    );

    shared.push({
      sourceAddress,
      label: getAddressLabel(sourceAddress),
      holderAddresses: data.holders,
      holderRanks: data.ranks,
      suspicionScore,
      flags: uniqueFlags,
    });
  }

  return shared.sort((a, b) => b.suspicionScore - a.suspicionScore);
}

export async function traceTokenFunds(
  contractAddress: string,
  holders: HolderEntry[],
  tokenSymbol: string | null,
  limit = 20
): Promise<FundTraceResult> {
  const entries = await traceHolders(holders, limit);
  const sharedSources = buildSharedSources(entries);
  const insiderClusterScore =
    sharedSources.length > 0
      ? Math.round(
          sharedSources.reduce((sum, s) => sum + s.suspicionScore, 0) /
            sharedSources.length
        )
      : 0;

  return {
    contractAddress: normalizeAddress(contractAddress),
    tokenSymbol,
    entries,
    sharedSources,
    insiderClusterScore,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
}
