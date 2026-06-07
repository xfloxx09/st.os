import { analyzeContractAddress } from "@/lib/analyze/ca-analyzer";
import { traceTokenFunds } from "@/lib/analyze/fund-tracer";
import type {
  CaAnalysisResult,
  CrossAnalysisResult,
  CrossHolderOverlap,
  SharedFundSource,
} from "@/lib/analyze/types";
import { getAddressLabel } from "@/lib/labels";

export function findCrossHolderOverlaps(
  analyses: CaAnalysisResult[],
  minTokens = 2
): CrossHolderOverlap[] {
  if (analyses.length < 2) return [];

  const byAddress = new Map<
    string,
    Array<{
      contractAddress: string;
      symbol: string | null;
      percentOfSupply: number;
    }>
  >();

  for (const analysis of analyses) {
    for (const holder of analysis.holders) {
      if (holder.excluded) continue;
      const list = byAddress.get(holder.address.toLowerCase()) ?? [];
      list.push({
        contractAddress: analysis.contractAddress,
        symbol: analysis.overview.symbol,
        percentOfSupply: holder.percentOfSupply,
      });
      byAddress.set(holder.address.toLowerCase(), list);
    }
  }

  const overlaps: CrossHolderOverlap[] = [];

  for (const [address, tokens] of byAddress) {
    if (tokens.length < minTokens) continue;
    const overlapScore = tokens.reduce((sum, t) => sum + t.percentOfSupply, 0);
    const avgPercent = overlapScore / tokens.length;
    const insiderScore = Math.min(
      100,
      Math.round(tokens.length * 15 + avgPercent * 2 + overlapScore * 0.5)
    );

    overlaps.push({
      address,
      label: getAddressLabel(address),
      tokens,
      overlapScore,
      insiderScore,
    });
  }

  return overlaps.sort((a, b) => b.insiderScore - a.insiderScore).slice(0, 75);
}

function mergeSharedSources(
  sources: SharedFundSource[]
): SharedFundSource[] {
  const byKey = new Map<string, SharedFundSource>();

  for (const source of sources) {
    const key = source.sourceAddress.toLowerCase();
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...source });
      continue;
    }
    const holders = [...new Set([...existing.holderAddresses, ...source.holderAddresses])];
    byKey.set(key, {
      ...existing,
      holderAddresses: holders,
      holderRanks: [...existing.holderRanks, ...source.holderRanks],
      suspicionScore: Math.max(existing.suspicionScore, source.suspicionScore),
      flags: [...new Set([...existing.flags, ...source.flags])],
    });
  }

  return [...byKey.values()].sort((a, b) => b.suspicionScore - a.suspicionScore);
}

export async function runCrossAnalysis(
  contractAddresses: string[],
  options?: { isPro?: boolean }
): Promise<CrossAnalysisResult> {
  const unique = [...new Set(contractAddresses.map((a) => a.toLowerCase()))];
  if (unique.length < 2) {
    throw new Error("Cross-analysis requires at least 2 contract addresses");
  }
  if (unique.length > 5) {
    throw new Error("Maximum 5 contracts per cross-analysis run");
  }

  const analyses = await Promise.all(
    unique.map((address) =>
      analyzeContractAddress(address, { isPro: options?.isPro })
    )
  );

  const overlaps = findCrossHolderOverlaps(analyses);
  const overlapAddresses = new Set(overlaps.map((o) => o.address.toLowerCase()));

  const fundTraces = await Promise.all(
    analyses.map((analysis) =>
      traceTokenFunds(
        analysis.contractAddress,
        analysis.holders.filter((h) =>
          overlapAddresses.size > 0
            ? overlapAddresses.has(h.address.toLowerCase()) || h.rank <= 15
            : true
        ),
        analysis.overview.symbol,
        12
      )
    )
  );

  const sharedFundSources = mergeSharedSources(
    fundTraces.flatMap((trace) => trace.sharedSources)
  );

  const tokenSymbols = Object.fromEntries(
    analyses.map((a) => [a.contractAddress, a.overview.symbol])
  );

  return {
    contracts: unique,
    tokenSymbols,
    overlaps,
    sharedFundSources,
    totalOverlappingWallets: overlaps.length,
    topInsiderCandidates: overlaps.slice(0, 15),
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
}
