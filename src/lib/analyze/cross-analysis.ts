import type { CaAnalysisResult, CrossHolderOverlap } from "@/lib/analyze/types";
import { getAddressLabel } from "@/lib/labels";

export function findCrossHolderOverlaps(
  analyses: CaAnalysisResult[],
  minTokens = 2
): CrossHolderOverlap[] {
  if (analyses.length < 2) return [];

  const byAddress = new Map<
    string,
    Array<{ contractAddress: string; percentOfSupply: number }>
  >();

  for (const analysis of analyses) {
    for (const holder of analysis.holders) {
      if (holder.excluded) continue;
      const list = byAddress.get(holder.address.toLowerCase()) ?? [];
      list.push({
        contractAddress: analysis.contractAddress,
        percentOfSupply: holder.percentOfSupply,
      });
      byAddress.set(holder.address.toLowerCase(), list);
    }
  }

  const overlaps: CrossHolderOverlap[] = [];

  for (const [address, tokens] of byAddress) {
    if (tokens.length < minTokens) continue;
    const overlapScore = tokens.reduce((sum, t) => sum + t.percentOfSupply, 0);
    overlaps.push({
      address,
      label: getAddressLabel(address),
      tokens,
      overlapScore,
    });
  }

  return overlaps.sort((a, b) => b.overlapScore - a.overlapScore).slice(0, 50);
}
